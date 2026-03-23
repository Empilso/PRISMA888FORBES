import os
from supabase import create_client
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import Optional, List

load_dotenv()

class StrategyRead(BaseModel):
    id: str
    title: str
    description: str
    status: str
    pillar: Optional[str] = None
    phase: Optional[str] = None
    impact: Optional[str] = None
    effort: Optional[str] = None
    examples: Optional[List[str]] = None
    created_at: str

def debug():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    supabase = create_client(url, key)

    campaign_id = "045a77c6-38b2-4641-a963-7896c9f2179b"
    print(f"Fetching all strategies for campaign {campaign_id}...")
    
    result = supabase.table("strategies").select("*").eq("campaign_id", campaign_id).execute()
    
    success_count = 0
    fail_count = 0
    
    for row in result.data:
        try:
            StrategyRead(**row)
            success_count += 1
        except Exception as e:
            fail_count += 1
            print(f"\n❌ Pydantic validation failed for ID: {row['id']}")
            print(f"Title: {row.get('title')}")
            print(f"Examples type: {type(row.get('examples'))}")
            print(f"Examples value: {row.get('examples')}")
            print(f"Error: {e}")

    print(f"\nScan complete: {success_count} success, {fail_count} failed.")

if __name__ == "__main__":
    debug()
