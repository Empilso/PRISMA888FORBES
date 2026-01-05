
import os
import sys
from dotenv import load_dotenv
from supabase import create_client

# Load env from backend dir
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
load_dotenv()

def fix_active_status():
    print("--- 🔧 FIX: ATIVAR PERSONA STANDARD ---")
    
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        print("❌ Erro: Credenciais do Supabase não encontradas no .env")
        return

    supabase = create_client(url, key)
    
    print("\n>> Atualizando is_active=True para name='standard'...")
    
    # Update
    res = supabase.table("personas").update({"is_active": True}).eq("name", "standard").execute()
    
    if res.data:
        print(f"✅ Sucesso! Atualizado: {res.data[0]['name']} -> is_active={res.data[0]['is_active']}")
    else:
        print("❌ Falha: Nenhuma linha atualizada. Verifique se o nome é 'standard'.")

if __name__ == "__main__":
    fix_active_status()
