
import os
import json
from supabase import create_client
from dotenv import load_dotenv

load_dotenv(dotenv_path="backend/.env")

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

def inspect_json():
    print("🔍 INSPECTING LATEST RADAR EXECUTION JSON\n")
    try:
        # Fetch latest successful Phase 2 execution
        execution = supabase.table("radar_executions") \
            .select("id, summary, finished_at") \
            .eq("phase", "phase2") \
            .eq("status", "ok") \
            .order("finished_at", desc=True) \
            .limit(1) \
            .execute()

        if execution.data:
            latest = execution.data[0]
            summary = latest.get("summary", {})
            
            print(f"✅ Last Run: {latest['finished_at']} (ID: {latest['id']})")
            
            # Navigate to categories
            data = summary.get("data", {})
            cats = data.get("categorias", [])
            
            if not cats:
                print("❌ 'data.categorias' not found or empty.")
                print("Full Summary Keys:", summary.keys())
                if 'data' in summary:
                    print("Data Keys:", summary['data'].keys())
            else:
                print(f"✅ Found {len(cats)} categories.")
                # Inspect first category for 'detalhes'
                first_cat = cats[0]
                print(f"📂 Category: {first_cat.get('nome')}")
                if "detalhes" in first_cat:
                    detalhes = first_cat["detalhes"]
                    print(f"✅ 'detalhes' found: {len(detalhes)} items.")
                    if detalhes:
                        print("Sample Item:", detalhes[0])
                else:
                    print("❌ 'detalhes' MISSING in category object.")
                    print("Category Keys:", first_cat.keys())

        else:
            print("❌ No successful execution found.")

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    inspect_json()
