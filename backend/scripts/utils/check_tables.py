import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

tables = ["municipalexpenses", "municipal_expenses", "expenses", "promise_budget_summaries"]

for t in tables:
    try:
        # Try to select 1 row to see if table exists
        res = supabase.table(t).select("*").limit(1).execute()
        print(f"✅ Table '{t}' exists. Rows: {len(res.data) if res.data else 0}")
    except Exception as e:
        print(f"❌ Table '{t}' check failed: {str(e)}")
