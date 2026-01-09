import os
import psycopg2
from dotenv import load_dotenv
import uuid

load_dotenv()

DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
    print("❌ DATABASE_URL not found")
    exit(1)

conn = psycopg2.connect(DB_URL)
conn.autocommit = True
cur = conn.cursor()

def fix_weber():
    print("🔎 Searching for Weber Manga...")
    cur.execute("SELECT id, name, cargo, city_id FROM politicians WHERE name ILIKE '%Weber%Manga%'")
    weber = cur.fetchone()
    
    if not weber:
        print("❌ Weber Manga not found in politicians table.")
        return

    pid, name, cargo, city_id = weber
    print(f"👤 Found: {name} | Cargo: {cargo} | ID: {pid}")

    # 1. Update Cargo to Prefeito
    if cargo != 'Prefeito':
        print(f"🔄 Updating cargo from {cargo} to 'Prefeito'...")
        cur.execute("UPDATE politicians SET cargo = 'Prefeito' WHERE id = %s", (pid,))
        print("✅ Cargo updated.")
    
    # 2. Check Mandate
    # Check if he has a mandate
    cur.execute("""
        SELECT m.id, o.title, m.is_active 
        FROM mandates m 
        JOIN offices o ON m.office_id = o.id 
        WHERE m.politician_id = %s
    """, (pid,))
    mandate = cur.fetchone()
    
    if mandate:
        mid, title, active = mandate
        print(f"📋 Existing Mandate: {title} (Active: {active})")
    else:
        print("⚠️ No mandate found. Creating one...")
        # Get Office ID for Prefeito
        cur.execute("SELECT id FROM offices WHERE title = 'Prefeito'")
        office = cur.fetchone()
        if not office:
            print("❌ Office 'Prefeito' not found")
            return
        oid = office[0]
        
        cur.execute("""
            INSERT INTO mandates (id, politician_id, office_id, city_id, is_active)
            VALUES (%s, %s, %s, %s, true)
            RETURNING id
        """, (str(uuid.uuid4()), pid, oid, city_id))
        new_mid = cur.fetchone()[0]
        print(f"✅ Mandate created: {new_mid}")

    # 3. Check Legislative Support (Remove if exists, he is Mayor)
    cur.execute("SELECT id FROM legislative_support WHERE politician_id = %s", (pid,))
    support = cur.fetchone()
    if support:
        print("⚠️ Found in legislative_support. This is wrong for a Mayor. Removing...")
        cur.execute("DELETE FROM legislative_support WHERE id = %s", (support[0],))
        print("✅ Removed from legislative_support.")

if __name__ == "__main__":
    fix_weber()
