import os
import sys
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv("backend/.env")

def check_progress():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    supabase = create_client(url, key)
    
    print("\n📊 PROGRESSO DA INGESTÃO 2025 (VOTORANTIM)\n")
    
    # Simple aggregation query
    # Note: Supabase/PostgREST doesn't support direct GROUP BY nicely in client libraries usually, 
    # so we'll fetch 'mes' column for all 2025 rows and aggregate in Python or use .rpc() if available.
    # To save bandwidth, let's just fetch 'mes'.
    
    res = supabase.table("municipal_expenses") \
        .select("mes") \
        .eq("municipio_slug", "votorantim") \
        .eq("ano", 2025) \
        .execute()
        
    if not res.data:
        print("❌ Nenhum dado encontrado para 2025.")
        return

    df = pd.DataFrame(res.data)
    monthly_counts = df["mes"].value_counts().sort_index()
    
    print("Mês | Registros | Status Estimado")
    print("--- | --------- | ---------------")
    
    all_months = range(1, 13)
    complete_count = 0
    
    for m in all_months:
        count = monthly_counts.get(m, 0)
        status = "✅ OK" if count > 1000 else ("⚠️ Parcial" if count > 0 else "❌ Pendente")
        print(f"{m:02d}  | {count:9d} | {status}")
        
    print(f"\nTotal de Registros: {len(df)}")

if __name__ == "__main__":
    check_progress()
