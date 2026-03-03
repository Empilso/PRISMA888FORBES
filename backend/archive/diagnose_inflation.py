import os
import sys
import json
from dotenv import load_dotenv
from supabase import create_client

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv("backend/.env")

def diagnose_inflation():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    supabase = create_client(url, key)
    
    # We need to find the latest execution or just analyze promise_verifications directly
    # Assuming the user is looking at a specific mandate, let's fetch verifications linked to it
    # For Votorantim mandate.
    
    # 1. Get Mandate ID for Weber Manga (from previous context or just search)
    mandates = supabase.table("mandates").select("id, politician_id").execute()
    if not mandates.data:
        print("❌ No mandates found.")
        return
        
    mandate_id = mandates.data[0]["id"] # Using the first one found for simplicity, or we filter
    print(f"🕵️  Diagnosing Mandate ID: {mandate_id}")
    
    # 2. Fetch all verifications
    print("⏳ Fetching promise verifications...")
    verifications = supabase.table("promise_verifications") \
        .select("id, promise_id, fuentes:fontes, score_similaridade") \
        .execute()
        
    if not verifications.data:
        print("❌ No verifications found.")
        return

    print(f"✅ Found {len(verifications.data)} verified promises.")
    
    # DEBUG: Print first item structure
    if verifications.data:
        print("\n🐛 DEBUG RAW ITEM (First):")
        print(json.dumps(verifications.data[0], indent=2, default=str))
    
    # 3. Analyze Overlap
    total_inflated = 0.0
    unique_expenses = {} # id -> value
    
    promise_overlaps = []
    
    for v in verifications.data:
        # DB column might be 'fontes' or 'fuentes' depending on alias in select
        # In step 651 we asked for `.select("..., fuentes:fontes, ...")`
        # So it should be in 'fuentes' key.
        sources = v.get("fuentes")
        
        if not sources:
            # Fallback check
            sources = v.get("fontes") or []

        # If it's a string, parse it
        if isinstance(sources, str):
            try:
                sources = json.loads(sources)
            except:
                sources = []
                
        # Handle case where sources is None
        if not sources:
            sources = []
            
        promise_total = 0.0
            
        for s in sources:
            if not isinstance(s, dict):
                continue
                
            val = float(s.get("value") or 0)
            exp_id = s.get("expense_id")
            
            promise_total += val
            
            if exp_id:
                if exp_id not in unique_expenses:
                    unique_expenses[exp_id] = val
                    
        total_inflated += promise_total
        promise_overlaps.append(len(sources))

    total_unique = sum(unique_expenses.values())
    
    print("\n🚨 DIAGNÓSTICO DE INFLAÇÃO LÓGICA 🚨")
    print(f"   💰 Soma Simples (O que aparece na tela):  R$ {total_inflated:,.2f}")
    print(f"   💰 Soma Real (Deduplicada):              R$ {total_unique:,.2f}")
    
    if total_unique > 0:
        inflation_factor = total_inflated / total_unique
        print(f"   📈 Fator de Inflação: {inflation_factor:.2f}x (Cada Real é contado ~{int(inflation_factor)} vezes)")
    else:
        print("   ❓ Zero unique value found.")
        
    print("\n🔍 DETALHES TÉCNICOS:")
    print(f"   - Despesas Únicas Encontradas: {len(unique_expenses)}")
    print(f"   - Média de Despesas por Promessa: {sum(promise_overlaps)/len(promise_overlaps):.1f}")

if __name__ == "__main__":
    diagnose_inflation()
