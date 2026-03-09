import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

def test_invalid_uuid():
    invalid_id = "not-a-uuid"
    print(f"🕵️ Testando query com UUID INVÁLIDO: {invalid_id}")
    try:
        res = supabase.table("strategies").select("*").eq("campaign_id", invalid_id).execute()
        print("✅ Sucesso inesperado?")
    except Exception as e:
        print(f"❌ Erro capturado: {e}")
        # Se fosse o SDK de JS, o erro teria campos específicos.

if __name__ == "__main__":
    test_invalid_uuid()
