
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv("backend/.env")

db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("❌ DATABASE_URL not found")
    exit(1)

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    print("\n--- 1. AUTH USERS (Last 20) ---")
    cur.execute("""
        SELECT id, email, created_at, email_confirmed_at
        FROM auth.users
        ORDER BY created_at DESC
        LIMIT 20;
    """)
    users = cur.fetchall()
    print(f"{'ID':<38} | {'Email':<30} | {'Created At'}")
    print("-" * 80)
    for u in users:
        print(f"{u[0]:<38} | {u[1]:<30} | {u[2]}")

    print("\n--- 2. PROFILES (Last 20) ---")
    cur.execute("""
        SELECT id, email, role, campaign_id, created_at
        FROM public.profiles
        ORDER BY created_at DESC
        LIMIT 20;
    """)
    profiles = cur.fetchall()
    print(f"{'ID':<38} | {'Email':<30} | {'Role':<10} | {'Campaign ID'}")
    print("-" * 100)
    for p in profiles:
        print(f"{p[0]:<38} | {p[1]:<30} | {p[2]:<10} | {p[3]}")

    print("\n--- 3. ORPHAN USERS (Users without Profile) ---")
    cur.execute("""
        SELECT u.id, u.email, u.created_at
        FROM auth.users u
        LEFT JOIN public.profiles p ON u.id = p.id
        WHERE p.id IS NULL;
    """)
    orphans = cur.fetchall()
    if not orphans:
        print("✅ No orphan users found.")
    else:
        print(f"⚠️ Found {len(orphans)} orphan users:")
        for o in orphans:
             print(f"   - {o[1]} (ID: {o[0]}) Created: {o[2]}")

    print("\n--- 4. RLS POLICIES on public.profiles ---")
    cur.execute("""
        SELECT policyname, permissive, roles, cmd, qual
        FROM pg_policies
        WHERE tablename = 'profiles';
    """)
    policies = cur.fetchall()
    for pol in policies:
        print(f"Policy: {pol[0]}")
        print(f"  Type: {pol[1]} | Roles: {pol[2]} | Cmd: {pol[3]}")
        print(f"  Qual: {pol[4]}")
        print("-" * 40)

    print("\n--- 5. SEARCH 'pivetta' OR 'candidato' ---")
    cur.execute("""
        SELECT id, email, created_at
        FROM auth.users
        WHERE email ILIKE '%pivetta%' OR email ILIKE '%candidato%';
    """)
    targets = cur.fetchall()
    if not targets:
        print("No matches for 'pivetta' or 'candidato'.")
    else:
        for t in targets:
            print(f"MATCH: {t[1]} (ID: {t[0]})")

    conn.close()

except Exception as e:
    print(f"❌ Error: {e}")
