import os
import sys
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

def audit_data():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    supabase = create_client(url, key)
    
    print("\n🕵️  AUDITORIA DE DADOS - VOTORANTIM 2025\n")
    
    # 1. Fetch all 2025 rows
    print("⏳ Carregando dados do banco...")
    # Pagination might be needed if > 1000, looping to be safe
    all_rows = []
    offset = 0
    batch_size = 1000
    
    while True:
        res = supabase.table("municipal_expenses") \
            .select("*") \
            .eq("municipio_slug", "votorantim") \
            .eq("ano", 2025) \
            .range(offset, offset + batch_size - 1) \
            .execute()
        
        if not res.data:
            break
            
        all_rows.extend(res.data)
        offset += batch_size
        print(f"   ...lidos {len(all_rows)} registros")

    if not all_rows:
        print("❌ Nenhum dado encontrado para 2025!")
        return

    df = pd.DataFrame(all_rows)
    
    # 2. Basic Stats
    total_val = df["vl_despesa"].sum()
    count = len(df)
    
    print(f"\n📊 ESTATÍSTICAS GERAIS:")
    print(f"   • Total de Registros: {count}")
    print(f"   • Valor Total: R$ {total_val:,.2f}")
    
    # 3. Monthly Distribution
    print(f"\n📅 DISTRIBUIÇÃO POR MÊS:")
    monthly = df.groupby("mes")["vl_despesa"].agg(['count', 'sum'])
    print(monthly)
    
    # 4. Top 10 Expenses (Outliers Check)
    print(f"\n💰 TOP 10 MAIORES DESPESAS:")
    top_10 = df.nlargest(10, "vl_despesa")[["mes", "orgao", "nm_fornecedor", "vl_despesa", "evento"]]
    print(top_10.to_string(index=False))
    
    # 5. Duplicates Check (Strict)
    # definition of duplicate: same empenho, fornecedor, data, valor, evento
    dup_cols = ["nr_empenho", "id_fornecedor", "dt_emissao_despesa", "vl_despesa", "evento"]
    duplicates = df[df.duplicated(subset=dup_cols, keep=False)]
    
    print(f"\n👯 VERIFICAÇÃO DE DUPLICATAS:")
    if not duplicates.empty:
        print(f"   ⚠️ Encontrados {len(duplicates)} registros potencialmente duplicados (mesmo empenho, dia, valor, fornecedor).")
        print("   Exemplo de duplicatas:")
        print(duplicates.head(4).to_string(index=False))
        
        # Calculate impact
        dup_val = duplicates["vl_despesa"].sum() / 2 # assuming pairs
        print(f"   Estimativa de Valor Duplicado: R$ {dup_val:,.2f}")
    else:
        print("   ✅ Nenhuma duplicata exata encontrada.")

    # 6. Check 'Restos a Pagar' vs 'Empenho'
    # Sometimes high January values are carried over from previous year
    print("\n🔎 ANÁLISE DE EVENTOS:")
    event_stats = df.groupby("evento")["vl_despesa"].sum().sort_values(ascending=False)
    print(event_stats)

if __name__ == "__main__":
    audit_data()
