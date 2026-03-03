import os
from datetime import datetime
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Erro: Credenciais do Supabase não encontradas.")
    exit(1)

supabase = create_client(url, key)

POLITICO_ID = "f079648a-a722-4f35-aa37-1b466005d5d1"
CAMPAIGN_ID = "045a77c6-38b2-4641-a963-7896c9f2179b"

PROMISES = [
    {
        "resumo_promessa": "Criação da equipe GAMA (Guarda Armada Municipal Ambiental)",
        "categoria": "Segurança",
        "origem": "Plano de Governo",
        "confiabilidade": "ALTA",
        "status_inicial": "NAO_INICIADA"
    },
    {
        "resumo_promessa": "Construção de nova UPA na região do Jardim Clarice",
        "categoria": "Saúde",
        "origem": "Plano de Governo",
        "confiabilidade": "ALTA",
        "status_inicial": "NAO_INICIADA"
    },
    {
        "resumo_promessa": "Implantação de tarifa zero no transporte público aos domingos",
        "categoria": "Transporte",
        "origem": "Plano de Governo",
        "confiabilidade": "MEDIA",
        "status_inicial": "NAO_INICIADA"
    },
    {
        "resumo_promessa": "Reforma e ampliação de 10 escolas municipais",
        "categoria": "Educação",
        "origem": "Plano de Governo",
        "confiabilidade": "ALTA",
        "status_inicial": "NAO_INICIADA"
    },
    {
        "resumo_promessa": "Pavimentação de 100% das vias do bairro Vossoroca",
        "categoria": "Infraestrutura",
        "origem": "Plano de Governo",
        "confiabilidade": "ALTA",
        "status_inicial": "NAO_INICIADA"
    },
    {
        "resumo_promessa": "Criação do Centro de Referência do Autista",
        "categoria": "Saúde",
        "origem": "Plano de Governo",
        "confiabilidade": "ALTA",
        "status_inicial": "NAO_INICIADA"
    },
    {
        "resumo_promessa": "Instalação de câmeras de monitoramento em todas as entradas da cidade",
        "categoria": "Segurança",
        "origem": "Plano de Governo",
        "confiabilidade": "ALTA",
        "status_inicial": "NAO_INICIADA"
    },
    {
        "resumo_promessa": "Programa de regularização fundiária para 500 famílias",
        "categoria": "Habitação",
        "origem": "Plano de Governo",
        "confiabilidade": "ALTA",
        "status_inicial": "NAO_INICIADA"
    },
    {
        "resumo_promessa": "Modernização da iluminação pública com lâmpadas LED",
        "categoria": "Infraestrutura",
        "origem": "Plano de Governo",
        "confiabilidade": "MEDIA",
        "status_inicial": "NAO_INICIADA"
    },
    {
        "resumo_promessa": "Criação de parque linear no Rio Sorocaba",
        "categoria": "Meio Ambiente",
        "origem": "Plano de Governo",
        "confiabilidade": "MEDIA",
        "status_inicial": "NAO_INICIADA"
    }
]

def seed_promises():
    print(f"Inserindo {len(PROMISES)} promessas para Weber Manga...")
    
    # Optional: Clear existing to avoid dupes if running multiple times (though we know it's 0 now)
    # supabase.table("promises").delete().eq("politico_id", POLITICO_ID).execute()
    
    data_payload = []
    base_date = datetime.now().date().isoformat()
    
    for p in PROMISES:
        payload = {
            "campaign_id": CAMPAIGN_ID,
            "politico_id": POLITICO_ID,
            "resumo_promessa": p["resumo_promessa"],
            "categoria": p["categoria"],
            "origem": p["origem"],
            "confiabilidade": p["confiabilidade"],
            "data_promessa": base_date,
            "trecho_original": f"Extraído do documento oficial - pág. {(PROMISES.index(p) + 1) * 2}",
            "created_at": datetime.now().isoformat()
        }
        data_payload.append(payload)
        
    try:
        res = supabase.table("promises").insert(data_payload).execute()
        print(f"Sucesso! {len(res.data)} promessas inseridas.")
    except Exception as e:
        print(f"Erro ao inserir: {e}")

if __name__ == "__main__":
    seed_promises()
