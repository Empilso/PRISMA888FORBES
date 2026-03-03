import os
import random
from datetime import datetime, timedelta
from uuid import uuid4
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Erro: Credenciais do Supabase não encontradas.")
    exit(1)

supabase = create_client(url, key)

MUNICIPIO_SLUG = "votorantim-sp"
ORGAOS = [
    "SECRETARIA DE SAÚDE", "SECRETARIA DE EDUCAÇÃO", "SECRETARIA DE OBRAS E URBANISMO",
    "SECRETARIA DE CULTURA", "GABINETE DO PREFEITO", "SECRETARIA DE SERVIÇOS PÚBLICOS"
]
FORNECEDORES = [
    "CONSTRUTORA VOTORANTIM LTDA", "SAUDE TOTAL SERVICOS MEDICOS", "EDUCAR MAIS LTDA",
    "PAVIMENTADORA ASFALTICA S/A", "CLEAN CITY LIMPEZA URBANA", "MEDICAL SUPRIMENTOS HOSPITALARES",
    "TECNOLOGIA E INOVACAO LTDA", "TRANSPORTE ESCOLAR RAPIDO", "MERENDA BOA ALIMENTOS",
    "EVENTOS E CULTURA PROMOCOES"
]

def generate_expenses(count=50):
    expenses = []
    base_date = datetime(2024, 1, 1)
    
    print(f"Gerando {count} despesas para {MUNICIPIO_SLUG}...")
    
    for _ in range(count):
        days_offset = random.randint(0, 365)
        dt_emissao = base_date + timedelta(days=days_offset)
        valor = round(random.uniform(5000.0, 500000.0), 2)
        
        expense = {
            "municipio_slug": MUNICIPIO_SLUG,
            "nm_fornecedor": random.choice(FORNECEDORES),
            "vl_despesa": valor,
            "dt_emissao_despesa": dt_emissao.strftime("%Y-%m-%d"),
            "nr_empenho": f"EMP-{random.randint(1000, 9999)}/2024",
            "historico_despesa": f"Pagamento referente a serviços de {random.choice(['manutenção', 'fornecimento', 'consultoria', 'obras'])} conforme contrato.",
            "orgao": random.choice(ORGAOS),
            "created_at": datetime.now().isoformat()
        }
        expenses.append(expense)
        
    return expenses

def seed():
    # 1. Limpar dados anteriores de Votorantim (opcional, mas bom para evitar duplicatas em testes)
    # print("Limpando dados antigos...")
    # supabase.table("municipal_expenses").delete().eq("municipio_slug", MUNICIPIO_SLUG).execute()
    
    # 2. Gerar e Inserir
    data = generate_expenses(60)
    
    # Batch insert
    try:
        res = supabase.table("municipal_expenses").insert(data).execute()
        print(f"Sucesso! {len(res.data)} despesas inseridas.")
    except Exception as e:
        print(f"Erro ao inserir: {e}")

if __name__ == "__main__":
    seed()
