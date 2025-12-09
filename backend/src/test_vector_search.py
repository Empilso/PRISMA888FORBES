#!/usr/bin/env python3
"""
Script de Teste: Verifica se a busca vetorial está funcionando corretamente.
Execute com: python backend/src/test_vector_search.py

Antes de rodar:
1. Execute a migração SQL no Supabase (backend/migrations/20241209_match_documents_rpc.sql)
2. Certifique-se de que existem chunks na tabela document_chunks para a campanha

Uso:
    python test_vector_search.py "educação" "223a036e-684e-4340-b1f6-81fa88c3ffbf"
"""

import os
import sys
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Adicionar src ao path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from supabase import create_client


def check_database_data(campaign_id: str):
    """Verifica se existem dados no banco para a campanha."""
    print("\n" + "="*60)
    print("📊 VERIFICAÇÃO DE DADOS NO BANCO")
    print("="*60)
    
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        print("❌ ERRO: Variáveis SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY não definidas!")
        return False
    
    supabase = create_client(url, key)
    
    # 1. Verificar documentos mestres
    print(f"\n🔍 Verificando tabela 'documents' para campaign_id: {campaign_id}")
    try:
        docs = supabase.table("documents").select("id, filename").eq("campaign_id", campaign_id).execute()
        if docs.data:
            print(f"   ✅ Encontrados {len(docs.data)} documento(s) mestre(s):")
            for doc in docs.data:
                print(f"      - {doc.get('filename', 'sem nome')} (ID: {doc.get('id', 'N/A')})")
        else:
            print("   ⚠️  Nenhum documento mestre encontrado.")
    except Exception as e:
        print(f"   ❌ Erro ao consultar: {e}")
    
    # 2. Verificar chunks vetorizados
    print(f"\n🔍 Verificando tabela 'document_chunks' para campaign_id: {campaign_id}")
    try:
        chunks = supabase.table("document_chunks").select("id, content", count="exact").eq("campaign_id", campaign_id).limit(3).execute()
        total = chunks.count if hasattr(chunks, 'count') else len(chunks.data)
        
        if chunks.data:
            print(f"   ✅ Encontrados {total} chunk(s) vetorizado(s)")
            print("   📄 Amostra dos primeiros chunks:")
            for chunk in chunks.data[:3]:
                content_preview = chunk.get('content', '')[:100] + "..." if len(chunk.get('content', '')) > 100 else chunk.get('content', '')
                print(f"      - {content_preview}")
            return True
        else:
            print("   ❌ NENHUM chunk encontrado! A ingestão de PDF pode ter falhado.")
            print("   💡 Execute a ingestão novamente via API /api/ingest/pdf")
            return False
    except Exception as e:
        print(f"   ❌ Erro ao consultar: {e}")
        return False


def test_rpc_function(campaign_id: str):
    """Testa se a função RPC match_documents existe e funciona."""
    print("\n" + "="*60)
    print("🧪 TESTE DA FUNÇÃO RPC match_documents")
    print("="*60)
    
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    supabase = create_client(url, key)
    
    # Gerar um embedding de teste
    from langchain_openai import OpenAIEmbeddings
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    test_embedding = embeddings.embed_query("teste de educação")
    
    print(f"\n🔍 Chamando match_documents com embedding de 'teste de educação'...")
    try:
        result = supabase.rpc("match_documents", {
            "query_embedding": test_embedding,
            "match_count": 3,
            "filter": {"campaign_id": campaign_id}
        }).execute()
        
        if result.data:
            print(f"   ✅ RPC funcionando! Retornou {len(result.data)} resultado(s).")
            for i, doc in enumerate(result.data, 1):
                similarity = doc.get('similarity', 0)
                content = doc.get('content', '')[:80] + "..."
                print(f"      [{i}] Similaridade: {similarity:.4f}")
                print(f"          {content}")
            return True
        else:
            print("   ⚠️  RPC executou mas não retornou dados.")
            print("   💡 Verifique se existem chunks para esta campanha.")
            return False
            
    except Exception as e:
        error_msg = str(e)
        if "function" in error_msg.lower() and "does not exist" in error_msg.lower():
            print(f"   ❌ FUNÇÃO RPC NÃO EXISTE!")
            print(f"   💡 Execute a migração SQL: backend/migrations/20241209_match_documents_rpc.sql")
        else:
            print(f"   ❌ Erro: {e}")
        return False


