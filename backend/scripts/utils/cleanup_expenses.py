import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv("frontend/.env.local")

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL:
    print("❌ Erro: URL não encontrada")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def cleanup():
    print("🧹 Iniciando limpeza de despesas duplicadas (Votorantim)...")
    
    # Deletar mês a mês para evitar timeout
    for mes in range(1, 13):
        print(f"   Deletando mês {mes}...")
        try:
            supabase.table("municipal_expenses") \
                .delete() \
                .eq("municipio_slug", "votorantim-sp") \
                .eq("mes", mes) \
                .execute()
            print(f"   ✅ Mês {mes} limpo.")
        except Exception as e:
            print(f"   ❌ Erro ao limpar mês {mes}: {e}")

    # Verificar saldo final
    res = supabase.table("municipal_expenses") \
        .select("count", count="exact") \
        .eq("municipio_slug", "votorantim-sp") \
        .execute()
    
    print(f"🏁 Total restante: {res.count}")

if __name__ == "__main__":
    cleanup()
