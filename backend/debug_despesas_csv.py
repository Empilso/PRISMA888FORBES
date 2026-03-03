import csv
import sys

csv_path = "backend/data/tce_sp_real/despesas-votorantim-2025.csv"

print(f"📁 Lendo CSV: {csv_path}")

total_value = 0
count = 0
meses = {}

try:
    with open(csv_path, 'r', encoding='latin-1', errors='replace') as f:
        reader = csv.reader(f, delimiter=';')
        next(reader) # Pular header
        
        eventos = {}
        total_geral = 0
        count = 0
        
        for row in reader:
            try:
                # tp_despesa é indice 6
                evento = row[6] if len(row) > 6 else "Desconhecido"
                
                # vl_despesa é indice 11
                valor_str = row[11].replace(',', '.') if len(row) > 11 else "0"
                valor = float(valor_str)
                
                eventos[evento] = eventos.get(evento, 0) + valor
                total_geral += valor
                count += 1
                
            except Exception as e:
                pass

    print(f"\n📊 Resultados da Análise do Arquivo:")
    print(f"   Total de Linhas Processadas: {count}")
    print(f"   💰 Total Geral (Tudo somado): R$ {total_geral:,.2f}")
    
    print(f"\n🏷️ Por Tipo de Despesa (Evento):")
    for evento, valor in eventos.items():
        print(f"   {evento}: R$ {valor:,.2f}")
        
except Exception as e:
    print(f"❌ Erro: {e}")

except Exception as e:
    print(f"❌ Erro ao ler arquivo: {e}")
