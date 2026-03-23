import os
import csv
import json
from dotenv import load_dotenv
from supabase import create_client

load_dotenv("backend/.env")

def get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, key)

def repair():
    supabase = get_supabase()
    
    print("=== PASSO 1: POPULAR num_codigo_exec NAS EMENDAS ===")
    # O arquivo centralização contém a relação completa.
    csv_path = "IBGE/EMENDAS DEPUTADOS/VW_PAINEL_EMENDAS_PARLAMENTARES_CENTRALIZACAO_DESCENTRALIZACAO.csv"
    
    res_am = supabase.table("parliamentary_amendments").select("id, ano_exercicio, objeto_detalhado, valor_orcado_atual").execute()
    db_ams = res_am.data or []
    
    updated_ams = 0
    with open(csv_path, mode='r', encoding='latin-1') as f:
        # Pular BOM se existir e ler cabeçalho manual
        header_line = f.readline().strip()
        if header_line.startswith('\ufeff'):
            header_line = header_line[1:]
        
        # Cabeçalho limpo
        headers = [h.strip('"') for h in header_line.split(';')]
        print(f"Colunas encontradas: {headers}")
        
        reader = csv.DictReader(f, fieldnames=headers, delimiter=';')
        csv_rows = list(reader)
        
        for am in db_ams:
            for row in csv_rows:
                # Limpar valores do CSV
                try:
                    ano = int(row.get('Ano Exercício', '0').strip('"'))
                    val_str = row.get('Valor Orçado Atual.', '0').strip('"').replace(',', '.')
                    csv_val = float(val_str) if val_str else 0.0
                    obj_csv = row.get('Ação do Programa de Governo', '').strip('"')
                    code = row.get('num_codigo', '').strip('"')
                    
                    if (ano == am['ano_exercicio'] and 
                        abs(csv_val - am['valor_orcado_atual']) < 2.0 and
                        (obj_csv.lower() in am['objeto_detalhado'].lower() or am['objeto_detalhado'].lower() in obj_csv.lower())):
                        
                        supabase.table("parliamentary_amendments").update({"num_codigo_exec": code}).eq("id", am['id']).execute()
                        updated_ams += 1
                        break
                except Exception as e:
                    continue
    
    print(f"Resultado Passo 1: {updated_ams} emendas com código de execução restaurado.")

    print("\n=== PASSO 2: REPARAR JOIN DE PAGAMENTOS ===")
    res_am_updated = supabase.table("parliamentary_amendments").select("id, num_codigo_exec").not_.is_("num_codigo_exec", "null").execute()
    am_map = {a['num_codigo_exec']: a['id'] for a in res_am_updated.data}
    
    res_pay = supabase.table("amendment_payments").select("id, num_codigo").is_("amendment_id", "null").execute()
    orphans = res_pay.data or []
    
    updated_pays = 0
    for p in orphans:
        code = p.get('num_codigo')
        if code in am_map:
            supabase.table("amendment_payments").update({"amendment_id": am_map[code]}).eq("id", p['id']).execute()
            updated_pays += 1
            
    print(f"Resultado Passo 2: {updated_pays} pagamentos vinculados.")

    print("\n=== PASSO 3: TERRITORIALIZAÇÃO E SQL CHECK ===")
    # Simular a query SQL solicitada
    print("Query solicitada pelo usuário:")
    print("SELECT id, objeto_detalhado, entidades_extraidas->'municipios_ba' FROM amendments WHERE (municipio_destino is null) AND municipios_ba != '[]'")
    
    res_ter = supabase.table("parliamentary_amendments").select("id, objeto_detalhado, entidades_extraidas, municipio_original").execute()
    raw_data = res_ter.data or []
    
    black_list = ["Saúde", "Educação", "Bahia"]
    territorialized_count = 0
    
    print(f"\n{'ID':<36} | {'Municípios Extraídos':<30} | {'Objeto parcial'}")
    print("-" * 100)
    
    for a in raw_data:
        mun_orig = (a.get('municipio_original') or "").strip()
        ent = a.get('entidades_extraidas') or {}
        muns = ent.get('municipios_ba', [])
        
        if (not mun_orig or mun_orig == "Estado da Bahia") and muns:
            # Mostrar no log da auditoria
            print(f"{a['id']:<36} | {str(muns):<30} | {a['objeto_detalhado'][:40]}...")
            
            # Executar territorialização real se não for falso positivo
            valid_muns = [m for m in muns if m not in black_list]
            if valid_muns:
                supabase.table("parliamentary_amendments").update({"municipio_original": f"{valid_muns[0]}-BA"}).eq("id", a['id']).execute()
                territorialized_count += 1
                
    print(f"\nResultado Passo 3: {territorialized_count} emendas territorializadas automaticamente.")

if __name__ == "__main__":
    repair()
