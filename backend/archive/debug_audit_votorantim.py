
import os
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env')

def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("Supabase credentials not found")
    return create_client(url, key)

def audit_votorantim_data():
    supabase = get_supabase_client()
    
    print("--- Auditoria de Dados: Votorantim ---")
    
    # Check RAW table
    raw_res = supabase.table("municipal_expenses_raw") \
        .select("ano, mes", count="exact") \
        .eq("municipio_slug", "votorantim") \
        .execute()
    
    print(f"Total de meses (Raw): {raw_res.count if raw_res.count else 0}")
    if raw_res.data:
        periods = [f"{d['mes']}/{d['ano']}" for d in raw_res.data]
        print(f"Períodos encontrados (Raw): {', '.join(periods)}")
    
    # Check NORMALIZED table
    norm_res = supabase.table("municipal_expenses") \
        .select("id", count="exact") \
        .eq("municipio_slug", "votorantim") \
        .limit(1) \
        .execute()
    
    print(f"Total de registros (Normalizados): {norm_res.count if norm_res.count else 0}")
    
    # Sample record
    if norm_res.count > 0:
        sample = supabase.table("municipal_expenses") \
            .select("*") \
            .eq("municipio_slug", "votorantim") \
            .limit(1) \
            .execute()
        print("\nAmostra de Registro:")
        print(sample.data[0])

if __name__ == "__main__":
    audit_votorantim_data()
