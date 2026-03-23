import os
import psycopg2
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

DATABASE_URL = os.getenv("DATABASE_URL")

def create_documents_table():
    print("🔧 Creating documents table with full schema...")
    
    sql = """
    -- Create documents table if not exists
    CREATE TABLE IF NOT EXISTS public.documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID,
        person_id UUID,
        city_id UUID,
        filename TEXT,
        file_url TEXT,
        file_type TEXT,
        doc_type TEXT,
        category TEXT,
        author_name TEXT,
        content_text TEXT,
        embedding vector(1536),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create index for common queries
    CREATE INDEX IF NOT EXISTS idx_documents_person_id ON public.documents(person_id);
    CREATE INDEX IF NOT EXISTS idx_documents_campaign_id ON public.documents(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON public.documents(doc_type);

    -- Trigger for updated_at
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
       NEW.updated_at = NOW();
       RETURN NEW;
    END;
    $$ language 'plpgsql';

    DROP TRIGGER IF EXISTS update_documents_updated_at ON public.documents;
    CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

    -- Enable RLS
    ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

    -- Basic RLS policy (allow all for service role)
    DROP POLICY IF EXISTS documents_all_access ON public.documents;
    CREATE POLICY documents_all_access ON public.documents
    FOR ALL USING (true) WITH CHECK (true);

    -- Reload PostgREST schema cache
    NOTIFY pgrst, 'reload schema';
    """
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cur = conn.cursor()
        
        cur.execute(sql)
        
        print("✅ Documents table created/updated successfully!")
        print("✅ PostgREST schema cache reloaded.")
        
        # Verify
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'documents';")
        cols = cur.fetchall()
        print(f"Columns: {[c[0] for c in cols]}")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    create_documents_table()
