import os
import requests
import tempfile
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    # Fallback to check if they are set in the environment (e.g. by docker or system)
    # But usually load_dotenv handles .env file.
    pass

def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("Supabase credentials not found in environment variables")
    return create_client(url, key)

    return create_client(url, key)

def extract_text_from_pdf(file_url: str) -> str:
    """
    Downloads and extracts text from a PDF URL.
    Returns the full text content combined.
    """
    print(f"Downloading PDF from {file_url}...")
    try:
        response = requests.get(file_url)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        raise ValueError(f"Failed to download PDF: {e}")

    tmp_file_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
            tmp_file.write(response.content)
            tmp_file_path = tmp_file.name

        print("Loading PDF...")
        loader = PyPDFLoader(tmp_file_path)
        pages = loader.load()
        
        if not pages:
            return ""

        full_text = "\n\n".join([p.page_content for p in pages])
        return full_text

    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        raise e
    finally:
        if tmp_file_path and os.path.exists(tmp_file_path):
            os.remove(tmp_file_path)

def process_campaign_pdf(file_url: str, campaign_id: str):
    # Check for OpenAI Key inside the function to ensure it's loaded or raise error at runtime
    if not os.getenv("OPENAI_API_KEY"):
        raise ValueError("OPENAI_API_KEY not found in environment variables. Please add it to backend/.env")

    supabase = get_supabase_client()

    # 1. Extract Text (Reusable)
    full_text = extract_text_from_pdf(file_url)
    
    if not full_text:
        return {"status": "warning", "message": "No text content found in PDF"}

    # 2. Chunking
    print("Splitting text...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )
    chunks = text_splitter.create_documents([full_text])
    print(f"Generated {len(chunks)} chunks.")
    
    if not chunks:
            return {"status": "warning", "message": "No chunks generated"}

    # 3. Embedding
    print("Generating embeddings...")
    embeddings_model = OpenAIEmbeddings(model="text-embedding-3-small")
    
    texts = [chunk.page_content for chunk in chunks]
    vectors = embeddings_model.embed_documents(texts)
    
    # Prepare data for insertion
    documents_data = []
    filename = file_url.split("/")[-1].split("?")[0] # Simple filename extraction
    
    for i, chunk in enumerate(chunks):
        # Clean content to remove null bytes or encoding issues if any
        content = chunk.page_content.replace("\x00", "")
        
        documents_data.append({
            "campaign_id": campaign_id,
            "content": content, # Alterado de content_text para content
            "embedding": vectors[i],
            "metadata": {
                "source": file_url,
                "filename": filename,
                "page": chunk.metadata.get("page", 0)
            }
        })
        
    # 4. Persist (Upsert)
    print("Inserting into Supabase (document_chunks)...")
    # Insert in batches
    batch_size = 50
    for i in range(0, len(documents_data), batch_size):
        batch = documents_data[i:i+batch_size]
        try:
            result = supabase.table("document_chunks").insert(batch).execute()
        except Exception as batch_error:
            print(f"Error inserting batch {i}: {batch_error}")
            raise batch_error
        
    print("Ingestion complete.")
    return {"status": "success", "chunks_processed": len(chunks)}

