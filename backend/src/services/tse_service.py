
import httpx
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)

class TSEService:
    """
    Service to interact with TSE's public API (DivulgaCandContas).
    Base URL: https://divulgacandcontas.tse.jus.br/divulga/rest/v1
    """
    
    BASE_URL = "https://divulgacandcontas.tse.jus.br/divulga/rest/v1"
    
    # Mapping of Year to Election ID (1st Round usually)
    ELECTION_IDS = {
        "2024": "2045202024",
        "2020": "2030402020" 
    } 

    def get_city_code(self, uf: str, city_name: str, year: str = "2024") -> Optional[str]:
        """
        Fetches the TSE internal code for a city given its UF and Name.
        Example: "Votorantim", "SP" -> "72450"
        """
        try:
            election_id = self.ELECTION_IDS.get(year, self.ELECTION_IDS["2024"])
            url = f"{self.BASE_URL}/eleicao/buscar/{uf}/{election_id}/municipios"
            print(f"[TSEService] Fetching city code for {city_name} ({uf}) from {url}")
            
            with httpx.Client(timeout=10.0) as client:
                response = client.get(url)
                response.raise_for_status()
                data = response.json()
                
                municipios = data.get("municipios", [])
                normalized_target = city_name.lower().strip()
                
                for mun in municipios:
                    if mun.get("nome", "").lower().strip() == normalized_target:
                        return mun.get("codigo")
                        
            print(f"[TSEService] City {city_name} not found in TSE list for {uf}")
            return None
            
        except Exception as e:
            logger.error(f"[TSEService] Error fetching city code: {e}")
            print(f"[TSEService] Error: {e}")
            return None

    def get_candidates(self, city_tse_code: str, cargo_code: str = "11", year: str = "2024") -> List[Dict]:
        """
        Fetches candidates for a specific city and office (cargo).
        Default cargo_code "11" is for Mayor (Prefeito).
        Cargo codes: 11=Prefeito, 13=Vereador.
        """
        try:
            election_id = self.ELECTION_IDS.get(year, self.ELECTION_IDS["2024"])
            # Endpoint: /candidatura/listar/{year}/{city_code}/{election_id}/{cargo_code}/candidatos
            url = f"{self.BASE_URL}/candidatura/listar/{year}/{city_tse_code}/{election_id}/{cargo_code}/candidatos"
            print(f"[TSEService] Fetching candidates for city {city_tse_code}, cargo {cargo_code}")
            
            with httpx.Client(timeout=15.0) as client:
                response = client.get(url)
                response.raise_for_status()
                data = response.json()
                
                candidates = data.get("candidatos", [])
                
                # Clean and simplify result
                results = []
                for c in candidates:
                    results.append({
                        "id": c.get("id"),
                        "nome_urna": c.get("nomeUrna"),
                        "numero": c.get("numero"),
                        "partido": c.get("partido", {}).get("sigla"),
                        "status": c.get("descricaoSituacao"), # Deferido, etc.
                        "resultado": c.get("descricaoTotalizacao") # Eleito, Não eleito
                    })
                    
                return results

        except Exception as e:
            logger.error(f"[TSEService] Error fetching candidates: {e}")
            print(f"[TSEService] Error fetching candidates: {e}")
            return []
