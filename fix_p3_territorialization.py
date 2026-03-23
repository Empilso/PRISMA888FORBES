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
    
    print("=== PROBLEMA 3: TERRITORIALIZAÇÃO AUTOMÁTICA ===")
    
    # 1. Identificar emendas sem município_destino mas com municípios extraídos
    query = """
    SELECT id, objeto_detalhado, entidades_extraidas->'municipios_ba' as municipios_extraidos 
    FROM parliamentary_amendments 
    WHERE (municipio_destino IS NULL OR municipio_destino = '' OR municipio_destino = 'Estado da Bahia') 
    AND entidades_extraidas->'municipios_ba' IS NOT NULL 
    AND jsonb_array_length(entidades_extraidas->'municipios_ba') > 0
    """
    
    # Executando via script Python (seleção manual pois o Supabase-py não tem raw sql direto fácil)
    res = supabase.table("parliamentary_amendments").select("id, objeto_detalhado, entidades_extraidas, municipio_original").execute()
    ams = res.data or []
    
    targets = []
    for a in ams:
        mun_orig = (a.get('municipio_original') or "").strip()
        # Se for Não Territorializada
        if not mun_orig or mun_orig == "Estado da Bahia":
            ent = a.get('entidades_extraidas') or {}
            muns = ent.get('municipios_ba', [])
            if muns:
                targets.append({
                    "id": a['id'],
                    "objeto": a['objeto_detalhado'][:50],
                    "municipio_detectado": muns[0]
                })

    print(f"Encontradas {len(targets)} emendas aptas para territorialização automática.")
    
    count = 0
    for t in targets:
        print(f"  - Movendo '{t['objeto']}...' para {t['municipio_detectado']}")
        supabase.table("parliamentary_amendments").update({
            "municipio_original": f"{t['municipio_detectado']}-BA" # Padronizando com sufixo BA
        }).eq("id", t['id']).execute()
        count += 1
        
    print(f"\nResultado P3: {count} emendas territorializadas com sucesso!")

if __name__ == "__main__":
    fix()
