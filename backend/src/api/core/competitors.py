"""
Competitor Management API
Handles competitor data uploads (CSV votes, PDF plans) and retrieval.
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
import csv
import io
import os
from supabase import create_client

router = APIRouter(prefix="/api/competitor", tags=["competitors"])


def get_supabase():
    """Create Supabase client with service role for backend operations."""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise HTTPException(status_code=500, detail="Supabase credentials not configured")
    return create_client(url, key)


class UploadCSVResponse(BaseModel):
    success: bool
    rows_imported: int
    message: str


@router.post("/{competitor_id}/upload/csv", response_model=UploadCSVResponse)
async def upload_competitor_csv(
    competitor_id: str,
    file: UploadFile = File(...)
):
    """
    Upload CSV de votos do concorrente.
    
    Formato esperado do CSV (TSE padrão):
    - location_name: Nome do local de votação
    - votes: Votos do concorrente
    - total_votes: Total de votos no local (opcional)
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Arquivo deve ser CSV")
    
    try:
        supabase = get_supabase()
        
        # Verifica se o competitor existe
        comp_result = supabase.table("competitors").select("id, name").eq("id", competitor_id).single().execute()
        if not comp_result.data:
            raise HTTPException(status_code=404, detail="Concorrente não encontrado")
        
        competitor_name = comp_result.data["name"]
        
        # Lê o CSV (mesma lógica do candidato principal)
        content = await file.read()
        decoded = content.decode('utf-8-sig')  # Handle BOM
        
        # Detecta delimitador (pode ser ; ou ,)
        first_line = decoded.split('\n')[0]
        delimiter = ';' if ';' in first_line else ','
        
        reader = csv.DictReader(io.StringIO(decoded), delimiter=delimiter)
        
        rows_to_insert = []
        for row in reader:
            # FORMATO 1: Igual ao candidato principal (local, votos_candidato, total_votos)
            location_name = (
                row.get('local') or 
                row.get('NM_LOCAL_VOTACAO') or 
                row.get('location_name') or 
                row.get('nome')
            )
            
            votes_str = (
                row.get('votos_candidato') or 
                row.get('QT_VOTOS') or 
                row.get('votes') or 
                row.get('votos') or '0'
            )
            
            total_str = (
                row.get('total_votos') or 
                row.get('QT_VOTOS_TOTAIS') or 
                row.get('total_votes') or 
                row.get('total') or '0'
            )
            
            if not location_name:
                continue
            
            try:
                # Limpa formatação de número (1.234,56 -> 1234.56)
                votes = int(str(votes_str).replace('.', '').replace(',', '').strip() or '0')
                total_votes = int(str(total_str).replace('.', '').replace(',', '').strip() or '0') if total_str else 0
            except ValueError:
                votes = 0
                total_votes = 0
            
            # Calcula porcentagem
            percentage = (votes / total_votes * 100) if total_votes > 0 else 0
            
            rows_to_insert.append({
                "competitor_id": competitor_id,
                "location_name": str(location_name).strip(),
                "votes": votes,
                "total_votes": total_votes,
                "percentage": round(percentage, 2)
            })
        
        if not rows_to_insert:
            raise HTTPException(status_code=400, detail="Nenhum dado válido encontrado no CSV. Colunas esperadas: local, votos_candidato, total_votos")
        
        # Limpa dados antigos do mesmo competitor
        supabase.table("competitor_votes").delete().eq("competitor_id", competitor_id).execute()
        
        # Insere novos dados em batches de 500
        batch_size = 500
        for i in range(0, len(rows_to_insert), batch_size):
            batch = rows_to_insert[i:i + batch_size]
            supabase.table("competitor_votes").insert(batch).execute()
        
        # Atualiza files no competitor
        files_update = comp_result.data.get("files", []) or []
        files_update = [f for f in files_update if f.get("type") != "csv"]  # Remove CSV anterior
        files_update.append({
            "name": file.filename,
            "type": "csv",
            "rows": len(rows_to_insert)
        })
        supabase.table("competitors").update({"files": files_update}).eq("id", competitor_id).execute()
        
        return UploadCSVResponse(
            success=True,
            rows_imported=len(rows_to_insert),
            message=f"Importados {len(rows_to_insert)} locais de votação para {competitor_name}"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao processar CSV: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class UploadPDFResponse(BaseModel):
    success: bool
    chunks_created: int
    message: str


@router.post("/{competitor_id}/upload/pdf", response_model=UploadPDFResponse)
async def upload_competitor_pdf(
    competitor_id: str,
    file: UploadFile = File(...)
):
    """
    Upload PDF do plano de governo do concorrente.
    Extrai texto, chunka e salva para análise IA.
    """
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Arquivo deve ser PDF")
    
    try:
        supabase = get_supabase()
        
        # Verifica se o competitor existe
        comp_result = supabase.table("competitors").select("id, name, campaign_id").eq("id", competitor_id).single().execute()
        if not comp_result.data:
            raise HTTPException(status_code=404, detail="Concorrente não encontrado")
        
        competitor_name = comp_result.data["name"]
        campaign_id = comp_result.data["campaign_id"]
        
        # Extrai texto do PDF usando mesma lib do sistema principal (langchain)
        import tempfile
        import os
        from langchain_community.document_loaders import PyPDFLoader
        
        content = await file.read()
        
        # Salva temporariamente para o loader
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
            tmp_file.write(content)
            tmp_path = tmp_file.name
        
        try:
            loader = PyPDFLoader(tmp_path)
            pages = loader.load()
            
            full_text = "\n\n".join([p.page_content for p in pages])
            page_count = len(pages)
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        
        if not full_text.strip():
            raise HTTPException(status_code=400, detail="Não foi possível extrair texto do PDF")
        
        # Chunking simples (500 chars com overlap de 100) - mesmo formato do sistema principal
        chunk_size = 500
        overlap = 100
        chunks = []
        
        text = full_text.strip()
        i = 0
        chunk_idx = 0
        while i < len(text):
            chunk_text = text[i:i + chunk_size]
            if chunk_text.strip():
                # Mesmo formato do pdf_ingestion.py do sistema principal
                chunks.append({
                    "campaign_id": campaign_id,
                    "competitor_id": competitor_id,
                    "content": chunk_text.strip(),
                    "metadata": {
                        "source": f"competitor_pdf:{file.filename}",
                        "competitor_name": competitor_name,
                        "filename": file.filename,
                        "page_count": page_count,
                        "chunk_index": chunk_idx
                    }
                })
                chunk_idx += 1
            i += chunk_size - overlap
        
        if not chunks:
            raise HTTPException(status_code=400, detail="PDF sem conteúdo extraível")
        
        # Limpa chunks antigos do mesmo competitor
        supabase.table("document_chunks").delete().eq("competitor_id", competitor_id).execute()
        
        # Insere novos chunks
        batch_size = 100
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i + batch_size]
            supabase.table("document_chunks").insert(batch).execute()
        
        # Atualiza files no competitor
        files_update = comp_result.data.get("files", []) or []
        files_update = [f for f in files_update if f.get("type") != "pdf"]  # Remove PDF anterior
        files_update.append({
            "name": file.filename,
            "type": "pdf",
            "chunks": len(chunks),
            "pages": page_count
        })
        supabase.table("competitors").update({"files": files_update}).eq("id", competitor_id).execute()
        
        return UploadPDFResponse(
            success=True,
            chunks_created=len(chunks),
            message=f"PDF processado: {len(chunks)} chunks de {competitor_name}"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao processar PDF: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{competitor_id}/votes")
async def get_competitor_votes(competitor_id: str):
    """Retorna votos processados do concorrente."""
    try:
        supabase = get_supabase()
        
        result = supabase.table("competitor_votes")\
            .select("*")\
            .eq("competitor_id", competitor_id)\
            .order("votes", desc=True)\
            .limit(100)\
            .execute()
        
        return {
            "competitor_id": competitor_id,
            "total_locations": len(result.data),
            "votes": result.data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{competitor_id}/files")
async def get_competitor_files(competitor_id: str):
    """Retorna metadados dos arquivos uploadados do concorrente."""
    try:
        supabase = get_supabase()
        
        result = supabase.table("competitors")\
            .select("id, name, files")\
            .eq("id", competitor_id)\
            .single()\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Concorrente não encontrado")
        
        return {
            "competitor_id": competitor_id,
            "name": result.data["name"],
            "files": result.data.get("files", [])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{competitor_id}/votes/geo")
async def get_competitor_votes_geo(competitor_id: str):
    """
    Retorna votos do concorrente com coordenadas geográficas.
    Cruza location_name com a tabela locations da campanha para obter lat/lng.
    """
    try:
        supabase = get_supabase()
        
        # Busca o competitor para obter campaign_id
        comp_result = supabase.table("competitors")\
            .select("id, name, campaign_id, color")\
            .eq("id", competitor_id)\
            .single()\
            .execute()
        
        if not comp_result.data:
            raise HTTPException(status_code=404, detail="Concorrente não encontrado")
        
        campaign_id = comp_result.data["campaign_id"]
        competitor_color = comp_result.data.get("color", "#EF4444")
        competitor_name = comp_result.data["name"]
        
        # Busca votos do concorrente
        votes_result = supabase.table("competitor_votes")\
            .select("*")\
            .eq("competitor_id", competitor_id)\
            .execute()
        
        if not votes_result.data:
            return {
                "competitor_id": competitor_id,
                "competitor_name": competitor_name,
                "color": competitor_color,
                "locations": [],
                "matched": 0,
                "unmatched": 0
            }
        
        # Busca locations da campanha para fazer geocoding match
        locations_result = supabase.table("locations")\
            .select("id, name, latitude, longitude")\
            .eq("campaign_id", campaign_id)\
            .execute()
        
        # Cria mapa de nome -> coordenadas (normalizado para match)
        location_map = {}
        for loc in locations_result.data or []:
            # Normaliza nome para match (lowercase, sem acentos simplificado)
            normalized = loc["name"].lower().strip()
            location_map[normalized] = {
                "lat": loc["latitude"],
                "lng": loc["longitude"],
                "original_name": loc["name"]
            }
        
        # Cruza votos com coordenadas
        geo_locations = []
        matched = 0
        unmatched = 0
        
        for vote in votes_result.data:
            location_name = vote["location_name"]
            normalized_name = location_name.lower().strip()
            
            coords = location_map.get(normalized_name)
            if coords:
                matched += 1
                geo_locations.append({
                    "id": vote["id"],
                    "name": location_name,
                    "votes": vote["votes"],
                    "total_votes": vote["total_votes"],
                    "percentage": vote["percentage"],
                    "position": [coords["lat"], coords["lng"]]
                })
            else:
                unmatched += 1
        
        return {
            "competitor_id": competitor_id,
            "competitor_name": competitor_name,
            "color": competitor_color,
            "locations": geo_locations,
            "matched": matched,
            "unmatched": unmatched
        }
        
    except HTTPException:
        raise

@router.post("/{competitor_id}/analyze")
async def analyze_competitor_adversarial(competitor_id: str):
    """
    DISPARA O MOTOR ADVERSÁRIO (Counter-Intel).
    Gera um relatório de pontos fracos e contra-ataques.
    """
    try:
        supabase = get_supabase()
        
        # 1. Busca dados do concorrente
        comp_result = supabase.table("competitors").select("id, name, campaign_id").eq("id", competitor_id).single().execute()
        if not comp_result.data:
            raise HTTPException(status_code=404, detail="Concorrente não encontrado")
            
        competitor_name = comp_result.data["name"]
        campaign_id = comp_result.data["campaign_id"]
        
        # 2. Instancia a Crew (Modo Adversário)
        from src.crew.genesis_crew import GenesisCrew
        
        # Usa persona "standard" ou "strategist" como base, mas a Crew vai focar no agente Counter-Intel
        crew = GenesisCrew(campaign_id=campaign_id, persona="standard")
        
        # 3. Executa a análise
        result = crew.run_adversarial_analysis(competitor_name)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro na análise adversária: {e}")
        raise HTTPException(status_code=500, detail=str(e))
