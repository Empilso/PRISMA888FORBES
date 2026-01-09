
import os
import sys
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

def get_project_id():
    url = os.getenv("SUPABASE_URL")
    if not url:
        print("SUPABASE_URL is missing")
        return
        
    print(f"SUPABASE_URL: {url}")
    # Extract ID: https://kgjpsnTPeFzMclgq.supabase.co -> kgjpsnTPeFzMclgq
    try:
        if "supabase.co" in url:
            pid = url.split("://")[1].split(".")[0]
            print(f"Project ID: {pid}")
    except:
        print("Could not extract ID")

if __name__ == "__main__":
    get_project_id()
