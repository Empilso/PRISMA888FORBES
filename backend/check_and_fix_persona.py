import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("❌ Error: Supabase credentials not found in env.")
    exit(1)

supabase = create_client(url, key)

REQUIRED_PERSONA = "standard"

def check_and_fix():
    print(f"Checking persona '{REQUIRED_PERSONA}'...")
    
    response = supabase.table("personas").select("*").eq("name", REQUIRED_PERSONA).execute()
    
    if not response.data:
        print(f"❌ Persona '{REQUIRED_PERSONA}' NOT FOUND!")
        return
    
    persona = response.data[0]
    print(f"Current State: is_active={persona.get('is_active')}, model={persona.get('llm_model')}")
    
    if not persona.get('is_active') or persona.get('llm_model') != 'deepseek/deepseek-chat':
        print(f"⚠️ Persona state incorrect. Updating...")
        try:
            update_response = supabase.table("personas").update({
                "is_active": True,
                "llm_model": "deepseek/deepseek-chat"
            }).eq("name", REQUIRED_PERSONA).execute()
            if update_response.data:
                print(f"✅ Persona updated: Active=True, Model=deepseek/deepseek-chat")
            else:
                print("❌ Failed to update persona.")
        except Exception as e:
            print(f"❌ Error updating persona: {e}")
    else:
        print("✅ Persona is ALREADY ACTIVE and Model is CORRECT.")

if __name__ == "__main__":
    check_and_fix()
