import os
import sys
import psycopg2
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

def debug_campaign(campaign_id):
    print(f"🔍 Investigating Campaign: {campaign_id}")
    db_url = os.getenv("DATABASE_URL")
    
    try:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        # 1. Check Runs
        print("\n--- ANALYSIS RUNS ---")
        cursor.execute("SELECT id, status, created_at FROM analysis_runs WHERE campaign_id = %s ORDER BY created_at DESC", (campaign_id,))
        runs = cursor.fetchall()
        
        if not runs:
            print("❌ No runs found for this campaign.")
        else:
            for run in runs:
                print(f"Run ID: {run[0]} | Status: {run[1]} | Created: {run[2]}")
                
                # 2. Check Strategies for this Run
                cursor.execute("SELECT count(*), phase FROM strategies WHERE run_id = %s GROUP BY phase", (str(run[0]),))
                stats = cursor.fetchall()
                if not stats:
                     print(f"   ⚠️ No strategies linked to this run!")
                     
                     # Check if there are strategies for this campaign WITHOUT run_id or with WRONG run_id
                     cursor.execute("SELECT count(*) FROM strategies WHERE campaign_id = %s AND run_id IS NULL", (campaign_id,))
                     orphans = cursor.fetchone()[0]
                     if orphans > 0:
                         print(f"   ⚠️ Found {orphans} orphaned strategies (no run_id) for this campaign.")
                else:
                    print(f"   ✅ Strategies found: {stats}")

        conn.close()
        
    except Exception as e:
        print(f"❌ DB Error: {e}")

if __name__ == "__main__":
    # ID extracted from user screenshot (Pivetta)
    target_id = "045a77c6-38b2-4641-a963-7896c9f2179b" 
    debug_campaign(target_id)
