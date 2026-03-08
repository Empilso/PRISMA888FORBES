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

# Fazendo requisição HTTP direta para a REST API do PostgREST pra pegar a definição
res = httpx.get(f"{url}/rest/v1/profiles?limit=1", headers=headers)
print("Resposta REST API:")
if res.status_code == 200:
    data = res.json()
    if len(data) > 0:
        print(list(data[0].keys()))
    else:
        print("Tabela tem 0 linhas. Nao eh possivel inferir schema pelo endpoint REST assim.")
else:
    print(res.text)

# Tentando por um insert com um UUID real de um admin que sabemos que existe no auth users
res = httpx.post(f"{url}/rest/v1/profiles", headers=headers, json={"id": "f852e92c-5b23-4b6c-b3a1-1256df2a688b", "email": "a", "cpf": "1", "phone": "1"})
print("\nInsert com CPF/Phone:", res.text)
