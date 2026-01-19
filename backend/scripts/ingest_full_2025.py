import os
import sys
import time
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv("backend/.env")

from src.workers.tcesp_worker import (
    fetch_and_store_municipal_expenses,
    normalize_municipal_expenses,
    extract_and_link_suppliers
)

def run_full_ingestion_2025():
    municipio = "votorantim"
    ano = 2025
    months = list(range(1, 13)) # 1 to 12
    
    print(f"🚀 INICIANDO INGESTÃO ANUAL: {municipio.upper()} - {ano} (Jan-Dez)")
    total_records = 0
    
    for mes in months:
        print(f"\n📅 PROCESSANDO MÊS {mes}/{ano}...")
        
        max_retries = 3
        for attempt in range(max_retries):
            try:
                # 1. FETCH
                c_fetch = fetch_and_store_municipal_expenses(municipio, ano, mes)
                # 2. NORMALIZE
                c_norm = normalize_municipal_expenses(municipio, ano, mes)
                # 3. LINK
                c_supp = extract_and_link_suppliers(municipio, ano, mes)
                
                print(f"   ✅ Mês {mes}: {c_norm} registros processados.")
                total_records += c_norm
                
                # Gentle pacing to avoid API saturation
                time.sleep(1)
                break # Success, exit retry loop
            
            except Exception as e:
                print(f"   ⚠️ Tentativa {attempt+1}/{max_retries} falhou para Mês {mes}: {e}")
                time.sleep(5) # Wait before retry
                if attempt == max_retries - 1:
                    print(f"   ❌ Erro persistente no mês {mes}. Pulando...")


    print(f"\n🎉 INGESTÃO ANUAL CONCLUÍDA!")
    print(f"Total de registros processados em 2025: {total_records}")

if __name__ == "__main__":
    run_full_ingestion_2025()
