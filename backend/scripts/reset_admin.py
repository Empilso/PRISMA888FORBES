
import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

# Add parent dir to path if needed for imports, though here we use direct libs
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Erro: Credenciais do Supabase não encontradas no .env")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

ADMIN_EMAIL = "admin@prisma888.com"
NEW_PASSWORD = "Password123!" # Senha forte padrão

def reset_admin():
    print(f"🔄 Tentando resetar/criar admin: {ADMIN_EMAIL}")
    
    try:
        # 1. Tentar encontrar usuário
        # Nota: list_users pode ter paginação, mas vamos assumir que o admin aparece nos primeiros ou buscar via filtro se possível
        # A API admin do python client pode variar, vamos tentar list_users filtrado ou raw request
        
        users = supabase.auth.admin.list_users()
        admin_user = None
        
        for u in users:
            if u.email == ADMIN_EMAIL:
                admin_user = u
                break
        
        if admin_user:
            print(f"✅ Usuário encontrado: {admin_user.id}")
            # 2. Atualizar senha
            supabase.auth.admin.update_user_by_id(
                admin_user.id, 
                {"password": NEW_PASSWORD}
            )
            print(f"✅ Senha atualizada com sucesso para: {NEW_PASSWORD}")
            
            # Garantir metadados de admin
            supabase.auth.admin.update_user_by_id(
                admin_user.id,
                {"user_metadata": {"role": "super_admin", "full_name": "Sistema Admin"}}
            )
            print("✅ Metadados atualizados (role=super_admin)")
            
        else:
            print("⚠️ Usuário não encontrado. Criando novo admin...")
            # 3. Criar usuário
            attributes = {
                "email": ADMIN_EMAIL,
                "password": NEW_PASSWORD,
                "email_confirm": True,
                "user_metadata": {"role": "super_admin", "full_name": "Sistema Admin"}
            }
            user = supabase.auth.admin.create_user(attributes)
            print(f"✅ Usuário criado com sucesso: {user.id}")
            print(f"✅ Senha definida: {NEW_PASSWORD}")

    except Exception as e:
        print(f"❌ Erro ao resetar admin: {e}")
        # Tentar via requests raw se SDK falhar (como no debug_list_auth_users)
        try:
            import requests
            headers = {
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json"
            }
            # List users raw
            r = requests.get(f"{SUPABASE_URL}/auth/v1/admin/users", headers=headers)
            if r.status_code == 200:
                raw_users = r.json().get("users", [])
                raw_admin = next((u for u in raw_users if u["email"] == ADMIN_EMAIL), None)
                
                if raw_admin:
                    # Update
                    uid = raw_admin["id"]
                    url = f"{SUPABASE_URL}/auth/v1/admin/users/{uid}"
                    data = {"password": NEW_PASSWORD, "user_metadata": {"role": "super_admin"}}
                    r2 = requests.put(url, headers=headers, json=data)
                    if r2.status_code == 200:
                         print(f"✅ (Raw API) Senha atualizada para: {NEW_PASSWORD}")
                    else:
                         print(f"❌ (Raw API) Falha no update: {r2.text}")
                else:
                    # Create
                    url = f"{SUPABASE_URL}/auth/v1/admin/users"
                    data = {
                        "email": ADMIN_EMAIL,
                        "password": NEW_PASSWORD,
                        "email_confirm": True,
                        "user_metadata": {"role": "super_admin", "full_name": "Sistema Admin"}
                    }
                    r3 = requests.post(url, headers=headers, json=data)
                    if r3.status_code == 200:
                         print(f"✅ (Raw API) Admin criado com senha: {NEW_PASSWORD}")
                    else:
                         print(f"❌ (Raw API) Falha na criação: {r3.text}")
            
        except Exception as e2:
             print(f"❌ Erro fatal: {e2}")

if __name__ == "__main__":
    reset_admin()
