
import os
import sys
import json
from dotenv import load_dotenv
from supabase import create_client

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

load_dotenv()

def check_keys():
    print("--- 🕵️ AUDITORIA DE CHAVES NO SUPABASE ---")
    
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    supabase = create_client(url, key)
    
    # 1. Check Personas
    print("\n>> [1/2] Verificando Personas...")
    res = supabase.table("personas").select("name, config").execute()
    found = False
    if res.data:
        for p in res.data:
            cfg_str = str(p.get('config', {}))
            if "sk-" in cfg_str or "key" in cfg_str.lower():
                 print(f"   ⚠️ SUSPEITA em persona '{p['name']}': Possível chave na config.")
                 found = True
    
    if not found:
        print("   ✅ Nenhuma chave explícita encontrada em personas.")

    # 2. Check Agents
    print("\n>> [2/2] Verificando Agents...")
    try:
        res = supabase.table("agents").select("name, config").execute()
        found = False
        if res.data:
            for a in res.data:
                cfg_str = str(a.get('config', {}))
                if "sk-" in cfg_str or "key" in cfg_str.lower():
                     print(f"   ⚠️ SUSPEITA em agente '{a['name']}': Possível chave na config.")
                     found = True
        if not found:
            print("   ✅ Nenhuma chave explícita encontrada em agents.")
    except Exception as e:
        print(f"   ⚠️ Tabela agents pode não existir ou erro: {e}")

if __name__ == "__main__":
    check_keys()
