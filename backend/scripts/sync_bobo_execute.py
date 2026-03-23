"""
Execução da Sincronização Profunda — Emendas do Deputado Bobô.
5 etapas na ordem aprovada pelo usuário.
"""

import os
import sys
import re
import csv
import json
import hashlib
import pandas as pd
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

# ── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
PROJECT_DIR = BACKEND_DIR.parent
DATA_DIR = PROJECT_DIR / "IBGE" / "EMENDAS DEPUTADOS"
OUTPUT_DIR = Path("/tmp/prisma888_audit_bobo")

CSV_PAGAMENTOS = DATA_DIR / "VW_PAINEL_EMENDAS_PARLAMENTARES_PAGAMENTOS.csv"
CSV_DESPESAS = DATA_DIR / "VW_PAINEL_EMENDAS_PARLAMENTARES_DESPESAS.csv"
CSV_SEI = DATA_DIR / "VW_PROCESSO_SEI.csv"

# ── Config ───────────────────────────────────────────────────────────────────
load_dotenv(BACKEND_DIR / ".env")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontradas no .env")
    sys.exit(1)

BOBO_POLITICIAN_ID = "fe0fce5b-cd46-48e2-8277-5a89c369fe31"
BOBO_CODE = "500070"
SEI_REGEX = re.compile(r"SEI[^\d]*(\d{3}\.\d{4}\.\d{4}\.\d{7}-\d{2})", re.IGNORECASE)


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
    defaults = {"sep": ";", "encoding": "utf-8", "dtype": str,
                "on_bad_lines": "skip", "quoting": csv.QUOTE_MINIMAL}
    defaults.update(kwargs)
    df = pd.read_csv(path, **defaults)
    df.columns = [c.strip().replace('"', '').replace('\ufeff', '') for c in df.columns]
    return df


