import os
import json
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

def migrate():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("❌ Erro: Credenciais do Supabase não encontradas no .env")
        return

    supabase = create_client(url, key)

    # 1. Aplicar Migração SQL (Simulada via RPC se disponível, ou assumindo que o usuário rodou)
    # Como não temos acesso direto ao SQL Editor via API sem RPC definido, 
    # vamos tentar verificar se a tabela existe primeiro.
    
    print("🔍 Verificando tabela social_monitors...")
    try:
        supabase.table("social_monitors").select("count", count="exact").limit(1).execute()
        print("✅ Tabela social_monitors já existe.")
    except Exception:
        print("⚠️ Tabela social_monitors não encontrada. Criando via SQL (se possível pela lib)...")
        # Nota: Se falhar aqui, o usuário precisará rodar o SQL manualmente no Supabase Studio.
        print("💡 Por favor, certifique-se de rodar o arquivo migrations/20260307_create_social_monitors_fix.sql no Supabase Studio.")
        return

    # 2. Migrar dados de campaigns.social_links
    print("🚀 Iniciando migração de perfis...")
    campaigns = supabase.table("campaigns").select("id, social_links").execute()
    
    total_migrated = 0
    for camp in campaigns.data:
        campaign_id = camp["id"]
        social_links = camp.get("social_links") or {}
        
        # Instagram
        for handle in social_links.get("instagram", []):
            try:
                supabase.table("social_monitors").insert({
                    "campaign_id": campaign_id,
                    "platform": "instagram",
                    "target": handle,
                    "target_type": "profile",
                    "is_active": True
                }).execute()
                total_migrated += 1
                print(f"  + IG {handle} migrado para campanha {campaign_id}")
            except Exception as e:
                print(f"  - Erro ao migrar IG {handle}: {e}")

        # TikTok
        for handle in social_links.get("tiktok", []):
            try:
                supabase.table("social_monitors").insert({
                    "campaign_id": campaign_id,
                    "platform": "tiktok",
                    "target": handle,
                    "target_type": "profile",
                    "is_active": True
                }).execute()
                total_migrated += 1
                print(f"  + TK {handle} migrado para campanha {campaign_id}")
            except Exception as e:
                print(f"  - Erro ao migrar TK {handle}: {e}")

    print(f"✅ Migração concluída! {total_migrated} perfis inseridos na tabela tática.")

if __name__ == "__main__":
    migrate()
