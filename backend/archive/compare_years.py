import os
import sys
import json
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

from supabase import create_client

def compare_structures():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    supabase = create_client(url, key)
    
    print("--- Comparing Data Structures ---")
    
    # Get 2024 Sample
    res_2024 = supabase.table("municipal_expenses").select("*").eq("ano", 2024).limit(1).execute()
    item_2024 = res_2024.data[0] if res_2024.data else None
    
    # Get 2025 Sample
    res_2025 = supabase.table("municipal_expenses").select("*").eq("ano", 2025).limit(1).execute()
    item_2025 = res_2025.data[0] if res_2025.data else None
    
    if not item_2024:
        print("❌ No 2024 data found to compare!")
    else:
        print("✅ 2024 Data Sample Keys:", item_2024.keys())
        
    if not item_2025:
        print("❌ No 2025 data found to compare!")
    else:
        print("✅ 2025 Data Sample Keys:", item_2025.keys())
        
    if item_2024 and item_2025:
        keys_2024 = set(item_2024.keys())
        keys_2025 = set(item_2025.keys())
        
        diff = keys_2024.symmetric_difference(keys_2025)
        if not diff:
            print("✅ Structures match exactly (Key-wise).")
            # Check for critical nulls in 2025
            crit_fields = ["vl_despesa", "nm_fornecedor", "orgao", "dt_emissao_despesa"]
            for f in crit_fields:
                val = item_2025.get(f)
                print(f"   2025 Field '{f}': {val} (Type: {type(val)})")
        else:
            print(f"❌ Structural Mismatch! Diff: {diff}")
            
if __name__ == "__main__":
    compare_structures()
