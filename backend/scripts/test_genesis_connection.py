import os
import sys
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

from src.crew.genesis_crew import GenesisCrew

def test_connection():
    print("🧪 Testing GenesisCrew Connection to Supabase...")
    
    # Mock parameters
    campaign_id = "00000000-0000-0000-0000-000000000000"
    
    try:
        crew = GenesisCrew(campaign_id=campaign_id, persona="standard")
        print("✅ GenesisCrew Initialized.")
        
        print("📝 Attempting to write log...")
        crew.log("Test Log Message", agent="Tester", status="info")
        print("✅ Log written successfully!")
        
    except Exception as e:
        print(f"❌ Connection Failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_connection()
