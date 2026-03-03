import csv

csv_path = "backend/data/tce_sp_real/despesas-votorantim-2025.csv"

with open(csv_path, 'r', encoding='latin-1', errors='replace') as f:
    # Ler apenas a primeira linha para ver os headers
    headers = f.readline().strip().split(';')
    print("Headers encontrados:")
    for i, h in enumerate(headers):
        print(f"[{i}] {h}")
