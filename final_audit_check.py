import os
import json
from dotenv import load_dotenv
from supabase import create_client

load_dotenv("backend/.env")

def get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, key)

def audit():
    supabase = get_supabase()
    
    print("=== EVIDÊNCIA PROBLEMA 1 (JOIN) ===")
    am_id = "b03fcfe5-2904-4146-8b9b-cfbdd3bc2e92" # Ecofestival
    pay_res = supabase.table("amendment_payments").select("id, credor, valor_pago").eq("amendment_id", am_id).execute()
    pays = pay_res.data or []
    print(f"Pagamentos vinculados ao Ecofestival: {len(pays)}")
    for p in pays:
        print(f"  - {p['credor']} | R$ {p['valor_pago']}")

    print("\n=== EVIDÊNCIA PROBLEMA 2 (BLOCO FORENSE) ===")
    # Simular o JSON retornado pelo endpoint para o usuário ver
    url = f"http://localhost:8000/api/emendas/{am_id}/dossie_detalhe"
    import requests
    try:
        res = requests.get(url)
        data = res.json()
        print(f"Campo 'entidades_extraidas' presente: {'entidades_extraidas' in data}")
        print(f"Total Entidades: {data.get('entidades_extraidas', {}).get('total_entidades', 0)}")
    except:
        print("Erro ao chamar endpoint local.")

    print("\n=== EVIDÊNCIA PROBLEMA 3 (TERRITORIALIZAÇÃO) ===")
    # Query SQL solicitada adaptada para o log
    res_ter = supabase.table("parliamentary_amendments").select("id, municipio_original").execute()
    data_ter = res_ter.data or []
    cities = set()
    for d in data_ter:
        m = d.get('municipio_original') or ""
        if m and m != "Estado da Bahia" and "-BA" in m:
             cities.add(m.replace("-BA", ""))
    
    print(f"Número de Municípios Reais Ativos: {len(cities)}")
    print(f"Cidades: {sorted(list(cities))}")

if __name__ == "__main__":
    audit()
