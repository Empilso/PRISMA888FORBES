import os
import sys
import pandas as pd
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

from src.integrations.tcesp_client import get_despesas

def verify_live_tcesp():
    municipio_slug = "votorantim"
    ano = 2025
    mes = 1
    
    print(f"\n📡 CONECTANDO AO TCESP (Live API) - {municipio_slug.upper()} {mes}/{ano}...\n")
    
    try:
        # Fetch data directly from API (no DB interaction)
        despesas = get_despesas(municipio_slug, ano, mes)
        
        if not despesas:
            print("❌ API retornou lista vazia!")
            return

        count = len(despesas)
        print(f"✅ API Retornou {count} registros.")
        
        # Convert to DataFrame for easy calc
        df = pd.DataFrame(despesas)
        
        # Numeric conversion (Format: "1.234,56")
        df["vl_despesa"] = df["vl_despesa"].astype(str).str.replace('.', '', regex=False).str.replace(',', '.', regex=False)
        df["vl_despesa"] = pd.to_numeric(df["vl_despesa"], errors='coerce').fillna(0.0)
        
        # Analyze by Event Type
        print(f"\n📊 TOTAIS DA API (FONTE ORIGINAL):")
        event_stats = df.groupby("evento")["vl_despesa"].sum().sort_values(ascending=False)
        print(event_stats)
        
        total_api = df["vl_despesa"].sum()
        print(f"\n💰 SOMA TOTAL BRUTA (API): R$ {total_api:,.2f}")
        
    except Exception as e:
        print(f"❌ Erro ao consultar API: {e}")

if __name__ == "__main__":
    verify_live_tcesp()
