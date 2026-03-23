import os
import json
from dotenv import load_dotenv
from supabase import create_client

load_dotenv("backend/.env")

def get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, key)

def search():
    supabase = get_supabase()
    
    # 1. Buscar todos os pagamentos de JAGUARARI
    print("=== PAGAMENTOS EM JAGUARARI (POR TEXTO NO OBJETO) ===")
    res = supabase.table("amendment_payments").select("*").ilike("objeto", "%Jaguarari%").execute()
    pays = res.data or []
    print(f"Total: {len(pays)} pagamentos encontrados em Jaguarari.")
    
    total_val = 0
    for p in pays:
        val = p.get('valor_pago', 0)
        total_val += val
        print(f"  - ID: {p['id']} | Valor: R$ {val} | Emenda: {p.get('amendment_id')} | Objeto: {p['objeto'][:60]}...")
    
    print(f"\nValor Total Pago em Jaguarari: R$ {total_val}")

if __name__ == "__main__":
    search()
