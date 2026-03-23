"""
Parliamentary Amendments API
GET /api/politicians/{politician_id}/amendments
Filtros: ?year=&area=&municipio=
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field
import os
import re
from datetime import datetime
from supabase import create_client
from src.api.core.organizations import get_current_user_id
from fastapi import Depends
from src.utils.text_extractor import extract_entities_from_text

router = APIRouter(prefix="/api", tags=["amendments"])


def get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("Supabase credentials not found")
    return create_client(url, key)


# ── Schemas ───────────────────────────────────────────────────────────────────

class AmendmentItem(BaseModel):
    id: str
    ano_exercicio: int
    orgao: Optional[str]
    unidade_orcamentaria: Optional[str]
    municipio_original: Optional[str]
    acao_programa: Optional[str]
    objeto_detalhado: Optional[str]
    area_tematica: Optional[str]
    valor_orcado_inicial: float
    valor_orcado_atual: float
    valor_empenhado: float
    valor_liquidado: float
    valor_pago: float

    class Config:
        from_attributes = True


class YearSummary(BaseModel):
    ano: int
    qtd: int
    orcado: float
    pago: float


class AreaSummary(BaseModel):
    area: str
    qtd: int
    orcado: float
    pago: float


class CityAmendmentSummary(BaseModel):
    city_id: Optional[str]
    city_name: str
    city_slug: Optional[str]
    lat: Optional[float] = None
    lng: Optional[float] = None
    qtd_emendas: int
    total_orcado: float
    total_pago: float


class AmendmentsResponse(BaseModel):
    politician_id: str
    total_registros: int
    total_cidades: int
    total_orcado: float
    total_empenhado: float
    total_pago: float
    por_ano: List[YearSummary]
    por_area: List[AreaSummary]
    por_cidade: List[CityAmendmentSummary]
    emendas: List[AmendmentItem]


class SyncResponse(BaseModel):
    inserted: int
    updated_amendments: int
    details: Optional[str] = None



class AdminAmendmentsSummary(BaseModel):
    total_emendas: int
    cidades_vinculadas: int
    cidades_pendentes: int
    por_cidade: List[CityAmendmentSummary]


class PoliticianAmendmentSummary(BaseModel):
    politician_id: str
    politician_name: str
    politician_slug: Optional[str] = None
    partido: Optional[str] = None
    foto_url: Optional[str] = None
    qtd_emendas: int
    total_orcado: float
    total_pago: float


class CityAmendmentsReceivedResponse(BaseModel):
    city_id: str
    total_registros: int
    total_orcado: float
    total_empenhado: float
    total_pago: float
    por_area: List[AreaSummary]
    por_politico: List[PoliticianAmendmentSummary]
    emendas: List[AmendmentItem]

class AuditExpense(BaseModel):
    id: str
    data: str
    historico: str
    fornecedor: str
    valor: float
    fonte: Optional[str] = None
    empenho: Optional[str] = None
    confidence: str # high, medium, low
    match_reason: str

class PaymentDetail(BaseModel):
    id: str
    credor: Optional[str] = None
    data_pagamento: Optional[str] = None
    valor_pago: float = 0.0
    sei_numero: Optional[str] = None
    processo_sei: Optional[str] = None
    objeto: Optional[str] = None
    num_empenho: Optional[str] = None

class AuditTrailResponse(BaseModel):
    politician_id: str
    matches: List[dict] # Lista de { emenda_id, emenda_objeto, emenda_valor, matching_expenses: [], payments: [] }


# ── Campaign Radar Schemas ────────────────────────────────────────────────────

class CampaignRadarPayment(BaseModel):
    id: str
    credor: Optional[str] = None
    data_pagamento: Optional[str] = None
    valor_pago: float = 0.0
    sei_numero: Optional[str] = None
    processo_sei: Optional[str] = None
    objeto: Optional[str] = None
    num_empenho: Optional[str] = None

class CampaignRadarItem(BaseModel):
    amendment_id: str
    ano_exercicio: int
    orgao: Optional[str] = None
    acao_programa: Optional[str] = None
    objeto_detalhado: Optional[str] = None
    valor_orcado_atual: float
    valor_empenhado: float
    valor_liquidado: float
    valor_pago_total: float
    percent_executado: float
    sei_numero: Optional[str] = None
    processo_sei: Optional[str] = None
    payments: List[CampaignRadarPayment]

class CampaignRadarResponse(BaseModel):
    campaign_id: str
    politician_id: str
    politician_name: str
    total_amendments: int
    total_orcado: float
    total_pago: float
    items: List[CampaignRadarItem]


# ── Forensic & Geographic Schemas ─────────────────────────────────────────────

class ForensicAmendmentItem(CampaignRadarItem):
    municipio_original: Optional[str] = None
    has_sei: bool = False
    qtd_pagamentos: int = 0

class CityImpactItem(BaseModel):
    city_id: Optional[str] = None
    municipio_nome: str
    uf: str = "BA"
    lat: Optional[float] = None
    lng: Optional[float] = None
    valor_orcado_total: float
    valor_pago_total: float
    valor_empenhado_total: float = 0.0
    qtd_emendas: int
    qtd_pagamentos: int


# ── Dossiê Municipal Schemas (QI220) ─────────────────────────────────────────

class DossiePaymentItem(BaseModel):
    id: str
    data_pagamento: Optional[str] = None
    credor: Optional[str] = None
    valor_pago: float = 0.0
    num_empenho: Optional[str] = None
    sei_numero: Optional[str] = None
    processo_sei: Optional[str] = None
    contrato_numero: Optional[str] = None
    objeto_pagamento: Optional[str] = None
    origem_dado: str = "amendment_payments"


class AlertaForense(BaseModel):
    tipo: str
    descricao: str


class DossieEmendaItem(BaseModel):
    id: str  # alias de amendment_id para frontend key
    amendment_id: str
    ano_exercicio: int
    politician_id: Optional[str] = None
    politician_name: Optional[str] = None
    municipio_destino: str
    descricao_loa: Optional[str] = None
    orgao: Optional[str] = None
    area_tematica: Optional[str] = None
    valor_orcado_atual: float = 0.0
    valor_empenhado: float = 0.0
    valor_liquidado: float = 0.0
    valor_pago_total: float = 0.0
    percent_executado: float = 0.0
    has_sei: bool = False
    sei_numeros: List[str] = []
    emenda_fantasma: bool = False
    divergencia_loa_pago: bool = False
    observacoes_forenses: Optional[str] = None
    entidades_extraidas: Dict[str, Any] = {}
    alertas_entidades: List[AlertaForense] = []
    payments: List[DossiePaymentItem] = []


class DossieMunicipalResponse(BaseModel):
    municipio: str
    total_emendas_orcadas: float = 0.0
    total_pago: float = 0.0
    percent_execucao_media: float = 0.0
    qtd_emendas: int = 0
    qtd_pagamentos: int = 0
    alertas: List[AlertaForense] = []
    emendas: List[DossieEmendaItem] = []


# ── Internal Helpers ──────────────────────────────────────────────────────────

async def get_amendments_with_payments(
    supabase, 
    politician_id: str, 
    limit: int = 500,
    offset: int = 0,
    year: Optional[int] = None,
    city: Optional[str] = None,
    area: Optional[str] = None,
    query_text: Optional[str] = None
) -> List[dict]:
    """
    Função utilitária interna para agregar emendas e seus respectivos pagamentos.
    Centraliza a lógica de cálculo de percentuais e matching de IDs.
    Suporta filtros forenses (Ano, Cidade, Área, Texto).
    """
    # 1. Construir query base
    q = (
        supabase.table("parliamentary_amendments")
        .select("*")
        .eq("politician_id", politician_id)
    )
    
    # Aplicar filtros
    if year:
        q = q.eq("ano_exercicio", year)
    if city:
        q = q.ilike("municipio_original", f"%{city}%")
    if area:
        q = q.eq("area_tematica", area)
    if query_text:
        # Busca básica no objeto ou município
        q = q.or_(f"objeto_detalhado.ilike.%{query_text}%,municipio_original.ilike.%{query_text}%")

    # Ordenação padrão QI 220
    q = q.order("ano_exercicio", desc=True).order("valor_orcado_atual", desc=True)
    
    # Range
    q = q.range(offset, offset + limit - 1)
    
    amend_res = q.execute()
    amendments = amend_res.data or []
    
    if not amendments:
        return []

    # 2. Buscar pagamentos vinculados
    amendment_ids = [a["id"] for a in amendments]
    payments_by_amendment = {}
    if amendment_ids:
        pay_res = (
            supabase.table("amendment_payments")
            .select("*")
            .in_("amendment_id", amendment_ids)
            .order("data_pagamento", desc=True)
            .execute()
        )
        for p in (pay_res.data or []):
            aid = p.get("amendment_id")
            if aid not in payments_by_amendment:
                payments_by_amendment[aid] = []
            
            payments_by_amendment[aid].append({
                "id": p["id"],
                "credor": p.get("credor"),
                "data_pagamento": str(p.get("data_pagamento") or ""),
                "valor_pago": float(p.get("valor_pago") or 0),
                "sei_numero": p.get("sei_numero"),
                "processo_sei": p.get("processo_sei"),
                "objeto": p.get("objeto"),
                "num_empenho": p.get("num_empenho"),
            })

    # 3. Consolidar e calcular percentuais
    results = []
    for am in amendments:
        aid = am["id"]
        pays = payments_by_amendment.get(aid, [])
        v_pago_total = sum(p["valor_pago"] for p in pays)
        v_orcado = float(am.get("valor_orcado_atual", 0) or 0)
        
        percent = (v_pago_total / v_orcado) if v_orcado > 0 else 0.0
        
        sei_num = am.get("sei_numero")
        
        results.append({
            "amendment_id": aid,
            "ano_exercicio": am.get("ano_exercicio", 0),
            "municipio_original": am.get("municipio_original"),
            "orgao": am.get("orgao"),
            "acao_programa": am.get("acao_programa"),
            "objeto_detalhado": am.get("objeto_detalhado"),
            "valor_orcado_atual": v_orcado,
            "valor_empenhado": float(am.get("valor_empenhado", 0) or 0),
            "valor_liquidado": float(am.get("valor_liquidado", 0) or 0),
            "valor_pago_total": v_pago_total,
            "percent_executado": round(percent, 4),
            "sei_numero": sei_num,
            "processo_sei": am.get("processo_sei"),
            "has_sei": bool(sei_num),
            "qtd_pagamentos": len(pays),
            "payments": pays
        })
    
    return results


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.get("/politicians/{politician_id}/amendments", response_model=AmendmentsResponse)
async def list_amendments(
    politician_id: str, # Aceitar como string para flexibilidade
    year: Optional[int] = Query(None, description="Filtrar por ano de exercício"),
    area: Optional[str] = Query(None, description="Filtrar por área temática"),
    municipio: Optional[str] = Query(None, description="Filtrar por município (busca parcial)"),
    limit: int = Query(200, le=500),
    offset: int = Query(0),
):
    """
    Lista emendas parlamentares de um político com totais agregados.
    Suporta filtros opcionais por ano, área temática e município.
    """
    try:
        supabase = get_supabase()
        pid = str(politician_id)

        # ── Query base ────────────────────────────────────────────────────────────
        query = (
            supabase.table("parliamentary_amendments")
            .select("*")
            .eq("politician_id", pid)
        )

        if year:
            query = query.eq("ano_exercicio", year)
        if area:
            query = query.eq("area_tematica", area)
        if municipio:
            query = query.ilike("municipio_original", f"%{municipio}%")

        query = query.order("ano_exercicio", desc=True).range(offset, offset + limit - 1)
        result = query.execute()

        rows = result.data or []

        if not rows and offset == 0:
            # Verifica se o político sequer existe para dar 404 adequado
            pol = supabase.table("politicians").select("id").eq("id", pid).execute()
            if not pol.data:
                raise HTTPException(status_code=404, detail="Político não encontrado")

        # ── Agregações em memória ─────────────────────────────────────────────────
        total_orcado    = sum(r.get("valor_orcado_atual", 0) or 0 for r in rows)
        total_empenhado = sum(r.get("valor_empenhado", 0) or 0 for r in rows)
        total_pago      = sum(r.get("valor_pago", 0) or 0 for r in rows)

        # Por ano
        ano_map: dict = {}
        for r in rows:
            ano = r.get("ano_exercicio", 0)
            if ano not in ano_map:
                ano_map[ano] = {"qtd": 0, "orcado": 0.0, "pago": 0.0}
            ano_map[ano]["qtd"] += 1
            ano_map[ano]["orcado"] += r.get("valor_orcado_atual", 0) or 0
            ano_map[ano]["pago"]   += r.get("valor_pago", 0) or 0
        por_ano = [
            YearSummary(ano=ano, **vals)
            for ano, vals in sorted(ano_map.items())
        ]

        # Por área
        area_map: dict = {}
        for r in rows:
            ar = r.get("area_tematica") or "Outros"
            if ar not in area_map:
                area_map[ar] = {"qtd": 0, "orcado": 0.0, "pago": 0.0}
            area_map[ar]["qtd"] += 1
            area_map[ar]["orcado"] += r.get("valor_orcado_atual", 0) or 0
            area_map[ar]["pago"]   += r.get("valor_pago", 0) or 0
        por_area = [
            AreaSummary(area=ar, **vals)
            for ar, vals in sorted(area_map.items(), key=lambda x: -x[1]["orcado"])
        ]

        # Por cidade
        cities_resp = supabase.table("cities").select("id, name, slug").execute()
        cities_map = {c["id"]: c for c in (cities_resp.data or [])}
        
        cidade_stats = {}
        cidades_unicas = set()
        
        for r in rows:
            cid = r.get("beneficiary_city_id")
            nome_orig = r.get("municipio_original") or "Desconhecido"
            orcado = r.get("valor_orcado_atual", 0) or 0
            pago = r.get("valor_pago", 0) or 0
            
            if cid:
                cidades_unicas.add(cid)
                key = cid
                cname = cities_map.get(cid, {}).get("name", nome_orig)
                slug = cities_map.get(cid, {}).get("slug", "")
                lat = None
                lng = None
            else:
                if nome_orig != "Estado da Bahia":
                    cidades_unicas.add(nome_orig)
                key = f"pendente_{nome_orig}"
                cname = nome_orig
                slug = None
                lat = None
                lng = None
                
            if key not in cidade_stats:
                cidade_stats[key] = {
                    "city_id": cid,
                    "city_name": cname,
                    "city_slug": slug,
                    "lat": lat,
                    "lng": lng,
                    "qtd": 0,
                    "orcado": 0.0,
                    "pago": 0.0
                }
                
            cidade_stats[key]["qtd"] += 1
            cidade_stats[key]["orcado"] += float(orcado)
            cidade_stats[key]["pago"] += float(pago)

        por_cidade = [
            CityAmendmentSummary(
                city_id=st["city_id"],
                city_name=st["city_name"],
                city_slug=st["city_slug"],
                lat=st["lat"],
                lng=st["lng"],
                qtd_emendas=st["qtd"],
                total_orcado=st["orcado"],
                total_pago=st["pago"]
            )
            for st in cidade_stats.values()
        ]
        por_cidade.sort(key=lambda x: x.total_orcado, reverse=True)

        emendas = [
            AmendmentItem(
                id=r["id"],
                ano_exercicio=r.get("ano_exercicio", 0),
                orgao=r.get("orgao"),
                unidade_orcamentaria=r.get("unidade_orcamentaria"),
                municipio_original=r.get("municipio_original"),
                acao_programa=r.get("acao_programa"),
                objeto_detalhado=r.get("objeto_detalhado"),
                area_tematica=r.get("area_tematica"),
                valor_orcado_inicial=float(r.get("valor_orcado_inicial", 0) or 0),
                valor_orcado_atual=float(r.get("valor_orcado_atual", 0) or 0),
                valor_empenhado=float(r.get("valor_empenhado", 0) or 0),
                valor_liquidado=float(r.get("valor_liquidado", 0) or 0),
                valor_pago=float(r.get("valor_pago", 0) or 0),
            )
            for r in rows
        ]

        return AmendmentsResponse(
            politician_id=pid,
            total_registros=len(rows),
            total_cidades=len(cidades_unicas),
            total_orcado=float(total_orcado),
            total_empenhado=float(total_empenhado),
            total_pago=float(total_pago),
            por_ano=por_ano,
            por_area=por_area,
            por_cidade=por_cidade,
            emendas=emendas,
        )
    except Exception as e:
        import traceback
        print(f"ERROR in list_amendments: {str(e)}")
        traceback.print_exc()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")


@router.get("/politicians/{politician_id}/audit_trail", response_model=AuditTrailResponse)
async def list_audit_trail(
    politician_id: str,
    city_slug: str = Query("senhor-do-bonfim-ba"),
    show_low_confidence: bool = Query(False),
):
    """
    Cruza emendas do político com gastos municipais (audit trail) com precisão cirúrgica.
    Extrai identificadores únicos (SEI, Contrato, NF) para garantir o match.
    """
    try:
        supabase = get_supabase()
        
        # 1. Buscar emendas do político (priorizando a cidade, mas permitindo ver todas se houver pagamentos)
        amend_query = (
            supabase.table("parliamentary_amendments")
            .select("id, ano_exercicio, area_tematica, objeto_detalhado, valor_orcado_atual, acao_programa, orgao, sei_numero, processo_sei, valor_pago, beneficiary_city_id, municipio_original")
            .eq("politician_id", politician_id)
        )
        
        # Se houver city_slug, tentamos filtrar, mas se não vier nada, buscamos as globais do político
        if city_slug:
            city_res = supabase.table("cities").select("id").eq("slug", city_slug).single().execute()
            if city_res.data:
                city_id = city_res.data["id"]
                # Modificamos para: (city_id OR city_id IS NULL) para pegar emendas não vinculadas ainda
                # Mas para simplificar e garantir Enterprise QI 190, vamos pegar TODAS do político 
                # e no loop a gente filtra ou prioriza.
                pass 

        amend_res = amend_query.order("valor_pago", desc=True).execute()
        amendments = amend_res.data or []

        # 1b. Buscar pagamentos detalhados da tabela amendment_payments
        amendment_ids = [a["id"] for a in amendments]
        payments_by_amendment = {}  # {amendment_id: [PaymentDetail, ...]}
        if amendment_ids:
            pay_res = (
                supabase.table("amendment_payments")
                .select("id, amendment_id, credor, data_pagamento, valor_pago, sei_numero, processo_sei, objeto, num_empenho")
                .in_("amendment_id", amendment_ids)
                .order("data_pagamento", desc=True)
                .execute()
            )
            for p in (pay_res.data or []):
                aid = p.get("amendment_id")
                if aid not in payments_by_amendment:
                    payments_by_amendment[aid] = []
                payments_by_amendment[aid].append({
                    "id": p["id"],
                    "credor": p.get("credor"),
                    "data_pagamento": str(p.get("data_pagamento") or ""),
                    "valor_pago": float(p.get("valor_pago") or 0),
                    "sei_numero": p.get("sei_numero"),
                    "processo_sei": p.get("processo_sei"),
                    "objeto": (p.get("objeto") or "")[:200],
                    "num_empenho": p.get("num_empenho"),
                })
        
        if not amendments:
            return AuditTrailResponse(politician_id=politician_id, matches=[])

        # 2. Buscar gastos municipais
        expense_res = (
            supabase.table("municipal_expenses")
            .select("id, dt_emissao_despesa, historico, nm_fornecedor, vl_despesa, fonte_recurso, nr_empenho, orgao")
            .eq("municipio_slug", city_slug)
            .order("dt_emissao_despesa", desc=True)
            .limit(2000)
            .execute()
        )
        all_expenses = expense_res.data or []

        # Regex patterns
        re_sei = re.compile(r'\d{3}\.\d{4}\.\d{4}\.\d{7}-\d{2}')
        re_contrato = re.compile(r'(?i)(?:CONTRATO|CT)\s*(\d+/\d+)')
        re_nf = re.compile(r'(?i)NF[S]?[\.\s:]+([\d\s,]+)')
        re_afm = re.compile(r'(?i)AFM\s*N[º°]?\s*([\d\/\.]+)')

        matches = []
        for am in amendments:
            obj = am.get("objeto_detalhado") or ""
            obj_upper = obj.upper()
            am_id = am["id"]
            
            # Extrair IDs da emenda
            am_sei = re_sei.search(obj)
            am_sei_val = am_sei.group(0) if am_sei else None
            
            am_cnt = re_contrato.search(obj)
            am_cnt_val = am_cnt.group(1) if am_cnt else None

            matching_expenses = []
            for exp in all_expenses:
                hist = (exp.get("historico") or "")
                hist_upper = hist.upper()
                
                confidence = "low"
                match_reason = ""
                
                # 🟢 ALTO: SEI ou NF exato
                exp_sei = re_sei.search(hist)
                if am_sei_val and exp_sei and am_sei_val == exp_sei.group(0):
                    confidence = "high"
                    match_reason = f"Número SEI idêntico: {am_sei_val}"
                
                if confidence != "high":
                    exp_nf = re_nf.search(hist)
                    am_nf = re_nf.search(obj)
                    if am_nf and exp_nf and am_nf.group(1).strip() == exp_nf.group(1).strip():
                        confidence = "high"
                        match_reason = f"Nota Fiscal idêntica: {am_nf.group(1)}"

                # 🟡 MÉDIO: Contrato ou AFM
                if confidence == "low":
                    exp_cnt = re_contrato.search(hist)
                    if am_cnt_val and exp_cnt and am_cnt_val == exp_cnt.group(1):
                        confidence = "medium"
                        match_reason = f"Número de Contrato idêntico: {am_cnt_val}"
                
                    if confidence == "low":
                        exp_afm = re_afm.search(hist)
                        am_afm = re_afm.search(obj)
                        if am_afm and exp_afm and am_afm.group(1) == exp_afm.group(1):
                            confidence = "medium"
                            match_reason = f"AFM idêntica: {am_afm.group(1)}"

                # 🔴 BAIXO: Secretaria + Valor Próximo (Somente se solicitado)
                if confidence == "low":
                    val_diff = abs(float(exp["vl_despesa"]) - float(am["valor_orcado_atual"]))
                    org_match = (exp.get("orgao") or "").upper() == (am.get("orgao") or "").upper()
                    
                    if org_match and val_diff < 10.0: # Margem de R$ 10
                        confidence = "low"
                        match_reason = "Vínculo por Órgão e Valor exato"
                    elif "EMENDA" in hist_upper and any(k in hist_upper for k in re.split(r'[^A-Z]+', obj_upper) if len(k) > 5):
                        confidence = "low"
                        match_reason = "Menção a 'Emenda' e palavras-chave"

                if confidence == "high" or confidence == "medium" or (confidence == "low" and show_low_confidence):
                    matching_expenses.append({
                        "id": exp["id"],
                        "data": exp["dt_emissao_despesa"],
                        "historico": exp["historico"],
                        "fornecedor": exp["nm_fornecedor"],
                        "valor": float(exp["vl_despesa"]),
                        "fonte": exp.get("fonte_recurso"),
                        "empenho": exp.get("nr_empenho"),
                        "confidence": confidence,
                        "match_reason": match_reason
                    })
            
            # Ordenar matches por confiança
            matching_expenses.sort(key=lambda x: {"high": 0, "medium": 1, "low": 2}[x["confidence"]])
            
            matches.append({
                "emenda_id": am_id,
                "emenda_objeto": am["objeto_detalhado"],
                "emenda_valor": float(am["valor_orcado_atual"]),
                "sei_numero": am.get("sei_numero"),
                "processo_sei": am.get("processo_sei"),
                "valor_pago_total": float(am.get("valor_pago") or 0),
                "municipio_original": am.get("municipio_original") or "Estado da Bahia",
                "beneficiary_city_id": am.get("beneficiary_city_id"),
                "ano_exercicio": am.get("ano_exercicio"),
                "area_tematica": am.get("area_tematica"),
                "matching_expenses": matching_expenses[:15],
                "payments": payments_by_amendment.get(am_id, []),
            })

        return AuditTrailResponse(politician_id=politician_id, matches=matches)

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/campaigns/{campaign_id}/radar", response_model=CampaignRadarResponse)
async def get_campaign_radar(
    campaign_id: str,
    limit: int = Query(500, le=1000),
    user_id: str = Depends(get_current_user_id)
):
    """
    Endpoint Radar de Campanha (Multi-tenant).
    Retorna emendas e pagamentos do político vinculado à campanha com validação de segurança.
    """
    try:
        supabase = get_supabase()
        
        # 1. SECURITY VALIDATION (Tenant Guard)
        # Verifica se a campanha existe e qual sua organization_id
        camp_res = (
            supabase.table("campaigns")
            .select("id, organization_id, candidate_name")
            .eq("id", campaign_id)
            .single()
            .execute()
        )
        
        if not camp_res.data:
            # Não revela se a campanha existe ou não se o usuário não tiver acesso
            raise HTTPException(status_code=404, detail="Recurso não encontrado")
            
        org_id = camp_res.data["organization_id"]
        
        # Verifica se o usuário pertence a esta organização
        profile_res = (
            supabase.table("profiles")
            .select("id")
            .eq("id", user_id)
            .eq("organization_id", org_id)
            .single()
            .execute()
        )
        
        if not profile_res.data:
            raise HTTPException(status_code=403, detail="Acesso negado: Organização incompatível")

        # 2. RESOLVE POLITICIAN
        # Busca o político vinculado à campanha
        pol_res = (
            supabase.table("politicians")
            .select("id, name")
            .eq("campaign_id", campaign_id)
            .single()
            .execute()
        )
        
        if not pol_res.data:
            # Campanha sem político vinculado retorna lista vazia
            return CampaignRadarResponse(
                campaign_id=campaign_id,
                politician_id="",
                politician_name=camp_res.data["candidate_name"] or "Candidato",
                total_amendments=0,
                total_orcado=0,
                total_pago=0,
                items=[]
            )
            
        pol_id = pol_res.data["id"]
        pol_name = pol_res.data["name"]

        # 3. DATA AGGREGATION (Reusing Internal Helper)
        items_data = await get_amendments_with_payments(supabase, pol_id, limit=limit)
        
        # 4. TOTALS
        total_orcado = sum(i["valor_orcado_atual"] for i in items_data)
        total_pago = sum(i["valor_pago_total"] for i in items_data)

        # Map to items (CampaignRadarItem)
        items = [CampaignRadarItem(**i) for i in items_data]

        return CampaignRadarResponse(
            campaign_id=campaign_id,
            politician_id=pol_id,
            politician_name=pol_name,
            total_amendments=len(items),
            total_orcado=total_orcado,
            total_pago=total_pago,
            items=items
        )

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        print(f"ERROR in get_campaign_radar: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro interno ao processar radar de campanha")


@router.get("/politicians/{politician_id}/amendments_table", response_model=List[ForensicAmendmentItem])
async def list_amendments_table(
    politician_id: str,
    year: Optional[int] = Query(None),
    city: Optional[str] = Query(None),
    area: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    limit: int = Query(500, le=1000),
    offset: int = Query(0)
):
    """
    Endpoint Forense para Tabela Detalhada.
    Lista emendas com pagamentos agregados e filtros avançados.
    """
    try:
        supabase = get_supabase()
        items = await get_amendments_with_payments(
            supabase, 
            politician_id, 
            limit=limit, 
            offset=offset,
            year=year,
            city=city,
            area=area,
            query_text=q
        )
        return [ForensicAmendmentItem(**i) for i in items]
    except Exception as e:
        print(f"ERROR in list_amendments_table: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/politicians/{politician_id}/by_city", response_model=List[CityImpactItem])
async def list_amendments_by_city(
    politician_id: str,
    limit: int = Query(100, le=500)
):
    """
    Endpoint de Impacto Territorial (QI 220).
    Agrega emendas e pagamentos por município com coordenadas geográficas.
    """
    try:
        supabase = get_supabase()
        
        # 1. Pegar TODAS as emendas e pagamentos do político (sem filtros para garantir totais)
        # Para performance em políticos com milhares, isso pode ser otimizado, 
        # mas por hora 5000 é seguro.
        items = await get_amendments_with_payments(supabase, politician_id, limit=5000)
        
        # 2. Agregação em memória
        city_stats = {}
        
        # Carregar coordenadas das cidades para o mapa
        cities_res = supabase.table("cities").select("id, name, state, lat, lng").execute()
        cities_geo = {c["id"]: c for c in (cities_res.data or [])}
        
        for item in items:
            municipio = item.get("municipio_original") or "Estado da Bahia"
            # Tentar encontrar city_id (precisamos do id original da emenda para isso se não trouxemos no helper)
            # Vamos ajustar o helper para trazer beneficiary_city_id
            
            # Como o helper não traz city_id explicitamente no return dict (atualizei acima), 
            # vou buscar os ids das cidades
            pass

        # RE-LENDO: O helper traz "municipio_original". Vou usar isso como chave primária 
        # e tentar o merge com cities_geo se houver match.
        
        for item in items:
            key = item["municipio_original"] or "Estado da Bahia"
            if key not in city_stats:
                city_stats[key] = {
                    "city_id": None,
                    "municipio_nome": key,
                    "uf": "BA",
                    "lat": None,
                    "lng": None,
                    "valor_orcado_total": 0.0,
                    "valor_pago_total": 0.0,
                    "valor_empenhado_total": 0.0,
                    "qtd_emendas": 0,
                    "qtd_pagamentos": 0
                }
            
            city_stats[key]["valor_orcado_total"] += item["valor_orcado_atual"]
            city_stats[key]["valor_pago_total"] += item["valor_pago_total"]
            city_stats[key]["valor_empenhado_total"] += item["valor_empenhado"]
            city_stats[key]["qtd_emendas"] += 1
            city_stats[key]["qtd_pagamentos"] += item["qtd_pagamentos"]

        # Enriquecer com coordenadas
        # Mapeamento por nome para casos sem city_id explícito no item
        cities_by_name = {c["name"].lower(): c for c in cities_geo.values()}
        
        for key, stats in city_stats.items():
            geo = cities_by_name.get(key.lower())
            if geo:
                stats["city_id"] = geo["id"]
                stats["lat"] = geo["lat"]
                stats["lng"] = geo["lng"]

        # Ordenar e Limitar
        result = sorted(city_stats.values(), key=lambda x: x["valor_orcado_total"], reverse=True)
        return [CityImpactItem(**r) for r in result[:limit]]

    except Exception as e:
        print(f"ERROR in list_amendments_by_city: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Dossiê Municipal Endpoints (QI220) ───────────────────────────────────────

async def build_dossie_municipal(supabase, municipio_nome: str) -> dict:
    """
    Constrói o dossiê forense completo para um município.
    Busca emendas por municipio_original exato OU menção no texto do objeto.
    """
    nome_lower = municipio_nome.lower().strip()

    # 1. Buscar TODAS emendas que mencionem o município
    all_amendments_res = (
        supabase.table("parliamentary_amendments")
        .select("*, politicians!inner(id, name)")
        .or_(f"municipio_original.ilike.%{municipio_nome}%,objeto_detalhado.ilike.%{municipio_nome}%")
        .order("ano_exercicio", desc=True)
        .limit(500)
        .execute()
    )
    amendments = all_amendments_res.data or []

    if not amendments:
        return {
            "municipio": municipio_nome,
            "total_emendas_orcadas": 0, "total_pago": 0,
            "percent_execucao_media": 0, "qtd_emendas": 0,
            "qtd_pagamentos": 0, "alertas": [], "emendas": []
        }

    # 2. Buscar pagamentos vinculados
    amendment_ids = [a["id"] for a in amendments]
    payments_by_amendment = {}
    if amendment_ids:
        pay_res = (
            supabase.table("amendment_payments")
            .select("*")
            .in_("amendment_id", amendment_ids)
            .order("data_pagamento", desc=True)
            .execute()
        )
        for p in (pay_res.data or []):
            aid = p.get("amendment_id")
            if aid not in payments_by_amendment:
                payments_by_amendment[aid] = []
            payments_by_amendment[aid].append(p)

    # 3. Montar itens do dossiê
    emendas_dossie = []
    total_orcado = 0.0
    total_pago = 0.0
    total_pagamentos = 0
    alertas = []
    alertas_set = set()  # evitar duplicatas

    for am in amendments:
        aid = am["id"]
        pays_raw = payments_by_amendment.get(aid, [])
        politician_data = am.get("politicians") or {}

        # Calcular valores
        v_orcado = float(am.get("valor_orcado_atual", 0) or 0)
        v_empenhado = float(am.get("valor_empenhado", 0) or 0)
        v_liquidado = float(am.get("valor_liquidado", 0) or 0)
        v_pago_total = sum(float(p.get("valor_pago", 0) or 0) for p in pays_raw)
        percent = round((v_pago_total / v_orcado) if v_orcado > 0 else 0.0, 4)

        # Município destino
        mun_original = (am.get("municipio_original") or "").strip()
        objeto = (am.get("objeto_detalhado") or "").lower()
        is_fantasma = (
            mun_original.lower() != nome_lower
            and nome_lower in objeto
        )
        if is_fantasma:
            municipio_destino = f"{mun_original} → real: {municipio_nome}"
        else:
            municipio_destino = mun_original or municipio_nome

        # Divergência LOA vs Pago
        has_divergencia = (v_orcado == 0 and v_pago_total > 0) or (v_orcado > 0 and v_pago_total == 0 and v_empenhado > 0)

        # Coletar SEIs
        sei_numeros = []
        am_sei = am.get("sei_numero")
        if am_sei:
            sei_numeros.append(am_sei)
        for p in pays_raw:
            p_sei = p.get("sei_numero")
            if p_sei and p_sei not in sei_numeros:
                sei_numeros.append(p_sei)
            p_proc = p.get("processo_sei")
            if p_proc and p_proc not in sei_numeros:
                sei_numeros.append(p_proc)

        # Observações forenses
        obs_parts = []
        if is_fantasma:
            obs_parts.append(f"Emenda aparece como '{mun_original}' mas texto menciona {municipio_nome}")
            alert_key = "EMENDA_FANTASMA"
            if alert_key not in alertas_set:
                alertas_set.add(alert_key)
                alertas.append({"tipo": alert_key, "descricao": f"Emenda(s) com município oficial diferente mas destino real é {municipio_nome}"})
        if has_divergencia:
            obs_parts.append(f"Divergência: orçado={v_orcado:.2f} vs pago={v_pago_total:.2f}")
            alert_key = "DIVERGENCIA_LOA_PAGO"
            if alert_key not in alertas_set:
                alertas_set.add(alert_key)
                alertas.append({"tipo": alert_key, "descricao": "Divergência entre valor orçado e pago detectada"})

        # Montar pagamentos do dossiê
        dossie_payments = []
        for p in pays_raw:
            # Tentar extrair contrato do objeto
            p_obj = p.get("objeto") or ""
            contrato = None
            ct_match = re.search(r'[Cc](?:ontrato|t)\s*(?:n[°º]?\s*)?([\d/]+)', p_obj)
            if ct_match:
                contrato = ct_match.group(1)

            dossie_payments.append({
                "id": p["id"],
                "data_pagamento": str(p.get("data_pagamento") or ""),
                "credor": p.get("credor"),
                "valor_pago": float(p.get("valor_pago", 0) or 0),
                "num_empenho": p.get("num_empenho"),
                "sei_numero": p.get("sei_numero"),
                "processo_sei": p.get("processo_sei"),
                "contrato_numero": contrato,
                "objeto_pagamento": p.get("objeto"),
                "origem_dado": "amendment_payments"
            })

        emendas_dossie.append({
            "id": aid,
            "amendment_id": aid,
            "ano_exercicio": am.get("ano_exercicio", 0),
            "politician_id": politician_data.get("id"),
            "politician_name": politician_data.get("name"),
            "municipio_destino": municipio_destino,
            "descricao_loa": am.get("objeto_detalhado"),
            "orgao": am.get("orgao"),
            "area_tematica": am.get("area_tematica"),
            "valor_orcado_atual": v_orcado,
            "valor_empenhado": v_empenhado,
            "valor_liquidado": v_liquidado,
            "valor_pago_total": v_pago_total,
            "percent_executado": percent,
            "has_sei": bool(am_sei) or any(p.get("sei_numero") for p in pays_raw),
            "sei_numeros": sei_numeros,
            "emenda_fantasma": is_fantasma,
            "divergencia_loa_pago": has_divergencia,
            "observacoes_forenses": "; ".join(obs_parts) if obs_parts else None,
            "payments": dossie_payments
        })

        total_orcado += v_orcado
        total_pago += v_pago_total
        total_pagamentos += len(pays_raw)

    qtd = len(emendas_dossie)
    pct_media = round((total_pago / total_orcado) if total_orcado > 0 else 0.0, 4)

    return {
        "municipio": municipio_nome,
        "total_emendas_orcadas": total_orcado,
        "total_pago": total_pago,
        "percent_execucao_media": pct_media,
        "qtd_emendas": qtd,
        "qtd_pagamentos": total_pagamentos,
        "alertas": alertas,
        "emendas": emendas_dossie
    }


@router.get("/municipios/dossie", response_model=DossieMunicipalResponse)
async def get_dossie_municipal(
    nome: str = Query(..., description="Nome do município (ex: Senhor do Bonfim)"),
):
    """
    Dossiê Forense Municipal (QI220).
    Retorna todas as emendas e pagamentos vinculados a um município,
    com alertas automáticos e indicadores forenses.
    """
    try:
        supabase = get_supabase()
        result = await build_dossie_municipal(supabase, nome)
        return DossieMunicipalResponse(**result)
    except Exception as e:
        print(f"ERROR in get_dossie_municipal: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/emendas/{amendment_id}/dossie_detalhe", response_model=DossieEmendaItem)
async def get_emenda_dossie_detalhe(
    amendment_id: str,
):
    """
    Detalhe forense de uma emenda específica com pagamentos completos.
    Retorna todas as informações para o painel lateral do frontend.
    """
    try:
        supabase = get_supabase()

        # Buscar emenda com join no político
        am_res = (
            supabase.table("parliamentary_amendments")
            .select("*, politicians!inner(id, name)")
            .eq("id", amendment_id)
            .single()
            .execute()
        )
        am = am_res.data
        if not am:
            raise HTTPException(status_code=404, detail="Emenda não encontrada")

        # Buscar pagamentos
        pay_res = (
            supabase.table("amendment_payments")
            .select("*")
            .eq("amendment_id", amendment_id)
            .order("data_pagamento", desc=True)
            .execute()
        )
        pays = pay_res.data or []
        politician_data = am.get("politicians") or {}

        # Calcular
        v_orcado = float(am.get("valor_orcado_atual", 0) or 0)
        v_empenhado = float(am.get("valor_empenhado", 0) or 0)
        v_liquidado = float(am.get("valor_liquidado", 0) or 0)
        v_pago = sum(float(p.get("valor_pago", 0) or 0) for p in pays)
        percent = round((v_pago / v_orcado) if v_orcado > 0 else 0.0, 4)

        mun_original = (am.get("municipio_original") or "").strip()
        objeto = (am.get("objeto_detalhado") or "").lower()

        sei_numeros = []
        am_sei = am.get("sei_numero")
        if am_sei:
            sei_numeros.append(am_sei)
        for p in pays:
            for fld in ["sei_numero", "processo_sei"]:
                val = p.get(fld)
                if val and val not in sei_numeros:
                    sei_numeros.append(val)

        has_divergencia = (v_orcado == 0 and v_pago > 0)

        # ── Camada Forense QI220 (Extrator de Entidades) ──
        # Tenta pegar do banco primeiro para economizar processamento e garantir dados já auditados
        entidades = am.get("entidades_extraidas")
        
        # Se não houver no banco ou estiver vazio, extrai em tempo real
        if not entidades or not entidades.get("total_entidades"):
            texto_para_extrair = f"{am.get('objeto_detalhado', '')}"
            for p in pays:
                texto_para_extrair += f" {p.get('objeto', '')}"
            entidades = extract_entities_from_text(texto_para_extrair)
        
        # Garante campo total_entidades para o frontend
        if "total_entidades" not in entidades:
            entidades["total_entidades"] = sum(len(v) if isinstance(v, list) else 0 for v in entidades.values())
        alertas_entidades = []
        
        # Alertas Automáticos baseados em entidades
        municipios_citados = entidades.get("municipios_ba", [])
        mun_original_clean = mun_original.replace("-BA", "").replace("-Ba", "").strip()
        
        for mun_citado in municipios_citados:
            if mun_citado.lower() != mun_original_clean.lower() and mun_original_clean.lower() != "estado da bahia":
                alertas_entidades.append({
                    "tipo": "MUNICIPIO_DIVERGENTE_NO_TEXTO",
                    "descricao": f"O texto cita '{mun_citado}', mas o destino oficial é '{mun_original}'."
                })
        
        if entidades.get("contratos") and not (entidades.get("empenhos") or any(p.get("num_empenho") for p in pays)):
            alertas_entidades.append({
                "tipo": "CONTRATO_SEM_EMPENHO",
                "descricao": "Foram identificados contratos no texto, mas não há empenhos formais vinculados."
            })
            
        if entidades.get("notas_fiscais"):
             alertas_entidades.append({
                "tipo": "NF_IDENTIFICADA",
                "descricao": f"Foram encontradas {len(entidades['notas_fiscais'])} Notas Fiscais referenciadas no histórico."
            })

        dossie_payments = []
        for p in pays:
            p_obj = p.get("objeto") or ""
            contrato = None
            ct_match = re.search(r'[Cc](?:ontrato|t)\s*(?:n[°º]?\s*)?([\d/]+)', p_obj)
            if ct_match:
                contrato = ct_match.group(1)
            dossie_payments.append({
                "id": p["id"],
                "data_pagamento": str(p.get("data_pagamento") or ""),
                "credor": p.get("credor"),
                "valor_pago": float(p.get("valor_pago", 0) or 0),
                "num_empenho": p.get("num_empenho"),
                "sei_numero": p.get("sei_numero"),
                "processo_sei": p.get("processo_sei"),
                "contrato_numero": contrato,
                "objeto_pagamento": p.get("objeto"),
                "origem_dado": "amendment_payments"
            })

        return DossieEmendaItem(
            id=amendment_id,
            amendment_id=amendment_id,
            ano_exercicio=am.get("ano_exercicio", 0),
            politician_id=politician_data.get("id"),
            politician_name=politician_data.get("name"),
            municipio_destino=mun_original or "Estado da Bahia",
            descricao_loa=am.get("objeto_detalhado"),
            orgao=am.get("orgao"),
            area_tematica=am.get("area_tematica"),
            valor_orcado_atual=v_orcado,
            valor_empenhado=v_empenhado,
            valor_liquidado=v_liquidado,
            valor_pago_total=v_pago,
            percent_executado=percent,
            has_sei=bool(am_sei) or any(p.get("sei_numero") for p in pays),
            sei_numeros=sei_numeros,
            emenda_fantasma=any(a["tipo"] == "MUNICIPIO_DIVERGENTE_NO_TEXTO" for a in alertas_entidades),
            divergencia_loa_pago=has_divergencia,
            observacoes_forenses=f"Divergência orçado/pago" if has_divergencia else None,
            entidades_extraidas=entidades,
            alertas_entidades=alertas_entidades,
            payments=dossie_payments
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR in get_emenda_dossie_detalhe: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/amendments/sync-cities", response_model=SyncResponse)
async def sync_cities():
    """
    Cadastra na tabela 'cities' os municípios pendentes de emendas 
    e atualiza a FK listada na tabela parliamentary_amendments.
    """
    supabase = get_supabase()

    # 1. Identificar municípios pendentes no DB atual
    # O Supabase DB (PostgREST) não suporta distinct direto fácil sem view/SQL.
    # Vamos buscar todas as com city_id nulo e filtrar usando Python.
    resp = (
        supabase.table("parliamentary_amendments")
        .select("id, municipio_original")
        .is_("beneficiary_city_id", "null")
        .neq("municipio_original", "Estado da Bahia")  # exclui estaduais
        .execute()
    )

    amendments = resp.data or []
    if not amendments:
        return SyncResponse(inserted=0, updated_amendments=0, details="Nenhuma cidade pendente.")

    # Extrai os nomes de cidades únicos
    city_names = set(a.get("municipio_original") for a in amendments if a.get("municipio_original"))

    # Verifica quais já existem na base (caso city_id apenas não tenha sido populado)
    existing_resp = supabase.table("cities").select("id, name, slug").execute()
    existing_cities = existing_resp.data or []
    existing_map_by_name = {c["name"].lower().strip(): c for c in existing_cities}

    new_cities = []
    
    # Prepara inserções para as que realmente NÃO existem
    for cname in city_names:
        clean_name = cname.strip()
        lower_name = clean_name.lower()
        if lower_name not in existing_map_by_name:
            # Gera slug simples: minúsculas, troca espaço por hífen, remove caracteres especiais
            slug = re.sub(r'[^a-z0-9]+', '-', lower_name).strip('-')
            new_cities.append({
                "name": clean_name,
                "state": "BA", # Assumido Bahia para a base Bobô (ajustar no futuro se nac.)
                "slug": slug,
                "population": None,
                "ibge_code": None
            })

    # Insere as novas cidades
    inserted_count = 0
    if new_cities:
        insert_resp = supabase.table("cities").insert(new_cities).execute()
        inserted_data = insert_resp.data or []
        for c in inserted_data:
            existing_map_by_name[c["name"].lower()] = c  # Adiciona ao mapa local
        inserted_count = len(inserted_data)

    # 3. Atualizar os IDs nas emendas pendentes
    updated_count = 0
    records_to_update = []
    
    for a in amendments:
        name = a.get("municipio_original")
        if not name:
            continue
        mapped_city = existing_map_by_name.get(name.lower().strip())
        if mapped_city:
            records_to_update.append({
                "id": a["id"],
                "beneficiary_city_id": mapped_city["id"]
            })

    # Executa o upsert/update em lote nas emendas
    # Limitamos chunks de 100
    CHUNK_SIZE = 100
    for i in range(0, len(records_to_update), CHUNK_SIZE):
        chunk = records_to_update[i : i + CHUNK_SIZE]
        # Aqui, como `id` é primary key e passamos update, precisamos
        # de fato enviar isso pelo upsert
        res = supabase.table("parliamentary_amendments").upsert(chunk).execute()
        updated_count += len(res.data or [])


@router.get("/cities/{city_id}/amendments_received", response_model=CityAmendmentsReceivedResponse)
async def list_city_amendments(
    city_id: UUID,
    year: Optional[int] = Query(None, description="Filtrar por ano de exercício"),
    limit: int = Query(200, le=500),
    offset: int = Query(0),
):
    """
    Lista emendas parlamentares destinadas a uma cidade (Radar da Cidade).
    Retorna totais consolidados, distribuição por área e ranking de políticos doadores.
    """
    supabase = get_supabase()
    cid = str(city_id)

    # ── Verifica se a cidade existe ──────────────────────────────────────────
    city_chk = supabase.table("cities").select("id").eq("id", cid).execute()
    if not city_chk.data:
        raise HTTPException(status_code=404, detail="Cidade não encontrada")

    # ── Query base usando `beneficiary_city_id` ──────────────────────────────
    query = (
        supabase.table("parliamentary_amendments")
        .select("*")
        .eq("beneficiary_city_id", cid)
    )

    if year:
        query = query.eq("ano_exercicio", year)

    # Puxar todos os registros de uma vez sem paginação na base
    # (a paginação pode quebrar os somatórios agregados gerais).
    # Vamos limitar a 5000 para segurança no Supabase.
    result = query.limit(5000).execute()
    rows = result.data or []

    # ── Agregações Globais ───────────────────────────────────────────────────
    total_orcado = sum(r.get("valor_orcado_atual", 0) or 0 for r in rows)
    total_empenhado = sum(r.get("valor_empenhado", 0) or 0 for r in rows)
    total_pago = sum(r.get("valor_pago", 0) or 0 for r in rows)
    total_registros = len(rows)

    # ── Por área ─────────────────────────────────────────────────────────────
    area_map: dict = {}
    for r in rows:
        ar = r.get("area_tematica") or "Outros"
        if ar not in area_map:
            area_map[ar] = {"qtd": 0, "orcado": 0.0, "pago": 0.0}
        area_map[ar]["qtd"] += 1
        area_map[ar]["orcado"] += r.get("valor_orcado_atual", 0) or 0
        area_map[ar]["pago"] += r.get("valor_pago", 0) or 0
    
    por_area = [
        AreaSummary(area=ar, **vals)
        for ar, vals in sorted(area_map.items(), key=lambda x: -x[1]["orcado"])
    ]

    # ── Por Político ─────────────────────────────────────────────────────────
    politicos_ids = list(set([r["politician_id"] for r in rows if r.get("politician_id")]))
    pol_map = {}
    if politicos_ids:
        # Busca detalhes dos políticos para o card
        pol_resp = supabase.table("politicians").select("id, name, slug, partido, foto_url").in_("id", politicos_ids).execute()
        pol_map = {p["id"]: p for p in (pol_resp.data or [])}

    pol_stats = {}
    for r in rows:
        pid = r.get("politician_id")
        if not pid:
            continue
            
        if pid not in pol_stats:
            p_info = pol_map.get(pid, {})
            pol_stats[pid] = {
                "politician_id": pid,
                "politician_name": p_info.get("name", "Desconhecido"),
                "politician_slug": p_info.get("slug"),
                "partido": p_info.get("partido"),
                "foto_url": p_info.get("foto_url"),
                "qtd": 0,
                "orcado": 0.0,
                "pago": 0.0
            }
        
        pol_stats[pid]["qtd"] += 1
        pol_stats[pid]["orcado"] += r.get("valor_orcado_atual", 0) or 0
        pol_stats[pid]["pago"] += r.get("valor_pago", 0) or 0

    por_politico = [
        PoliticianAmendmentSummary(
            politician_id=st["politician_id"],
            politician_name=st["politician_name"],
            politician_slug=st["politician_slug"],
            partido=st["partido"],
            foto_url=st["foto_url"],
            qtd_emendas=st["qtd"],
            total_orcado=st["orcado"],
            total_pago=st["pago"]
        ) for st in sorted(pol_stats.values(), key=lambda x: -x["orcado"])
    ]

    # A paginação só se aplica explicitamente para a listagem discriminada `emendas` se desejado,
    # caso contrário devolvemos todas ou um limite pro frontend lidar.
    # Exemplo: Devolver as top limit.
    emendas = [AmendmentItem(**r) for r in sorted(rows, key=lambda x: -(x.get("valor_orcado_atual", 0) or 0))][:limit]

    return CityAmendmentsReceivedResponse(
        city_id=cid,
        total_registros=total_registros,
        total_orcado=total_orcado,
        total_empenhado=total_empenhado,
        total_pago=total_pago,
        por_area=por_area,
        por_politico=por_politico,
        emendas=emendas
    )
@router.get("/amendments/admin/summary", response_model=AdminAmendmentsSummary)
async def admin_amendments_summary():
    """
    Retorna o resumo de emendas agrupado por cidade para a aba de Cidades.
    """
    supabase = get_supabase()
    
    resp = supabase.table("parliamentary_amendments").select("id, beneficiary_city_id, municipio_original, valor_orcado_atual, valor_pago").execute()
    amendments = resp.data or []
    
    cities_resp = supabase.table("cities").select("id, name, slug").execute()
    cities_map = {c["id"]: c for c in (cities_resp.data or [])}

    vinculadas = set()
    pendentes_nomes = set()
    cidade_stats = {}
    
    for a in amendments:
        cid = a.get("beneficiary_city_id")
        nome_orig = a.get("municipio_original") or "Desconhecido"
        orcado = a.get("valor_orcado_atual", 0) or 0
        pago = a.get("valor_pago", 0) or 0
        
        if cid:
            vinculadas.add(cid)
            key = cid
            cname = cities_map.get(cid, {}).get("name", nome_orig)
            slug = cities_map.get(cid, {}).get("slug", "")
        else:
            if nome_orig != "Estado da Bahia":
                pendentes_nomes.add(nome_orig)
            key = f"pendente_{nome_orig}"
            cname = nome_orig
            slug = None
            
        if key not in cidade_stats:
            cidade_stats[key] = {
                "city_id": cid,
                "city_name": cname,
                "city_slug": slug,
                "qtd": 0,
                "orcado": 0.0,
                "pago": 0.0
            }
        
        cidade_stats[key]["qtd"] += 1
        cidade_stats[key]["orcado"] += orcado
        cidade_stats[key]["pago"] += pago

    por_cidade = [
        CityAmendmentSummary(
            city_id=st["city_id"],
            city_name=st["city_name"],
            city_slug=st["city_slug"],
            qtd_emendas=st["qtd"],
            total_orcado=st["orcado"],
            total_pago=st["pago"]
        )
        for st in cidade_stats.values()
    ]
    por_cidade.sort(key=lambda x: x.total_orcado, reverse=True)

    return AdminAmendmentsSummary(
        total_emendas=len(amendments),
        cidades_vinculadas=len(vinculadas),
        cidades_pendentes=len(pendentes_nomes),
        por_cidade=por_cidade
    )
