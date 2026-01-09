
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Erro: Credenciais não encontradas.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def apply_migration():
    print("🚀 Aplicando migração: create_legislative_support.sql")
    try:
        with open("migrations/create_legislative_support.sql", "r") as f:
            sql = f.read()
        
        # O supabase-py client (postgrest) não tem método direto para raw SQL arbitrário infelizmente,
        # a menos que usemos uma função RPC chamada 'exec_sql' se ela existir no banco.
        # Alternativa: Usar a API Rest se tiver uma function, ou psycopg2 se tiver connection string.
        # Mas vamos tentar usar o endpoint RPC 'exec_sql' que geralmente é criado em setups supabase para admins,
        # OU vamos assumir que o ambiente tem comando psql disponivel via shell?
        # A instrução de ambiente diz "linux", "bash".
        # Vamos tentar chamar uma função rpc 'execute_sql' caso ela exista (comum em starters kits).
        
        # Se não existir, vou falhar. 
        # TENTATIVA 1: RPC
        try:
           response = supabase.rpc("exec_sql", {"sql_query": sql}).execute()
           print("✅ Migração via RPC executada.")
           return
        except Exception as e:
           print(f"⚠️ RPC exec_sql falhou: {e}")
           
        # TENTATIVA 2: Se falhar RPC, vou tentar psycopg2 se disponível, ou alertar o usuário.
        # Mas espere, se eu tenho acesso ao terminal, eu posso verificar se tenho psql instalado?
        # Ou se tenho a connection string no .env?
        
    except Exception as e:
        print(f"❌ Erro ao ler arquivo: {e}")

if __name__ == "__main__":
    apply_migration()
