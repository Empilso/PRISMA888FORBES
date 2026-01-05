
import os
import sys
from dotenv import load_dotenv

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

load_dotenv()

def verify_alignment():
    print("--- 🌍 INICIANDO VERIFICAÇÃO DE ALINHAMENTO GLOBAL ---")
    
    # 1. Verify TacticalAI
    try:
        from src.services.tactical_ai import TacticalAIService
        print("\n>> [1/2] Verificando TacticalAIService...")
        tactical = TacticalAIService()
        model = tactical.llm.model_name
        base_url = getattr(tactical.llm, "base_url", "N/A")
        
        print(f"   Model: {model}")
        print(f"   Base URL: {base_url}")
        
        if "deepseek" in model and "api.deepseek.com" in str(base_url):
             print("   ✅ TacticalAI: ALINHADO")
        else:
             print("   ❌ TacticalAI: DESALINHADO!")
    except Exception as e:
        print(f"   ❌ Erro ao testar TacticalAI: {e}")

    # 2. Verify RadarCrew
    try:
        from src.crew.radar_crew import RadarCrew
        print("\n>> [2/2] Verificando RadarCrew (Default)...")
        # Mocking minimal params
        radar = RadarCrew(campaign_id="test", run_id="test")
        model = radar.llm.model_name
        base_url = getattr(radar.llm, "base_url", "N/A")
        
        print(f"   Model: {model}")
        print(f"   Base URL: {base_url}")
        
        if "deepseek" in model and "api.deepseek.com" in str(base_url):
             print("   ✅ RadarCrew: ALINHADO")
        else:
             print("   ❌ RadarCrew: DESALINHADO!")
             
    except Exception as e:
        print(f"   ❌ Erro ao testar RadarCrew: {e}")

if __name__ == "__main__":
    verify_alignment()
