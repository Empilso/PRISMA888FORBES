import os
import psycopg2
from dotenv import load_dotenv

# Force IPv4 resolution (Copied from apply_competitors.py)
import socket
from urllib.parse import urlparse, urlunparse

load_dotenv()

def apply_sql_file(file_path):
    print(f"🚀 Aplicando SQL: {file_path}")
    db_url = os.getenv("DATABASE_URL")
    
    if not db_url:
        print("❌ DATABASE_URL não encontrada.")
        return

    # IPv4 Fix Logic
    try:
        parsed = urlparse(db_url)
        host = parsed.hostname
        # If host is already an IP, verify; if generic pooler DNS, resolve it
        try:
             # Only resolve if it's not already an IP (simple heuristic)
            if not host.replace('.','').isnumeric():
                 ipv4 = socket.gethostbyname(host)
                 print(f"🌍 IPv4 Resolvido: {ipv4} (Original: {host})")
        except:
             pass 
             # If resolution fails, psycopg2 might handle it if it's the pooler URL which is IPv4 compatible
    except:
        pass

    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cursor = conn.cursor()
        
        with open(file_path, 'r') as f:
            sql = f.read()
            
        cursor.execute(sql)
        print("✅ SQL aplicado com sucesso!")
        conn.close()
        
    except Exception as e:
        print(f"❌ Erro ao aplicar SQL: {e}")

if __name__ == "__main__":
    # Go up two levels from scripts/ to backend/, then one more to project root
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(os.path.dirname(current_dir))
    target_file = os.path.join(project_root, "migrations", "enhance_competitors_rich_profile.sql")
    
    print(f"📂 Buscando arquivo em: {target_file}")
    apply_sql_file(target_file)
