import sqlite3
import json

DB_PATH = "/home/carneiro888/CARNEIRO888/PRISMA888V11/PRISMA888FORBES/engine/.venv/lib/python3.12/site-packages/langflow/langflow.db"

def inspect_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        print("--- USERS ---")
        cursor.execute("SELECT id, username FROM user")
        users = cursor.fetchall()
        for u in users:
            print(f"User: {u}")

        print("\n--- FOLDERS (PROJECTS) ---")
        cursor.execute("SELECT id, name, user_id FROM folder")
        folders = cursor.fetchall()
        for f in folders:
            print(f"Folder: {f}")

        print("\n--- FLOWS ---")
        cursor.execute("SELECT id, name, folder_id, user_id, endpoint_name FROM flow")
        flows = cursor.fetchall()
        for f in flows:
            print(f"Flow: {f}")
            
    except Exception as e:
        print(f"❌ Erro: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    inspect_db()
