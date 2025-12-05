import sqlite3
import json

DB_PATH = "/home/carneiro888/CARNEIRO888/PRISMA888V11/PRISMA888FORBES/engine/.venv/lib/python3.12/site-packages/langflow/langflow.db"
FLOW_JSON = "/home/carneiro888/CARNEIRO888/PRISMA888V11/PRISMA888FORBES/engine/langflow_flows/simple_valid_flow.json"
FLOW_ID = "88d97796f4ac4181b4e3139a2844cc62"

def update_flow_simple():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        with open(FLOW_JSON, 'r') as f:
            flow_data = json.load(f)
            
        data_content = json.dumps(flow_data)
            
        print("🔄 Atualizando com flow simples...")
        
        cursor.execute("""
            UPDATE flow 
            SET data = ?,
                updated_at = datetime('now')
            WHERE id = ?
        """, (data_content, FLOW_ID))
        
        conn.commit()
        print("✅ Atualizado!")
        
    except Exception as e:
        print(f"❌ Erro: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    update_flow_simple()
