import os
import json
from dotenv import load_dotenv
from supabase import create_client

load_dotenv("backend/.env")

def get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, key)

def fix():
    supabase = get_supabase()
    
    print("=== RESOLVENDO PROBLEMA 1 (JOIN DE PAGAMENTOS) ===")
    
    # 1. Pegar todos os pagamentos e todas as emendas
    pays_res = supabase.table("amendment_payments").select("id, num_codigo, objeto, amendment_id").execute()
    ams_res = supabase.table("parliamentary_amendments").select("id, num_codigo_exec, objeto_detalhado").execute()
    
    pays = pays_res.data or []
    ams = ams_res.data or []
    
    am_by_codigo = {a['num_codigo_exec']: a['id'] for a in ams if a.get('num_codigo_exec')}
    
    # Cache de texto para emendas do Bobô para Jaguarari (Ecofestival)
    ecofestival_am_id = "b03fcfe5-2904-4146-8b9b-cfbdd3bc2e92"
    
    linked_count = 0
    for p in pays:
        if p.get('amendment_id'): continue # Já vinculado
        
        # Estratégia A: Por num_codigo
        if p.get('num_codigo') in am_by_codigo:
            supabase.table("amendment_payments").update({"amendment_id": am_by_codigo[p['num_codigo']]}).eq("id", p['id']).execute()
            linked_count += 1
            continue
            
        # Estratégia B: Por texto (Ecofestival Jaguarari)
        if "ECOFESTIVAL" in (p.get('objeto') or "").upper() and "JAGUARARI" in (p.get('objeto') or "").upper():
            supabase.table("amendment_payments").update({"amendment_id": ecofestival_am_id}).eq("id", p['id']).execute()
            linked_count += 1
            continue

    print(f"Resultado P1: {linked_count} novos pagamentos vinculados.")

    print("\n=== RESOLVENDO PROBLEMA 2 (BLOCO FORENSE) ===")
    # Vou agora verificar se o endpoint de dossiê está selecionando o campo entidades_extraidas
    # Isso já validamos antes, mas vamos garantir que o total_entidades esteja populado no banco.
    
    updated_ent_count = 0
    for a in ams:
        ent = a.get('entidades_extraidas')
        if ent and "total_entidades" not in ent:
            ent["total_entidades"] = sum(len(v) if isinstance(v, list) else 0 for v in ent.values())
            supabase.table("parliamentary_amendments").update({"entidades_extraidas": ent}).eq("id", a['id']).execute()
            updated_ent_count += 1
            
    print(f"Resultado P2: {updated_ent_count} emendas atualizadas com contador de entidades.")

if __name__ == "__main__":
    fix()
