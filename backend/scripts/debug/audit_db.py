import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

def audit_database():
    print("📋 Auditoria de Campanhas e Locais")
    
    # 1. Listar Campanhas
    res_c = supabase.table("campaigns").select("id, candidate_name, city").execute()
    campaigns = res_c.data
    
    print(f"\n🏢 Total de Campanhas: {len(campaigns)}")
    for c in campaigns:
        # Contar locais por campanha
        res_l = supabase.table("locations").select("id", count="exact").eq("campaign_id", c['id']).execute()
        print(f"   - {c['candidate_name']} ({c['city']}): {res_l.count} locais [ID: {c['id']}]")

    # 2. Verificar se existem locais sem campaign_id (órfãos)
    res_o = supabase.table("locations").select("id", count="exact").is_("campaign_id", "null").execute()
    if res_o.count > 0:
        print(f"\n⚠️ Alerta: {res_o.count} locais órfãos (sem campaign_id) encontrados!")

    # 3. Verificar o total absoluto na tabela locations
    res_t = supabase.table("locations").select("id", count="exact").execute()
    print(f"\n📊 Total absoluto na tabela 'locations': {res_t.count}")

if __name__ == "__main__":
    audit_database()
