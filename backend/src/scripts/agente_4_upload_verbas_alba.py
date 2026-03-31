"""
╔══════════════════════════════════════════════════════════════════════╗
║  AGENTE 4 — UPLOAD VERBAS GABINETE ALBA                             ║
║  Crew ALBA Verbas | Prisma 888                                       ║
╠══════════════════════════════════════════════════════════════════════╣
║  Função: Apaga e reinsere TODOS os registros da tabela               ║
║          despesas_gabinete a partir do arquivo OURO (JSON).          ║
║                                                                      ║
║  Uso:                                                                ║
║    python agente_4_upload_verbas_alba.py --arquivo dados/alba_ouro.json ║
║    python agente_4_upload_verbas_alba.py --arquivo dados/alba_ouro.json --dry-run ║
╚══════════════════════════════════════════════════════════════════════╝

Campos EXCLUÍDOS do payload (banco gera automaticamente):
  - valor_liquido  → GENERATED: valor_detalhe - valor_glosado
  - criado_em      → DEFAULT: now()

Schema alvo: public.despesas_gabinete
PK: prisma_id (SHA256: {fonte_portal}:{num_processo}:{competencia_date})
"""

import os
import json
import hashlib
import argparse
import logging
from datetime import datetime, date
from typing import Optional
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# ─────────────────────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────────────────────
BATCH_SIZE      = 500          # registros por lote de insert
FONTE_PORTAL    = "al_ba_gov_br"
ESFERA          = "estadual"
UF              = "BA"
NIVEL_QUALIDADE = "ouro"
QUALIDADE_SCORE = 1.0

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S"
)
log = logging.getLogger("agente_4")

# ─────────────────────────────────────────────────────────────────────────────
# SUPABASE CLIENT
# ─────────────────────────────────────────────────────────────────────────────
def get_supabase() -> Client:
    url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("❌ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios no .env")
    return create_client(url, key)

# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────
def gerar_prisma_id(fonte_portal: str, num_processo: str, competencia_date: str) -> str:
    """
    Hash SHA256 canônico: {fonte_portal}:{num_processo}:{competencia_date}
    Garante idempotência — mesmo arquivo rodado duas vezes não duplica.
    """
    raw = f"{fonte_portal}:{num_processo}:{competencia_date}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def limpar_valor(val) -> float:
    """Converte string monetária brasileira para float."""
    if val is None or val == "":
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    val = str(val).strip()
    val = val.replace("R$", "").replace(" ", "")
    # Formato BR: 1.234,56 → 1234.56
    if "," in val and "." in val:
        val = val.replace(".", "").replace(",", ".")
    elif "," in val:
        val = val.replace(",", ".")
    try:
        return float(val)
    except (ValueError, TypeError):
        return 0.0


