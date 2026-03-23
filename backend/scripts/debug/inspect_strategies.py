import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

def inspect_columns():
    print("📋 Inspecionando colunas da tabela 'strategies'...")
    try:
        # Pega um registro para ver as chaves
        res = supabase.table("strategies").select("*").limit(1).execute()
        if res.data:
            row = res.data[0]
            print(f"✅ Colunas encontradas: {list(row.keys())}")
            for k, v in row.items():
                print(f"   - {k}: {type(v).__name__}")
        else:
            print("❌ Nenhuma estratégia encontrada para inspecionar.")
    except Exception as e:
        print(f"❌ Erro ao inspecionar: {e}")

if __name__ == "__main__":
    inspect_columns()
