import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

def check_rls():
    print("🛡️ Verificando RLS na tabela 'strategies'...")
    try:
        # Query pg_tables to check row security
        res = supabase.rpc("get_table_info", {"table_name": "strategies"}).execute()
        print(f"📊 Info: {res.data}")
    except Exception as e:
        # Se o RPC não existir, tentamos via query direta se possível (mas geralmente não é)
        # Vamos tentar um select simples com a chave anon (se tivéssemos a chave anon)
        print(f"⚠️ Não foi possível verificar RLS via RPC: {e}")
        
    # Alternativa: tentar um select sem a service role se possível (precisaria da anon key)
    # Como não tenho a anon key fácil, vou tentar inferir.

if __name__ == "__main__":
    check_rls()
