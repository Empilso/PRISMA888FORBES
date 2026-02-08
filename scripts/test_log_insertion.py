
import os
import uuid
from dotenv import load_dotenv
from supabase import create_client

load_dotenv("backend/.env")

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("❌ Credentials not found")
    exit(1)

supabase = create_client(url, key)

# Get a valid campaign
campaigns = supabase.table("campaigns").select("id").limit(1).execute()
if not campaigns.data:
    print("❌ No campaigns found")
    exit(1)

campaign_id = campaigns.data[0]['id']
trace_id = str(uuid.uuid4())

print(f"--- TESTING LOG INSERTION ---")
print(f"Campaign ID: {campaign_id}")
print(f"Trace ID: {trace_id}")

try:
    data = {
        "campaign_id": campaign_id,
        "trace_id": trace_id,
        "step_name": "Test Step",
        "agent_role": "Test Agent",
        "model_used": "test-model",
        "raw_output": "This is a test log for realtime streaming.",
        "tool_calls": "test_tool",
        "is_success": True
    }
    
    res = supabase.table("ai_execution_logs").insert(data).execute()
    print("✅ Log inserted successfully!")
    print(res.data)
    
except Exception as e:
    print(f"❌ Insert Failed: {e}")
