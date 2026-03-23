import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

campaign_id = "045a77c6-38b2-4641-a963-7896c9f2179b" # Campanha de Votorantim que o backend processou por último

def check_duplicates():
    print(f"🔍 Investigando locais para a campanha: {campaign_id}")
    
    # 1. Contagem total
    res = supabase.table("locations").select("id", count="exact").eq("campaign_id", campaign_id).execute()
    total = res.count
    print(f"📊 Total de registros em 'locations': {total}")
    
    # 2. Listar nomes e endereços para ver duplicidade
    res = supabase.table("locations").select("name, address").eq("campaign_id", campaign_id).execute()
    locations = res.data
    
    seen = {}
    duplicates = []
    for loc in locations:
        key = (loc['name'], loc['address'])
        if key in seen:
            seen[key] += 1
            duplicates.append(loc)
        else:
            seen[key] = 1
            
    print(f"📍 Locais únicos encontrados: {len(seen)}")
    if duplicates:
        print(f"⚠️ Encontrados {len(duplicates)} registros duplicados!")
        for loc in duplicates[:5]:
            print(f"   - {loc['name']} ({loc['address']})")
    else:
        print("✅ Nenhum registro duplicado encontrado na estrutura de dados.")

if __name__ == "__main__":
    check_duplicates()
