
import os
import sys
import requests
from dotenv import load_dotenv
from supabase import create_client

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

load_dotenv("backend/.env")

def check_data():
    # 1. Check Database
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    print("\n--- BANCO DE DADOS (SUPABASE) ---")
    if not url or not key:
        print("❌ Credenciais do Supabase não encontradas.")
    else:
        try:
            supabase = create_client(url, key)
            # Check 2024
            res24 = supabase.table("municipal_expenses").select("count", count="exact").eq("ano", 2024).execute()
            count24 = res24.count
            print(f"Registros de 2024: {count24}")
            
            # Check 2025
            res25 = supabase.table("municipal_expenses").select("count", count="exact").eq("ano", 2025).execute()
            count25 = res25.count
            print(f"Registros de 2025: {count25}")
        except Exception as e:
            print(f"❌ Erro ao conectar no Supabase: {e}")

    # 2. Check API TCESP
    print("\n--- API OFICIAL (TCESP) ---")
    tcesp_url = "https://transparencia.tce.sp.gov.br/api/json/despesas/votorantim/2025/1"
    print(f"Consultando: {tcesp_url} ...")
    
    try:
        resp = requests.get(tcesp_url, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list) and len(data) > 0:
                print(f"✅ SUCESSO! A API já retornou {len(data)} registros para Jan/2025.")
                print("Exemplo:", data[0])
            else:
                print("⚠️ API retornou lista vazia. (Provavelmente dados de 2025 ainda não processados pelo TCE)")
        elif resp.status_code == 404:
            print("⚠️ API retornou 404. (Dados de 2025 ainda não existem)")
        else:
            print(f"⚠️ Status Code: {resp.status_code}")
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")

if __name__ == "__main__":
    check_data()
