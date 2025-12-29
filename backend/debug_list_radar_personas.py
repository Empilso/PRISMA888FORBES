
import os
import asyncio
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Erro: Credenciais do Supabase não encontradas.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def list_radar_personas():
    print("🔍 Buscando personas 'Radar'...")
    try:
        response = supabase.table("personas").select("*").execute()
        personas = response.data
        
        found = False
        print(f"\nTotal de personas encontradas: {len(personas)}")
        print("-" * 60)
        print(f"{'ID':<38} | {'Name (Slug)':<30} | {'Type':<15} | {'Display Name'}")
        print("-" * 60)
        
        for p in personas:
            dname = p.get('display_name', '')
            slug = p.get('name', '')
            if 'radar' in dname.lower() or 'radar' in slug.lower():
                found = True
                print(f"{p['id']:<38} | {slug:<30} | {p.get('type'):<15} | {dname}")
        
        if not found:
            print("❌ Nenhuma persona com 'radar' no nome encontrada.")
            
    except Exception as e:
        print(f"❌ Erro ao buscar personas: {e}")

if __name__ == "__main__":
    list_radar_personas()
