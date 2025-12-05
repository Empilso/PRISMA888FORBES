import sqlite3
import json

DB_PATH = "/home/carneiro888/CARNEIRO888/PRISMA888V11/PRISMA888FORBES/engine/.venv/lib/python3.12/site-packages/langflow/langflow.db"
FLOW_ID = "88d97796f4ac4181b4e3139a2844cc62"

def fix_flow_for_mcp():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # 1. Definir endpoint_name (obrigatório para MCP)
        endpoint_name = "supabase_research_crew"
        
        # 2. Garantir que webhook está ativo (ajuda na exposição)
        cursor.execute("""
            UPDATE flow 
            SET endpoint_name = ?,
                webhook = 1,
                updated_at = datetime('now')
            WHERE id = ?
        """, (endpoint_name, FLOW_ID))
        
        if cursor.rowcount > 0:
            print(f"✅ Flow atualizado com endpoint_name='{endpoint_name}'")
        else:
            print("❌ Flow não encontrado para atualização")
            
        conn.commit()
        
    except Exception as e:
        print(f"❌ Erro: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    fix_flow_for_mcp()
