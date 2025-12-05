import requests
import csv
from io import StringIO

# URL do CSV
csv_url = "https://gsmmanjpsdbfwmnmtgpg.supabase.co/storage/v1/object/public/campaign-files/campaigns/1764422601687_VOTORANTIM-PREFEITOS-COM-COORDENADAS-FINAL.csv"

print("📥 Baixando CSV...")
response = requests.get(csv_url)
response.encoding = 'utf-8'  # Garantir encoding correto

if response.status_code == 200:
    print("✅ CSV baixado com sucesso!\n")
    
    # Ler CSV com delimitador ponto-e-vírgula
    csv_content = StringIO(response.text)
    reader = csv.DictReader(csv_content, delimiter=';')
    
    # Pegar headers
    headers = reader.fieldnames
    print("📋 COLUNAS DO CSV:")
    print("=" * 80)
    for i, header in enumerate(headers, 1):
        print(f"{i:2d}. {header}")
    
    print("\n" + "=" * 80)
    print("\n📊 PRIMEIRAS 5 LINHAS DE DADOS:")
    print("=" * 80)
    
    # Mostrar primeiras 5 linhas
    rows = []
    for i, row in enumerate(reader, 1):
        if i > 5:
            break
        rows.append(row)
        print(f"\nLINHA {i}:")
        for key, value in row.items():
            if value:  # Só mostrar se tiver valor
                print(f"  {key:25s} = {value}")
    
    print("\n" + "=" * 80)
    print("\n🗺️ MAPEAMENTO SUGERIDO (CSV → Tabela 'locations'):")
    print("=" * 80)
    
    if rows:
        exemplo = rows[0]
        print(f"""
Estrutura detectada:
    
CSV Column                    →  locations.column         Exemplo
────────────────────────────────────────────────────────────────────────
local                         →  name                     "{exemplo.get('local', 'N/A')}"
endereco                      →  address                  "{exemplo.get('endereco', 'N/A')}"
latitude                      →  lat                      {exemplo.get('latitude', 'N/A')}
longitude                     →  lng                      {exemplo.get('longitude', 'N/A')}
votos_candidato              →  votes_count              {exemplo.get('votos_candidato', 'N/A')}
        
NOTA: O CSV parece conter dados de LOCAIS DE VOTAÇÃO por seção.
      Cada linha tem: município, zona, seção, local, endereço, coordenadas e votos.
    """)
    
else:
    print(f"❌ Erro ao baixar CSV: {response.status_code}")
