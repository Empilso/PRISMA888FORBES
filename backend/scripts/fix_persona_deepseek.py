import os
import sys
from dotenv import load_dotenv
from supabase import create_client

# Adiciona path para imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))

load_dotenv()

def update_persona():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        print("❌ Supabase creds not found")
        return

    supabase = create_client(url, key)
    
    print(">> Buscando persona 'standard'...")
    res = supabase.table("personas").select("*").eq("name", "standard").execute()
    
    if not res.data:
        print("⚠️ Persona 'standard' não encontrada. Buscando qualquer fallback...")
        res = supabase.table("personas").select("*").limit(1).execute()
        
    if not res.data:
        print("❌ DB vazio!")
        return

    persona_id = res.data[0]['id']
    current_model = res.data[0].get('llm_model')
    print(f">> Persona ID: {persona_id} | Model Atual: {current_model}")
    
    current_config = res.data[0].get('config', {})
    print(f">> Config Atual: {current_config}")
    
    # Update config manager_model
    current_config['manager_model'] = "deepseek/deepseek-chat"
    current_config['process_type'] = "sequential" 
    
    print(">> Atualizando 'llm_model' e 'config'...")
    update_res = supabase.table("personas").update({
        "llm_model": "deepseek/deepseek-chat",
        "config": current_config
    }).eq("id", persona_id).execute()
    
    # Validação
    new_model = update_res.data[0]['llm_model']
    print(f"✅ SUCESSO! Novo Model: {new_model}")

if __name__ == "__main__":
    update_persona()
