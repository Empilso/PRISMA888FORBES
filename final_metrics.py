import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv("backend/.env")

def get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, key)

def metrics():
    supabase = get_supabase()
    
    # 1. Total de pagamentos vinculados
    res_pay = supabase.table("amendment_payments").select("id").not_.is_("amendment_id", "null").execute()
    total_pays = len(res_pay.data or [])
    
    # 2. Total de emendas territorializadas por município real (BA)
    res_am = supabase.table("parliamentary_amendments").select("municipio_original").execute()
    ams = res_am.data or []
    
    cities = set()
    non_territorialized = 0
    for a in ams:
        mun = a.get('municipio_original') or ""
        if mun and mun != "Estado da Bahia" and "-BA" in mun:
            cities.add(mun.replace("-BA", ""))
        else:
            non_territorialized += 1
            
    print(f"MÉTRICAS FINAIS PRISMA888:")
    print(f"- Total de pagamentos vinculados e visíveis: {total_pays}")
    print(f"- Número de municípios ativos na Rastreabilidade: {len(cities)}")
    print(f"- Emendas 'Não Territorializadas' restantes: {non_territorialized}")
    print(f"- Municípios identificados: {sorted(list(cities))}")

if __name__ == "__main__":
    metrics()
