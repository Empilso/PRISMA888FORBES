import os
import json
from dotenv import load_dotenv
from supabase import create_client

load_dotenv("backend/.env")

def get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, key)

def run():
    supabase = get_supabase()
    
    print("=== RESOLVENDO PROBLEMA 3: TERRITORIALIZAÇÃO ===\n")
    # Query solicitada: emendas sem municipio mas com municipios_ba no JSON
    res = supabase.table("parliamentary_amendments").select("id, objeto_detalhado, entidades_extraidas, municipio_original").execute()
    ams = res.data or []
    
    moved_count = 0
    black_list = ["Saúde", "Educação", "Bahia", "Infraestrutura"]
    
    print(f"Buscando emendas não territorializadas...")
    for a in ams:
        mun_orig = (a.get('municipio_original') or "").strip()
        if not mun_orig or mun_orig == "Estado da Bahia":
            ent = a.get('entidades_extraidas') or {}
            muns = ent.get('municipios_ba', [])
            
            valid_muns = [m for m in muns if m not in black_list]
            if valid_muns:
                target_city = valid_muns[0]
                print(f"  [FIX] Emenda {a['id'][:8]}... | Detectado: {target_city} | Objeto: {a['objeto_detalhado'][:50]}")
                supabase.table("parliamentary_amendments").update({
                    "municipio_original": f"{target_city}-BA"
                }).eq("id", a['id']).execute()
                moved_count += 1

    print(f"\nResultado P3: {moved_count} emendas territorializadas automaticamente.")

    print("\n=== RESOLVENDO PROBLEMA 1: COMPLEMENTO PAGAMENTOS ECOFESTIVAL ===\n")
    # Jaguarari Ecofestival ID: b03fcfe5-2904-4146-8b9b-cfbdd3bc2e92
    am_id = "b03fcfe5-2904-4146-8b9b-cfbdd3bc2e92"
    
    # Buscar pagamentos que citem Ecofestival ou Jaguarari e não tenham amendment_id
    res_pay = supabase.table("amendment_payments").select("id, objeto, valor_pago").is_("amendment_id", "null").execute()
    orphans = res_pay.data or []
    
    linked_pays = 0
    total_val = 0
    for p in orphans:
        obj = (p.get('objeto') or "").upper()
        if "ECOFESTIVAL" in obj or ("JAGUARARI" in obj and p['valor_pago'] > 50000):
            supabase.table("amendment_payments").update({"amendment_id": am_id}).eq("id", p['id']).execute()
            linked_pays += 1
            total_val += p['valor_pago']
            
    print(f"Resultado P1: {linked_pays} pagamentos vinculados ao Ecofestival.")
    print(f"Valor extra vinculado: R$ {total_val}")

if __name__ == "__main__":
    run()
