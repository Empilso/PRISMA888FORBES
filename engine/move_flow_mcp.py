import sqlite3
import os

DB_PATH = "/home/carneiro888/CARNEIRO888/PRISMA888V11/PRISMA888FORBES/engine/.venv/lib/python3.12/site-packages/langflow/langflow.db"
FLOW_ID = "88d97796f4ac4181b4e3139a2844cc62"  # ID do flow importado
PROJECT_ID = "cb742f3c-b62f-49cf-b86d-d87b44836851" # ID do projeto MCP

def move_flow_to_project():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Verificar se o flow existe
        cursor.execute("SELECT name FROM flow WHERE id = ?", (FLOW_ID,))
        flow = cursor.fetchone()
        if not flow:
            print(f"❌ Flow {FLOW_ID} não encontrado!")
            return

        print(f"📦 Flow encontrado: {flow[0]}")
        
        # Atualizar folder_id
        cursor.execute("UPDATE flow SET folder_id = ? WHERE id = ?", (PROJECT_ID, FLOW_ID))
        conn.commit()
        
        print(f"✅ Flow movido com sucesso para o projeto {PROJECT_ID}!")
        
    except Exception as e:
        print(f"❌ Erro: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    move_flow_to_project()
