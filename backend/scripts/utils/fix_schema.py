import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

def fix_schema():
    print("🛠️ Adicionando coluna 'estimated_votes' na tabela 'strategies'...")
    try:
        # Executa SQL via RPC do Supabase
        res = supabase.rpc("exec_sql", {
            "query": "ALTER TABLE strategies ADD COLUMN IF NOT EXISTS estimated_votes INTEGER DEFAULT 0;"
        }).execute()
        print(f"✅ Coluna adicionada com sucesso! Resposta: {res.data}")
    except Exception as e:
        print(f"⚠️ RPC falhou (esperado se não existir): {e}")
        print("📋 Execute manualmente no Supabase SQL Editor:")
        print("   ALTER TABLE strategies ADD COLUMN IF NOT EXISTS estimated_votes INTEGER DEFAULT 0;")

if __name__ == "__main__":
    fix_schema()
    
    # Verificar se funcionou
    print("\n🔍 Verificando...")
    try:
        res = supabase.table("strategies").select("id, estimated_votes").limit(1).execute()
        print(f"✅ Coluna 'estimated_votes' agora existe! Dados: {res.data}")
    except Exception as e:
        print(f"❌ Ainda não existe: {e}")
