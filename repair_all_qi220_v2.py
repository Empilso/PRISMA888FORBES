import os
import csv
import io
import re
from dotenv import load_dotenv
from supabase import create_client

load_dotenv("backend/.env")

def get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, key)

def clean_str(s):
    if not s: return ""
    # Remove aspas e espaços extras
    s = s.replace('"', '').strip()
    # Remove caracteres de controle e acentos básicos se necessário (mas aqui vamos focar no essencial)
    return s.lower()

def repair():
    supabase = get_supabase()
    
    print("=== PASSO 1: MAPEANDO num_codigo_exec NAS EMENDAS ===")
    csv_path = "IBGE/EMENDAS DEPUTADOS/VW_PAINEL_EMENDAS_PARLAMENTARES_DESPESAS.csv"
    
    res_am = supabase.table("parliamentary_amendments").select("id, ano_exercicio, objeto_detalhado, valor_orcado_atual").execute()
    db_ams = res_am.data or []
    print(f"Buscadas {len(db_ams)} emendas do banco.")

    updated_ams = 0
    with open(csv_path, mode='r', encoding='latin-1') as f:
        # Pular BOM manual e limpar cabeçalhos
        lines = f.readlines()
        if not lines: return
        
        header_raw = lines[0]
        # Limpa o cabeçalho de aspas e caracteres invisíveis
        header_clean = [h.strip().replace('"', '') for h in header_raw.split(';')]
        # Mapeia colunas problemáticas
        col_map = {}
        for i, h in enumerate(header_clean):
            if "Ano" in h: col_map["ano"] = i
            if "Atual" in h: col_map["valor"] = i
            if "Ação" in h or "Governo" in h: col_map["acao"] = i
            if "num_codigo" in h and "exec" not in h: col_map["codigo"] = i

        print(f"Mapeamento de colunas: {col_map}")

        for line in lines[1:]:
            parts = [p.strip().replace('"', '') for p in line.split(';')]
            if len(parts) <= max(col_map.values()): continue
            
            try:
                ano_csv = int(parts[col_map["ano"]])
                val_csv = float(parts[col_map["valor"]].replace(',', '.'))
                acao_csv = clean_str(parts[col_map["acao"]])
                code = parts[col_map["codigo"]]
                
                for am in db_ams:
                    if am.get('num_codigo_exec'): continue
                    
                    obj_db = clean_str(am['objeto_detalhado'])
                    # Match relaxado: Ano, Valor aproximado (0.01 de diferença) e Ação no Objeto
                    if (am['ano_exercicio'] == ano_csv and 
                        abs(am['valor_orcado_atual'] - val_csv) < 1.0 and
                        (acao_csv in obj_db or obj_db in acao_csv)):
                        
                        supabase.table("parliamentary_amendments").update({"num_codigo_exec": code}).eq("id", am['id']).execute()
                        am['num_codigo_exec'] = code
                        updated_ams += 1
                        break
            except:
                continue

    print(f"Sucesso Passo 1: {updated_ams} emendas vinculadas.")

    print("\n=== PASSO 2: VINCULANDO PAGAMENTOS VIA num_codigo ===")
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
            
    print(f"Sucesso Passo 2: {linked_pays} pagamentos vinculados.")

    print("\n=== PASSO 3: TERRITORIALIZAÇÃO AUTOMÁTICA ===")
    res_terr = supabase.table("parliamentary_amendments").select("id, objeto_detalhado, entidades_extraidas, municipio_original").execute()
    raw_data = res_terr.data or []
    
    black_list = ["saúde", "educação", "bahia", "infraestrutura"]
    territorialized_count = 0
    
    for a in raw_data:
        mun_orig = (a.get('municipio_original') or "").strip()
        if not mun_orig or mun_orig == "Estado da Bahia":
            ent = a.get('entidades_extraidas') or {}
            muns = ent.get('municipios_ba', [])
            
            valid_muns = [m for m in muns if m.lower() not in black_list]
            if valid_muns:
                print(f"Territorializando: '{a['objeto_detalhado'][:40]}...' -> {valid_muns[0]}")
                supabase.table("parliamentary_amendments").update({"municipio_original": f"{valid_muns[0]}-BA"}).eq("id", a['id']).execute()
                territorialized_count += 1
                
    print(f"Sucesso Passo 3: {territorialized_count} emendas territorializadas.")

if __name__ == "__main__":
    repair()
