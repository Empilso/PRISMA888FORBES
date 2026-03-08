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

# Consultar o information_schema via PostgREST (se exposto) ou tentar um select numa linha qquer
print("--- COLUNAS DA TABELA CAMPAIGNS ---")
# Usando a RPC ou uma query que costuma funcionar no PostgREST para introspectar
res = httpx.get(f"{url}/rest/v1/campaigns?limit=1", headers=headers)
if res.status_code == 200:
    data = res.json()
    if len(data) > 0:
        print("Colunas:", list(data[0].keys()))
    else:
        print("Tabela vazia. Tentando via rpc/executar query de erro...")
        # Outra forma: tentar inserir vazio e ver o que ele reclama que falta ou o que ele aceita
        ins = httpx.post(f"{url}/rest/v1/campaigns", headers=headers, json={"id": "00000000-0000-0000-0000-000000000000"})
        print("Erro de inserção (ajuda a ver colunas):", ins.text)
else:
    print("Erro ao acessar API:", res.text)
