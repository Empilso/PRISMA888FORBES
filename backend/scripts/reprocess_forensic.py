import os
import sys
import asyncio
from typing import List, Dict, Any

# Ajuste do path para importar src
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.utils.text_extractor import extract_entities_from_text
from src.api.core.amendments import get_supabase

async def reprocess_forensic_data():
    supabase = get_supabase()
    print("🚀 Iniciando Reprocessamento Forense em Lote...")

    # 1. Reprocessar Emendas
    print("\n📦 Processando Parliamentary Amendments...")
    am_res = supabase.table("parliamentary_amendments").select("id, objeto_detalhado").execute()
    amendments = am_res.data or []
    am_count = 0

    for am in amendments:
        texto = am.get("objeto_detalhado") or ""
        if texto:
            entidades = extract_entities_from_text(texto)
            supabase.table("parliamentary_amendments").update({
                "entidades_extraidas": entidades
            }).eq("id", am["id"]).execute()
            am_count += 1
            if am_count % 10 == 0:
                print(f"   - {am_count} emendas processadas")

    # 2. Reprocessar Pagamentos
    print("\n💸 Processando Amendment Payments...")
    pay_res = supabase.table("amendment_payments").select("id, objeto").execute()
    payments = pay_res.data or []
    pay_count = 0

    for p in payments:
        texto = p.get("objeto") or ""
        if texto:
            entidades = extract_entities_from_text(texto)
            supabase.table("amendment_payments").update({
                "entidades_extraidas": entidades
            }).eq("id", p["id"]).execute()
            pay_count += 1
            if pay_count % 50 == 0:
                print(f"   - {pay_count} pagamentos processados")

    print("\n✅ Reprocessamento Concluído!")
    print(f"📊 Total Emendas: {am_count}")
    print(f"📊 Total Pagamentos: {pay_count}")

    # 3. Verificação específica EcoFestival / Jaguarari
    print("\n🔍 Verificando registro do EcoFestival...")
    search_res = supabase.table("parliamentary_amendments").select("id, objeto_detalhado, entidades_extraidas").ilike("objeto_detalhado", "%Jaguarari%").execute()
    
    if search_res.data:
        print(f"📋 Encontrado {len(search_res.data)} registro(s) para 'Jaguarari':")
        for item in search_res.data:
            print(f"--- ID: {item['id']} ---")
            print(f"Texto: {item['objeto_detalhado']}")
            import json
            print(f"Entidades: {json.dumps(item['entidades_extraidas'], indent=2, ensure_ascii=False)}")
    else:
        print("❌ Nenhum registro encontrado com 'Jaguarari' no objeto_detalhado.")

if __name__ == "__main__":
    asyncio.run(reprocess_forensic_data())
