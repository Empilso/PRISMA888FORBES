"""
Script de Sincronização Profunda — Enriquecimento de Emendas do Deputado Bobô.
Versão: Processamento local + relatório de auditoria.

Estratégia:
  1. Processa os CSVs localmente
  2. Gera relatório de auditoria completo
  3. Exporta dados processados para JSON em /tmp/prisma888_audit_bobo/
  4. A etapa de escrita no Supabase é separada (--execute)
"""

import os
import sys
import re
import csv
import json
import pandas as pd
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

# ── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
PROJECT_DIR = BACKEND_DIR.parent
DATA_DIR = PROJECT_DIR / "IBGE" / "EMENDAS DEPUTADOS"
OUTPUT_DIR = Path("/tmp/prisma888_audit_bobo")

CSV_PAGAMENTOS = DATA_DIR / "VW_PAINEL_EMENDAS_PARLAMENTARES_PAGAMENTOS.csv"
CSV_DESPESAS = DATA_DIR / "VW_PAINEL_EMENDAS_PARLAMENTARES_DESPESAS.csv"
CSV_LIQUIDACAO = DATA_DIR / "VW_PAINEL_EMENDAS_PARLAMENTARES_LIQUIDACAO_ORCAMENTO.csv"
CSV_CENTRAL = DATA_DIR / "VW_PAINEL_EMENDAS_PARLAMENTARES_CENTRALIZACAO_DESCENTRALIZACAO.csv"
CSV_SEI = DATA_DIR / "VW_PROCESSO_SEI.csv"
CSV_LOA = DATA_DIR / "BOBO_LOA_2022_2026_FINAL.csv"

# ── Config ───────────────────────────────────────────────────────────────────
BOBO_POLITICIAN_ID = "fe0fce5b-cd46-48e2-8277-5a89c369fe31"
BOBO_CODE = "500070"  # Código da emenda do Bobô no sistema LOA/BA
SEI_REGEX = re.compile(r"SEI[^\d]*(\d{3}\.\d{4}\.\d{4}\.\d{7}-\d{2})", re.IGNORECASE)


# ── Helpers ───────────────────────────────────────────────────────────────────

def normalize_money(val) -> float:
    if pd.isna(val) or str(val).strip() == "":
        return 0.0
    s = str(val).strip().replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return 0.0


def extract_sei(text: str) -> str | None:
    if pd.isna(text) or not text:
        return None
    match = SEI_REGEX.search(str(text))
    return match.group(1) if match else None


def safe_read_csv(path, **kwargs):
    """Lê CSV com tratamento de erro."""
    defaults = {"sep": ";", "encoding": "utf-8", "dtype": str,
                "on_bad_lines": "skip", "quoting": csv.QUOTE_MINIMAL}
    defaults.update(kwargs)
    df = pd.read_csv(path, **defaults)
    df.columns = [c.strip().replace('"', '').replace('\ufeff', '') for c in df.columns]
    return df


# ── Processamento Principal ──────────────────────────────────────────────────

