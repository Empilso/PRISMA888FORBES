import chardet

csv_path = "backend/data/tce_sp_real/despesas-votorantim-2025.csv"

# Ler bytes crus para detectar encoding
with open(csv_path, 'rb') as f:
    raw_data = f.read(10000)
    result = chardet.detect(raw_data)
    print(f"🔍 Encoding Detectado: {result}")
    
    # Tentar decodificar e mostrar primeiras linhas
    try:
        content = raw_data.decode(result['encoding'])
        print("\n📄 Primeiras 5 linhas:")
        print('\n'.join(content.splitlines()[:5]))
    except Exception as e:
        print(f"❌ Erro ao decodificar: {e}")
