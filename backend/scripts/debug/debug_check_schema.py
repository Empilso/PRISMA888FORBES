import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))

# Function to safely get table column names
def list_cols(table):
    try:
        res = supabase.table(table).select("*").limit(1).execute()
        if res.data: return list(res.data[0].keys())
        return "Empty table"
    except Exception as e:
        return str(e)

tables = [
    "cities", "politicians", "promises", "promise_verifications", 
    "municipal_expenses", "municipal_revenues", 
    "radar_offices", "radar_mandates", "radar_executions"
]

for t in tables:
    print(f"Table {t}: {list_cols(t)}")
