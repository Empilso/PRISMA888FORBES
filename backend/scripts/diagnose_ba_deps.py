import os
from supabase import create_client

# Chaves estáticas descobertas do .env do projeto
SUPABASE_URL = "https://gsmmanjpsdbfwmnmtgpg.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzbW1hbmpwc2RiZndtbm10Z3BnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI5NzI1MywiZXhwIjoyMDc4ODczMjUzfQ.kmXCryVGBRJ4FctN2tb0zJsTNFfI69D9uWCcndv-nDE"

client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

try:
    print("=== CANDIDATOS ATRELADOS À BAHIA ===")
    
    # Busca com filtro de cidade (inner join em cities)
    res_ba_cities = client.table("politicians").select("name, tipo, cities!inner(name, state)").eq("cities.state", "BA").execute()
    
    encontrados_ba = set()
    
    if res_ba_cities.data:
        for p in res_ba_cities.data:
            city_name = p.get('cities', {}).get('name', 'N/A')
            print(f"- {p['name']} | Tipo: {p['tipo']} | Ref. Cidade: {city_name}")
            encontrados_ba.add(p['name'])
    
    # Vamos buscar também "todos" e printar o que der match em BA se houver outra forma de vínculo
    print("\n=== TODOS OS DEPUTADOS ===")
    res_dep = client.table("politicians").select("name, tipo").ilike("tipo", "%Deputado%").execute()
    
    if res_dep.data:
        distinct_tipos = set()
        for p in res_dep.data:
            print(f"- {p['name']} | Tipo Exato: {p['tipo']}")
            distinct_tipos.add(p['tipo'])
            
        print("\n=> Tipos detalhados encontrados para Deputados:", list(distinct_tipos))
    else:
        print("Nenhum deputado encontrado.")
        
except Exception as e:
    print("ERRO:", e)
