import sqlite3

DB_PATH = "/home/carneiro888/CARNEIRO888/PRISMA888V11/PRISMA888FORBES/engine/.venv/lib/python3.12/site-packages/langflow/langflow.db"
FLOW_ID = "22b62615-9640-475d-916e-baf27187780e" # ID do flow que está aberto no navegador

def fix_new_flow_mcp():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # 1. Definir endpoint_name e garantir que está na pasta certa
        endpoint_name = "supabase_research_crew_final"
        folder_id = "cb742f3cb62f49cfb86dd87b44836851" # Folder do Starter Project (sem hifens)
        
        print(f"🔧 Configurando flow {FLOW_ID}...")
        
        cursor.execute("""
            UPDATE flow 
            SET name = 'Supabase Research Crew Final',
                endpoint_name = ?,
                folder_id = ?,
                webhook = 1,
                updated_at = datetime('now')
            WHERE id = ?
        """, (endpoint_name, folder_id, FLOW_ID))
        
        if cursor.rowcount > 0:
            print(f"✅ Flow configurado com endpoint_name='{endpoint_name}'")
        else:
            print("❌ Flow não encontrado no banco (talvez não tenha salvo ainda?)")
            
        conn.commit()
        
    except Exception as e:
        print(f"❌ Erro: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    fix_new_flow_mcp()
