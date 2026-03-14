#!/usr/bin/env python3
"""
Adapter de Ingestão de Despesas: TCM-BA (Senhor do Bonfim)
Lê dados a partir de tabelas extraídas de PDFs brutos e os converte
para o schema unificado da tabela `municipal_expenses`.
"""

import os
import sys
import hashlib
import pdfplumber
import re
from datetime import datetime
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

# Cliente admin (Bypass RLS para importação bruta)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Configurações Constantes do Adapter BA
PDF_PATH = "/home/carneiro888/CARNEIRO888/Obsidian/][=_=][ ZIKUALDO/COMINHO COM COGNIÇÃO/PRISMA888/senhor do bonfim/despesas-sem-cnpj - inicial.pdf"
MUNICIPIO_SLUG = "senhor-do-bonfim-ba"
ANO_FIXO = 2025
MES_FIXO = 1  # Janeiro
MAX_PAGES = 25 # Limite para testar ingestão sem demorar horas

def parse_date(date_str):
    """Converte DD/MM/YYYY para YYYY-MM-DD com fallback de regex."""
    if not date_str: return None
    # Busca um padrao dd/mm/yyyy
    match = re.search(r'(\d{2})/(\d{2})/(\d{4})', str(date_str))
    if match:
        return f"{match.group(3)}-{match.group(2)}-{match.group(1)}"
    return None

def parse_value(val_str):
    """Lida com formatação BR de valores monetários (1.234,56 -> 1234.56)."""
    if not val_str: return 0.0
    val_str = str(val_str).strip()
    # Casos anômalos onde vem vazio ou R$ 
    val_str = re.sub(r'[^\d,\.-]', '', val_str)
    if not val_str: return 0.0
    # Padroniza para float americano
    if ',' in val_str and '.' in val_str:
        val_str = val_str.replace('.', '').replace(',', '.')
    elif ',' in val_str:
        val_str = val_str.replace(',', '.')
    
    try:
        return float(val_str)
    except:
        return 0.0

def generate_hash(identifier_string):
    """Hash de garantia de idempotência (Raw Hash)."""
    return hashlib.md5(str(identifier_string).encode('utf-8')).hexdigest()

def clean_text(text):
    if not text: return ""
    return re.sub(r'\s+', ' ', str(text)).strip()

