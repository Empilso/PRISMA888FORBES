
import os
import json
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Erro: Credenciais do Supabase não encontradas.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

RADAR_AGENTS = [
    "radar-extrator-promessas",
    "radar-fiscal-verbas"
]

def sync_radar_agents():
    print("🔄 Iniciando sincronização de Agentes Radar...")
    
    for agent_slug in RADAR_AGENTS:
        print(f"\nProcessing: {agent_slug}")
        
        # 1. Check if exists in agents
        existing = supabase.table("agents").select("*").eq("name", agent_slug).execute()
        if existing.data:
            print(f"   ⚠️  Agent '{agent_slug}' already exists in agents table. Skipping.")
            # Optional: Update it? For now, skip to avoid overwriting user edits if any.
            # But the user said it's empty, so it shouldn't exist.
            continue
            
        # 2. Fetch from PERSONAS (source of truth)
        persona_res = supabase.table("personas").select("*").eq("name", agent_slug).execute()
        if not persona_res.data:
            print(f"   ❌ Persona '{agent_slug}' not found in personas table. Cannot sync.")
            continue
            
        persona = persona_res.data[0]
        config = persona.get("config", {})
        
        # 3. Prepare Agent Data
        agent_data = {
            "name": agent_slug,
            "display_name": persona.get("display_name"),
            "role": config.get("role", "Agente Radar"),
            "type": "radar", # Force type radar
            "description": persona.get("description", "Agente do sistema Radar Premium"),
            "system_prompt": config.get("system_message", "Você é um agente do sistema Radar."),
            "tools": [], # RadarCrew doesn't use external tools via API yet
            "is_active": True,
            "knowledge_base": [],
            "compliance_rules": {}
        }
        
        print(f"   ➡ Inserting into agents: {agent_data['display_name']}")
        
        try:
            insert_res = supabase.table("agents").insert(agent_data).execute()
            print("   ✅ Success!")
        except Exception as e:
            print(f"   ❌ Failed to insert: {e}")

if __name__ == "__main__":
    sync_radar_agents()
