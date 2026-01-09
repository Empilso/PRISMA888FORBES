import os
import requests
import tempfile
import logging
import time
import io
from typing import Optional
from dataclasses import dataclass

# Setup Logger
logger = logging.getLogger("pdf_service")
logger.setLevel(logging.INFO)

@dataclass
class ExtractionResult:
    text: str
    pages: int
    success: bool
    error: Optional[str] = None

class PDFExtractionService:
    """
    Enterprise-grade PDF Extraction Service.
    Handles downloading, parsing, and error management with retries.
    """
    
    def __init__(self, max_retries: int = 2):
        self.max_retries = max_retries
        self.user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"

    def extract_from_storage(self, file_url: str, bucket: str = "government-plans") -> ExtractionResult:
        """
        Extract text from a PDF stored in Supabase Storage using authenticated download.
        This handles private buckets correctly.
        
        Args:
            file_url: The full public URL or just the path within the bucket
            bucket: The storage bucket name
        """
        from supabase import create_client
        
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not supabase_url or not supabase_key:
            return ExtractionResult(text="", pages=0, success=False, error="Supabase credentials missing")
        
        supabase = create_client(supabase_url, supabase_key)
        
        # Extract path from URL if full URL provided
        if bucket in file_url:
            path = file_url.split(f"{bucket}/")[1].split("?")[0]
        else:
            path = file_url
        
        logger.info(f"Downloading from storage: {bucket}/{path}")
        
        try:
            # Authenticated download
            file_data = supabase.storage.from_(bucket).download(path)
            logger.info(f"Downloaded {len(file_data)} bytes")
            
            # Parse directly from bytes
            text, pages = self._parse_pdf_bytes(file_data)
            
            if not text.strip():
                return ExtractionResult(text="", pages=pages, success=False, error="OCR Required (Image PDF)")
            
            return ExtractionResult(text=text, pages=pages, success=True)
            
        except Exception as e:
            logger.error(f"Storage download error: {e}")
            return ExtractionResult(text="", pages=0, success=False, error=str(e))

    def extract_text(self, url: str) -> ExtractionResult:
        """
        Download and extract text from a PDF URL.
        For Supabase Storage URLs with private buckets, use extract_from_storage() instead.
        """
        if not url:
            return ExtractionResult(text="", pages=0, success=False, error="URL is empty")

        # Auto-detect Supabase Storage URLs and use authenticated download
        if "supabase.co/storage" in url and "government-plans" in url:
            logger.info("Detected Supabase Storage URL, using authenticated download")
            return self.extract_from_storage(url, "government-plans")

        pdf_path = None
        
        for attempt in range(self.max_retries + 1):
            try:
                # 1. Download
                logger.info(f"Downloading PDF from {url} (Attempt {attempt+1}/{self.max_retries+1})")
                headers = {"User-Agent": self.user_agent}
                response = requests.get(url, headers=headers, timeout=20)
                response.raise_for_status()
                
                # 2. Save to Temp
                with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                    tmp.write(response.content)
                    pdf_path = tmp.name
                
                # 3. Parse
                text, pages = self._parse_pdf(pdf_path)
                
                # Cleanup
                if os.path.exists(pdf_path):
                    os.remove(pdf_path)
                    
                if not text.strip():
                     return ExtractionResult(text="", pages=pages, success=False, error="OCR Required (Image PDF)")

                return ExtractionResult(text=text, pages=pages, success=True)

            except Exception as e:
                logger.error(f"Error on attempt {attempt}: {e}")
                if pdf_path and os.path.exists(pdf_path):
                    os.remove(pdf_path)
                
                if attempt == self.max_retries:
                    return ExtractionResult(text="", pages=0, success=False, error=str(e))
                
                time.sleep(1) # Backoff

        return ExtractionResult(text="", pages=0, success=False, error="Unknown error after retries")

    def _parse_pdf_bytes(self, data: bytes) -> tuple[str, int]:
        """
        Parse PDF from bytes (for storage downloads)
        """
        try:
            from pypdf import PdfReader
        except ImportError:
            from PyPDF2 import PdfReader
        
        reader = PdfReader(io.BytesIO(data))
        text = ""
        pages_count = len(reader.pages)
        
        for i, page in enumerate(reader.pages):
            if i > 50: 
                break
            page_content = page.extract_text()
            if page_content:
                text += page_content + "\n\n"
        
        clean_text = "\n".join([line.strip() for line in text.splitlines() if line.strip()])
        
        # CRITICAL: Remove NULL bytes that PostgreSQL cannot store
        clean_text = clean_text.replace('\x00', '')
        clean_text = clean_text.replace('\u0000', '')
        
        return clean_text, pages_count

    def _parse_pdf(self, path: str) -> tuple[str, int]:
        """
        Internal method to parse PDF using pypdf/PyPDF2
        Returns (text, num_pages)
        """
        try:
            from pypdf import PdfReader
        except ImportError:
            try:
                from PyPDF2 import PdfReader
            except ImportError:
                raise ImportError("pypdf or PyPDF2 not installed.")

        reader = PdfReader(path)
        text = ""
        pages_count = len(reader.pages)
        
        for i, page in enumerate(reader.pages):
            if i > 50: 
                break
            page_content = page.extract_text()
            if page_content:
                text += page_content + "\n\n"
        
        clean_text = "\n".join([line.strip() for line in text.splitlines() if line.strip()])
        
        # CRITICAL: Remove NULL bytes that PostgreSQL cannot store
        clean_text = clean_text.replace('\x00', '')
        clean_text = clean_text.replace('\u0000', '')
        
        return clean_text, pages_count

