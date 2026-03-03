from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from src.services.ingestion import process_electoral_csv

router = APIRouter(prefix="/api/ingest", tags=["ingestion"])


class IngestLocationsRequest(BaseModel):
    campaign_id: str
    file_url: str


@router.post("/locations")
async def ingest_locations(request: IngestLocationsRequest):
    """
    Processa CSV de dados eleitorais e popula a tabela locations.
    
    Body:
        - campaign_id: UUID da campanha
        - file_url: URL pública do CSV no Supabase Storage
    """
    try:
        result = await process_electoral_csv(
            file_url=request.file_url,
            campaign_id=request.campaign_id
        )
        
        if result.get("success"):
            return result
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Erro desconhecido"))
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class IngestPdfRequest(BaseModel):
    campaign_id: str
    file_url: str


@router.post("/pdf")
async def ingest_pdf(request: IngestPdfRequest):
    """
    Processa PDF de Plano de Governo e gera embeddings para busca semântica.
    
    Body:
        - campaign_id: UUID da campanha
        - file_url: URL pública do PDF no Supabase Storage
    """
    from src.services.pdf_ingestion import process_campaign_pdf
    
    try:
        result = process_campaign_pdf(
            file_url=request.file_url,
            campaign_id=request.campaign_id
        )
        
        return result
            
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
