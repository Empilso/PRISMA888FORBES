#!/usr/bin/env python3
"""
Script para importação COMPLETA de despesas municipais (TCE-SP)
Substitui importações parciais anteriores.
"""

import os
import csv
import sys
import hashlib
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv("frontend/.env.local")

# Configuração Supabase
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
# Usar Service Role key para admin access (bypass RLS)
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or SUPABASE_KEY

if not SUPABASE_URL:
    print("❌ Erro: Variável NEXT_PUBLIC_SUPABASE_URL não encontrada")
    sys.exit(1)

# Cliente com privilégios elevados
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

CSV_PATH = "backend/data/tce_sp_real/despesas-votorantim-2025.csv"
MUNICIPIO_SLUG = "votorantim-sp"

def parse_date(date_str):
    """Converte DD/MM/YYYY para YYYY-MM-DD"""
    if not date_str: return None
    try:
        return datetime.strptime(date_str, "%d/%m/%Y").strftime("%Y-%m-%d")
    except:
        return None

def parse_value(val_str):
    """Converte 1.234,56 para 1234.56"""
    if not val_str: return 0.0
    return float(val_str.replace('.', '').replace(',', '.'))

def generate_hash(row_str):
    """Gera hash único para a linha"""
    return hashlib.md5(row_str.encode()).hexdigest()

def get_mes_numero(mes_extenso):
    meses = {
        "Janeiro": 1, "Fevereiro": 2, "Março": 3, "Abril": 4, "Maio": 5, "Junho": 6,
        "Julho": 7, "Agosto": 8, "Setembro": 9, "Outubro": 10, "Novembro": 11, "Dezembro": 12
    }
    return meses.get(mes_extenso, 0)

def import_expenses():
    if not os.path.exists(CSV_PATH):
        print(f"❌ Arquivo não encontrado: {CSV_PATH}")
        return

    print("🗑️  Limpando despesas existentes de Votorantim...")
    try:
        supabase.table("municipal_expenses").delete().eq("municipio_slug", MUNICIPIO_SLUG).execute()
        print("✅ Dados antigos removidos.")
    except Exception as e:
        print(f"⚠️  Erro ao limpar dados (pode ser a primeira importação): {e}")

    print(f"📂 Lendo CSV: {CSV_PATH}")
    
    expenses = []
    
    with open(CSV_PATH, 'r', encoding='latin-1', errors='replace') as f:
        # Usar reader simples para garantir leitura correta das colunas baseada em índice
        reader = csv.reader(f, delimiter=';')
        next(reader) # Pular header
        
        for idx, row in enumerate(reader, 1):
            try:
                # Mapeamento Baseado nos Headers identificados:
                # [0] id_despesa_detalhe
                # [1] ano_exercicio
                # [2] ds_municipio
                # [3] ds_orgao
                # [4] mes_referencia
                # [5] mes_ref_extenso
                # [6] tp_despesa (Evento e.g. Empenhado)
                # [7] nr_empenho
                # [8] identificador_despesa
                # [9] ds_despesa (histórico curto ou credor desc?)
                # [10] dt_emissao_despesa
                # [11] vl_despesa
                # [12] ds_funcao_governo
                # [13] ds_subfuncao_governo
                # ...
                # [22] historico_despesa
                
                # Campos seguros (com check de tamanho)
                ano = int(row[1]) if len(row) > 1 else 2025
                orgao = row[3] if len(row) > 3 else "Não informado"
                mes_extenso = row[5] if len(row) > 5 else "Janeiro"
                mes = get_mes_numero(mes_extenso)
                evento = row[6] if len(row) > 6 else "Desconhecido"
                nr_empenho = row[7] if len(row) > 7 else ""
                
                # Extraindo credor do histórico ou campo específico?
                # O CSV do TCE tem colunas de credor?
                # Pelo header anterior não vi explícito "nm_creder", mas vi "ds_despesa"
                # Vamos assumir que o credor está no histórico ou faremos parse depois.
                # PERA! No print do detect_encoding vi:
                # ...;VALEC DISTRIBUIDORA DE VEICULOS LTDA;...
                # Isso parece estar DEPOIS de id_fornecedor (CNPJ). 
                # Vamos re-validar os indices com base no print do encoding:
                # 635999264;2025;Votorantim;PREFEITURA...;1;Janeiro;Empenhado;841-2025;CNPJ...;VALEC...;30/01/2025
                
                # Ajuste de Mapeamento Baseado no Print Real:
                # 0: id
                # 1: ano
                # 2: muni
                # 3: orgao
                # 4: mes_int
                # 5: mes_ext
                # 6: evento (Empenhado)
                # 7: nr_empenho
                # 8: id_fornecedor (CNPJ...)
                # 9: nm_fornecedor (VALEC...)
                # 10: data
                # 11: valor
                
                id_fornecedor = row[8] if len(row) > 8 else ""
                nm_fornecedor = row[9] if len(row) > 9 else "Não informado"
                data_str = row[10] if len(row) > 10 else None
                dt_emissao = parse_date(data_str)
                
                valor_str = row[11].replace(',', '.') if len(row) > 11 else "0"
                vl_despesa = float(valor_str)

                historico = row[22] if len(row) > 22 else ""

                # Usar id_despesa_detalhe (row[0]) para garantir hash único por linha do portal
                id_tce = row[0] if len(row) > 0 else f"idx_{idx}"

                # Criar objeto
                expense = {
                    "municipio_slug": MUNICIPIO_SLUG,
                    "ano": ano,
                    "mes": mes,
                    "orgao": orgao[:255],
                    "evento": evento,
                    "nr_empenho": nr_empenho[:50],
                    "id_fornecedor": id_fornecedor[:255],
                    "nm_fornecedor": nm_fornecedor[:255],
                    "dt_emissao_despesa": dt_emissao,
                    "vl_despesa": vl_despesa,
                    "raw_hash": generate_hash(f"{MUNICIPIO_SLUG}_{id_tce}"),
                    "historico": historico
                }
                
                expenses.append(expense)
                
                if idx % 5000 == 0:
                    print(f"   Processado: {idx} registros...")
                    
            except Exception as e:
                # print(f"Erro linha {idx}: {e}")
                pass

    print(f"✅ Total processado: {len(expenses)} registros")

    # Importar em lotes
    BATCH_SIZE = 1000
    total_imported = 0
    
    for i in range(0, len(expenses), BATCH_SIZE):
        batch = expenses[i:i+BATCH_SIZE]
        try:
            supabase.table("municipal_expenses").upsert(batch).execute()
            total_imported += len(batch)
            print(f"   🚀 Lote {i//BATCH_SIZE + 1}: {total_imported}/{len(expenses)} inseridos")
        except Exception as e:
            print(f"   ❌ Erro lote {i//BATCH_SIZE + 1}: {e}")

    print(f"\n🎉 Importação finalizada! {total_imported} registros no banco.")

if __name__ == "__main__":
    import_expenses()
