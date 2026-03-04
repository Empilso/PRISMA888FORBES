import os
import psycopg2
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), 'PRISMA888 FORBES/backend/.env'))

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    load_dotenv(os.path.join(os.path.dirname(__file__), 'PRISMA888FORBES/backend/.env'))
    DATABASE_URL = os.environ.get("DATABASE_URL")

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'campaigns'")
print("CAMPANHA COLS:", [row[0] for row in cur.fetchall()])
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles'")
print("PROFILES COLS:", [row[0] for row in cur.fetchall()])
