
import os
import sys
import logging
from supabase import create_client, Client
from dotenv import load_dotenv

# Adicionar o diretório raiz ao path para importar src
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.crew.ingestion import ingest_file

# Setup Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("force_ingestion")

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def force_ingestion():
    file_id = "ff88034f-1af1-4d8d-9b4a-4a8ae57a6707"
    file_path = "backend/data/uploads/PLANODEGOVERNOWEBERMANGA.pdf"
    
    if not os.path.exists(file_path):
        logger.error(f"Arquivo não encontrado localmente: {file_path}")
        return

    logger.info(f"🚀 Iniciando vetorização forçada para o arquivo {file_id}...")
    
    metadata = {
        "knowledge_file_id": file_id,
        "category": "plano_governo",
        "city_id": "5cace28c-9fc0-4348-98d2-34eec4b706a6"
    }
    
    try:
        # A função ingest_file em src.crew.ingestion já usa 'knowledge_chunks' como table_name
        table_name = ingest_file(file_path, metadata=metadata)
        logger.info(f"✅ Vetorização concluída com sucesso na tabela {table_name}")
        
        # Verificar se os registros apareceram
        res = supabase.table("knowledge_chunks").select("count", count="exact").eq("metadata->>knowledge_file_id", file_id).execute()
        logger.info(f"📊 Total de chunks na tabela: {res.count}")
        
    except Exception as e:
        logger.error(f"❌ Erro na vetorização: {e}")

if __name__ == "__main__":
    force_ingestion()
