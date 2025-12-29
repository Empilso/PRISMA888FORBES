"""
TCESP API Client
Client for Tribunal de Contas do Estado de São Paulo transparency API.
https://transparencia.tce.sp.gov.br/api
"""

import requests
import logging
from typing import List, Dict, Any, Optional

# Configure logging
logger = logging.getLogger(__name__)

# API Configuration
TCESP_BASE_URL = "https://transparencia.tce.sp.gov.br/api/json"
REQUEST_TIMEOUT = 30  # seconds


class TCESPClientError(Exception):
    """Custom exception for TCESP API errors"""
    pass


def get_municipios() -> List[Dict[str, str]]:
    """
    Fetch list of all municipalities from TCESP API.
    
    Returns:
        List of dicts with 'municipio' (slug) and 'municipio_extenso' (full name)
        
    Example response:
        [{"municipio": "votorantim", "municipio_extenso": "Votorantim"}, ...]
    """
    url = f"{TCESP_BASE_URL}/municipios"
    logger.info(f"[TCESP] Fetching municipalities from {url}")
    
    try:
        response = requests.get(url, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        
        data = response.json()
        logger.info(f"[TCESP] Retrieved {len(data)} municipalities")
        return data
        
    except requests.exceptions.Timeout:
        logger.error(f"[TCESP] Timeout fetching municipalities from {url}")
        raise TCESPClientError(f"Timeout connecting to TCESP API: {url}")
        
    except requests.exceptions.HTTPError as e:
        logger.error(f"[TCESP] HTTP error fetching municipalities: {e}")
        raise TCESPClientError(f"HTTP error from TCESP API: {e}")
        
    except requests.exceptions.RequestException as e:
        logger.error(f"[TCESP] Request error fetching municipalities: {e}")
        raise TCESPClientError(f"Failed to connect to TCESP API: {e}")
        
    except ValueError as e:
        logger.error(f"[TCESP] JSON decode error: {e}")
        raise TCESPClientError(f"Invalid JSON response from TCESP API: {e}")


def get_despesas(municipio_slug: str, ano: int, mes: int) -> List[Dict[str, Any]]:
    """
    Fetch municipal expenses for a specific month.
    
    Args:
        municipio_slug: Municipality identifier (e.g., "votorantim")
        ano: Year (e.g., 2024)
        mes: Month (1-12)
        
    Returns:
        List of expense records from TCESP API
        
    Example response item:
        {
            "orgao": "PREFEITURA MUNICIPAL DE VOTORANTIM",
            "mes": "Janeiro",
            "evento": "Empenhado",
            "nr_empenho": "476-2024",
            "id_fornecedor": "CNPJ - PESSOA JURÍDICA - ...",
            "nm_fornecedor": "PRODESP",
            "dt_emissao_despesa": "02/01/2024",
            "vl_despesa": "50000,00"
        }
    """
    # Validate inputs
    if mes < 1 or mes > 12:
        raise TCESPClientError(f"Invalid month: {mes}. Must be 1-12.")
    
    if ano < 2014:
        raise TCESPClientError(f"Invalid year: {ano}. TCESP data starts from 2014.")
    
    url = f"{TCESP_BASE_URL}/despesas/{municipio_slug}/{ano}/{mes}"
    logger.info(f"[TCESP] Fetching expenses from {url}")
    
    try:
        response = requests.get(url, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        
        data = response.json()
        
        # API returns empty list if no data, or list of expense objects
        if isinstance(data, list):
            logger.info(f"[TCESP] Retrieved {len(data)} expense records for {municipio_slug}/{ano}/{mes}")
            return data
        else:
            logger.warning(f"[TCESP] Unexpected response format: {type(data)}")
            return []
        
    except requests.exceptions.Timeout:
        logger.error(f"[TCESP] Timeout fetching expenses from {url}")
        raise TCESPClientError(f"Timeout connecting to TCESP API: {url}")
        
    except requests.exceptions.HTTPError as e:
        status_code = e.response.status_code if e.response else None
        logger.error(f"[TCESP] HTTP {status_code} error fetching expenses: {e}")
        
        if status_code == 404:
            # Municipality not found or no data for period
            logger.warning(f"[TCESP] No data found for {municipio_slug}/{ano}/{mes}")
            return []
            
        raise TCESPClientError(f"HTTP error from TCESP API: {e}")
        
    except requests.exceptions.RequestException as e:
        logger.error(f"[TCESP] Request error fetching expenses: {e}")
        raise TCESPClientError(f"Failed to connect to TCESP API: {e}")
        
    except ValueError as e:
        logger.error(f"[TCESP] JSON decode error: {e}")
        raise TCESPClientError(f"Invalid JSON response from TCESP API: {e}")


def validate_municipio_exists(municipio_slug: str) -> bool:
    """
    Check if a municipality exists in TCESP database.
    
    Args:
        municipio_slug: Municipality identifier to check
        
    Returns:
        True if municipality exists, False otherwise
    """
    try:
        municipios = get_municipios()
        slugs = [m.get("municipio", "").lower() for m in municipios]
        return municipio_slug.lower() in slugs
    except TCESPClientError:
        return False
