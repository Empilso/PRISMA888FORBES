import os
import httpx
from dotenv import load_dotenv

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Profile": "public"
}

# Tenta um insert mínimo para ver o erro de restrição
print("--- TESTE DE INSERÇÃO MÍNIMA EM CAMPAIGNS ---")
# Vamos tentar inserir apenas o nome e ver o que ele reclama que falta
payload = {"name": "Teste de Diagnostico"}
res = httpx.post(f"{url}/rest/v1/campaigns", headers=headers, json=payload)
print("Resultado da tentativa:")
print(res.text)

# Agora vamos tentar simular o insert da action
payload_full = {
    "name": "Campanha Luciano Silva 2024",
    "candidate_name": "Luciano Silva",
    "slug": "luciano-silva",
    "role": "Prefeito",
    "city": "VOTORANTIM",
    "party": "PODE",
    "number": 20,
    "ballot_name": "LUCIANO SILVA",
    "election_date": "2028-10-01",
    "social_links": {}
}

print("\n--- TESTE DE INSERÇÃO COMPLETA (SIMULANDO ACTION) ---")
res_full = httpx.post(f"{url}/rest/v1/campaigns", headers=headers, json=payload_full)
print("Resultado da tentativa completa:")
print(res_full.text)
