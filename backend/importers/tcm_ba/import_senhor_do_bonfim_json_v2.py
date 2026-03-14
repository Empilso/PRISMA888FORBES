#!/usr/bin/env python3
"""
Adapter de Ingestão de Despesas: TCM-BA (Senhor do Bonfim) via Arquivo JSON.
Lê dados a partir do JSON bruto e os converte
para o schema unificado da tabela `municipal_expenses`.
"""

import os
import sys
import hashlib
import json
import re
from supabase import create_client, Client
from dotenv import load_dotenv

# Caminhos Absolutos para evitar erros de CWD
BASE_DIR = "/home/carneiro888/CARNEIRO888/PRISMA888V11/PRISMA888FORBES"
ENV_PATH = os.path.join(BASE_DIR, "frontend/.env.local")
DATA_DIR = os.path.join(BASE_DIR, "IBGE/BA_bairros_CD2022")
MUNICIPIO_SLUG = "senhor-do-bonfim-ba"

# Carrega ambiente
if os.path.exists(ENV_PATH):
    load_dotenv(ENV_PATH)
else:
    print(f"❌ Erro: Arquivo .env não encontrado em {ENV_PATH}")

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Erro: Variáveis do Supabase não encontradas no .env")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def find_json_file():
    if not os.path.exists(DATA_DIR):
        return None
    for f in os.listdir(DATA_DIR):
        if "result-Home" in f and "Pagamento" in f and f.endswith(".json"):
            return os.path.join(DATA_DIR, f)
    return None

def parse_date(date_str):
    if not date_str: return None
    match = re.search(r'(\d{2})/(\d{2})/(\d{4})', str(date_str))
    if match:
        return f"{match.group(3)}-{match.group(2)}-{match.group(1)}"
    return None

def parse_value(val_str):
    if not val_str: return 0.0
    val_str = str(val_str).strip()
    val_str = re.sub(r'[^\d,\.-]', '', val_str)
    if not val_str: return 0.0
    if ',' in val_str and '.' in val_str:
        val_str = val_str.replace('.', '').replace(',', '.')
    elif ',' in val_str:
        val_str = val_str.replace(',', '.')
    try:
        return float(val_str)
    except:
        return 0.0

def generate_hash(identifier_string):
    return hashlib.md5(str(identifier_string).encode('utf-8')).hexdigest()

def extract_and_import():
    json_path = find_json_file()
    if not json_path:
        print("❌ Arquivo JSON não encontrado.")
        return

    print(f"📂 Lendo JSON: {repr(json_path)}")
    
    try:
        # Usando latin-1 conforme identificado anteriormente
        with open(json_path, "r", encoding="latin-1") as f:
            raw_content = json.load(f)
            
            if "data" in raw_content and "result" in raw_content["data"]:
                items = raw_content["data"]["result"]
            else:
                print("❌ Estrutura JSON inválida.")
                return

            print(f"📖 Registros encontrados: {len(items)}")

            expenses = []
            for idx, item in enumerate(items):
                dt_emissao_raw = item.get("DATA") or item.get("LIQ_DATA_LIQUIDACAO") or ""
                dt_emissao_despesa = parse_date(dt_emissao_raw)
                
                ano = 2025
                mes = 1
                if dt_emissao_despesa:
                    parts = dt_emissao_despesa.split("-")
                    ano = int(parts[0])
                    mes = int(parts[1])

                nm_fornecedor = item.get("PES_NOME") or "Desconhecido"
                vl_pago = item.get("VALORCHAR") or "0"
                vl_despesa = parse_value(vl_pago)

                if vl_despesa == 0 and not nm_fornecedor:
                    continue

                chave_interna = item.get("CHAVE") or f"{item.get('NUMERO_EMPENHO')}_{nm_fornecedor}_{dt_emissao_raw}_{vl_pago}"
                raw_hash = generate_hash(f"{MUNICIPIO_SLUG}_{idx}_{chave_interna}")

                expense = {
                    "municipio_slug": MUNICIPIO_SLUG,
                    "ano": ano,
                    "mes": mes,
                    "orgao": (item.get("ORG_NOME") or "Prefeitura")[:255],
                    "evento": item.get("Tipo_Nota") or "Pago",
                    "nr_empenho": (item.get("NUMERO_EMPENHO") or "")[:50],
                    "id_fornecedor": "BA_SEM_CNPJ",
                    "nm_fornecedor": nm_fornecedor[:255],
                    "dt_emissao_despesa": dt_emissao_despesa,
                    "vl_despesa": vl_despesa,
                    "raw_hash": raw_hash,
                    "historico": item.get("EMP_HISTORICO") or ""
                }
                expenses.append(expense)

            print(f"✅ Conversão concluída: {len(expenses)} registros.")

            if not expenses: return

            # Limpando dados antigos do slug antes de inserir
            print(f"🗑️ Limpando dados antigos de {MUNICIPIO_SLUG}...")
            supabase.table("municipal_expenses").delete().eq("municipio_slug", MUNICIPIO_SLUG).execute()

            # Inserção em lotes
            BATCH_SIZE = 1000
            for i in range(0, len(expenses), BATCH_SIZE):
                batch = expenses[i:i+BATCH_SIZE]
                supabase.table("municipal_expenses").upsert(batch).execute()
                print(f"🚀 Enviados: {min(i+BATCH_SIZE, len(expenses))}/{len(expenses)}")

            print("\n🎉 Importação finalizada com sucesso!")

    except Exception as e:
        print(f"❌ Erro: {e}")

if __name__ == "__main__":
    extract_and_import()
