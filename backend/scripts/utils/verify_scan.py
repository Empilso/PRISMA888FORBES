import sys
import os
import asyncio
import json
from dotenv import load_dotenv

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), "src"))

# Load env
load_dotenv()

from crew.radar_crew import RadarCrew

async def main():
    print("Iniciando Verificação de Scan (Phase 3)...")
    
    # Mock parameters
    campaign_id = "test-campaign-id"
    politician_name = "Dr. Dario Pacheco" # Real mayor of Vinhedo
    city = "Vinhedo"
    
    crew = RadarCrew(campaign_id)
    
    print(f"Executando scan para {politician_name} em {city}...")
    
    # Run scan
    try:
        # Note: run_google_scan is synchronous
        result = crew.run_google_scan(
            politician_name=politician_name,
            city_name=city,
            search_mode="focused",
            target_sites=["g1.globo.com", "folha.uol.com.br"],
            max_results=5
        )
        
        print("\n=== RESULTADO DO SCAN ===")
        print(json.dumps(result, indent=2, ensure_ascii=False))
        
        if "details" in result and isinstance(result["details"], list):
            print(f"\nSucesso! {len(result['details'])} itens encontrados.")
            # Validate item structure
            if len(result["details"]) > 0:
                item = result["details"][0]
                required_fields = ["title", "url", "date", "source", "summary"]
                missing = [f for f in required_fields if f not in item]
                if missing:
                    print(f"ALERTA: Campos faltando no primeiro item: {missing}")
                else:
                    print("Estrutura do item válida.")
        else:
            print("\nERRO: Campo 'details' não encontrado ou inválido no JSON.")
            
    except Exception as e:
        print(f"\nERRO FATAL NA EXECUÇÃO: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
