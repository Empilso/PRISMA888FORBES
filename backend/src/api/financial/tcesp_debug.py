"""
TCESP Debug API
Admin-only endpoints for testing TCESP integration.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
import logging

from src.workers.tcesp_worker import (
    fetch_and_store_municipal_expenses, 
    normalize_municipal_expenses,
    extract_and_link_suppliers
)
from src.integrations.tcesp_client import get_municipios, TCESPClientError

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/tcesp", tags=["admin-tcesp"])


class FetchExpensesRequest(BaseModel):
    """Request body for fetching expenses"""
    municipio_slug: str = Field(..., description="Municipality slug (e.g., 'city-slug')")
    ano: int = Field(..., ge=2014, description="Year (2014+)")
    mes: int = Field(..., ge=1, le=12, description="Month (1-12)")


class FetchExpensesResponse(BaseModel):
    """Response for fetch expenses endpoint"""
    municipio_slug: str
    ano: int
    mes: int
    records: int
    status: str = "success"


class NormalizeExpensesRequest(BaseModel):
    """Request body for normalizing expenses"""
    municipio_slug: str = Field(..., description="Municipality slug (e.g., 'city-slug')")
    ano: int = Field(..., ge=2014, description="Year (2014+)")
    mes: int = Field(..., ge=1, le=12, description="Month (1-12)")


class NormalizeExpensesResponse(BaseModel):
    """Response for normalize expenses endpoint"""
    municipio_slug: str
    ano: int
    mes: int
    records: int
    status: str = "success"


class ExtractSuppliersRequest(BaseModel):
    """Request body for extracting suppliers"""
    municipio_slug: str = Field(..., description="Municipality slug (e.g., 'city-slug')")
    ano: int = Field(..., ge=2014, description="Year (2014+)")
    mes: int = Field(..., ge=1, le=12, description="Month (1-12)")


class ExtractSuppliersResponse(BaseModel):
    """Response for extract suppliers endpoint"""
    municipio_slug: str
    ano: int
    mes: int
    suppliers_processed: int
    status: str = "success"


@router.post("/fetch-expenses", response_model=FetchExpensesResponse)
async def fetch_expenses(request: FetchExpensesRequest):
    """
    Manually trigger expense fetch from TCESP API.
    
    This is an admin-only endpoint for testing the TCESP integration.
    Fetches data for a specific municipality/year/month and stores in raw table.
    """
    logger.info(f"[TCESP API] Fetch request: {request.municipio_slug}/{request.ano}/{request.mes}")
    
    try:
        records = fetch_and_store_municipal_expenses(
            municipio_slug=request.municipio_slug,
            ano=request.ano,
            mes=request.mes
        )
        
        return FetchExpensesResponse(
            municipio_slug=request.municipio_slug,
            ano=request.ano,
            mes=request.mes,
            records=records,
            status="success"
        )
        
    except TCESPClientError as e:
        logger.error(f"[TCESP API] Client error: {e}")
        raise HTTPException(status_code=502, detail=f"TCESP API error: {str(e)}")
        
    except Exception as e:
        logger.error(f"[TCESP API] Internal error: {e}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.post("/normalize-expenses", response_model=NormalizeExpensesResponse)
async def normalize_expenses(request: NormalizeExpensesRequest):
    """
    Normalize raw expenses data into analytics-ready table.
    
    Reads data from municipal_expenses_raw and transforms into municipal_expenses.
    Must run /fetch-expenses first to have raw data available.
    """
    logger.info(f"[TCESP API] Normalize request: {request.municipio_slug}/{request.ano}/{request.mes}")
    
    try:
        records = normalize_municipal_expenses(
            municipio_slug=request.municipio_slug,
            ano=request.ano,
            mes=request.mes
        )
        
        return NormalizeExpensesResponse(
            municipio_slug=request.municipio_slug,
            ano=request.ano,
            mes=request.mes,
            records=records,
            status="success"
        )
        
    except ValueError as e:
        # No raw data found
        logger.warning(f"[TCESP API] No raw data: {e}")
        raise HTTPException(
            status_code=400, 
            detail=str(e)
        )
        
    except Exception as e:
        logger.error(f"[TCESP API] Internal error: {e}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.post("/extract-suppliers", response_model=ExtractSuppliersResponse)
async def extract_suppliers(request: ExtractSuppliersRequest):
    """
    Extract and link suppliers from normalized expenses.
    
    Reads data from municipal_expenses and creates/updates suppliers table.
    Must run /fetch-expenses and /normalize-expenses first.
    """
    logger.info(f"[TCESP API] Extract suppliers: {request.municipio_slug}/{request.ano}/{request.mes}")
    
    try:
        suppliers_count = extract_and_link_suppliers(
            municipio_slug=request.municipio_slug,
            ano=request.ano,
            mes=request.mes
        )
        
        return ExtractSuppliersResponse(
            municipio_slug=request.municipio_slug,
            ano=request.ano,
            mes=request.mes,
            suppliers_processed=suppliers_count,
            status="success"
        )
        
    except ValueError as e:
        # No expenses found
        logger.warning(f"[TCESP API] No expenses found: {e}")
        raise HTTPException(
            status_code=400, 
            detail=str(e)
        )
        
    except Exception as e:
        logger.error(f"[TCESP API] Internal error: {e}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get("/municipios")
async def list_municipios():
    """
    List all available municipalities from TCESP.
    
    Returns the list of municipalities that can be queried.
    """
    try:
        municipios = get_municipios()
        return {
            "count": len(municipios),
            "municipios": municipios
        }
        
    except TCESPClientError as e:
        logger.error(f"[TCESP API] Failed to fetch municipalities: {e}")
        raise HTTPException(status_code=502, detail=f"TCESP API error: {str(e)}")


@router.get("/status/{municipio_slug}")
async def check_municipio_status(municipio_slug: str):
    """
    Check if a municipality exists and has data available.
    """
    try:
        municipios = get_municipios()
        slugs = [m.get("municipio", "").lower() for m in municipios]
        
        exists = municipio_slug.lower() in slugs
        
        if exists:
            # Find the full name
            for m in municipios:
                if m.get("municipio", "").lower() == municipio_slug.lower():
                    return {
                        "municipio_slug": municipio_slug,
                        "exists": True,
                        "nome_completo": m.get("municipio_extenso", municipio_slug)
                    }
        
        return {
            "municipio_slug": municipio_slug,
            "exists": False,
            "nome_completo": None
        }
        
    except TCESPClientError as e:
        raise HTTPException(status_code=502, detail=f"TCESP API error: {str(e)}")
