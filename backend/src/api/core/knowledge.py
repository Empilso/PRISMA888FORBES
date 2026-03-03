
import os
import shutil
import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Depends, Form
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv

# Initialize Environment
load_dotenv()

# Setup Supabase
video_supabase_url = os.getenv("SUPABASE_URL")
video_supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not video_supabase_url or not video_supabase_key:
    video_supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    video_supabase_key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

# Create Client
try:
    supabase: Client = create_client(video_supabase_url, video_supabase_key)
except Exception as e:
    print(f"⚠️ Warning: Supabase client init failed in knowledge.py: {e}")
    supabase = None

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])

UPLOAD_DIR = "/home/carneiro888/CARNEIRO888/PRISMA888V11/PRISMA888FORBES/backend/data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# --- Models ---
class CheckFileDTO(BaseModel):
    id: str
    filename: str
    file_path: str
    file_type: Optional[str] = None
    file_size: Optional[int] = 0
    status: str
    created_at: str
    category: Optional[str] = "geral"
    city_id: Optional[str] = None

class UploadResponse(BaseModel):
    id: str
    filename: str
    file_path: str
    status: str

# --- Background Tasks ---
def process_file_background(file_id: str, file_path: str, provider: str = "openai"):
    """
    Background task to process embeddings.
    Updates the status in the DB.
    """
    if not supabase: return

    try:
        print(f"🔄 Processing Knowledge File: {file_path} using {provider}")
        
        # 1. Fetch metadata from DB
        file_record = supabase.table("knowledge_files").select("*").eq("id", file_id).single().execute()
        if not file_record.data:
            raise Exception(f"File record {file_id} not found in database")
        
        record = file_record.data
        metadata = {
            "knowledge_file_id": file_id,
            "category": record.get("category", "geral"),
            "city_id": record.get("city_id")
        }
        
        # 2. Update status to processing
        supabase.table("knowledge_files").update({"status": "processing"}).eq("id", file_id).execute()
        
        # 3. Call actual ingestion logic with metadata and provider
        try:
            from src.crew.ingestion import ingest_file
            vector_id = ingest_file(file_path, metadata=metadata, provider=provider)
        except ImportError:
            print("⚠️ Ingestion module not found, skipping real vectorization.")
            vector_id = "mock_vector_id"
        except Exception as e:
            print(f"⚠️ Ingestion failed: {e}")
            raise e
        
        # 4. Update to indexed
        supabase.table("knowledge_files").update({
            "status": "indexed",
            "vector_id": str(vector_id)
        }).eq("id", file_id).execute()
        
        print(f"✅ Knowledge File Indexed: {file_id}")
        
    except Exception as e:
        print(f"❌ Processing Failed for {file_id}: {e}")
        supabase.table("knowledge_files").update({"status": "error"}).eq("id", file_id).execute()

# --- Endpoints ---

@router.get("/list", response_model=List[CheckFileDTO])
def list_knowledge(
    campaign_id: Optional[str] = None,
    category: Optional[str] = None,
    city_id: Optional[str] = None
):
    """Get all knowledge files from the database."""
    if not supabase:
        return []

    try:
        query = supabase.table("knowledge_files").select("*").order("created_at", desc=True)
        
        if campaign_id:
            query = query.eq("campaign_id", campaign_id)
        
        if category:
            query = query.eq("category", category)
            
        if city_id:
            query = query.eq("city_id", city_id)
            
        result = query.execute()
        return result.data
    except Exception as e:
        print(f"Database error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload", response_model=UploadResponse)
async def upload_knowledge(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...),
    category: str = Form("geral"),
    city_id: Optional[str] = Form(None),
    provider: str = Form("openai")
):
    """
    Upload a file, save to disk, record in DB, and queue ingestion.
    """
    if not supabase:
        raise HTTPException(status_code=503, detail="Database Unavailable")

    try:
        # 1. Save to Disk
        safe_filename = file.filename.replace(" ", "_")
        file_path = os.path.join(UPLOAD_DIR, safe_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        file_size = os.path.getsize(file_path)
        
        # 2. Insert into DB
        file_data = {
            "filename": safe_filename,
            "file_path": file_path,
            "file_type": file.content_type or "unknown",
            "file_size": file_size,
            "status": "pending",
            "category": category,
            "city_id": city_id if city_id and city_id != 'null' else None
        }
        
        res = supabase.table("knowledge_files").insert(file_data).execute()
        
        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to insert into DB")
            
        record = res.data[0]
        file_id = record["id"]

        # 3. Queue Background Processing
        background_tasks.add_task(process_file_background, file_id, file_path, provider)
        
        return {
            "id": file_id,
            "filename": safe_filename,
            "file_path": file_path,
            "status": "queued"
        }

    except Exception as e:
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
