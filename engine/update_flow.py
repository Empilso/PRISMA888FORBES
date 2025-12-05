import sqlite3
import json
import os

DB_PATH = "/home/carneiro888/CARNEIRO888/PRISMA888V11/PRISMA888FORBES/engine/.venv/lib/python3.12/site-packages/langflow/langflow.db"
FLOW_JSON = "/home/carneiro888/CARNEIRO888/PRISMA888V11/PRISMA888FORBES/engine/langflow_flows/supabase_research_crew_v2.json"
FLOW_ID = "88d97796f4ac4181b4e3139a2844cc62"

def update_flow_content():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        with open(FLOW_JSON, 'r') as f:
            flow_data = json.load(f)
            
        # Garantir que 'data' seja string JSON se não for
        data_content = flow_data.get("data")
        if isinstance(data_content, dict):
            data_content = json.dumps(data_content)
            
        print("🔄 Atualizando conteúdo do flow...")
        
        cursor.execute("""
            UPDATE flow 
            SET data = ?,
                updated_at = datetime('now')
            WHERE id = ?
        """, (data_content, FLOW_ID))
        
        if cursor.rowcount > 0:
            print("✅ Flow atualizado com JSON válido!")
        else:
            print("❌ Flow não encontrado")
            
        conn.commit()
        
    except Exception as e:
        print(f"❌ Erro: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    update_flow_content()
