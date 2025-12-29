
import os
import json
from dotenv import load_dotenv
from src.crew.radar_crew import RadarCrew

# Mock Supabase for credentials ONLY (connection is real)
load_dotenv()

def test_extraction():
    print("🧪 Testando extração via RadarCrew...")
    
    # Mock text
    dummy_text = """
    PLANO DE GOVERNO - CANDIDATO TESTE
    
    SAÚDE:
    1. Prometo construir 3 novas UPAs na zona norte.
    2. Vamos contratar mais 50 médicos para a rede básica.
    
    EDUCAÇÃO:
    3. Criação do programa 'Escola Viva' com tempo integral.
    4. Reforma de todas as creches municipais.
    
    INFRAESTRUTURA:
    5. Asfaltamento de 100% das ruas do bairro Centro.
    """
    
    crew = RadarCrew(campaign_id="test-campaign", run_id="test-run")
    
    try:
        results = crew.run_extraction(dummy_text)
        print("\n✅ Resultado bruto:")
        print(json.dumps(results, indent=2, ensure_ascii=False))
        
        if isinstance(results, list) and len(results) > 0:
            p1 = results[0]
            if "resumo_promessa" in p1 and "categoria" in p1:
                print("\n✅ Schema Validado!")
            else:
                print("\n❌ Schema Inválido (chaves erradas).")
        else:
             print("\n❌ Lista vazia ou formato inválido.")
             
    except Exception as e:
        print(f"\n❌ Erro na execução: {e}")

if __name__ == "__main__":
    test_extraction()
