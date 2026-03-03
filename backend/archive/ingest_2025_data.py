
import os
import sys
from dotenv import load_dotenv

# Add parent directory to path to allow imports from src
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv("backend/.env")

from src.workers.tcesp_worker import (
    fetch_and_store_municipal_expenses,
    normalize_municipal_expenses,
    extract_and_link_suppliers
)

def run_ingestion_2025():
    municipio = "votorantim"
    ano = 2025
    mes = 1
    
    print(f"🚀 INICIANDO INGESTÃO COMPLETA: {municipio.upper()} - {mes}/{ano}")
    
    # 1. FETCH (Bronze Layer)
    print("\n--- PASSO 1: BAIXANDO DADOS (FETCH) ---")
    try:
        count_raw = fetch_and_store_municipal_expenses(municipio, ano, mes)
        print(f"✅ Download concluído: {count_raw} registros salvos em 'raw'.")
    except Exception as e:
        print(f"❌ Erro no Fetch: {e}")
        return

    # 2. NORMALIZE (Silver Layer)
    print("\n--- PASSO 2: NORMALIZANDO DADOS (ETL) ---")
    try:
        count_norm = normalize_municipal_expenses(municipio, ano, mes)
        print(f"✅ Normalização concluída: {count_norm} registros processados para analytics.")
    except Exception as e:
        print(f"❌ Erro na Normalização: {e}")
        return

    # 3. SUPPLIERS (Enrichment)
    print("\n--- PASSO 3: EXTRAINDO FORNECEDORES ---")
    try:
        count_supp = extract_and_link_suppliers(municipio, ano, mes)
        print(f"✅ Fornecedores processados: {count_supp} identificados.")
    except Exception as e:
        print(f"❌ Erro na Extração de Fornecedores: {e}")
        return

    print("\n🎉 SUCESSO! Ciclo de ingestão finalizado.")
    print("O Radar Fiscal agora tem acesso aos dados oficiais de Jan/2025.")

if __name__ == "__main__":
    run_ingestion_2025()
