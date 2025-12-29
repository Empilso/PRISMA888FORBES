
import os
from dotenv import load_dotenv
from supabase import create_client
from datetime import datetime
import collections

# Load env from backend
load_dotenv("/home/carneiro888/CARNEIRO888/PRISMA888V11/PRISMA888FORBES/backend/.env")

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("❌ Credentials not found")
    exit(1)

supabase = create_client(url, key)

print("--- Analysis of Strategies ---")
try:

    strategies_res = supabase.table("strategies").select("id, title, created_at, pillar, phase, campaign_id").order("created_at", desc=True).execute()
    strategies = strategies_res.data
    print(f"Total Strategies: {len(strategies)}")

    # Group by minute
    time_counts = collections.defaultdict(int)
    for s in strategies:
        try:
            # Simple slice for YYYY-MM-DD HH:MM
            key = s['created_at'][:16].replace('T', ' ')
            time_counts[key] += 1
        except:
            pass
    
    print("\nCreation Activity (Strategies per minute):")
    for t, count in sorted(time_counts.items(), reverse=True)[:10]:
        print(f"{t}: {count}")

    # Check duplicates by title
    title_counts = collections.defaultdict(int)
    for s in strategies:
        title_counts[s['title']] += 1
    
    dupes = {k: v for k, v in title_counts.items() if v > 1}
    print(f"\nDuplicate Strategy Titles: {len(dupes)}")
    if dupes:
        print("Top 5 duplicates:")
        for t, c in sorted(dupes.items(), key=lambda x: x[1], reverse=True)[:5]:
            print(f"- {t}: {c}")

except Exception as e:
    print(f"Error fetching strategies: {e}")

print("\n--- Analysis of Tasks ---")
try:
    tasks_res = supabase.table("tasks").select("id, title, created_at, status").order("created_at", desc=True).execute()
    tasks = tasks_res.data
    print(f"Total Tasks: {len(tasks)}")

    time_counts = collections.defaultdict(int)
    for t in tasks:
        try:
            key = t['created_at'][:16].replace('T', ' ')
            time_counts[key] += 1
        except:
            pass

    
    print("\nCreation Activity (Tasks per minute):")
    for t, count in sorted(time_counts.items(), reverse=True)[:10]:
        print(f"{t}: {count}")

    title_counts = collections.defaultdict(int)
    for t in tasks:
        title_counts[t['title']] += 1
    

    dupes = {k: v for k, v in title_counts.items() if v > 1}

except Exception as e:
    print(f"Error fetching tasks: {e}")

print("\n--- Persona Configuration ---")
try:
    persona_res = supabase.table("personas").select("name, config").execute()
    for p in persona_res.data:
        config = p.get('config', {})
        t_count = config.get('task_count', 'N/A')
        print(f"Persona: {p['name']}, task_count: {t_count}")
except Exception as e:
    print(f"Error fetching personas: {e}")


