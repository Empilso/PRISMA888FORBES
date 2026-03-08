import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

print("--- TESTANDO ACESSO À TABELA ORGANIZATIONS ---")
try:
    result = supabase.table("organizations").select("*").execute()
    print(f"Sucesso! Encontradas {len(result.data)} organizações.")
    for org in result.data:
        print(f"- {org['name']} (Slug: {org['slug']})")
except Exception as e:
    print(f"ERRO ao listar organizações: {e}")

print("\n--- TESTANDO TABELA CAMPAIGNS ---")
try:
    result = supabase.table("campaigns").select("id, name, organization_id").execute()
    print(f"Sucesso! Encontradas {len(result.data)} campanhas.")
    for camp in result.data:
        print(f"- {camp['name']} (Org ID: {camp.get('organization_id')})")
except Exception as e:
    print(f"ERRO ao listar campanhas: {e}")
