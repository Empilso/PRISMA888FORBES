import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Variaveis do Supabase nao configuradas no .env")
    exit(1)

supabase = create_client(url, key)

print("--- CANDIDATOS ATIVOS (CAMPAIGNS) ---")
res = supabase.table("campaigns").select("id, candidate_name").execute()
for c in res.data:
    print(f"- {c['candidate_name']} ({c['id']})")

print("\n--- PERFIS CADASTRADOS (PROFILES) ---")
prof = supabase.table("profiles").select("id, email, full_name, role").execute()
for p in prof.data:
    print(f"- {p.get('full_name', 'Sem Nome')[:20]} | {p.get('email')} | {p.get('role')}")

try:
    print("\n--- USUARIOS NO AUTH (LOGIN REAL) ---")
    users = supabase.auth.admin.list_users()
    for u in users:
        print(f"- {u.email} | Last Sign In: {u.last_sign_in_at}")
except Exception as e:
    print(f"Erro ao acessar auth.admin: {e}")
