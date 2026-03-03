import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv("frontend/.env.local")

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Receitas
print("--- RECEITAS ---")
rev_result = supabase.table("municipal_revenues").select("vl_receita").eq("municipio_slug", "votorantim-sp").execute()
total_rev = sum(r['vl_receita'] for r in rev_result.data) if rev_result.data else 0
print(f"Total Receitas: R$ {total_rev:,.2f}")

# Despesas
print("--- DESPESAS ---")
def get_all_expenses():
    all_data = []
    
    # Supabase pagination
    page_size = 1000
    for i in range(100): # max 100k
        res = supabase.table("municipal_expenses").select("vl_despesa,evento").eq("municipio_slug", "votorantim-sp").range(i*page_size, (i+1)*page_size - 1).execute()
        if not res.data:
            break
        all_data.extend(res.data)
        if len(res.data) < page_size:
            break
    return all_data

expenses = get_all_expenses()

net_expense = 0
for exp in expenses:
    evt = (exp.get('evento') or '').strip().lower()
    val = exp.get('vl_despesa') or 0
    if evt in ['empenhado', 'reforço']:
        net_expense += val
    elif evt in ['anulação', 'anulado']:
        net_expense -= val

print(f"Despesa Líquida (Empenhado + Reforço - Anulação): R$ {net_expense:,.2f}")
print(f"Total registros na varredura: {len(expenses)}")

