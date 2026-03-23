import os
import json
from dotenv import load_dotenv
from supabase import create_client

load_dotenv("backend/.env")

def get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, key)

def solve():
    supabase = get_supabase()
    
    print("=== RESOLVENDO PROBLEMA 1 (JOIN) E PROBLEMA 3 (TERRITORIALISMO) ===\n")
    
    # 1. Buscar todas as emendas e seus pagamentos
    res_am = supabase.table("parliamentary_amendments").select("id, municipio_original, objeto_detalhado, valor_pago").execute()
    db_ams = res_am.data or []
    
    res_pay = supabase.table("amendment_payments").select("id, amendment_id, objeto, entidades_extraidas, valor_pago").execute()
    db_pays = res_pay.data or []
    
    # Mapa de pagamentos por emenda
    pay_by_am = {}
    for p in db_pays:
        aid = p.get('amendment_id')
        if aid:
            if aid not in pay_by_am: pay_by_am[aid] = []
            pay_by_am[aid].append(p)

    moved_count = 0
    extra_linked_count = 0
    
    # Ecofestival ID fix
    ecofestival_am_id = "b03fcfe5-2904-4146-8b9b-cfbdd3bc2e92"
    
    print("Iniciando processamento cruzado...")
    for am in db_ams:
        am_id = am['id']
        mun_orig = (am.get('municipio_original') or "").strip()
        
        # --- PROBLEMA 1 (VÍNCULO EXTRA ECOFESTIVAL) ---
        if am_id == ecofestival_am_id:
             # Buscar órfãos que deveriam ser daqui
             orphans = [p for p in db_pays if not p.get('amendment_id')]
             for p in orphans:
                  obj = (p.get('objeto') or "").upper()
                  if "ECOFESTIVAL" in obj:
                       supabase.table("amendment_payments").update({"amendment_id": am_id}).eq("id", p['id']).execute()
                       extra_linked_count += 1

        # --- PROBLEMA 3 (TERRITORIALIZAÇÃO VIA PAGAMENTOS) ---
        if not mun_orig or mun_orig == "Estado da Bahia":
            # Pegar pagamentos vinculados
            pays = pay_by_am.get(am_id, [])
            detected_muns = []
            for p in pays:
                ent = p.get('entidades_extraidas') or {}
                muns = ent.get('municipios_ba', [])
                detected_muns.extend([m for m in muns if m not in ["Saúde", "Educação", "Bahia"]])
            
            if detected_muns:
                target_city = detected_muns[0]
                print(f"  [AUTO-TERRITORIALIZE] Emenda {am_id[:8]}... -> {target_city} (via pagamento)")
                supabase.table("parliamentary_amendments").update({"municipio_original": f"{target_city}-BA"}).eq("id", am_id).execute()
                moved_count += 1

    print(f"\nResumo P1: {extra_linked_count} novos pagamentos vinculados.")
    print(f"Resumo P3: {moved_count} emendas territorializadas via cruzamento de pagamentos.")

    print("\n=== PROBLEMA 2: GARANTINDO total_entidades NA RESPOSTA NO BANCO ===\n")
    # Garantir que o campo no banco tenha o total para o frontend não precisar calcular
    updated_ent = 0
    for am in db_ams:
        ent = am.get('entidades_extraidas')
        if ent and isinstance(ent, dict):
            # Recalcular total se necessário
            current_total = ent.get('total_entidades', 0)
            calculated_total = sum(len(v) if isinstance(v, list) else 0 for k, v in ent.items() if k != 'total_entidades' and k != 'texto_original')
            if calculated_total > current_total:
                ent['total_entidades'] = calculated_total
                supabase.table("parliamentary_amendments").update({"entidades_extraidas": ent}).eq("id", am['id']).execute()
                updated_ent += 1
    
    print(f"Resumo P2: {updated_ent} emendas com metadados forenses atualizados.")

if __name__ == "__main__":
    solve()
