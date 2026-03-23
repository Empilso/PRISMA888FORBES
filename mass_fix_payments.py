import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv("backend/.env")

def get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, key)

def fix():
    supabase = get_supabase()
    
    # 1. Pegar mapa de num_codigo para id de emendas
    # O num_codigo do pagamento (ex: 2025.3.32.32101.411.3701.500070.5) 
    # deve bater com algo na emenda. Na emenda, o campo num_codigo_exec parece estar vazio.
    # Vamos tentar bater pelo objeto_detalhado (hash ou texto similar) para o Ecofestival
    # e num_codigo para os outros se possível.
    
    print("=== REPARANDO PAGAMENTOS ECOFESTIVAL (VINCULO COMPLETO) ===")
    am_id = "b03fcfe5-2904-4146-8b9b-cfbdd3bc2e92" # Jaguarari Ecofestival
    
    # Buscar pagamentos que tenham 'ECOFESTIVAL' no objeto mas não tenham amendment_id
    res_orphan = supabase.table("amendment_payments").select("id").ilike("objeto", "%ECOFESTIVAL%").is_("amendment_id", "null").execute()
    orphans = res_orphan.data or []
    
    for o in orphans:
        supabase.table("amendment_payments").update({"amendment_id": am_id}).eq("id", o['id']).execute()
        print(f"Vinculado pagamento {o['id']} ao Ecofestival")

    print("\n=== REPARANDO OUTROS PAGAMENTOS VIA NUM_CODIGO ===")
    # Se num_codigo do pagamento bater com num_codigo_exec da emenda (se estivesse populado)
    # Como num_codigo_exec está nulo, vamos tentar uma estratégia de texto se o num_codigo for similar ao objeto? Não.
    # Vamos ver se o num_codigo do pagamento existe no objeto_detalhado da emenda (algumas vezes o código vem no texto)
    
    # Por enquanto, vamos focar no Ecofestival como prova de conceito detalhada e 
    # tentar vincular os demais que encontramos antes.
    
if __name__ == "__main__":
    fix()
