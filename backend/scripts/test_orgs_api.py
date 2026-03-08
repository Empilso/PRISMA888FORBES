import os
import requests
from dotenv import load_dotenv

load_dotenv()
backend_url = "http://localhost:8000"

# Precisamos de um token válido para testar.
# Como não tenho um token de usuário logado facilmente, 
# vou tentar simular o que o backend faz internamente.

from supabase import create_client
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

print("--- TESTANDO LOGICA INTERNA DE /api/organizations ---")
try:
    # 1. Simular list_organizations
    result = supabase.table("organizations").select("*").execute()
    print(f"Listagem direta ok: {len(result.data)} orgs")
    
    # 2. Simular get_current_user_id (apenas se tivermos um token, mas vamos pular e focar no que pode dar 500)
    
    # O que mais pode dar 500?
    # No list_organizations: 
    # except Exception as e: print(f"Error listing orgs: {e}")
    
except Exception as e:
    print(f"ERRO: {e}")

# Tentar fazer um request real (vai dar 401 ou 500)
print("\n--- FAZENDO REQUEST PARA http://localhost:8000/api/organizations ---")
try:
    res = requests.get(f"{backend_url}/api/organizations")
    print(f"Status: {res.status_code}")
    print(f"Response: {res.text}")
except Exception as e:
    print(f"ERRO DE CONEXÃO: {e}")