def parse_data(val) -> Optional[str]:
    """Normaliza datas para formato ISO YYYY-MM-DD."""
    if not val:
        return None
    if isinstance(val, (datetime, date)):
        return str(val)[:10]
    val = str(val).strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%Y/%m/%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(val, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def extrair_ano_mes(competencia_date: Optional[str]):
    """Extrai ano e mês de uma string YYYY-MM-DD."""
    if not competencia_date:
        return None, None
    try:
        d = datetime.strptime(competencia_date[:10], "%Y-%m-%d")
        return d.year, d.month
    except ValueError:
        return None, None


def safe_str(val, max_len: int = None) -> Optional[str]:
    if val is None:
        return None
    s = str(val).strip()
    if s in ("", "nan", "None", "null"):
        return None
    return s[:max_len] if max_len else s


# ─────────────────────────────────────────────────────────────────────────────
# MAPEAMENTO: registro do JSON → payload da tabela
# ─────────────────────────────────────────────────────────────────────────────
def mapear_registro(rec: dict) -> Optional[dict]:
    """
    Recebe 1 registro do arquivo OURO e retorna o payload pronto para o banco.
    Campos EXCLUÍDOS: valor_liquido (GENERATED), criado_em (DEFAULT now()).

    Chaves aceitas no JSON (flexível — suporta variações de nome):
      num_processo      → num_processo
      num_nf            → num_nf / numero_nf / nf
      competencia       → competencia_date / data_competencia / mes_ano / data
      nome_deputado_raw → nome_deputado / deputado / parlamentar_nome
      partido_raw       → partido / sigla_partido
      cnpj_fornecedor   → cnpj / cnpj_fornecedor
      cpf_fornecedor    → cpf / cpf_fornecedor
      nome_fornecedor   → fornecedor / razao_social / nome_fornecedor
      valor             → valor / vl_bruto / valor_bruto
      valor_detalhe     → valor_detalhe / valor_detalhado / vl_detalhe
      valor_glosado     → valor_glosado / vl_glosado / glosa
      categoria_portal  → categoria / tipo_despesa / categoria_portal
      categoria_slug    → categoria_slug
      categoria_detalhe → categoria_detalhe / descricao / historico
      tipo_documento    → tipo_documento / tipo_doc
      url_documento     → url_documento / url_doc / link_documento
      url_transparencia → url_transparencia / link_transparencia
      parlamentar_id    → parlamentar_id / prisma_parlamentar_id
      metadados         → metadados / metadata / extra
    """

    # ── Num processo (obrigatório para gerar PK) ──────────────────────────────
    num_processo = safe_str(
        rec.get("num_processo") or rec.get("numero_processo") or rec.get("processo") or rec.get("id_original")
    )
    if not num_processo:
        log.warning(f"⚠️  Registro sem num_processo — pulando: {str(rec)[:80]}")
        return None

    # ── Competência (data mês/ano) ────────────────────────────────────────────
    comp_raw = (
        rec.get("competencia_date") or rec.get("competencia") or
        rec.get("data_competencia") or rec.get("mes_ano") or rec.get("data")
    )
    competencia_date = parse_data(comp_raw)
    competencia_ano, competencia_mes = extrair_ano_mes(competencia_date)

    # ── PK ────────────────────────────────────────────────────────────────────
    prisma_id = rec.get("prisma_id") or gerar_prisma_id(
        FONTE_PORTAL, num_processo, competencia_date or ""
    )

    # ── Parlamentar ───────────────────────────────────────────────────────────
    nome_deputado_raw = safe_str(
        rec.get("nome_deputado_raw") or rec.get("nome_deputado") or
        rec.get("deputado") or rec.get("parlamentar_nome") or rec.get("nome_parlamentar")
    )
    partido_raw = safe_str(
        rec.get("partido_raw") or rec.get("partido") or rec.get("sigla_partido")
    )
    parlamentar_id = safe_str(
        rec.get("parlamentar_id") or rec.get("prisma_parlamentar_id")
    )

    # ── NF ────────────────────────────────────────────────────────────────────
    num_nf = safe_str(rec.get("num_nf") or rec.get("numero_nf") or rec.get("nf"))
    num_nf_normalizado = safe_str(rec.get("num_nf_normalizado"))
    if num_nf and not num_nf_normalizado:
        num_nf_normalizado = num_nf.lstrip("0") or num_nf

    # ── Fornecedor ────────────────────────────────────────────────────────────
    cnpj_fornecedor = safe_str(rec.get("cnpj_fornecedor") or rec.get("cnpj"))
    cpf_fornecedor  = safe_str(rec.get("cpf_fornecedor") or rec.get("cpf"))
    nome_fornecedor = safe_str(
        rec.get("nome_fornecedor") or rec.get("fornecedor") or
        rec.get("razao_social") or rec.get("nome_empresa")
    )

    # ── Valores ───────────────────────────────────────────────────────────────
    valor         = limpar_valor(rec.get("valor") or rec.get("vl_bruto") or rec.get("valor_bruto"))
    valor_detalhe = limpar_valor(rec.get("valor_detalhe") or rec.get("valor_detalhado") or rec.get("vl_detalhe") or valor)
    valor_glosado = limpar_valor(rec.get("valor_glosado") or rec.get("vl_glosado") or rec.get("glosa"))
    # NOTA: valor_liquido NÃO é incluído → banco calcula: valor_detalhe - valor_glosado

    # ── Categorias ────────────────────────────────────────────────────────────
    categoria_portal  = safe_str(rec.get("categoria_portal") or rec.get("categoria") or rec.get("tipo_despesa"))
    categoria_slug    = safe_str(rec.get("categoria_slug"))
    categoria_detalhe = safe_str(rec.get("categoria_detalhe") or rec.get("descricao") or rec.get("historico"))
    tipo_documento    = safe_str(rec.get("tipo_documento") or rec.get("tipo_doc"))

    # ── URLs ──────────────────────────────────────────────────────────────────
    url_documento    = safe_str(rec.get("url_documento") or rec.get("url_doc") or rec.get("link_documento"))
    url_transparencia = safe_str(rec.get("url_transparencia") or rec.get("link_transparencia"))

    # ── Metadados extras (jsonb) ───────────────────────────────────────────────
    metadados_raw = rec.get("metadados") or rec.get("metadata") or rec.get("extra") or {}
    if isinstance(metadados_raw, str):
        try:
            metadados_raw = json.loads(metadados_raw)
        except json.JSONDecodeError:
            metadados_raw = {"raw": metadados_raw}

    # ── Timestamps ────────────────────────────────────────────────────────────
    coletado_em = safe_str(rec.get("coletado_em") or rec.get("data_coleta"))
    processado_em = datetime.utcnow().isoformat()
    # criado_em NÃO é incluído → DEFAULT now() do banco

    # ── Payload final ─────────────────────────────────────────────────────────
    return {
        "prisma_id":           prisma_id,
        "parlamentar_id":      parlamentar_id,
        "fonte_portal":        FONTE_PORTAL,
        "esfera":              ESFERA,
        "uf":                  UF,
        "nome_deputado_raw":   nome_deputado_raw,
        "partido_raw":         partido_raw,
        "competencia_date":    competencia_date,
        "competencia_ano":     competencia_ano,
        "competencia_mes":     competencia_mes,
        "num_processo":        num_processo,
        "num_nf":              num_nf,
        "num_nf_normalizado":  num_nf_normalizado,
        "tipo_documento":      tipo_documento,
        "cnpj_fornecedor":     cnpj_fornecedor,
        "cpf_fornecedor":      cpf_fornecedor,
        "nome_fornecedor":     nome_fornecedor,
        "valor":               valor,
        "valor_detalhe":       valor_detalhe,
        "valor_glosado":       valor_glosado,
        # valor_liquido → OMITIDO (coluna GENERATED)
        "categoria_portal":    categoria_portal,
        "categoria_slug":      categoria_slug,
        "categoria_detalhe":   categoria_detalhe,
        "url_documento":       url_documento,
        "url_transparencia":   url_transparencia,
        "nivel_qualidade":     NIVEL_QUALIDADE,
        "qualidade_score":     QUALIDADE_SCORE,
        "metadados":           metadados_raw,
        "coletado_em":         coletado_em,
        "processado_em":       processado_em,
        # criado_em → OMITIDO (DEFAULT now())
    }


# ─────────────────────────────────────────────────────────────────────────────
# FASE 1: APAGAR TUDO (fonte_portal = al_ba_gov_br)
# ─────────────────────────────────────────────────────────────────────────────
def apagar_registros_alba(supabase: Client, dry_run: bool = False):
    log.info("🗑️  FASE 1 — Apagando registros anteriores da ALBA...")
    if dry_run:
        log.info("   [DRY-RUN] Nenhuma deleção executada.")
        return

    # Deleta em lotes para evitar timeout em tabelas grandes
    total_deletado = 0
    while True:
        res = (
            supabase.table("despesas_gabinete")
            .delete()
            .eq("fonte_portal", FONTE_PORTAL)
            .limit(1000)
            .execute()
        )
        deletados = len(res.data) if res.data else 0
        total_deletado += deletados
        if deletados == 0:
            break
        log.info(f"   🗑️  {total_deletado} registros deletados até agora...")

    log.info(f"   ✅ Deleção concluída. Total removido: {total_deletado} registros.")


# ─────────────────────────────────────────────────────────────────────────────
# FASE 2: CARREGAR E VALIDAR JSON
# ─────────────────────────────────────────────────────────────────────────────
def carregar_arquivo(caminho: str) -> list:
    log.info(f"📂 FASE 2 — Carregando arquivo: {caminho}")
    if not os.path.exists(caminho):
        raise FileNotFoundError(f"Arquivo não encontrado: {caminho}")

    with open(caminho, "r", encoding="utf-8") as f:
        dados = json.load(f)

    if isinstance(dados, dict):
        # Suporta { "registros": [...] } ou { "data": [...] }
        dados = dados.get("registros") or dados.get("data") or dados.get("despesas") or list(dados.values())[0]

    if not isinstance(dados, list):
        raise ValueError("Formato inválido: o JSON deve conter uma lista de registros.")

    log.info(f"   ✅ {len(dados):,} registros carregados.")
    return dados


# ─────────────────────────────────────────────────────────────────────────────
# FASE 3: MAPEAR + INSERIR EM LOTES
# ─────────────────────────────────────────────────────────────────────────────
def inserir_em_lotes(supabase: Client, registros: list, dry_run: bool = False):
    log.info(f"🚀 FASE 3 — Mapeando e inserindo {len(registros):,} registros em lotes de {BATCH_SIZE}...")

    payloads = []
    erros_mapeamento = 0

    for rec in registros:
        payload = mapear_registro(rec)
        if payload:
            payloads.append(payload)
        else:
            erros_mapeamento += 1

    log.info(f"   📊 Mapeados: {len(payloads):,} | Ignorados: {erros_mapeamento}")

    if dry_run:
        log.info("   [DRY-RUN] Nenhum insert executado.")
        if payloads:
            log.info(f"   📋 Exemplo do 1º payload:\n{json.dumps(payloads[0], indent=2, default=str, ensure_ascii=False)}")
        return 0, erros_mapeamento

    total_inserido = 0
    total_erros    = 0
    lote_num       = 0

    for i in range(0, len(payloads), BATCH_SIZE):
        lote = payloads[i : i + BATCH_SIZE]
        lote_num += 1
        try:
            res = (
                supabase.table("despesas_gabinete")
                .upsert(lote, on_conflict="prisma_id")
                .execute()
            )
            inseridos = len(res.data) if res.data else len(lote)
            total_inserido += inseridos
            log.info(f"   ✅ Lote {lote_num}: +{inseridos} registros | Total: {total_inserido:,}")
        except Exception as e:
            total_erros += len(lote)
            log.error(f"   ❌ Lote {lote_num} falhou: {e}")
            # Tenta registro por registro para salvar o máximo possível
            for rec in lote:
                try:
                    supabase.table("despesas_gabinete").upsert(rec, on_conflict="prisma_id").execute()
                    total_inserido += 1
                except Exception as e2:
                    log.error(f"      ↳ Registro {rec.get('prisma_id', '?')[:12]}... falhou: {e2}")

    return total_inserido, erros_mapeamento


# ─────────────────────────────────────────────────────────────────────────────
# FASE 4: RELATÓRIO FINAL
# ─────────────────────────────────────────────────────────────────────────────
def relatorio_final(supabase: Client, total_inserido: int, total_erros: int, inicio: datetime):
    duracao = (datetime.utcnow() - inicio).total_seconds()

    # Contagem real no banco
    try:
        res = (
            supabase.table("despesas_gabinete")
            .select("prisma_id", count="exact")
            .eq("fonte_portal", FONTE_PORTAL)
            .execute()
        )
        total_banco = res.count or "N/A"
    except Exception:
        total_banco = "N/A"

    log.info("═" * 60)
    log.info("  📊 RELATÓRIO FINAL — AGENTE 4 ALBA VERBAS")
    log.info("═" * 60)
    log.info(f"  ✅ Inseridos:       {total_inserido:,}")
    log.info(f"  ⚠️  Ignorados:       {total_erros:,}")
    log.info(f"  🗄️  Total no banco:  {total_banco:,}")
    log.info(f"  ⏱️  Duração:         {duracao:.1f}s")
    log.info("═" * 60)


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Agente 4 — Upload Verbas Gabinete ALBA → despesas_gabinete"
    )
    parser.add_argument(
        "--arquivo", "-a",
        required=True,
        help="Caminho para o arquivo JSON OURO (ex: dados/alba_2015_ouro_aguia_v2.json)"
    )
    parser.add_argument(
        "--dry-run", "-d",
        action="store_true",
        help="Simula o processo sem gravar no banco. Mostra 1 exemplo de payload."
    )
    args = parser.parse_args()

    inicio = datetime.utcnow()

    log.info("╔══════════════════════════════════════════════╗")
    log.info("║  AGENTE 4 — UPLOAD VERBAS GABINETE ALBA     ║")
    log.info(f"║  Arquivo : {args.arquivo[:38]:<38}║")
    log.info(f"║  Modo    : {'DRY-RUN ⚠️ ' if args.dry_run else 'PRODUÇÃO 🚀':<38}║")
    log.info("╚══════════════════════════════════════════════╝")

    supabase = get_supabase()

    # Fase 1 — Apagar
    apagar_registros_alba(supabase, dry_run=args.dry_run)

    # Fase 2 — Carregar
    registros = carregar_arquivo(args.arquivo)

    # Fase 3 — Inserir
    total_inserido, total_erros = inserir_em_lotes(supabase, registros, dry_run=args.dry_run)

    # Fase 4 — Relatório
    relatorio_final(supabase, total_inserido, total_erros, inicio)


if __name__ == "__main__":
    main()
