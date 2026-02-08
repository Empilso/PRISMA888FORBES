
import os
import logging

logger = logging.getLogger("ingestion")
logger.setLevel(logging.INFO)

def ingest_pdf_file(file_path: str):
    """
    Placeholder for PDF ingestion logic.
    Ideally this would split the PDF, generate embeddings, and store in a Vector DB (e.g. Supabase pgvector).
    """
    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        return
        
    logger.info(f"📄 [PDF Ingestion] Processing {file_path}...")
    # TODO: Implement LangChain PDFLoader + Embeddings
    logger.info(f"✅ [PDF Ingestion] Mock execution complete.")

def ingest_text_file(file_path: str):
    """
    Placeholder for Text ingestion logic.
    """
    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        return
        
    logger.info(f"📝 [Text Ingestion] Processing {file_path}...")
    # TODO: Implement Text Loading + Embeddings
    logger.info(f"✅ [Text Ingestion] Mock execution complete.")
