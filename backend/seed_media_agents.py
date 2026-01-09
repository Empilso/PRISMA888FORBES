import os
import sys
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv()

def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("❌ Supabase credentials not found. Check .env file.")
        sys.exit(1)
    return create_client(url, key)

def seed_media_agent():
    print("🚀 Seeding Media Scan Agent...")
    supabase = get_supabase_client()
    
    # Agent Data
    agent_data = {
        "name": "radar-google-scanner",
        "display_name": "Radar - Investigador Google",
        "role": "Investigador Político Especialista em Fontes Abertas",
        "type": "scanning",
        "description": "Agente responsável por buscar notícias, entrevistas e postagens que contenham promessas de campanha ou contradições.",
        "system_prompt": """Você é um Jornalista Investigativo Sênior especializado em fact-checking e monitoramento de promessas políticas.
Sua missão é varrer a internet em busca de declarações, entrevistas, notícias e postagens oficiais onde o político alvo tenha feito promessas ou assumido compromissos.

SUAS DIRETRIZES:
1. **Foco em Promessas:** Procure por verbos de ação futura ("vou construir", "vamos fazer", "prometo", "garanto", "investiremos").
2. **Contexto Local:** Priorize fontes locais (jornais da cidade, blogs regionais, portais de prefeituras).
3. **Imparcialidade:** Colete os fatos exatamente como foram reportados.
4. **Precisão:** Ignore boatos sem fonte verificável.

Ao receber um nome de político e uma cidade, você deve simular uma busca (neste ambiente de teste) e retornar evidências de promessas encontradas em fontes públicas.

SE VOCÊ PRECISAR 'INVENTAR' DADOS PARA TESTE (SIMULAÇÃO):
Gere 5 notícias realistas de jornais locais imaginários ou reais da região, contendo promessas de campanha plausíveis para o perfil do candidato.
Cada item deve ter: Data, Fonte, Título e Resumo da Promessa.""",
        "tools": ["web_search", "news_search"],
        "compliance_rules": {"fact_check": True, "impartiality": True},
        "is_active": True
    }

    try:
        # Check if exists
        existing = supabase.table("agents").select("id").eq("name", agent_data["name"]).execute()
        
        if existing.data:
            print(f"⚠️ Agent '{agent_data['name']}' already exists. Updating...")
            supabase.table("agents").update(agent_data).eq("name", agent_data["name"]).execute()
            print("✅ Agent updated successfully.")
        else:
            print(f"✨ Creating new agent '{agent_data['name']}'...")
            supabase.table("agents").insert(agent_data).execute()
            print("✅ Agent created successfully.")
            
    except Exception as e:
        print(f"❌ Error seeding agent: {e}")

if __name__ == "__main__":
    seed_media_agent()
