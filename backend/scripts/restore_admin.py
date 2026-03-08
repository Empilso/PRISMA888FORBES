import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

print("--- BUSCANDO USER ID DO ADMIN ---")
users = supabase.auth.admin.list_users()
admin_user = None
for u in users:
    if u.email == "admin@prisma888.com":
        admin_user = u
        break

if admin_user:
    print(f"Admin ID: {admin_user.id}")
    # Criar profile
    res = supabase.table("profiles").upsert({
        "id": admin_user.id,
        "email": admin_user.email,
        "full_name": "Admin Prisma",
        "role": "super_admin"
    }).execute()
    print("Profile Admin Criado:", res.data)
else:
    print("Admin nao encontrado no Auth.")
