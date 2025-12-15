from langchain.tools import tool
import json
import random

class IBGEDataTool:
    @tool("ibge_demographics_search")
    def search(city_code: str):
        """
        Busca dados demográficos do IBGE para um determinado código de município ou nome.
        Retorna população, PIB per capita, e índices de escolaridade.
        Útil para o DemographicsAnalyzer.
        """
        # Simulação de dados reais do IBGE
        # Em produção, isso bateria na API do IBGE (servicodados.ibge.gov.br)
        
        mock_data = {
            "city_code": city_code,
            "population_estimated": 123450 + random.randint(0, 1000),
            "gdp_per_capita": 35000.50,
            "education_index": 0.75,
            "demographics": {
                "young_adults_18_24": "15%",
                "adults_25_45": "35%",
                "seniors_60_plus": "20%"
            },
            "main_economic_activities": ["Serviços", "Indústria Leve"]
        }
        
        return json.dumps(mock_data, ensure_ascii=False)

class TSEDataTool:
    @tool("tse_electoral_history")
    def search(city_name: str, year: str = "2020"):
        """
        Busca histórico eleitoral do TSE para um município e ano.
        Retorna abstenção, votos nulos e vencedor da última eleição.
        Útil para o DataIntegrator.
        """
        # Simulação de dados do TSE
        mock_data = {
            "city": city_name,
            "election_year": year,
            "abstention_rate": "18.5%",
            "null_votes": "5.2%",
            "last_winner_party": "PARTIDO_A",
            "margin_of_victory": "4.3%"
        }
        
        return json.dumps(mock_data, ensure_ascii=False)
