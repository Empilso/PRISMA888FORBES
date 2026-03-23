import os
import csv
from dotenv import load_dotenv
from supabase import create_client

load_dotenv("backend/.env")

def get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, key)

def repair():
    supabase = get_supabase()
    
    print("=== PASSO 1: MAPEANDO num_codigo_exec NAS EMENDAS ===")
    csv_path = "IBGE/EMENDAS DEPUTADOS/VW_PAINEL_EMENDAS_PARLAMENTARES_DESPESAS.csv"
    
    # 1. Buscar emendas do banco
    res_am = supabase.table("parliamentary_amendments").select("id, ano_exercicio,objeto_detalhado, valor_orcado_atual").execute()
    db_ams = res_am.data or []
    print(f"Buscadas {len(db_ams)} emendas do banco.")

    # 2. Ler CSV e criar mapa de identificação
    # Usaremos (Ano, Valor e parte do Objeto) para bater o CSV com o Banco
    updated_count = 0
    with open(csv_path, mode='r', encoding='latin-1') as f:
        # Pular o BOM se existir
        content = f.read()
        if content.startswith('\ufeff'):
            content = content[1:]
        
        f_io = csv.StringIO(content)
        reader = csv.DictReader(f_io, delimiter=';')
        
        for row in reader:
            try:
                ano_csv = int(row['Ano Exercício'])
                val_csv = float(row['Valor Orçado Atual.'].replace(',', '.'))
                acao_csv = row['Ação do Programa de Governo']
                num_codigo = row['num_codigo']
                
                for am in db_ams:
                    if am.get('num_codigo_exec'): continue
                    
                    # Critério de match: Ano igual, Valor igual (tolerância 1 real) e Ação contida no Objeto
                    if (am['ano_exercicio'] == ano_csv and 
                        abs(am['valor_orcado_atual'] - val_csv) < 1.0 and
                        acao_csv.lower() in am['objeto_detalhado'].lower()):
                        
                        # Atualiza o código na emenda
                        supabase.table("parliamentary_amendments").update({"num_codigo_exec": num_codigo}).eq("id", am['id']).execute()
                        am['num_codigo_exec'] = num_codigo # Marca como processado
                        updated_count += 1
                        break
            except Exception as e:
                continue

    print(f"Sucesso Passo 1: {updated_count} emendas vinculadas a códigos de execução.")

    print("\n=== PASSO 2: VINCULANDO PAGAMENTOS VIA num_codigo ===")
    # Agora buscamos emendas que tem o código e pagamentos que tem o código mas não tem o ID
    res_am_with_code = supabase.table("parliamentary_amendments").select("id, num_codigo_exec").not_.is_("num_codigo_exec", "null").execute()
    am_map = {a['num_codigo_exec']: a['id'] for a in res_am_with_code.data}
    
    res_pay = supabase.table("amendment_payments").select("id, num_codigo").is_("amendment_id", "null").execute()
    orphans = res_pay.data or []
    
    linked_pays = 0
    for p in orphans:
        code = p.get('num_codigo')
        if code in am_map:
            supabase.table("amendment_payments").update({"amendment_id": am_map[code]}).eq("id", p['id']).execute()
            linked_pays += 1
            
    print(f"Sucesso Passo 2: {linked_pays} pagamentos vinculados às suas emendas.")

if __name__ == "__main__":
    repair()
