import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

print("--- VERIFICANDO METADADOS DO ADMIN ---")
users = supabase.auth.admin.list_users()
admin_user = None
for u in users:
    if u.email == "admin@prisma888.com":
        admin_user = u
        break

if admin_user:
    metadata = admin_user.user_metadata or {}
    print(f"Metadados Atuais: {metadata}")
    
    if metadata.get("role") != "super_admin":
        print("Atualizando role para super_admin...")
        supabase.auth.admin.update_user_by_id(
            admin_user.id,
            attributes={"user_metadata": {**metadata, "role": "super_admin"}}
        )
        print("Metadados atualizados com sucesso!")
    else:
        print("Role ja esta correta.")
else:
    print("Admin nao encontrado.")
