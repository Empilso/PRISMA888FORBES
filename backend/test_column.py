import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

def test_column():
    print("🕵️ Testando seleção da coluna 'estimated_votes'...")
    try:
        res = supabase.table("strategies").select("estimated_votes").limit(1).execute()
        print("✅ Coluna existe!")
    except Exception as e:
        print(f"❌ Erro: {e}")

if __name__ == "__main__":
    test_column()
