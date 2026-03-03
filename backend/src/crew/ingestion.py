
import os
import logging
from typing import List, Optional
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import SupabaseVectorStore
from supabase import create_client, Client
from dotenv import load_dotenv

# Initialize Environment
load_dotenv()

# Setup Logger
logger = logging.getLogger("ingestion")
logger.setLevel(logging.INFO)

# Supabase Client
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.error("Supabase credentials missing. Ingestion will fail.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_embeddings_model(provider: str = "openai"):
    """
    Returns the embedding model.
    Supports 'openai' and 'deepseek'.
    """
    if provider == "deepseek":
        api_key = os.getenv("DEEPSEEK_API_KEY")
        if not api_key:
            logger.warning("DEEPSEEK_API_KEY not found. Falling back to OpenAI.")
            provider = "openai"
        else:
            # DeepSeek uses OpenAI compatible API for embeddings too usually, 
            # but let's check if we need a custom class or just OpenAI with base_url
            return OpenAIEmbeddings(
                model="deepseek-chat", # Placeholder, verify if deepseek has a specific embed model name
                openai_api_key=api_key,
                openai_api_base="https://api.deepseek.com/v1"
            )

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.warning("OPENAI_API_KEY not found. Embeddings might fail.")
        return None
    
    return OpenAIEmbeddings(model="text-embedding-3-small")

def ingest_file(file_path: str, metadata: dict = None, provider: str = "openai") -> str:
    """
    Ingests a file (PDF or TXT) into Supabase Vector Store.
    Returns the vector store ID alias or table name.
    
    Args:
        file_path: Path to local file
        metadata: Dict with 'knowledge_file_id', 'category', 'city_id', etc.
        provider: 'openai' or 'deepseek'
    """
    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        raise FileNotFoundError(f"File not found: {file_path}")
    
    metadata = metadata or {}
    knowledge_file_id = metadata.get("knowledge_file_id")

    try:
        logger.info(f"📄 Processing {file_path} with metadata: {metadata} using {provider}...")

        # 1. Load Document
        if file_path.lower().endswith(".pdf"):
            loader = PyPDFLoader(file_path)
        else:
            loader = TextLoader(file_path)
        
        docs = loader.load()
        logger.info(f"📖 Loaded {len(docs)} pages/documents.")

        # 2. Split Text
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        splits = text_splitter.split_documents(docs)
        logger.info(f"✂️ Split into {len(splits)} chunks.")

        # 3. Enrich Metadata & Clean Text (Remove null chars \u0000)
        for split in splits:
            split.page_content = split.page_content.replace('\x00', '').replace('\u0000', '')
            split.metadata.update(metadata)
            split.metadata["source"] = file_path
            # LangChain SupabaseVectorStore uses a specific column for foreign key usually if configured, 
            # otherwise it goes into the metadata jsonb.
        
        # 4. Create Embeddings & Store in Supabase
        embeddings = get_embeddings_model(provider)
        if not embeddings:
            raise ValueError("No embedding model available.")

        # Using 'knowledge_chunks' table (Dedicated Enterprise Storage)
        vector_store = SupabaseVectorStore.from_documents(
            documents=splits,
            embedding=embeddings,
            client=supabase,
            table_name="knowledge_chunks",
            query_name="match_knowledge" 
        )
        
        logger.info(f"✅ Ingestion Complete. Stored {len(splits)} vectors in 'knowledge_chunks' table.")
        
        return "knowledge_chunks"

    except Exception as e:
        logger.error(f"❌ Ingestion Failed: {e}")
        raise e

def ingest_pdf_file(file_path: str, metadata: dict = None):
    return ingest_file(file_path, metadata)

def ingest_text_file(file_path: str, metadata: dict = None):
    return ingest_file(file_path, metadata)
