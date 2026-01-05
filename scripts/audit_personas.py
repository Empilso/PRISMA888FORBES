
import os
import sys
import json
from dotenv import load_dotenv
from supabase import create_client

# Add backend to sys path to ensure we can import if needed, 
# but we will try to be standalone to avoid complex dependency issues.
sys.path.append(os.path.join(os.getcwd(), 'backend'))


# Try to load .env from backend directory first, then current
env_path = os.path.join(os.getcwd(), 'backend', '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()

def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("❌ Supabase credentials not found in .env")
        sys.exit(1)
    return create_client(url, key)

def audit_personas():
    supabase = get_supabase_client()
    
    print("\n📦 INVENTÁRIO DE PERSONAS (DB)")
    print("="*120)
    print(f"{'Nome':<20} | {'Type':<10} | {'Proc.':<10} | {'Agentes':<8} | {'Model':<15} | {'Obs'}")
    print("-" * 120)
    
    try:
        response = supabase.table("personas").select("*").execute()
        personas = response.data
        
        for p in personas:
            config = p.get("config") or {}
            
            # Count agents
            num_agents = 0
            agents_source = "N/A"
            if "agents" in config and isinstance(config["agents"], dict):
                num_agents = len(config["agents"])
                agents_source = "Dynamic"
            elif p.get("type") == "strategy": # Legacy assumption
                 num_agents = 3 # Analyst, Strategist, Planner
                 agents_source = "Legacy"
            
            # Process Type
            process = config.get("process_type", "seq")
            
            # Manager Model
            manager = config.get("manager_model", "-")
            
            # LLM Model
            llm = p.get("llm_model", "-")
            
            obs = []
            if not p.get("is_active"):
                obs.append("INACTIVE")
            if "template_id" in config:
                obs.append(f"Tpl:{config['template_id']}")
            
            obs_str = ", ".join(obs)
            
            print(f"{p.get('name')[:20]:<20} | {p.get('type')[:10]:<10} | {process[:10]:<10} | {str(num_agents):<8} | {llm[:15]:<15} | {obs_str}")

    except Exception as e:
        print(f"❌ Erro ao listar personas: {e}")

    print("\n")

def audit_agents():
    supabase = get_supabase_client()
    
    print("\n🤖 INVENTÁRIO DE AGENTES ENTERPRISE (DB - Tabela 'agents')")
    print("="*120)
    print(f"{'Nome (Slug)':<25} | {'Role':<25} | {'Type':<10} | {'Tools'}")
    print("-" * 120)
    
    try:
        response = supabase.table("agents").select("*").execute()
        agents = response.data
        
        for a in agents:
            tools = a.get("tools") or []
            tools_str = str(len(tools)) + " tools"
            
            print(f"{a.get('name')[:25]:<25} | {a.get('role')[:25]:<25} | {a.get('type')[:10]:<10} | {tools_str}")

    except Exception as e:
        print(f"❌ Erro ao listar agentes: {e}")

if __name__ == "__main__":
    audit_personas()
    audit_agents()
