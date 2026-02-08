
import os
import psycopg2
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv("backend/.env")

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
db_url = os.getenv("DATABASE_URL")

if not url or not key:
    print("❌ Missing credentials")
    exit(1)

supabase: Client = create_client(url, key)

EMAIL = "admin@prisma888.com"
PASSWORD = "PrismaAdmin123" # Simple, alphanumeric

print(f"--- FIXING LOGIN FOR: {EMAIL} ---")

try:
    # 1. Find User
    print("1. Searching for user...")
    users = supabase.auth.admin.list_users()
    user = next((u for u in users if u.email == EMAIL), None)
    
    if not user:
        print("⚠️ User not found. Creating...")
        user = supabase.auth.admin.create_user({
            "email": EMAIL,
            "password": PASSWORD,
            "email_confirm": True,
            "user_metadata": {"full_name": "Admin Prisma", "role": "super_admin"}
        })
        print(f"✅ User Created: {user.user.id}")
        user_id = user.user.id
    else:
        print(f"✅ User found: {user.id}")
        print("🔄 Updating password...")
        supabase.auth.admin.update_user_by_id(
            user.id, 
            {"password": PASSWORD, "email_confirm": True}
        )
        print("✅ Password updated.")
        user_id = user.id

    # 2. Check Profile
    print("\n2. Checking Profile...")
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cur = conn.cursor()
    
    cur.execute("SELECT id, role FROM public.profiles WHERE id = %s", (user_id,))
    profile = cur.fetchone()
    
    if not profile:
        print("⚠️ Profile missing. Creating...")
        # Get a campaign
        cur.execute("SELECT id FROM public.campaigns LIMIT 1")
        camp = cur.fetchone()
        camp_id = camp[0] if camp else None
        
        if not camp_id:
             cur.execute("INSERT INTO public.campaigns (name) VALUES ('Admin Camp') RETURNING id")
             camp_id = cur.fetchone()[0]

        cur.execute("""
            INSERT INTO public.profiles (id, email, full_name, role, campaign_id)
            VALUES (%s, %s, %s, 'super_admin', %s)
        """, (user_id, EMAIL, "Admin Prisma", camp_id))
        print("✅ Profile inserted.")
    else:
        print(f"✅ Profile exists. Role: {profile[1]}")
        if profile[1] != 'super_admin':
            print("🔄 Upgrading role to super_admin...")
            cur.execute("UPDATE public.profiles SET role = 'super_admin' WHERE id = %s", (user_id,))
            print("✅ Role updated.")

    conn.close()

    # 3. Verify Login
    print("\n3. Verifying Login (Server-Side)...")
    try:
        session = supabase.auth.sign_in_with_password({"email": EMAIL, "password": PASSWORD})
        if session.user:
            print("✅ LOGIN SUCCESSFUL! System is working.")
            print(f"👉 Use these credentials: {EMAIL} / {PASSWORD}")
        else:
            print("❌ Login failed (No session).")
    except Exception as e:
        print(f"❌ Login Failed: {e}")

except Exception as e:
    print(f"❌ Error: {e}")
