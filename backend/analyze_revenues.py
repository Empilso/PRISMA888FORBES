import csv
from collections import defaultdict

with open('backend/data/tce_sp_real/receitas-votorantim-2025.csv', encoding='latin-1') as f:
    r = csv.DictReader(f, delimiter=';')
    total = 0
    by_category = defaultdict(float)
    rows = list(r)
    
    for row in rows:
        val = float(row['vl_arrecadacao'].replace(',', '.'))
        total += val
        cat = row.get('ds_categoria', 'Unknown')
        by_category[cat] += val

print(f"Total Rows: {len(rows)}")
print(f"Total Value: {total:,.2f}")
print("By Category:")
for k, v in by_category.items():
    print(f"  {k}: {v:,.2f}")

