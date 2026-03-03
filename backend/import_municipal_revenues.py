#!/usr/bin/env python3
"""
Script para criar tabela municipal_revenues e importar dados do CSV
Executa migration + import em uma única operação
"""

import os
import csv
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv("frontend/.env.local")

# Configuração Supabase
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

# Usar Service Role Key se disponível para bypass RLS
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or SUPABASE_KEY

if not SUPABASE_URL:
    print("❌ Erro: Variável NEXT_PUBLIC_SUPABASE_URL não encontrada")
    sys.exit(1)

# Cliente com privilégios elevados (Service Role)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def create_table():
    """Cria a tabela municipal_revenues via SQL"""
    print("📊 Criando tabela municipal_revenues...")
    
    with open("migrations/create_municipal_revenues.sql", "r") as f:
        sql = f.read()
    
    try:
        # Nota: supabase-py não tem método direto para executar SQL DDL
        # Vamos verificar se a tabela existe consultando-a
        result = supabase.table("municipal_revenues").select("id").limit(1).execute()
        print("✅ Tabela municipal_revenues já existe")
        return True
    except Exception as e:
        print(f"⚠️  Tabela não existe. Execute a migration manualmente via Supabase Dashboard:")
        print(f"   https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new")
        print(f"   Cole o conteúdo de: migrations/create_municipal_revenues.sql")
        return False

def import_revenues_csv():
    """Importa dados do CSV de receitas"""
    csv_path = "backend/data/tce_sp_real/receitas-votorantim-2025.csv"
    
    if not os.path.exists(csv_path):
        print(f"❌ Arquivo não encontrado: {csv_path}")
        return False
    
    print(f"📁 Lendo CSV: {csv_path}")

    print("🗑️  Limpando receitas existentes de Votorantim no banco...")
    try:
        supabase.table("municipal_revenues").delete().eq("municipio_slug", "votorantim-sp").execute()
        print("✅ Dados antigos removidos.")
    except Exception as e:
        print(f"⚠️  Erro ao limpar dados: {e}")
    
    revenues = []
    mes_map = {
        "Janeiro": 1, "Fevereiro": 2, "Março": 3, "Abril": 4,
        "Maio": 5, "Junho": 6, "Julho": 7, "Agosto": 8,
        "Setembro": 9, "Outubro": 10, "Novembro": 11, "Dezembro": 12
    }
    
    with open(csv_path, 'r', encoding='latin-1') as f:
        reader = csv.DictReader(f, delimiter=';')
        
        for idx, row in enumerate(reader, 1):
            try:
                # Extrair valor (último campo, formato: "123456,78")
                valor_str = row.get(list(row.keys())[-1], '0').replace(',', '.')
                valor = float(valor_str)
                
                # Extrair rubrica (penúltimo campo antes do valor)
                rubrica_raw = list(row.values())[-2] if len(row.values()) > 1 else ""
                rubrica = rubrica_raw.split(" - ")[-1] if " - " in rubrica_raw else rubrica_raw
                
                # Tipo de receita (classificação simples)
                tipo_receita = "Outras"
                if "Transfer" in rubrica_raw or "FPM" in rubrica_raw or "ICMS" in rubrica_raw:
                    tipo_receita = "Transferências"
                elif "IPTU" in rubrica_raw or "ISS" in rubrica_raw or "ITBI" in rubrica_raw or "Imposto" in rubrica_raw:
                    tipo_receita = "Tributária"

                id_rec = row.get("id_rec_arrec_detalhe") or str(idx)
                
                revenue = {
                    "municipio_slug": "votorantim-sp",
                    "municipio_nome": row.get("Município", "Votorantim") or row.get("ds_municipio", "Votorantim"),
                    "exercicio": int(row.get("Exercício", 2025) or row.get("ano_exercicio", 2025)),
                    "mes_competencia": mes_map.get(row.get("Mês", "Janeiro") or row.get("mes_ref_extenso", "Janeiro"), 1),
                    "rubrica": rubrica[:255] if rubrica else "Não especificada",
                    "fonte_receita": row.get("Fonte/Destinação de Recursos", "")[:255],
                    "tipo_receita": tipo_receita,
                    "codigo_receita": rubrica_raw[:100] if rubrica_raw else "",
                    "vl_receita": valor,
                    "fonte_recurso": row.get("Fonte/Destinação de Recursos", "")[:100],
                }
                
                revenues.append(revenue)
                
                if idx % 100 == 0:
                    print(f"   Processando linha {idx}...")
                
            except Exception as e:
                print(f"⚠️  Erro na linha {idx}: {e}")
                continue
    
    print(f"✅ {len(revenues)} receitas processadas")
    
    # Importar em lotes de 500
    batch_size = 500
    total_imported = 0
    
    for i in range(0, len(revenues), batch_size):
        batch = revenues[i:i+batch_size]
        try:
            result = supabase.table("municipal_revenues").upsert(batch).execute()
            total_imported += len(batch)
            print(f"   ✅ Importado lote {i//batch_size + 1}: {total_imported}/{len(revenues)}")
        except Exception as e:
            print(f"   ❌ Erro ao importar lote {i//batch_size + 1}: {e}")
            continue
    
    print(f"\n🎉 Importação concluída! Total: {total_imported} receitas")
    return True

def verify_import():
    """Verifica os dados importados"""
    print("\n🔍 Verificando importação...")
    
    try:
        # Total de receitas
        result = supabase.table("municipal_revenues") \
            .select("*", count="exact") \
            .eq("municipio_slug", "votorantim-sp") \
            .execute()
        
        count = result.count if hasattr(result, 'count') else len(result.data)
        print(f"   📊 Total de registros: {count}")
        
        # Soma total
        if result.data:
            total = sum(r['vl_receita'] for r in result.data)
            print(f"   💰 Receita Total: R$ {total:,.2f}")
            
            # Por tipo
            tipos = {}
            for r in result.data:
                tipo = r.get('tipo_receita', 'Outras')
                tipos[tipo] = tipos.get(tipo, 0) + r['vl_receita']
            
            print(f"\n   📈 Por Tipo:")
            for tipo, valor in sorted(tipos.items(), key=lambda x: x[1], reverse=True):
                print(f"      {tipo}: R$ {valor:,.2f}")
        
        return True
    except Exception as e:
        print(f"   ❌ Erro na verificação: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 IMPORTADOR DE RECEITAS MUNICIPAIS - TCE-SP")
    print("=" * 60)
    
    # Passo 1: Verificar/Criar tabela
    if not create_table():
        print("\n⚠️  ATENÇÃO: Execute a migration manualmente antes de importar")
        print("   Depois execute: python backend/import_municipal_revenues.py")
        sys.exit(0)
    
    # Passo 2: Importar dados
    if import_revenues_csv():
        # Passo 3: Verificar
        verify_import()
        print("\n✅ Processo concluído! Receitas disponíveis no dashboard.")
    else:
        print("\n❌ Falha na importação")
        sys.exit(1)
