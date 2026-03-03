import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

def migrate():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    supabase = create_client(url, key)

    print("🚀 Iniciando migração da tabela social_monitors...")

    # Como não temos acesso direto ao SQL via SDK do Supabase sem uma function RPC, 
    # vamos tentar verificar os campos via select e logar o estado atual.
    # Nota: Em ambientes Supabase, idealmente usamos RPC ou migrations via dashboard.
    # Vou sugerir ao usuário rodar o SQL se for possível, ou tentar uma alternativa.
    
    try:
        # Tenta pegar um registro para ver as colunas
        res = supabase.table("social_monitors").select("*").limit(1).execute()
        print(f"✅ Conexão OK. Colunas atuais: {res.data[0].keys() if res.data else 'Tabela vazia'}")
        
    except Exception as e:
        print(f"❌ Erro ao acessar tabela: {e}")

if __name__ == "__main__":
    migrate()