def extract_and_import():
    if not os.path.exists(PDF_PATH):
        print(f"❌ PDF não encontrado no caminho: {PDF_PATH}")
        return

    print(f"📂 Abrindo e traduzindo PDF do TCM-BA: {PDF_PATH}...")
    
    expenses = []
    
    # Abrimos o PDF usando pdfplumber
    with pdfplumber.open(PDF_PATH) as pdf:
        total_pages = len(pdf.pages)
        print(f"📖 Total de páginas identificadas: {total_pages}. Limitado a {MAX_PAGES} para teste de Adapter.")
        
        for page_num, page in enumerate(pdf.pages, start=1):
            if page_num > MAX_PAGES:
                break

            if page_num % 5 == 0 or page_num == 1:
                print(f"   ⏳ Extraindo página {page_num}/{MAX_PAGES}...")
                
            # Extração agressiva de tabelas
            tables = page.extract_tables({
                "vertical_strategy": "text", 
                "horizontal_strategy": "text",
                "snap_tolerance": 3
            })
            
            for table_idx, table in enumerate(tables):
                # Pulando possível header
                start_row = 1 if 'Valor' in str(table[0]) else 0
                for row_idx, row in enumerate(table[start_row:]):
                    # Ignora linhas nulas ou muito pequenas
                    if not row or len(row) < 5: 
                        continue
                        
                    # Baseado no output do log anterior:
                    # ['2070', '', '30/05/2025', '30/05/2025', 'Orçamentária', '', 'PREFEITURA MUNICIPAL DE SENHOR\nDO BONFIM', '42 47', 'CONTRIBUIÇÃO PARA O PIS/PASEP', 'SECRETARIA DA RECEITA FEDERAL', '0,2', 'Não', 'Não', ...]
                    # ['N° do Proc. Contrato / Processo Dispensa / Processo inegexibilidade', 'Ordem Cronológica', 'Data de Liquidação', 'Data de Empenho', 'Extra - Orçamentária / Despesa', 'Especificação', 'Unidade', 'Empenho', 'Histórico', 'Favorecido', 'Valor Pago', 'Restos a Pagar ?', 'Fonte Pagadora', 'Comprovante', 'Subempenho', 'Item', 'Função Pagadora', 'N° do Contrato', 'Ação', 'Valor a Pagar']

                    # Regras de adaptação TCM-BA (Heurística baseada no print do PDF)
                    try:
                        # Extrair de forma tolerante a falhas (Adapter core)
                        nr_processo = clean_text(row[0]) if len(row) > 0 else ""
                        dt_liquidacao = clean_text(row[2]) if len(row) > 2 else ""
                        dt_empenho = clean_text(row[3]) if len(row) > 3 else ""
                        evento_raw = clean_text(row[4]) if len(row) > 4 else ""
                        orgao = clean_text(row[6]) if len(row) > 6 else "Prefeitura (Geral)"
                        empenho = clean_text(row[7]) if len(row) > 7 else nr_processo
                        historico = clean_text(row[8]) if len(row) > 8 else ""
                        nm_fornecedor = clean_text(row[9]) if len(row) > 9 else "Desconhecido"
                        vl_pago = clean_text(row[10]) if len(row) > 10 else "0"
                        
                        # Padroniza "Evento" (SP usa Empenhado, Pago, Anulado). Bahia usa Extra - Orçamentária
                        evento = "Pago" if "Orçamentária" in evento_raw else "Empenho"
                        if "Despesa" in evento_raw: evento = "Pago"
                        
                        # Data principal
                        dt_principal = dt_liquidacao if dt_liquidacao else dt_empenho
                        dt_emissao_despesa = parse_date(dt_principal)
                        
                        # Valor Financeiro
                        vl_despesa = parse_value(vl_pago)
                        
                        if vl_despesa == 0 and not nm_fornecedor:
                            continue # Linha vazia ou lixo de header
                            
                        # Gera um hash único blindado para a Bahia, garantindo idempotência
                        unique_str = f"{MUNICIPIO_SLUG}_{page_num}_{row_idx}_{empenho}_{nm_fornecedor}_{dt_principal}_{vl_pago}"
                        raw_hash = generate_hash(unique_str)

                        # Dicionário Padronizado para Persistência
                        expense = {
                            "municipio_slug": MUNICIPIO_SLUG,
                            "ano": ANO_FIXO,
                            "mes": MES_FIXO,
                            "orgao": orgao[:255] if orgao else "Não Identificado",
                            "evento": evento,
                            "nr_empenho": empenho[:50],
                            "id_fornecedor": "BAHIA_SEM_CNPJ",  # CPF/CNPJ não veio no PDF fornecido
                            "nm_fornecedor": nm_fornecedor[:255],
                            "dt_emissao_despesa": dt_emissao_despesa,
                            "vl_despesa": vl_despesa,
                            "raw_hash": raw_hash,
                            "historico": historico
                        }
                        
                        if expense["nm_fornecedor"] and expense["nm_fornecedor"] not in ["Favorecido", "Desconhecido", "SECRETARIA DA RECEITA FEDERAL"]:
                            expenses.append(expense)
                            
                    except Exception as loop_e:
                        print(f"⚠️ Aviso ao parsear linha (Page {page_num}): {loop_e}")
                        continue
                        
    print(f"✅ Conversão concluída: {len(expenses)} despesas traduzidas para o formato de SP.")

    if not expenses:
        print("🤷‍♂️ Nenhuma despesa válida encontrada. Abortando inserção.")
        return

    # Inserção em massa e Deleção Inteligente (Upsert)
    print("🗑️  Limpando dados preexistentes dessa base da Bahia para evitar sujeiras antigas...")
    try:
        supabase.table("municipal_expenses").delete().eq("municipio_slug", MUNICIPIO_SLUG).execute()
        print("✅ Dados antigos removidos.")
    except Exception as e:
        print(f"⚠️  Erro ao limpar dados (poder ser run inédito): {e}")

    # Chunks de 500 para não estourar a API do Supabase
    BATCH_SIZE = 500
    total_imported = 0
    
    print("🚀 Iniciando push para o Supabase (Schema Unificado)...")
    for i in range(0, len(expenses), BATCH_SIZE):
        batch = expenses[i:i+BATCH_SIZE]
        try:
            supabase.table("municipal_expenses").upsert(batch).execute()
            total_imported += len(batch)
            print(f"   📥 Lote {i//BATCH_SIZE + 1} salvo: {total_imported}/{len(expenses)}")
        except Exception as e:
            print(f"   ❌ Erro ao empurrar lote {i//BATCH_SIZE + 1}: {e}")

    print(f"\n🎉 SUCESSO! {total_imported} Despesas de Senhor do Bonfim estão no Banco de Dados.")
    print("O frontend (VisaoGeralTab) já pode exibir essas métricas sem nenhuma modificação no código JS!")

if __name__ == "__main__":
    extract_and_import()
