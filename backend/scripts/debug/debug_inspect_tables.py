
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Erro: Credenciais do Supabase não encontradas.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def inspect_table(table_name):
    print(f"\n🔍 Inspecting table: {table_name}")
    try:
        # Fetch one row to see keys
        response = supabase.table(table_name).select("*").limit(1).execute()
        if not response.data:
            print(f"   ⚠️ Table {table_name} is empty or does not exist.")
            return
        
        keys = list(response.data[0].keys())
        print(f"   Structure: {keys}")
        print(f"   Sample Row: {response.data[0]}")
    except Exception as e:
        print(f"   ❌ Error accessing {table_name}: {e}")

if __name__ == "__main__":
    inspect_table("personas")
    inspect_table("social_mentions")
    inspect_table("campaigns")
