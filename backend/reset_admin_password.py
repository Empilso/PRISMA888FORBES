
import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

# Carregar variáveis de ambiente
# Tenta carregar do frontend/.env.local primeiro pois é onde as chaves costumam estar
load_dotenv("frontend/.env.local")

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from environment.")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def reset_password(email, new_password):
    print(f"🔄 Buscando usuário: {email}...")
    try:
        # 1. Localizar o usuário pelo email
        users_resp = supabase.auth.admin.list_users()
        target_user = None
        
        for user in users_resp:
            if user.email == email:
                target_user = user
                break
        
        if not target_user:
            print(f"❌ Usuário {email} não encontrado.")
            return

        print(f"✅ Usuário encontrado. ID: {target_user.id}")
        
        # 2. Resetar a senha
        res = supabase.auth.admin.update_user_by_id(
            target_user.id,
            {"password": new_password}
        )
        
        print(f"🎉 Senha de {email} resetada com sucesso!")
        
    except Exception as e:
        print(f"❌ Erro ao resetar senha: {e}")

if __name__ == "__main__":
    EMAIL = "admin@prisma888.com"
    NEW_PASSWORD = "admin123"
    reset_password(EMAIL, NEW_PASSWORD)
