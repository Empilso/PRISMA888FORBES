import os
import csv
from dotenv import load_dotenv
from supabase import create_client

load_dotenv("backend/.env")

def get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, key)

def inspect():
    supabase = get_supabase()
    
    # 1. Uma emenda do banco
    res_am = supabase.table("parliamentary_amendments").select("*").limit(1).execute()
    am = res_am.data[0]
    print("--- BANCO ---")
    print(f"Objeto: '{am['objeto_detalhado']}'")
    print(f"Valor: {am['valor_orcado_atual']}")
    
    # 2. Primeira linha do CSV
    csv_path = "IBGE/EMENDAS DEPUTADOS/VW_PAINEL_EMENDAS_PARLAMENTARES_DESPESAS.csv"
    with open(csv_path, mode='r', encoding='latin-1') as f:
        content = f.read()
        if content.startswith('\ufeff'):
            content = content[1:]
        f_io = csv.StringIO(content)
        reader = csv.DictReader(f_io, delimiter=';')
        row = next(reader)
        print("\n--- CSV ---")
        for k, v in row.items():
            print(f"'{k}': '{v}'")

if __name__ == "__main__":
    inspect()
