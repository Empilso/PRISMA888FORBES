import os
import sys
import argparse
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv("backend/.env")

from src.workers.tcesp_worker import (
    fetch_and_store_municipal_expenses,
    normalize_municipal_expenses,
    extract_and_link_suppliers
)

def ingest_month(mes: int):
    municipio = "votorantim"
    ano = 2025
    
    print(f"\n🚀 PROCESSANDO INDIVIDUALMENTE: {municipio.upper()} - Mês {mes}/{ano}")
    
    try:
        # 1. FETCH
        print(f"   📥 [1/3] Baixando dados...")
        c_fetch = fetch_and_store_municipal_expenses(municipio, ano, mes)
        print(f"      ✅ Fetch OK: {c_fetch} registros.")
        
        if c_fetch == 0:
            print("      ⚠️ Nenhum dado bruto retornado. O mês pode não estar fechado ainda.")
            return

        # 2. NORMALIZE
        print(f"   ⚙️ [2/3] Normalizando...")
        c_norm = normalize_municipal_expenses(municipio, ano, mes)
        print(f"      ✅ Normalização OK: {c_norm} registros.")

        # 3. LINK
        print(f"   🔗 [3/3] Linkando Fornecedores...")
        c_supp = extract_and_link_suppliers(municipio, ano, mes)
        print(f"      ✅ Fornecedores OK: {c_supp} processados.")
        
        print(f"🎉 SUCESSO! Mês {mes} concluído.")

    except Exception as e:
        print(f"❌ ERRO CRÍTICO no Mês {mes}: {e}")
        sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Ingest single month data')
    parser.add_argument('mes', type=int, help='Month number (1-12)')
    args = parser.parse_args()
    
    ingest_month(args.mes)
