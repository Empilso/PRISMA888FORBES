import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

# Campanha do Laércio (Senhor do Bonfim)
laercio_id = "754b61ee-6ca1-48aa-8375-8c59d9fb6db2"

def validate_isolation():
    print(f"🕵️ Validando isolamento para Laércio ({laercio_id})")
    
    # 1. Pegar localizações do Laércio
    res_l = supabase.table("locations").select("id").eq("campaign_id", laercio_id).execute()
    loc_ids = [l['id'] for l in res_l.data]
    print(f"📍 Laércio possui {len(loc_ids)} localizações.")
    
    # 2. Buscar resultados dessas localizações
    res_r = supabase.table("location_results").select("candidate_name").in_("location_id", loc_ids).execute()
    results = res_r.data
    
    candidates = set(r['candidate_name'] for r in results)
    print(f"👥 Candidatos encontrados nas seções do Laércio: {candidates}")
    
    # Conferir se tem Weber ou Votorantim
    leaks = [c for c in candidates if "WEBER" in c.upper() or "VOTORANTIM" in c.upper()]
    if leaks:
        print(f"❌ VAZAMENTO DETECTADO: {leaks}")
    else:
        print("✅ Isolamento confirmado! Nenhum dado de Votorantim encontrado nas seções do Laércio.")

if __name__ == "__main__":
    validate_isolation()
