import os
import psycopg2
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

DATABASE_URL = os.getenv("DATABASE_URL")

def create_legislative_support():
    print("🔧 Creating legislative_support table...")
    
    sql = """
    CREATE TABLE IF NOT EXISTS public.legislative_support (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL,
        politician_id UUID NOT NULL,
        status TEXT DEFAULT 'neutro',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(campaign_id, politician_id)
    );

    -- Index
    CREATE INDEX IF NOT EXISTS idx_leg_support_campaign ON public.legislative_support(campaign_id);

    -- RLS
    ALTER TABLE public.legislative_support ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS leg_support_all ON public.legislative_support;
    CREATE POLICY leg_support_all ON public.legislative_support
    FOR ALL USING (true) WITH CHECK (true);

    -- Notify PostgREST
    NOTIFY pgrst, 'reload schema';
    """
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute(sql)
        print("✅ Table legislative_support created!")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    create_legislative_support()
