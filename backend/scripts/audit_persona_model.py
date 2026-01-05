
import os
import sys
from dotenv import load_dotenv
from supabase import create_client

# Load env from backend dir
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
load_dotenv()

def audit_persona():
    print("--- 🕵️ AUDITORIA DE PERSONA (READ-ONLY) ---")
    
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        print("❌ Erro: Credenciais do Supabase não encontradas no .env")
        return

    supabase = create_client(url, key)
    
    # BUSCA PELA PERSONA 'standard'
    print("\n>> Buscando persona onde name='standard' ou slug='standard'...")
    
    # Tenta buscar por name
    res = supabase.table("personas").select("*").eq("name", "standard").execute()
    data = res.data
    
    if not data:
        # Se não achar, tenta slug se a coluna existir (mas o código usa name)
        print("   ⚠️ Não encontrou por name='standard'.")
    else:
        print(f"   ✅ Encontrada(s) {len(data)} persona(s) com name='standard'.")
        for p in data:
            print(f"\n   [ID]: {p.get('id')}")
            print(f"   [NAME]: {p.get('name')}")
            print(f"   [IS_ACTIVE]: {p.get('is_active')}")  # ← CHAVE!
            print(f"   [LLM_MODEL] (Coluna direta): {p.get('llm_model')}")
            
            config = p.get('config', {})
            print(f"   [CONFIG->MANAGER_MODEL]: {config.get('manager_model')}")
            print(f"   [CONFIG->TEMPERATURE]: {config.get('temperature')}")
            print(f"   [UPDATED_AT]: {p.get('updated_at')}")
            print("-" * 30)

if __name__ == "__main__":
    audit_persona()
