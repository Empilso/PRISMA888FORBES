import os
import sys
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv("backend/.env")

def check_db_totals():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    supabase = create_client(url, key)
    
    print("\n📊 AUDITORIA DE TOTAIS 2025 (BANCO DE DADOS)\n")
    
    # 1. Fetch ALL expenses for 2025
    # We need to fetch in chunks if too large, but let's try a reasonable limit assuming we have ~40k rows from previous steps
    # Actually, 40k rows might hit fetch limits. Let's do a logic sum if possible or fetch specific columns.
    
    # 1. Count Total
    count_res = supabase.table("municipal_expenses") \
        .select("id", count="exact", head=True) \
        .eq("municipio_slug", "votorantim") \
        .eq("ano", 2025) \
        .execute()
        
    total_count = count_res.count
    print(f"📉 Total de Registros no Banco: {total_count}")
    
    # 2. Fetch Data (Paginated)
    all_data = []
    chunk_size = 1000
    for offset in range(0, total_count, chunk_size):
        print(f"   Fetching offset {offset}...")
        res = supabase.table("municipal_expenses") \
            .select("vl_despesa, evento, orgao") \
            .eq("municipio_slug", "votorantim") \
            .eq("ano", 2025) \
            .range(offset, offset + chunk_size - 1) \
            .execute()
        all_data.extend(res.data)
        
    df = pd.DataFrame(all_data)
    
    print(f"Registros Analisados: {len(df)}")
    
    # Filter for 'Empenhado' only as that's usually the 'Budget Committed'
    df_empenhado = df[df["evento"] == "Empenhado"].copy()
    
    total_empenhado = df_empenhado["vl_despesa"].sum()
    
    print(f"\n💰 TOTAL EMPENHADO NO BANCO (2025): R$ {total_empenhado:,.2f}")
    
    print("\n🏢 POR ÓRGÃO:")
    print(df_empenhado.groupby("orgao")["vl_despesa"].sum().sort_values(ascending=False).apply(lambda x: f"R$ {x:,.2f}"))
    
    print("\n📋 POR TIPO DE EVENTO:")
    print(df.groupby("evento")["vl_despesa"].sum().sort_values(ascending=False).apply(lambda x: f"R$ {x:,.2f}"))

if __name__ == "__main__":
    check_db_totals()
