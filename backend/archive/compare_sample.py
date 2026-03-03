import os
import sys
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv("backend/.env")

def generate_comparison_list():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    supabase = create_client(url, key)
    
    print("\n📋 AMOSTRA DE DADOS: JANEIRO/2025 (PARA CONFERÊNCIA)\n")
    
    # Fetch random sample or top values?
    # Top values are better landmarks.
    
    print("🔎 BUSCANDO MAIORES DESPESAS DE JANEIRO (TOP 20)...")
    
    res = supabase.table("municipal_expenses") \
        .select("dt_emissao_despesa, nr_empenho, nm_fornecedor, vl_despesa, evento") \
        .eq("municipio_slug", "votorantim") \
        .eq("ano", 2025) \
        .eq("mes", 1) \
        .order("vl_despesa", desc=True) \
        .limit(20) \
        .execute()
        
    if not res.data:
        print("❌ Nenhum dado encontrado.")
        return

    df = pd.DataFrame(res.data)
    
    # Format for display
    print(f"{'DATA':<12} | {'EMPENHO':<10} | {'VALOR (R$)':<15} | {'FORNECEDOR'}")
    print("-" * 80)
    
    for _, row in df.iterrows():
        dt = row.get("dt_emissao_despesa", "")
        if dt:
            # Simple assumption on format YYYY-MM-DD from DB to DD/MM/YYYY
            try:
                dt = pd.to_datetime(dt).strftime("%d/%m/%Y")
            except:
                pass
                
        emp = row.get("nr_empenho", "N/A")
        val = float(row.get("vl_despesa", 0))
        forn = row.get("nm_fornecedor", "DESCONHECIDO")
        evt = row.get("evento", "")
        
        print(f"{dt:<12} | {emp:<10} | R$ {val:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".").ljust(43) + f" | {forn[:40]}")

    print("\n💡 DICA: Compare estes valores (os maiores do mês) com o Portal.")
    print("Os dados devem ser IDÊNTICOS centavo por centavo.")

if __name__ == "__main__":
    generate_comparison_list()
