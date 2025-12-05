import sqlite3

DB_PATH = "/home/carneiro888/CARNEIRO888/PRISMA888V11/PRISMA888FORBES/engine/.venv/lib/python3.12/site-packages/langflow/langflow.db"
FLOW_ID = "88d97796f4ac4181b4e3139a2844cc62"
CORRECT_FOLDER_ID = "cb742f3cb62f49cfb86dd87b44836851" # Sem hífens!

def fix_folder_id():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        print(f"🔧 Corrigindo folder_id para: {CORRECT_FOLDER_ID}")
        
        cursor.execute("""
            UPDATE flow 
            SET folder_id = ?
            WHERE id = ?
        """, (CORRECT_FOLDER_ID, FLOW_ID))
        
        if cursor.rowcount > 0:
            print("✅ Flow movido para a pasta correta!")
        else:
            print("❌ Flow não encontrado")
            
        conn.commit()
        
    except Exception as e:
        print(f"❌ Erro: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    fix_folder_id()