def run_execution():
    print("🚀 EXECUÇÃO DA SINCRONIZAÇÃO PROFUNDA — Bobô")
    print("═" * 60)

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # ═════════════════════════════════════════════════════════════════════════
    # ETAPA 1: ALTER TABLE — Adicionar colunas
    # ═════════════════════════════════════════════════════════════════════════
    print("\n📌 [ETAPA 1/5] ALTER TABLE parliamentary_amendments...")
    try:
        sql_alter = """
        ALTER TABLE parliamentary_amendments
          ADD COLUMN IF NOT EXISTS sei_numero TEXT,
          ADD COLUMN IF NOT EXISTS processo_sei TEXT,
          ADD COLUMN IF NOT EXISTS data_sincronizacao TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS num_codigo_exec TEXT;
        """
        supabase.rpc("exec_sql", {"query": sql_alter}).execute()
        print("   ✅ Colunas adicionadas com sucesso!")
    except Exception as e:
        # O Supabase pode não ter a função exec_sql.
        # Neste caso, vamos usar postgrest direto com um update dummy para testar
        print(f"   ⚠️ RPC exec_sql não disponível ({e})")
        print("   🔄 Tentando via update de teste...")
        try:
            # Testa se as colunas existem fazendo um select
            test = supabase.table("parliamentary_amendments").select("sei_numero").limit(1).execute()
            print("   ✅ Colunas já existem (ou foram criadas manualmente)!")
        except Exception as e2:
            print(f"   ❌ Colunas NÃO existem. Execute este SQL manualmente no Supabase Dashboard:")
            print(f"""
    ALTER TABLE parliamentary_amendments
      ADD COLUMN IF NOT EXISTS sei_numero TEXT,
      ADD COLUMN IF NOT EXISTS processo_sei TEXT,
      ADD COLUMN IF NOT EXISTS data_sincronizacao TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS num_codigo_exec TEXT;
            """)
            print("   Depois re-execute este script.")
            sys.exit(1)

    # ═════════════════════════════════════════════════════════════════════════
    # ETAPA 2: CREATE TABLE amendment_payments
    # ═════════════════════════════════════════════════════════════════════════
    print("\n📌 [ETAPA 2/5] CREATE TABLE amendment_payments...")
    try:
        sql_create = """
        CREATE TABLE IF NOT EXISTS amendment_payments (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          amendment_id UUID REFERENCES parliamentary_amendments(id),
          politician_id UUID,
          num_empenho TEXT,
          sei_numero TEXT,
          processo_sei TEXT,
          credor TEXT,
          data_pagamento DATE,
          valor_pago NUMERIC,
          objeto TEXT,
          num_codigo TEXT,
          data_sincronizacao TIMESTAMPTZ DEFAULT now()
        );
        """
        supabase.rpc("exec_sql", {"query": sql_create}).execute()
        print("   ✅ Tabela amendment_payments criada!")
    except Exception as e:
        print(f"   ⚠️ RPC exec_sql não disponível ({e})")
        # Tenta verificar se tabela já existe
        try:
            test = supabase.table("amendment_payments").select("id").limit(1).execute()
            print("   ✅ Tabela amendment_payments já existe!")
        except Exception as e2:
            print(f"   ❌ Tabela NÃO existe. Execute este SQL no Supabase Dashboard:")
            print(f"""
    CREATE TABLE IF NOT EXISTS amendment_payments (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      amendment_id UUID REFERENCES parliamentary_amendments(id),
      politician_id UUID,
      num_empenho TEXT,
      sei_numero TEXT,
      processo_sei TEXT,
      credor TEXT,
      data_pagamento DATE,
      valor_pago NUMERIC,
      objeto TEXT,
      num_codigo TEXT,
      data_sincronizacao TIMESTAMPTZ DEFAULT now()
    );
            """)
            print("   Depois re-execute este script.")
            sys.exit(1)

    # ─── Carregar Mapa SEI ───────────────────────────────────────────────────
    print("\n🔗 Carregando mapa SEI...")
    sei_map = {}
    if CSV_SEI.exists():
        df_sei = safe_read_csv(CSV_SEI)
        for _, row in df_sei.iterrows():
            emp = str(row.get("num_empenho_orcamento", "")).strip()
            proc = str(row.get("num_processo_sist_elet_info", "")).strip()
            if emp and proc and emp != "nan":
                sei_map[emp] = proc
        print(f"   ✅ {len(sei_map)} mapeamentos carregados.")

    # ─── Carregar registros LOA existentes ───────────────────────────────────
    print("\n🔍 Carregando registros LOA existentes do Bobô...")
    res = supabase.table("parliamentary_amendments") \
        .select("id, raw_hash, acao_programa, municipio_original, objeto_detalhado") \
        .eq("politician_id", BOBO_POLITICIAN_ID) \
        .execute()
    db_records = res.data or []
    print(f"   ✅ {len(db_records)} registros LOA carregados.")

    # ═════════════════════════════════════════════════════════════════════════
    # ETAPA 3: IMPORT 218 pagamentos na tabela amendment_payments
    # ═════════════════════════════════════════════════════════════════════════
    print("\n📌 [ETAPA 3/5] Importando pagamentos na tabela amendment_payments...")
    df_pag = safe_read_csv(CSV_PAGAMENTOS)

    mask_bob = df_pag["Objeto"].str.contains("Bob", case=False, na=False)
    mask_cod = df_pag["num_codigo_exec"].astype(str).str.contains(BOBO_CODE, na=False)
    df_bobo = df_pag[mask_bob | mask_cod].copy()
    print(f"   🎯 Total de pagamentos Bobô: {len(df_bobo)}")

    # Preparar registros para inserção
    payment_records = []
    sei_data_for_loa = {}  # {acao_key: {sei_numero, processo_sei, total_pago}}

    for _, row in df_bobo.iterrows():
        obj = str(row.get("Objeto", ""))
        val = normalize_money(row.get("val_pagto_nob", 0))
        data_str = str(row.get("Data do Pagamento", "")).strip()
        credor = str(row.get("RazaoSocialCredorPagamento", "")).strip()
        emp = str(row.get("num_empenho", "")).strip()
        cod = str(row.get("num_codigo_exec", "")).strip()

        sei = extract_sei(obj)
        proc = sei_map.get(emp)

        # Converter data
        data_pagamento = None
        if data_str and data_str != "nan":
            try:
                dt = datetime.strptime(data_str.split(" ")[0], "%d/%m/%Y")
                data_pagamento = dt.strftime("%Y-%m-%d")
            except:
                pass

        # Tentar vincular a um registro LOA
        amendment_id = None
        obj_lower = obj.lower()
        best_score = 0
        for db_rec in db_records:
            db_acao = str(db_rec.get("acao_programa", "")).lower()
            if db_acao and len(db_acao) > 5:
                words = [w for w in db_acao.split() if len(w) > 3]
                if words:
                    matches = sum(1 for w in words if w in obj_lower)
                    score = matches / len(words)
                    if score > best_score and score > 0.4:
                        best_score = score
                        amendment_id = db_rec["id"]

        # Acumular SEI e valor_pago para o UPDATE do LOA
        if amendment_id:
            if amendment_id not in sei_data_for_loa:
                sei_data_for_loa[amendment_id] = {
                    "sei_numero": None,
                    "processo_sei": None,
                    "total_pago": 0.0
                }
            if sei:
                sei_data_for_loa[amendment_id]["sei_numero"] = sei
            if proc:
                sei_data_for_loa[amendment_id]["processo_sei"] = proc
            sei_data_for_loa[amendment_id]["total_pago"] += val

        payment_records.append({
            "amendment_id": amendment_id,
            "politician_id": BOBO_POLITICIAN_ID,
            "num_empenho": emp if emp != "nan" else None,
            "sei_numero": sei,
            "processo_sei": proc,
            "credor": credor[:200] if credor != "nan" else None,
            "data_pagamento": data_pagamento,
            "valor_pago": val,
            "objeto": obj[:500] if obj != "nan" else None,
            "num_codigo": cod if cod != "nan" else None,
        })

    # Inserir em chunks
    CHUNK_SIZE = 50
    total_inserted = 0
    for i in range(0, len(payment_records), CHUNK_SIZE):
        chunk = payment_records[i:i+CHUNK_SIZE]
        try:
            supabase.table("amendment_payments").insert(chunk).execute()
            total_inserted += len(chunk)
            print(f"   ✅ Chunk {i//CHUNK_SIZE+1}: {len(chunk)} pagamentos inseridos (total: {total_inserted})")
        except Exception as e:
            print(f"   ❌ Erro no chunk {i//CHUNK_SIZE+1}: {e}")

    print(f"   📊 Total inserido: {total_inserted}/{len(payment_records)}")

    # ═════════════════════════════════════════════════════════════════════════
    # ETAPA 4: UPDATE nos 90 LOA com sei_numero, processo_sei, valor_pago
    # ═════════════════════════════════════════════════════════════════════════
    print(f"\n📌 [ETAPA 4/5] Atualizando {len(sei_data_for_loa)} registros LOA com SEI e valor_pago...")
    updates_ok = 0
    updates_err = 0
    for amendment_id, data in sei_data_for_loa.items():
        update_fields = {
            "data_sincronizacao": datetime.now().isoformat(),
        }
        if data["sei_numero"]:
            update_fields["sei_numero"] = data["sei_numero"]
        if data["processo_sei"]:
            update_fields["processo_sei"] = data["processo_sei"]
        if data["total_pago"] > 0:
            update_fields["valor_pago"] = data["total_pago"]

        try:
            supabase.table("parliamentary_amendments").update(update_fields).eq("id", amendment_id).execute()
            updates_ok += 1
        except Exception as e:
            print(f"   ❌ Erro no update {amendment_id}: {e}")
            updates_err += 1

    print(f"   ✅ Updates LOA: {updates_ok} OK, {updates_err} erros")

    # ═════════════════════════════════════════════════════════════════════════
    # ETAPA 5: Atualizar valor_empenhado via CSV de Despesas
    # ═════════════════════════════════════════════════════════════════════════
    print(f"\n📌 [ETAPA 5/5] Atualizando LOA com dados do CSV de Despesas...")
    if not CSV_DESPESAS.exists():
        print("   ⚠️ Arquivo de despesas não encontrado. Pulando.")
    else:
        df_desp = safe_read_csv(CSV_DESPESAS)

        # Filtrar despesas do Bobô
        if "num_codigo" in df_desp.columns:
            df_bobo_desp = df_desp[df_desp["num_codigo"].astype(str).str.contains(BOBO_CODE, na=False)].copy()
        else:
            df_bobo_desp = pd.DataFrame()

        print(f"   🎯 Despesas Bobô encontradas: {len(df_bobo_desp)}")

        if not df_bobo_desp.empty:
            # Agrupar por Ação + Ano para fazer update nos registros LOA
            desp_updates = 0
            desp_errors = 0

            for _, desp in df_bobo_desp.iterrows():
                ano = str(desp.get("Ano Exercício", "")).strip()
                acao = str(desp.get("Ação do Programa de Governo", "")).strip()
                val_emp = normalize_money(desp.get("Valor Empenhado.", 0))
                val_liq = normalize_money(desp.get("Valor Liquidado.", 0))
                val_pago = normalize_money(desp.get("Valor Pago.", 0))
                val_orc = normalize_money(desp.get("Valor Orçado Atual.", 0))

                if not ano or ano == "nan" or not acao or acao == "nan":
                    continue

                # Buscar registro LOA correspondente
                for db_rec in db_records:
                    db_acao = str(db_rec.get("acao_programa", "")).strip()
                    if db_acao.lower() == acao.lower():
                        update_fields = {"data_sincronizacao": datetime.now().isoformat()}
                        if val_emp > 0:
                            update_fields["valor_empenhado"] = val_emp
                        if val_liq > 0:
                            update_fields["valor_liquidado"] = val_liq

                        try:
                            supabase.table("parliamentary_amendments") \
                                .update(update_fields) \
                                .eq("id", db_rec["id"]) \
                                .execute()
                            desp_updates += 1
                        except Exception as e:
                            desp_errors += 1
                        break  # Só atualiza o primeiro match

            print(f"   ✅ Updates Despesas: {desp_updates} OK, {desp_errors} erros")

    # ─── RESUMO FINAL ────────────────────────────────────────────────────────
    print("\n" + "═" * 60)
    print("✅ SINCRONIZAÇÃO PROFUNDA CONCLUÍDA!")
    print(f"   Pagamentos inseridos:     {total_inserted}")
    print(f"   LOAs atualizados (SEI):   {updates_ok}")
    print(f"   Erros totais:             {updates_err}")
    print("═" * 60)


if __name__ == "__main__":
    run_execution()