def run_audit():
    print("🚀 AUDITORIA PROFUNDA — Emendas do Deputado Bobô")
    print("═" * 60)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # ─── 1. Processos SEI ────────────────────────────────────────────────────
    sei_map = {}
    if CSV_SEI.exists():
        print(f"\n📄 [1/5] Processos SEI ({CSV_SEI.name})")
        df_sei = safe_read_csv(CSV_SEI)
        print(f"   Colunas: {df_sei.columns.tolist()}")
        for _, row in df_sei.iterrows():
            emp = str(row.get("num_empenho_orcamento", "")).strip()
            proc = str(row.get("num_processo_sist_elet_info", "")).strip()
            if emp and proc and emp != "nan":
                sei_map[emp] = proc
        print(f"   ✅ {len(sei_map)} mapeamentos empenho→processo")

    # ─── 2. Pagamentos ──────────────────────────────────────────────────────
    print(f"\n📄 [2/5] Pagamentos ({CSV_PAGAMENTOS.name})")
    df_pag = safe_read_csv(CSV_PAGAMENTOS)
    print(f"   Colunas: {df_pag.columns.tolist()}")
    print(f"   Total geral: {len(df_pag)} linhas")

    # Filtro Duplo
    mask_bob = df_pag["Objeto"].str.contains("Bob", case=False, na=False)
    mask_cod = df_pag["num_codigo_exec"].astype(str).str.contains(BOBO_CODE, na=False)
    df_bobo_pag = df_pag[mask_bob | mask_cod].copy()
    print(f"   🎯 Pagamentos Bobô: {len(df_bobo_pag)} (nome: {mask_bob.sum()}, código: {mask_cod.sum()})")

    # Extração de SEI
    sei_extracted = 0
    sei_from_map = 0
    pagamentos_detail = []

    for _, row in df_bobo_pag.iterrows():
        obj = str(row.get("Objeto", ""))
        val = normalize_money(row.get("val_pagto_nob", 0))
        data = str(row.get("Data do Pagamento", "")).strip()
        credor = str(row.get("RazaoSocialCredorPagamento", "")).strip()
        emp = str(row.get("num_empenho", "")).strip()
        cod = str(row.get("num_codigo_exec", "")).strip()
        efetivado = str(row.get("Pagamento_Efetivado", "")).strip()

        sei = extract_sei(obj)
        if sei:
            sei_extracted += 1

        proc = sei_map.get(emp)
        if proc:
            sei_from_map += 1

        pagamentos_detail.append({
            "credor": credor,
            "valor_pago": val,
            "data_pagamento": data,
            "efetivado": efetivado,
            "sei_extraido": sei,
            "processo_sei_mapa": proc,
            "num_empenho": emp,
            "num_codigo_exec": cod,
            "objeto_resumo": obj[:120],
        })

    total_pago_csv = sum(p["valor_pago"] for p in pagamentos_detail)

    # ─── 3. Despesas ─────────────────────────────────────────────────────────
    print(f"\n📄 [3/5] Despesas ({CSV_DESPESAS.name})")
    if CSV_DESPESAS.exists():
        df_desp = safe_read_csv(CSV_DESPESAS)
        print(f"   Colunas: {df_desp.columns.tolist()}")
        print(f"   Total geral: {len(df_desp)} linhas")
        # Filtrar por código do Bobô
        if "num_codigo" in df_desp.columns:
            df_bobo_desp = df_desp[df_desp["num_codigo"].astype(str).str.contains(BOBO_CODE, na=False)]
            print(f"   🎯 Despesas Bobô: {len(df_bobo_desp)}")
        else:
            # Tenta outro campo
            for col in df_desp.columns:
                if "codigo" in col.lower():
                    df_bobo_desp = df_desp[df_desp[col].astype(str).str.contains(BOBO_CODE, na=False)]
                    print(f"   🎯 Despesas Bobô (via {col}): {len(df_bobo_desp)}")
                    break
    else:
        print("   ⚠️ Arquivo não encontrado")

    # ─── 4. Liquidação/Orçamento ─────────────────────────────────────────────
    print(f"\n📄 [4/5] Liquidação/Orçamento ({CSV_LIQUIDACAO.name})")
    if CSV_LIQUIDACAO.exists():
        df_liq = safe_read_csv(CSV_LIQUIDACAO)
        print(f"   Colunas: {df_liq.columns.tolist()}")
        print(f"   Total geral: {len(df_liq)} linhas")
    else:
        print("   ⚠️ Arquivo não encontrado")

    # ─── 5. Centralização/Descentralização ───────────────────────────────────
    print(f"\n📄 [5/5] Centralização/Descentralização ({CSV_CENTRAL.name})")
    if CSV_CENTRAL.exists():
        df_cent = safe_read_csv(CSV_CENTRAL)
        print(f"   Colunas: {df_cent.columns.tolist()}")
        print(f"   Total geral: {len(df_cent)} linhas")
        # Filtrar por código do Bobô
        for col in df_cent.columns:
            if "codigo" in col.lower() or "num_codigo" in col.lower():
                df_bobo_cent = df_cent[df_cent[col].astype(str).str.contains(BOBO_CODE, na=False)]
                print(f"   🎯 Registros Bobô (via {col}): {len(df_bobo_cent)}")
                break
    else:
        print("   ⚠️ Arquivo não encontrado")

    # ─── 6. LOA Original (para comparação) ──────────────────────────────────
    print(f"\n📄 [Referência] LOA Original ({CSV_LOA.name})")
    if CSV_LOA.exists():
        df_loa = safe_read_csv(CSV_LOA)
        print(f"   Colunas: {df_loa.columns.tolist()}")
        print(f"   Total linhas: {len(df_loa)}")

        # Totais LOA
        for col in ["Orçado Atual", "Empenhado", "Pago", "Liquidado"]:
            if col in df_loa.columns:
                total = sum(normalize_money(v) for v in df_loa[col])
                print(f"   LOA {col}: R$ {total:,.2f}")

    # ─── RELATÓRIO FINAL ─────────────────────────────────────────────────────
    sei_pct = (sei_extracted / len(df_bobo_pag) * 100) if len(df_bobo_pag) > 0 else 0
    proc_pct = (sei_from_map / len(df_bobo_pag) * 100) if len(df_bobo_pag) > 0 else 0

    print("\n" + "═" * 60)
    print("📋 RELATÓRIO DE AUDITORIA COMPLETO")
    print("═" * 60)
    print(f"   Pagamentos do Bobô no CSV:    {len(df_bobo_pag)}")
    print(f"   Total Pago (CSV Pagamentos):  R$ {total_pago_csv:,.2f}")
    print(f"   SEIs extraídos do Objeto:     {sei_extracted} ({sei_pct:.1f}%)")
    print(f"   Processos SEI via empenho:    {sei_from_map} ({proc_pct:.1f}%)")
    print(f"   Total de mapeamentos SEI:     {len(sei_map)}")
    print("═" * 60)

    # Exportar dados processados
    output_file = OUTPUT_DIR / "pagamentos_bobo_processados.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(pagamentos_detail, f, ensure_ascii=False, indent=2, default=str)
    print(f"\n💾 Dados exportados para: {output_file}")

    # Exportar relatório
    report_file = OUTPUT_DIR / "relatorio_auditoria.txt"
    with open(report_file, "w", encoding="utf-8") as f:
        f.write(f"AUDITORIA PROFUNDA — Emendas do Deputado Bobô\n")
        f.write(f"Data: {datetime.now().isoformat()}\n")
        f.write(f"{'='*60}\n")
        f.write(f"Pagamentos encontrados: {len(df_bobo_pag)}\n")
        f.write(f"Total Pago (CSV): R$ {total_pago_csv:,.2f}\n")
        f.write(f"SEIs extraídos: {sei_extracted} ({sei_pct:.1f}%)\n")
        f.write(f"Processos SEI via empenho: {sei_from_map} ({proc_pct:.1f}%)\n")
        f.write(f"\nDetalhamento de pagamentos com SEI:\n")
        for p in pagamentos_detail:
            if p["sei_extraido"] or p["processo_sei_mapa"]:
                f.write(f"  SEI: {p['sei_extraido'] or '—'} | Processo: {p['processo_sei_mapa'] or '—'} | Credor: {p['credor'][:40]} | R$ {p['valor_pago']:,.2f}\n")
    print(f"💾 Relatório exportado para: {report_file}")

    print("\n✅ Auditoria concluída. Dados prontos para sincronização com o banco.")


if __name__ == "__main__":
    run_audit()
