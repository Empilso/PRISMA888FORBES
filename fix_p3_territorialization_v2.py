import os
import json
from dotenv import load_dotenv
from supabase import create_client

load_dotenv("backend/.env")

def get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, key)

def fix():
    supabase = get_supabase()
    
    # Lista de municípios que frequentemente são falsos positivos em contextos de saúde/educação
    black_list = ["Saúde", "Educação", "Bahia"]
    
    print("=== REFINANDO TERRITORIALIZAÇÃO AUTOMÁTICA (v2) ===")
    
    res = supabase.table("parliamentary_amendments").select("id, objeto_detalhado, entidades_extraidas, municipio_original").execute()
    ams = res.data or []
    
    targets = []
    for a in ams:
        mun_orig = (a.get('municipio_original') or "").strip()
        # Se for Não Territorializada ou foi marcada erradamente como 'Saúde-BA'
        if not mun_orig or mun_orig in ["Estado da Bahia", "Saúde-BA", "Educação-BA"]:
            ent = a.get('entidades_extraidas') or {}
            muns = ent.get('municipios_ba', [])
            
            # Filtra a lista
            valid_muns = [m for m in muns if m not in black_list]
            
            if valid_muns:
                targets.append({
                    "id": a['id'],
                    "objeto": a['objeto_detalhado'][:50],
                    "municipio_detectado": valid_muns[0]
                })

    print(f"Encontradas {len(targets)} emendas aptas para territorialização real.")
    
    count = 0
    for t in targets:
        print(f"  - Movendo '{t['objeto']}...' para {t['municipio_detectado']}")
        supabase.table("parliamentary_amendments").update({
            "municipio_original": f"{t['municipio_detectado']}-BA"
        }).eq("id", t['id']).execute()
        count += 1
        
    print(f"\nResultado P3 (v2): {count} emendas territorializadas com sucesso!")

if __name__ == "__main__":
    fix()