def test_langchain_vector_store(campaign_id: str, query: str):
    """Testa a busca usando LangChain SupabaseVectorStore."""
    print("\n" + "="*60)
    print("🚀 TESTE DO LANGCHAIN SUPABASE VECTOR STORE")
    print("="*60)
    
    try:
        from langchain_openai import OpenAIEmbeddings
        from langchain_community.vectorstores import SupabaseVectorStore
        
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        supabase = create_client(url, key)
        embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
        
        print(f"\n🔍 Buscando por: '{query}'")
        print(f"   Campaign ID: {campaign_id}")
        
        vector_store = SupabaseVectorStore(
            client=supabase,
            embedding=embeddings,
            table_name="document_chunks",
            query_name="match_documents"
        )
        
        results = vector_store.similarity_search(
            query=query,
            k=3,
            filter={"campaign_id": campaign_id}
        )
        
        if results:
            print(f"\n   ✅ SUCESSO! Encontrados {len(results)} resultado(s):\n")
            for i, doc in enumerate(results, 1):
                content = doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content
                print(f"   [{i}] {content}\n")
            return True
        else:
            print("   ⚠️  Nenhum resultado encontrado via LangChain.")
            return False
            
    except Exception as e:
        print(f"   ❌ Erro: {e}")
        return False


def test_crewai_tool(campaign_id: str, query: str):
    """Testa a ferramenta CrewAI diretamente."""
    print("\n" + "="*60)
    print("🤖 TESTE DA FERRAMENTA CREWAI (CampaignVectorSearchTool)")
    print("="*60)
    
    # Definir a variável de ambiente que a tool usa
    os.environ["CURRENT_CAMPAIGN_ID"] = campaign_id
    
    try:
        from crew.tools import campaign_vector_search
        
        print(f"\n🔍 Executando campaign_vector_search._run('{query}')")
        result = campaign_vector_search._run(query)
        
        if "Nenhum documento" in result or "Erro" in result:
            print(f"   ⚠️  Resultado: {result}")
            return False
        else:
            print(f"   ✅ SUCESSO! Resultado:\n")
            print(result[:500] + "..." if len(result) > 500 else result)
            return True
            
    except Exception as e:
        print(f"   ❌ Erro: {e}")
        return False


def main():
    print("""
╔══════════════════════════════════════════════════════════════╗
║     🧪 PRISMA 888 - TESTE DE BUSCA VETORIAL                 ║
╚══════════════════════════════════════════════════════════════╝
    """)
    
    # Parâmetros
    query = sys.argv[1] if len(sys.argv) > 1 else "educação"
    campaign_id = sys.argv[2] if len(sys.argv) > 2 else "223a036e-684e-4340-b1f6-81fa88c3ffbf"
    
    print(f"📋 Parâmetros do teste:")
    print(f"   Query: {query}")
    print(f"   Campaign ID: {campaign_id}")
    
    # Executar testes em sequência
    results = {
        "Dados no Banco": check_database_data(campaign_id),
        "RPC match_documents": test_rpc_function(campaign_id),
        "LangChain VectorStore": test_langchain_vector_store(campaign_id, query),
        "CrewAI Tool": test_crewai_tool(campaign_id, query),
    }
    
    # Resumo final
    print("\n" + "="*60)
    print("📋 RESUMO DOS TESTES")
    print("="*60)
    
    all_passed = True
    for test_name, passed in results.items():
        status = "✅ PASSOU" if passed else "❌ FALHOU"
        print(f"   {test_name}: {status}")
        if not passed:
            all_passed = False
    
    print("\n" + "="*60)
    if all_passed:
        print("🎉 TODOS OS TESTES PASSARAM! A busca vetorial está funcionando!")
    else:
        print("⚠️  ALGUNS TESTES FALHARAM. Verifique os logs acima.")
        print("\n💡 Próximos passos sugeridos:")
        if not results["Dados no Banco"]:
            print("   1. Execute a ingestão de PDF: POST /api/ingest/pdf")
        if not results["RPC match_documents"]:
            print("   2. Execute a migração SQL no Supabase Dashboard")
            print("      Arquivo: backend/migrations/20241209_match_documents_rpc.sql")
    print("="*60)


if __name__ == "__main__":
    main()
