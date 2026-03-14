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

# Carrega ambiente
load_dotenv("../frontend/.env.local")

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or SUPABASE_KEY

if not SUPABASE_URL:
    print("❌ Erro: Variável NEXT_PUBLIC_SUPABASE_URL não encontrada")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Configurações Constantes do Adapter BA (JSON Edition)
# Procurar o arquivo dinamicamente para evitar bad escape de \n hardcoded
FOLDER = "/home/carneiro888/CARNEIRO888/PRISMA888V11/PRISMA888FORBES/IBGE/BA_bairros_CD2022"
MUNICIPIO_SLUG = "senhor-do-bonfim-ba"
ANO_FIXO = 2025 # Opcional: extrair do PDF se houver
MES_FIXO = 1

def find_json_file():
    for f in os.listdir(FOLDER):
        if "result-Home" in f and "Pagamento" in f and f.endswith(".json"):
            return os.path.join(FOLDER, f)
    return None

def parse_date(date_str):
    """Converte DD/MM/YYYY para YYYY-MM-DD."""
    if not date_str: return None
    match = re.search(r'(\d{2})/(\d{2})/(\d{4})', str(date_str))
    if match:
        return f"{match.group(3)}-{match.group(2)}-{match.group(1)}"
    return None

def parse_value(val_str):
    """Lida com formatação BR de valores monetários (1.234,56 -> 1234.56)."""
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
    """Hash blindado de garantia de idempotência."""
    return hashlib.md5(str(identifier_string).encode('utf-8')).hexdigest()

def extract_and_import():
    print("Iniciando extract_and_import", flush=True)
    json_path = find_json_file()
    if not json_path:
        print("❌ Arquivo JSON não encontrado na pasta BA_bairros_CD2022.", flush=True)
        return

    print(f"📂 Abrindo e traduzindo JSON do TCM-BA (Senhor do Bonfim): {repr(json_path)}", flush=True)
    
    expenses = []
    
    try:
        print("Carregando o json com json.load...", flush=True)
        with open(json_path, "r", encoding="latin-1") as f:
            raw_content = json.load(f)
            
            # O JSON atual tem a estrutura: {"data": {"result": [...]}}
            if "data" in raw_content and "result" in raw_content["data"]:
                items = raw_content["data"]["result"]
            else:
                print("❌ Formato JSON inesperado. Faltam as chaves 'data' ou 'result'.")
                return

            print(f"📖 Total de registros identificados no JSON: {len(items)}")

            for item in items:
                # Regras de adaptação TCM-BA via chaves do JSON
                nr_processo = item.get("PAG_NUMERO_PROCESSO") or ""
                dt_emissao_raw = item.get("DATA") or item.get("LIQ_DATA_LIQUIDACAO") or ""
                evento_raw = item.get("Tipo_Nota") or ""
                orgao = item.get("ORG_NOME") or "Prefeitura Municipal"
                empenho = item.get("NUMERO_EMPENHO") or nr_processo
                historico = item.get("EMP_HISTORICO") or ""
                nm_fornecedor = item.get("PES_NOME") or "Desconhecido"
                vl_pago = item.get("VALORCHAR") or "0"
                
                # O ano e mes reais baseados na data extraída
                dt_emissao_despesa = parse_date(dt_emissao_raw)
                ano_real = ANO_FIXO
                mes_real = MES_FIXO
                if dt_emissao_despesa:
                    parts = dt_emissao_despesa.split("-")
                    ano_real = int(parts[0])
                    mes_real = int(parts[1])
                
                # Adaptação de "Evento" (Empenhado / Pago / Anulado / Extra Orçamentária)
                evento = "Pago"
                if "Extra" in evento_raw: evento = "Extra-Orçamentária"
                elif "Anula" in evento_raw: evento = "Anulado"

                vl_despesa = parse_value(vl_pago)
                
                if vl_despesa == 0 and not nm_fornecedor:
                    continue
                    
                # Hash atômico para evitar duplicação em upserts futuros
                chave_interna = item.get("CHAVE") or f"{empenho}_{nm_fornecedor}_{dt_emissao_raw}_{vl_pago}"
                unique_str = f"{MUNICIPIO_SLUG}_{chave_interna}_{vl_pago}"
                raw_hash = generate_hash(unique_str)

                expense = {
                    "municipio_slug": MUNICIPIO_SLUG,
                    "ano": ano_real,
                    "mes": mes_real,
                    "orgao": orgao[:255] if orgao else "Não Identificado",
                    "evento": evento,
                    "nr_empenho": empenho[:50],
                    "id_fornecedor": "BA_SEM_CNPJ", # Até o momento sem CPF/CNPJ
                    "nm_fornecedor": nm_fornecedor[:255],
                    "dt_emissao_despesa": dt_emissao_despesa,
                    "vl_despesa": vl_despesa,
                    "raw_hash": raw_hash,
                    "historico": historico
                }
                
                expenses.append(expense)
                if len(expenses) <= 5:
                    print(f"Sample Expense {len(expenses)}:", json.dumps(expense, indent=2, ensure_ascii=False), flush=True)

    except Exception as e:
        print(f"❌ Erro ao parsear o JSON: {e}")
        return

    print(f"✅ Conversão concluída: {len(expenses)} despesas traduzidas com perfeição, prontas para o PRISMA888.")

    if not expenses:
        print("🤷‍♂️ Nenhuma despesa processada. Cancelando inserção no banco.")
        return

    print("🗑️  Limpando despesas (pilot test de PDF) pra recarregar 100% via JSON...")
    try:
        supabase.table("municipal_expenses").delete().eq("municipio_slug", MUNICIPIO_SLUG).execute()
        print("✅ Dados antigos removidos.")
    except Exception as e:
        print(f"⚠️  Erro ao limpar dados antigos: {e}")

    # Chunks de inserção (Supabase API Limits)
    BATCH_SIZE = 1000
    total_imported = 0
    
    print("🚀 Iniciando Push para o Supabase (Schema Unificado)...")
    for i in range(0, len(expenses), BATCH_SIZE):
        batch = expenses[i:i+BATCH_SIZE]
        try:
            supabase.table("municipal_expenses").upsert(batch).execute()
            total_imported += len(batch)
            print(f"   📥 Lote salvos: {total_imported}/{len(expenses)}")
        except Exception as e:
            print(f"   ❌ Erro ao subir lote: {e}")

    print(f"\\n🎉 SUCESSO! Senhor do Bonfim atualizada na Velocidade da Luz: {total_imported} registros em Produção.")

if __name__ == "__main__":
    extract_and_import()
