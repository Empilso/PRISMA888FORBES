import pandas as pd
from supabase import create_client, Client
from typing import Dict, List
import os
from dotenv import load_dotenv

load_dotenv()

# Configuração Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://gsmmanjpsdbfwmnmtgpg.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


async def process_electoral_csv(file_url: str, campaign_id: str) -> Dict:
    """
    Processa CSV de dados eleitorais e insere na tabela locations.
    
    Args:
        file_url: URL pública do CSV no Supabase Storage
        campaign_id: UUID da campanha
        
    Returns:
        Dict com estatísticas do processamento
    """
    try:
        print(f"📥 Baixando CSV de: {file_url}")
        
        # Ler CSV direto da URL (pandas suporta isso)
        df = pd.read_csv(file_url, delimiter=';', encoding='utf-8')
        
        print(f"✅ CSV carregado: {len(df)} linhas")
        print(f"📋 Colunas: {list(df.columns)}")
        
        # Garantir que lat/lng são float
        df['latitude'] = pd.to_numeric(df['latitude'], errors='coerce')
        df['longitude'] = pd.to_numeric(df['longitude'], errors='coerce')
        df['votos_candidato'] = pd.to_numeric(df['votos_candidato'], errors='coerce')
        
        # Remover linhas com coordenadas inválidas
        df = df.dropna(subset=['latitude', 'longitude', 'local', 'endereco'])
        
        print(f"✅ Após limpeza: {len(df)} linhas válidas")
        
        # AGREGAÇÃO: Agrupar por local único
        # Cada local pode ter múltiplas linhas (uma por candidato)
        # Vamos somar os votos de TODOS os candidatos em cada local
        aggregated = df.groupby(['local', 'endereco', 'latitude', 'longitude']).agg({
            'votos_candidato': 'sum',  # Soma total de votos no local
            'total_votos': 'first',    # Total de votos da seção (todos os candidatos)
        }).reset_index()
        
        print(f"📊 Locais únicos encontrados: {len(aggregated)}")
        
        # Preparar dados para inserção
        locations_data = []
        for _, row in aggregated.iterrows():
            location = {
                'campaign_id': campaign_id,
                'name': row['local'],
                'address': row['endereco'],
                'lat': float(row['latitude']),
                'lng': float(row['longitude']),
                'votes_count': int(row['votos_candidato']),
                'vote_goal': int(row['total_votos']) if pd.notna(row['total_votos']) else 0,
                'color': 'blue'  # Cor padrão
            }
            locations_data.append(location)
        
        # Inserir no Supabase em batch
        if locations_data:
            print(f"💾 Inserindo {len(locations_data)} locais no banco...")
            
            # Supabase aceita batch insert
            response = supabase.table('locations').insert(locations_data).execute()
            
            print(f"✅ Inserção concluída!")
            
            return {
                "success": True,
                "total_rows": len(df),
                "unique_locations": len(aggregated),
                "inserted": len(locations_data),
                "message": f"Importados {len(locations_data)} locais de votação com sucesso"
            }
        else:
            return {
                "success": False,
                "error": "Nenhum dado válido encontrado no CSV"
            }
            
    except Exception as e:
        print(f"❌ Erro ao processar CSV: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }
