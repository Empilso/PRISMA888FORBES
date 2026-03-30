import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv("../backend/.env")

def get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, key)

def debug():
    supabase = get_supabase()
    res = supabase.table("parliamentary_amendments").select("id, municipio_original, entidades_extraidas, objeto_detalhado").limit(20).execute()
    data = res.data or []
    print(f"Total registros na amostra: {len(data)}")
    for i, d in enumerate(data):
        ent = d.get('entidades_extraidas') or {}
        muns = ent.get('municipios_ba', [])
        print(f"{i}: ID={d['id'][:6]}... | MunOrig='{d['municipio_original']}' | MunsBA={muns}")

if __name__ == "__main__":
    debug()
