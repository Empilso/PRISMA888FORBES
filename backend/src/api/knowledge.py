
import os
import shutil
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from pydantic import BaseModel
from src.crew.ingestion import ingest_pdf_file, ingest_text_file

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])

UPLOAD_DIR = "/home/carneiro888/CARNEIRO888/PRISMA888V11/PRISMA888FORBES/backend/data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class IngestionResponse(BaseModel):
    filename: str
    status: str
    message: str

def process_file_background(file_path: str, filename: str):
    """Background task to process embeddings."""
    try:
        if filename.endswith(".pdf"):
            ingest_pdf_file(file_path)
        else:
            ingest_text_file(file_path)
        print(f"✅ Background Ingestion Complete: {filename}")
        # Here we could update a DB status if we had a knowledge_files table
    except Exception as e:
        print(f"❌ Background Ingestion Failed: {e}")

@router.post("/upload", response_model=IngestionResponse)
async def upload_knowledge(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """
    Enterprise Upload Handler.
    Saves file and triggers background vector ingestion.
    """
    try:
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Trigger Background Processing to not block UI
        background_tasks.add_task(process_file_background, file_path, file.filename)
        
        return {
            "filename": file.filename,
            "status": "queued",
            "message": "File uploaded and ingestion started in background."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
def list_knowledge():
    """List available knowledge files."""
    try:
        files = []
        if os.path.exists(UPLOAD_DIR):
             for f in os.listdir(UPLOAD_DIR):
                 files.append({"filename": f, "size": os.path.getsize(os.path.join(UPLOAD_DIR, f))})
        return files
    except Exception as e:
         return []
