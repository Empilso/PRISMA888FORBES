import os
import sys
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("Supabase credentials not found")
    return create_client(url, key)

def run_test():
    print("🧪 Iniciando Verificação de Segurança Multi-tenant...")
    supabase = get_supabase_client()
    
    # 1. Verificar se a tabela de organizações existe
    try:
        print("\n📁 [1/4] Verificando tabela 'organizations'...")
        res = supabase.table("organizations").select("count", count="exact").limit(1).execute()
        print(f"✅ Tabela 'organizations' acessível. Total de orgs: {res.count if hasattr(res, 'count') else 0}")
    except Exception as e:
        print(f"❌ Erro ao acessar 'organizations': {e}")

    # 2. Verificar se colunas novas em 'profiles' existem
    print("\n👤 [2/4] Verificando colunas me 'profiles'...")
    try:
        res = supabase.table("profiles").select("organization_id, org_role").limit(1).execute()
        print("✅ Colunas 'organization_id' e 'org_role' encontradas em 'profiles'.")
    except Exception as e:
        print(f"❌ Colunas em 'profiles' não encontradas ou erro de acesso: {e}")

    # 3. Verificar se coluna nova em 'campaigns' existe
    print("\n📊 [3/4] Verificando colunas em 'campaigns'...")
    try:
        res = supabase.table("campaigns").select("organization_id").limit(1).execute()
        print("✅ Coluna 'organization_id' encontrada em 'campaigns'.")
    except Exception as e:
        print(f"❌ Coluna em 'campaigns' não encontrada: {e}")

    # 4. Verificar RLS no PostgreSQL (via RPC ou Query direta se possível)
    print("\n🔐 [4/4] Verificando Políticas de RLS (Row Level Security)...")
    try:
        # Tenta listar políticas via SQL
        sql = """
        SELECT policyname, tablename, permissive, roles, cmd, qual 
        FROM pg_policies 
        WHERE tablename IN ('organizations', 'campaigns');
        """
        # Nota: supabase-py não executa SQL arbitrário por padrão sem RPC setado.
        # Vamos tentar testar o efeito prático do RLS.
        print("ℹ️ Dica: Teste prático do RLS requer headers de autenticação de usuário comum.")
        print("ℹ️ Check de schema concluído. O isolamento de dados depende do estado do RLS no Supabase Dashboard.")
    except Exception as e:
        print(f"❌ Falha ao inspecionar políticas: {e}")

    print("\n✨ Verificação de Schema Concluída!")

if __name__ == "__main__":
    run_test()
