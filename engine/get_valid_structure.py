import sqlite3
import json

DB_PATH = "/home/carneiro888/CARNEIRO888/PRISMA888V11/PRISMA888FORBES/engine/.venv/lib/python3.12/site-packages/langflow/langflow.db"

def get_valid_flow_structure():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Pegar o flow que sabemos que funciona
        cursor.execute("SELECT data FROM flow WHERE name = 'YouTube Analysis' LIMIT 1")
        row = cursor.fetchone()
        
        if row:
            data = json.loads(row[0])
            # Salvar em arquivo para eu analisar
            with open("valid_flow_structure.json", "w") as f:
                json.dump(data, f, indent=2)
            print("✅ Estrutura válida extraída com sucesso!")
        else:
            print("❌ Flow YouTube Analysis não encontrado")
            
    except Exception as e:
        print(f"❌ Erro: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    get_valid_flow_structure()
