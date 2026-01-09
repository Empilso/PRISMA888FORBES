"""
PDF Diagnostic Script v2 - Uses authenticated download
"""

import os
import io
from dotenv import load_dotenv
from supabase import create_client, Client

env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def diagnose_pdf():
    print("🔍 PDF Diagnostic Tool v2 (Authenticated Download)\n" + "="*50)
    
    # 1. Find the latest government plan document
    print("\n1. Buscando documento no banco...")
    
    docs_res = supabase.table("documents") \
        .select("id, filename, file_url, person_id, created_at") \
        .eq("doc_type", "government_plan") \
        .order("created_at", desc=True) \
        .limit(1) \
        .execute()
    
    if not docs_res.data:
        print("❌ Nenhum documento encontrado!")
        return
    
    doc = docs_res.data[0]
    print(f"   📄 Arquivo: {doc['filename']}")
    
    # 2. Extract path from URL
    file_url = doc['file_url']
    # URL: .../government-plans/politician_id/filename
    if "government-plans" in file_url:
        path = file_url.split("government-plans/")[1].split("?")[0]
        print(f"   📁 Path no storage: {path}")
    else:
        print("   ❌ URL mal formatada")
        return
    
    # 3. Download via authenticated storage API
    print("\n2. Baixando via Storage API autenticado...")
    try:
        file_data = supabase.storage.from_("government-plans").download(path)
        print(f"   ✅ Download OK: {len(file_data)} bytes ({len(file_data)/1024:.1f} KB)")
    except Exception as e:
        print(f"   ❌ Erro: {e}")
        return
    
    # 4. Analyze with pypdf
    print("\n3. Analisando PDF...")
    try:
        from pypdf import PdfReader
        
        reader = PdfReader(io.BytesIO(file_data))
        
        print(f"   📄 Páginas: {len(reader.pages)}")
        print(f"   🔒 Encriptado: {reader.is_encrypted}")
        
        if reader.is_encrypted:
            try:
                reader.decrypt("")
            except:
                print("   ❌ Não foi possível descriptografar")
                return
        
        # Extract text from first pages
        print("\n4. Extraindo texto...")
        
        total_text = ""
        for i, page in enumerate(reader.pages[:3]):
            text = page.extract_text() or ""
            total_text += text
            print(f"   Página {i+1}: {len(text)} chars")
        
        # Verdict
        print("\n" + "="*50)
        print("📊 DIAGNÓSTICO:")
        
        if len(total_text.strip()) < 50:
            print("   ❌ PDF É IMAGEM/SCAN (sem texto extraível)")
            print("   → Solução: Implementar OCR")
        else:
            print(f"   ✅ PDF TEM TEXTO ({len(total_text)} chars)")
            print(f"\n   Amostra:\n   {total_text[:800]}")
            
    except Exception as e:
        print(f"   ❌ Erro ao analisar: {e}")

if __name__ == "__main__":
    diagnose_pdf()
