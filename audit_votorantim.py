
import os
import json
from supabase import create_client
from dotenv import load_dotenv
from collections import Counter

# Load environment variables
load_dotenv(dotenv_path="backend/.env")

# Initialize Supabase
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("❌ Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in backend/.env")
    exit(1)

supabase = create_client(url, key)

def run_audit():
    print("🔍 INICIANDO AUDITORIA DE DADOS - CASE VOTORANTIM\n")

    # 1. Check radar_executions (Latest Run)
    print("--- 1. ANÁLISE DO ÚLTIMO EXECUTION LOG (radar_executions) ---")
    try:
        execution = supabase.table("radar_executions") \
            .select("*") \
            .eq("phase", "phase2") \
            .eq("status", "ok") \
            .order("finished_at", desc=True) \
            .limit(1) \
            .execute()

        if execution.data:
            latest = execution.data[0]
            summary = latest.get("summary", {})
            
            print(f"✅ Última execução: {latest['finished_at']}")
            print(f"🆔 ID: {latest['id']}")
            
            # Check for rich data
            if isinstance(summary, dict):
                print(f"📊 Matches Encontrados (Summary): {summary.get('matches_found')}")
                print(f"💰 Valor Total (Summary): R$ {summary.get('total_evidence_value', 0):,.2f}")
                
                # Check sample matches
                samples = summary.get("sample_matches", [])
                if samples:
                    print(f"\n📝 Amostra de Matches no JSON ({len(samples)} itens):")
                    for i, s in enumerate(samples[:3]):
                        print(f"  {i+1}. {s.get('promise_resumo')[:60]}...")
                        for exp in s.get('matched_expenses', [])[:2]:
                            print(f"     -> R$ {exp.get('vl_despesa')} | {exp.get('nm_fornecedor')} | {exp.get('orgao')}")
                else:
                    print("⚠️ Nenhuma amostra encontrada no JSON do summary.")
            else:
                print("⚠️ Summary não é um dicionário válido.")
        else:
            print("❌ Nenhuma execução 'ok' encontrada em radar_executions.")
    
    except Exception as e:
        print(f"❌ Erro ao consultar radar_executions: {e}")

    print("\n" + "="*50 + "\n")

    # 2. Check promise_verifications (Granular Data)
    print("--- 2. PROFUNDIDADE DOS DADOS (promise_verifications) ---")
    try:
        # Fetch verifications that have sources
        verifications = supabase.table("promise_verifications") \
            .select("id, promise_id, fontes, justificativa_ia, score_similaridade") \
            .neq("fontes", "[]") \
            .order("score_similaridade", desc=True) \
            .limit(100) \
            .execute()

        all_sources = []
        
        if verifications.data:
            print(f"📚 Analisando {len(verifications.data)} verificações com evidências...")
            
            for v in verifications.data:
                fontes = v.get("fontes", [])
                if isinstance(fontes, list):
                    all_sources.extend(fontes)
            
            print(f"📌 Total de evidências individuais extraídas: {len(all_sources)}")
            
            # Top Values
            print("\n🏆 TOP 5 MAIORES PAGAMENTOS ENCONTRADOS:")
            # Sort by value (handling potential string/float discrepancies)
            def get_val(s):
                try:
                    return float(s.get("value", 0) or 0)
                except:
                    return 0.0
            
            sorted_sources = sorted(all_sources, key=get_val, reverse=True)
            
            for i, s in enumerate(sorted_sources[:5]):
                val = get_val(s)
                supplier = s.get("supplier", "Desconhecido")
                print(f"  {i+1}. R$ {val:,.2f} - {supplier}")

            # Top Suppliers
            print("\n🏢 PRINCIPAIS FORNECEDORES (Frequência):")
            suppliers = [s.get("supplier") for s in all_sources if s.get("supplier")]
            common_suppliers = Counter(suppliers).most_common(5)
            
            for name, count in common_suppliers:
                print(f"  - {name}: {count} ocorrências")

        else:
            print("⚠️ Nenhuma verificação com dados encontrada em 'promise_verifications'.")

    except Exception as e:
         print(f"❌ Erro ao consultar promise_verifications: {e}")

if __name__ == "__main__":
    run_audit()
