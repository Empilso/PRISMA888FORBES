import os
import json
from dotenv import load_dotenv
from supabase import create_client

# Explicit path to .env in backend directory
load_dotenv("backend/.env")

def get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("Erro: Credenciais do Supabase não carregadas. Verifique o caminho do .env.")
        return None
    return create_client(url, key)

def check():
    supabase = get_supabase()
    if not supabase:
        return
    
    # 1. Buscar emenda do Ecofestival
    am_res = supabase.table("parliamentary_amendments").select("id, objeto_detalhado, valor_pago").ilike("objeto_detalhado", "%ECOFESTIVAL%").execute()
    if not am_res.data:
        print("Emenda Ecofestival não encontrada.")
        return
    
    am = am_res.data[0]
    am_id = am['id']
    print(f"--- EMENDA ENCONTRADA ---")
    print(f"ID: {am_id}")
    print(f"Objeto: {am['objeto_detalhado'][:100]}...")
    print(f"Valor Pago (Campo Emenda): R$ {am['valor_pago']}\n")

    # 2. Query exata do endpoint (Problema 1)
    print("--- EXECUTANDO QUERY DO ENDPOINT ---")
    print(f"Query: supabase.table('amendment_payments').select('*').eq('amendment_id', '{am_id}')")
    pay_res = (
        supabase.table("amendment_payments")
        .select("*")
        .eq("amendment_id", am_id)
        .order("data_pagamento", desc=True)
        .execute()
    )
    pays = pay_res.data or []
    
    print(f"Resultado: {len(pays)} pagamentos encontrados.")
    for p in pays:
        print(f"  - Pagamento ID: {p['id']} | Valor: R$ {p['valor_pago']} | Credor: {p['credor']}")

    if len(pays) == 0:
        print("\n--- INVESTIGANDO ÓRFÃOS ---")
        # Se não encontrou, vamos ver se existem pagamentos com esse texto mas sem amendment_id
        orphan_res = supabase.table("amendment_payments").select("id, objeto, amendment_id").ilike("objeto", "%ECOFESTIVAL%").execute()
        orphans = orphan_res.data or []
        print(f"Encontramos {len(orphans)} pagamentos com o texto 'ECOFESTIVAL'.")
        for o in orphans:
             print(f"  - Pagamento {o['id']} -> amendment_id: {o['amendment_id']}")

if __name__ == "__main__":
    check()
