import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from src.crew.genesis_crew import GenesisCrew

def verify_factory():
    print("🚀 Iniciando verificação da Genesis Crew Factory...")
    
    # Mock campaign ID
    campaign_id = "test-campaign-id"
    
    try:
        # Tenta instanciar com persona 'standard'
        print("1. Tentando instanciar GenesisCrew com persona='standard'...")
        crew = GenesisCrew(campaign_id=campaign_id, persona="standard")
        
        # Verifica qual modelo foi carregado
        llm_model = crew.llm.model_name
        print(f"✅ Genesis Crew instanciada com sucesso!")
        print(f"🧠 Modelo LLM carregado: {llm_model}")
        
        # Verifica se é deepseek (sabemos que a persona 'standard' deve ser deepseek ou gpt-4o dependendo do config)
        # Vamos assumir que queremos ver deepseek aqui se o config estiver certo
        
        # Teste de Ping manual (já foi feito no init, mas vamos reforçar)
        print("2. Testando Ping manual no LLM...")
        try:
            crew.llm.invoke("Ping")
            print("✅ Ping manual com sucesso!")
        except Exception as e:
            print(f"❌ Ping manual falhou: {e}")

    except Exception as e:
        print(f"❌ Erro crítico na instanciação: {e}")

if __name__ == "__main__":
    verify_factory()
