import os
import pandas as pd
import psycopg2
import hashlib
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
    print("❌ Erro: DATABASE_URL não encontrada.")
    exit(1)

DATA_DIR = "/home/carneiro888/CARNEIRO888/PRISMA888V11/PRISMA888FORBES/backend/data/tce_sp_real"

def connect_db():
    return psycopg2.connect(DB_URL)

def setup_schema(conn):
    """Cria as colunas necessárias se não existirem."""
    print("🛠️  Verificando schema do banco...")
    with conn.cursor() as cur:
        cur.execute("""
            ALTER TABLE municipal_expenses ADD COLUMN IF NOT EXISTS historico TEXT;
            ALTER TABLE municipal_expenses ADD COLUMN IF NOT EXISTS funcao TEXT;
            ALTER TABLE municipal_expenses ADD COLUMN IF NOT EXISTS subfuncao TEXT;
            ALTER TABLE municipal_expenses ADD COLUMN IF NOT EXISTS fonte_recurso TEXT;
            ALTER TABLE municipal_expenses ADD COLUMN IF NOT EXISTS modalidade_licitacao TEXT;
            ALTER TABLE municipal_expenses ALTER COLUMN nr_empenho DROP NOT NULL; -- Permitir NULL para receitas
        """)
        conn.commit()
    print("✅ Schema atualizado!")

def clean_currency(val):
    if isinstance(val, str):
        val = val.replace('R$', '').replace('.', '').replace(',', '.')
    return float(val)

def parse_date(date_str):
    """Converte DD/MM/AAAA para AAAA-MM-DD"""
    if not date_str or pd.isna(date_str):
        return None
    try:
        return datetime.strptime(date_str, '%d/%m/%Y').strftime('%Y-%m-%d')
    except ValueError:
        return date_str # Tentar retornar como está se falhar

def generate_hash(row_data):
    """Gera um hash único baseado no conteúdo da linha."""
    row_str = str(row_data) + str(datetime.now().timestamp())
    return hashlib.md5(row_str.encode()).hexdigest()

def import_csvs():
    conn = connect_db()
    setup_schema(conn)

    files = [f for f in os.listdir(DATA_DIR) if f.endswith('.csv')]
    print(f"📂 Encontrados {len(files)} arquivos.")

    total_inserted = 0

    for filename in files:
        filepath = os.path.join(DATA_DIR, filename)
        print(f"🚀 Processando: {filename}...")
        
        try:
            try:
                df = pd.read_csv(filepath, encoding='latin1', sep=';')
            except:
                df = pd.read_csv(filepath, encoding='utf-8', sep=';')
            
            df.columns = [c.strip().lower() for c in df.columns]
            is_receita = 'receita' in filename.lower()
            
            with conn.cursor() as cur:
                for _, row in df.iterrows():
                    raw_hash = generate_hash(row.to_dict())

                    # Data
                    if is_receita:
                        ano = row.get('ano_exercicio')
                        mes = row.get('mes_referencia')
                        dt_emissao = f"{ano}-{mes:02d}-01"
                    else:
                        date_raw = row.get('data') or row.get('dt_emissao_despesa')
                        dt_emissao = parse_date(date_raw)

                    # Valor
                    val_str = row.get('valor') or row.get('vl_despesa') or row.get('vl_arrecadacao') or 0
                    vl_despesa = clean_currency(val_str)
                    
                    if is_receita:
                        historico = f"{row.get('ds_alinea')} - {row.get('ds_subalinea')}"
                        fornecedor = "RECEITA MUNICIPAL"
                        evento = "Arrecadação"
                        orgao = row.get('ds_orgao')
                        funcao = "RECEITA"
                        subfuncao = row.get('ds_subalinea')
                        fonte_recurso = row.get('ds_fonte_recurso')
                        modalidade = None
                        nr_empenho = None # NULL permitido agora
                    else:
                        fornecedor = (row.get('ds_despesa') or row.get('nm_fornecedor') or "Fornecedor não informado")
                        evento = row.get('tp_despesa') or "Despesa"
                        orgao = row.get('ds_orgao')
                        historico = row.get('historico_despesa')
                        funcao = row.get('ds_funcao_governo')
                        subfuncao = row.get('ds_subfuncao_governo')
                        fonte_recurso = row.get('ds_fonte_recurso')
                        modalidade = row.get('ds_modalidade_lic')
                        nr_empenho = row.get('nr_empenho')
                    
                    if not orgao: orgao = "PREFEITURA MUNICIPAL DE VOTORANTIM"

                    cur.execute("""
                        INSERT INTO municipal_expenses 
                        (municipio_slug, dt_emissao_despesa, vl_despesa, nm_fornecedor, historico, funcao, subfuncao, orgao, fonte_recurso, modalidade_licitacao, evento, nr_empenho, raw_hash, ano, mes)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, EXTRACT(YEAR FROM %s::DATE), EXTRACT(MONTH FROM %s::DATE))
                    """, (
                        'votorantim-sp', 
                        dt_emissao, 
                        vl_despesa, 
                        fornecedor, 
                        historico, 
                        funcao, 
                        subfuncao, 
                        orgao,
                        fonte_recurso,
                        modalidade,
                        evento,
                        nr_empenho,
                        raw_hash,
                        dt_emissao,
                        dt_emissao
                    ))
                    total_inserted += 1
                
                conn.commit()
                print(f"   ✅ Arquivo {filename} importado.")

        except Exception as e:
            print(f"❌ Erro ao processar {filename}: {e}")
            conn.rollback()

    print(f"\n🎉 Importação Concluída! Total de registros: {total_inserted}")
    conn.close()

if __name__ == "__main__":
    import_csvs()
