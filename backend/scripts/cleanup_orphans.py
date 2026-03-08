import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

def cleanup():
    print("--- 🔍 INICIANDO FAXINA DE USUÁRIOS ÓRFÃOS ---")
    
    # 1. Pegar todos os usuários do Auth
    users = supabase.auth.admin.list_users()
    
    # 2. Pegar todas as campanhas e perfis
    campaigns = supabase.table("campaigns").select("id").execute().data
    campaign_ids = {c["id"] for c in campaigns}
    
    profiles = supabase.table("profiles").select("id").execute().data
    profile_ids = {p["id"] for p in profiles}
    
    deleted_count = 0
    
    for user in users:
        # Pular o Admin
        if user.email == "admin@prisma888.com":
            continue
            
        is_orphan = False
        reason = ""
        
        # Check by metadata
        meta_camp_id = user.user_metadata.get("campaign_id")
        
        if not meta_camp_id:
            is_orphan = True
            reason = "Sem campaign_id nos metadados"
        elif meta_camp_id not in campaign_ids:
            is_orphan = True
            reason = f"Campanha {meta_camp_id} não existe mais"
            
        # Check by profile
        if user.id not in profile_ids and not is_orphan:
            # Se não tem profile mas tem campanha, talvez seja um erro de criação parcial
            is_orphan = True
            reason = "Sem registro na tabela profiles"

        if is_orphan:
            print(f"🗑️ Deletando órfão: {user.email} (Motivo: {reason})")
            supabase.auth.admin.delete_user(user.id)
            deleted_count += 1

    print(f"\n--- ✅ FAXINA CONCLUÍDA: {deleted_count} usuários removidos ---")

if __name__ == "__main__":
    cleanup()
