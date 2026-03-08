import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

print("--- TESTANDO INSERT EM LOCATION_RESULTS ---")
try:
    # Tenta inserir sem fornecer ID
    # Primeiro preciso de um location_id válido.
    loc = supabase.table("locations").select("id").limit(1).execute()
    if not loc.data:
        print("Nenhum local encontrado para teste.")
    else:
        loc_id = loc.data[0]['id']
        payload = {
            "location_id": loc_id,
            "candidate_name": "TESTE CANDIDATO",
            "votes": 10
        }
        res = supabase.table("location_results").insert(payload).execute()
        print("Sucesso no insert!")
except Exception as e:
    print(f"ERRO no insert: {e}")
