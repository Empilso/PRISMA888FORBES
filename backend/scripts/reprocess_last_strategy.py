
import os
import json
import ast
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Credenciais do Supabase não encontradas.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def reprocess_last_strategy():
    print("🔄 Buscando último log de IA...")
    
    # 1. Fetch last log (assuming it's the one we want)
    # Filter by agent_role='Task Finished' (which contains the final JSON) or just checking raw_output
    res = supabase.table("ai_execution_logs")\
        .select("*")\
        .eq("step_name", "Task Finished")\
        .order("created_at", desc=True)\
        .limit(1)\
        .execute()
        
    if not res.data:
        print("❌ Nenhum log encontrado.")
        return

    log_entry = res.data[0]
    campaign_id = log_entry.get("campaign_id")
    raw_output_str = log_entry.get("raw_output", "")
    
    print(f"📄 Log encontrado: {log_entry['id']} (Campaign: {campaign_id})")
    
    # 2. Parse JSON
    try:
        # Try JSON load first
        data = json.loads(raw_output_str)
    except:
        try:
            # Try AST literal eval if it's a python dict string
            data = ast.literal_eval(raw_output_str)
        except:
            print("❌ Falha ao parsear raw_output.")
            return

    # 3. Extract Strategies (PT-BR Logic)
    strategies = []
    if "estrategias" in data:
        strategies = data["estrategias"]
    elif "strategies" in data:
        strategies = data["strategies"]
    
    if not strategies:
        print("⚠️ Nenhuma estratégia encontrada no JSON.")
        return

    print(f"✅ Encontradas {len(strategies)} estratégias.")

    # 4. Prepare Insert Data
    phase_map = {"pre_campaign": "diagnostico", "campaign": "campanha_rua", "final_sprint": "reta_final"}
    insert_data = []
    
    for s in strategies:
        title = s.get("title") or s.get("nome") or "No Title"
        desc = s.get("description") or s.get("descricao") or ""
        pillar = s.get("pillar") or s.get("pilar") or ""
        phase = s.get("phase") or "campaign"
        
        insert_data.append({
            "campaign_id": campaign_id,
           # "run_id": log_entry.get("trace_id"), # Using trace_id as run_id approximation or Null
            "title": title,
            "description": desc,
            "pillar": pillar,
            "phase": phase_map.get(phase, "campanha_rua"),
            "status": "suggested",
            "examples": s.get("examples") or s.get("exemplos") or []
        })
        
    # 5. Insert
    try:
        supabase.table("strategies").insert(insert_data).execute()
        print("🚀 Sucesso! Estratégias salvas no banco manualmente.")
    except Exception as e:
        print(f"❌ Erro ao salvar: {e}")

if __name__ == "__main__":
    reprocess_last_strategy()
