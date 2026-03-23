#!/usr/bin/env python3
"""
Apply fix_admin_dashboard_rls.sql migration
"""
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

def main():
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not url or not key:
        print("❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados")
        return
    
    print(f"🔍 Conectando ao projeto: {url}")
    supabase = create_client(url, key)
    
    # Read migration file
    migration_path = '../migrations/fix_admin_dashboard_rls.sql'
    with open(migration_path, 'r') as f:
        migration_sql = f.read()
    
    print(f"📄 Lendo migration: {migration_path}")
    print("🚀 Aplicando migration...")
    print("="*60)
    
    # Split into individual statements
    statements = [s.strip() for s in migration_sql.split(';') if s.strip() and not s.strip().startswith('--')]
    
    success_count = 0
    error_count = 0
    
    for i, statement in enumerate(statements, 1):
        if not statement:
            continue
            
        try:
            # Use PostgREST to execute via a stored procedure or direct query
            # Since we can't execute DDL directly via Supabase client, we need to use SQL editor
            print(f"Statement {i}/{len(statements)}: {statement[:50]}...")
            
            # Try to execute via rpc if available
            result = supabase.rpc('exec_sql', {'query': statement}).execute()
            print(f"  ✅ Executado")
            success_count += 1
        except Exception as e:
            error_msg = str(e)
            if 'does not exist' in error_msg or 'not found' in error_msg:
                print(f"  ⚠️  RPC exec_sql não disponível")
                print("\n" + "="*60)
                print("INSTRUÇÕES: Execute este SQL manualmente no Supabase Dashboard")
                print("="*60)
                print(migration_sql)
                return
            else:
                print(f"  ❌ Erro: {error_msg}")
                error_count += 1
    
    print("="*60)
    print(f"✅ Sucesso: {success_count} statements")
    if error_count > 0:
        print(f"❌ Erros: {error_count} statements")
    print("🎉 Migration concluída!")

if __name__ == '__main__':
    main()
