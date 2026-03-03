import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv("frontend/.env.local")
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

all_data = []
page_size = 1000
for i in range(10):
    res = supabase.table("municipal_revenues").select("vl_receita").eq("municipio_slug", "votorantim-sp").range(i*page_size, (i+1)*page_size - 1).execute()
    if not res.data:
        break
    all_data.extend(res.data)
    if len(res.data) < page_size:
        break

total_rev = sum(r['vl_receita'] for r in all_data)
print(f"Total rows fetched: {len(all_data)}")
print(f"Total Receitas: R$ {total_rev:,.2f}")

