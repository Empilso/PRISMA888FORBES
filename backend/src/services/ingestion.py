import pandas as pd
from supabase import create_client, Client
from typing import Dict, List
import os
from dotenv import load_dotenv
import math

load_dotenv()

# Configuração Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://gsmmanjpsdbfwmnmtgpg.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async def process_electoral_csv(file_url: str, campaign_id: str) -> Dict:
    """
    Processa CSV de dados eleitorais e insere na tabela locations e location_results.
    MANTÉM O DETALHAMENTO DE VOTOS POR CANDIDATO.
    
    Args:
        file_url: URL pública do CSV no Supabase Storage
        campaign_id: UUID da campanha
        
    Returns:
        Dict com estatísticas do processamento
    """
    try:
        print(f"📥 Ingestão V2 (Detalhada): Baixando CSV de: {file_url}")
        
        # Ler CSV direto da URL
        df = pd.read_csv(file_url, delimiter=';', encoding='utf-8')
        
        print(f"✅ CSV carregado: {len(df)} linhas")
        
        # Conversão de Tipos e Limpeza
        df['latitude'] = pd.to_numeric(df['latitude'], errors='coerce')
        df['longitude'] = pd.to_numeric(df['longitude'], errors='coerce')
        df['votos_candidato'] = pd.to_numeric(df['votos_candidato'], errors='coerce').fillna(0)
        df['total_votos'] = pd.to_numeric(df['total_votos'], errors='coerce').fillna(0)
        
        # Remover linhas inválidas
        df = df.dropna(subset=['latitude', 'longitude', 'local', 'endereco'])
        
        print(f"✅ Dados limpos: {len(df)} linhas válidas para processamento")
        
        # 1. Identificar Locais Únicos (Agrupamento Geográfico)
        # Agrupamos por nome e coordenadas para unificar seções do mesmo prédio
        unique_locations = df.groupby(['local', 'endereco', 'latitude', 'longitude']).agg({
             'total_votos': 'first'  # Valor de referência
        }).reset_index()
        
        print(f"📍 Identificados {len(unique_locations)} locais de votação únicos.")
        
        inserted_count = 0
        details_count = 0
        
        # 2. Loop de Inserção Relacional
        # Para cada local: Cria o registro PAI -> Pega o ID -> Insere os registros FILHOS (Detalhes)
        
        for index, loc_row in unique_locations.iterrows():
            try:
                # Filtrar todas as linhas originais deste local específico to get detailed votes
                # (Pode haver várias linhas se houver vários candidatos ou seções)
                # Usamos uma máscara booleana segura
                # Atenção: float comparison pode ser tricky, melhor usar uma tolerância ou string se der bug, 
                # mas aqui vamos confiar na igualdade pois vieram do mesmo source.
                loc_filter = (
                    (df['local'] == loc_row['local']) & 
                    (abs(df['latitude'] - loc_row['latitude']) < 0.00001)
                )
                loc_data = df[loc_filter]
                
                # Calcular total real de votos no local (soma de todos os candidatos)
                calculated_total_votes = loc_data['votos_candidato'].sum()
                
                # Preparar Payload do Local (PAI)
                location_payload = {
                    'campaign_id': campaign_id,
                    'name': loc_row['local'],
                    'address': loc_row['endereco'],
                    'lat': float(loc_row['latitude']),
                    'lng': float(loc_row['longitude']),
                    'votes_count': int(calculated_total_votes),
                    # Meta: Se total_votos da planilha for valido usa, senão usa o calculado. 
                    # Idealmente total_votos seria 'aptos', mas vamos assumir votos validos da seção.
                    'vote_goal': int(loc_row['total_votos']) if loc_row['total_votos'] > 0 else int(calculated_total_votes),
                    'color': 'blue'
                }
                
                # Inserir Local e capturar resposta para pegar o ID
                res_loc = supabase.table('locations').insert(location_payload).execute()
                
                if res_loc.data and len(res_loc.data) > 0:
                    new_location_id = res_loc.data[0]['id']
                    
                    # Preparar Payload dos Resultados (FILHOS)
                    # Agrupar por candidato (somando votos de múltiplas seções se houver)
                    candidates_agg = loc_data.groupby('nome_candidato')['votos_candidato'].sum().reset_index()
                    
                    results_payload = []
                    for _, cand in candidates_agg.iterrows():
                        if cand['votos_candidato'] > 0: # Só salva quem teve voto
                            results_payload.append({
                                'location_id': new_location_id,
                                'candidate_name': cand['nome_candidato'],
                                'votes': int(cand['votos_candidato']),
                                'is_target': False # Pode ser atualizado depois via UI
                            })
                    
                    # Inserir Resultados em Batch
                    if results_payload:
                        supabase.table('location_results').insert(results_payload).execute()
                        details_count += len(results_payload)
                    
                    inserted_count += 1
                    
                    if inserted_count % 10 == 0:
                        print(f"⏳ Progresso: {inserted_count}/{len(unique_locations)} locais inseridos...")
                        
            except Exception as inner_e:
                print(f"⚠️ Erro ao inserir local {loc_row['local']}: {inner_e}")
                continue # Pula para o próximo e não quebra tudo
        
        print(f"✅ Ingestão Concluída!")
        print(f"🏫 Locais criados: {inserted_count}")
        print(f"🗳️ Registros de votos detalhados: {details_count}")
            
        return {
            "success": True,
            "total_rows": len(df),
            "unique_locations": len(unique_locations),
            "inserted_locations": inserted_count,
            "inserted_details": details_count,
            "message": f"Sucesso! {inserted_count} escolas e {details_count} registros de votos importados."
        }
            
    except Exception as e:
        print(f"❌ Erro fatal na ingestão: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }
