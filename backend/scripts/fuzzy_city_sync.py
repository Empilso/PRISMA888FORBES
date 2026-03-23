import os
import re
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

def get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, key)

def fuzzy_match_city():
    supabase = get_supabase()
    
    # 1. Carregar todas as cidades para referência
    cities_resp = supabase.table("cities").select("id, name").execute()
    cities = cities_resp.data or []
    city_names = {c["name"].upper(): c["id"] for c in cities}
    
    # 2. Buscar emendas sem city_id ou marcadas como "Estado da Bahia"
    amend_resp = supabase.table("parliamentary_amendments") \
        .select("id, municipio_original, objeto_detalhado") \
        .is_("beneficiary_city_id", "null") \
        .execute()
    
    amendments = amend_resp.data or []
    print(f"Analisando {len(amendments)} emendas pendentes...")
    
    updates = []
    found_count = 0
    
    for am in amendments:
        raw_text = f"{am.get('municipio_original', '')} {am.get('objeto_detalhado', '')}".upper()
        # Limpa o texto de sujeira comum nos PDFs/CSVs
        text_to_search = raw_text.replace("¿", " ").replace("\r", " ").replace("\n", " ")
        text_to_search = re.sub(r'\s+', ' ', text_to_search) # Normaliza espaços
        
        # Busca por nome de cidade no texto limpo
        for cname, cid in city_names.items():
            clean_cname = cname.upper()
            # Busca ignorando bordas de palavras pra pegar casos como BONFIM-BA
            if clean_cname in text_to_search:
                updates.append({"id": am["id"], "beneficiary_city_id": cid})
                found_count += 1
                break
                
    if updates:
        print(f"Sucesso! Encontradas {found_count} associações.")
        # CHUNK para evitar timeout
        for i in range(0, len(updates), 50):
            chunk = updates[i:i+50]
            supabase.table("parliamentary_amendments").upsert(chunk).execute()
        print("Banco de dados atualizado.")
    else:
        print("Nenhuma associação óbvia encontrada via texto.")

if __name__ == "__main__":
    fuzzy_match_city()
