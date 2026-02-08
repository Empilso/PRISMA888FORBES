
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

    print("\n--- TABLE: public.profiles ---")
    cur.execute("""
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema='public' AND table_name='profiles'
        ORDER BY ordinal_position;
    """)
    columns = cur.fetchall()
    if not columns:
        print("Table 'public.profiles' not found.")
    else:
        print(f"{'Column':<20} | {'Type':<15} | {'Nullable':<10} | {'Default'}")
        print("-" * 60)
        for col in columns:
            print(f"{col[0]:<20} | {col[1]:<15} | {col[2]:<10} | {col[3]}")

    print("\n\n--- RLS POLICIES (public.profiles) ---")
    cur.execute("""
        SELECT policyname, cmd, roles, qual, with_check
        FROM pg_policies
        WHERE tablename = 'profiles';
    """)
    policies = cur.fetchall()
    if not policies:
        print("No RLS policies found.")
    else:
        for pol in policies:
            print(f"Policy: {pol[0]}")
            print(f"  Command: {pol[1]}")
            print(f"  Roles: {pol[2]}")
            print(f"  Using: {pol[3]}")
            print(f"  Check: {pol[4]}")
            print("-" * 30)

    print("\n\n--- TRIGGERS on auth.users (Looking for profile creation) ---")
    # Triggers on auth.users are harder to see from standard user unless we have permissions, 
    # but let's try assuming we are connected as postgres or have visibility.
    # We query pg_trigger join pg_class
    try:
        cur.execute("""
            SELECT tgname, proname, relname 
            FROM pg_trigger 
            JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid 
            JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid 
            JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid 
            WHERE pg_namespace.nspname = 'auth' AND pg_class.relname = 'users';
        """)
        triggers = cur.fetchall()
        if not triggers:
            print("No triggers found on auth.users (or permission denied).")
        else:
            for tg in triggers:
                print(f"Trigger: {tg[0]} | Function: {tg[1]} | Table: {tg[2]}")
                
                # If we found the function, let's print its source code to see what it does
                if 'handle_new_user' in tg[1] or 'create_profile' in tg[1]:
                    print(f"\n--- SOURCE: {tg[1]} ---")
                    cur.execute(f"SELECT prosrc FROM pg_proc WHERE proname = '{tg[1]}'")
                    src = cur.fetchone()
                    if src:
                        print(src[0])

    except Exception as e:
         print(f"Could not inspect auth schema triggers: {e}")

    conn.close()

except Exception as e:
    print(f"Error connecting to DB: {e}")
