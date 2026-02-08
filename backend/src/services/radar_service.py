import logging
import os
from datetime import datetime
from uuid import UUID
from typing import List, Optional
from supabase import create_client

# Local Service Imports
from src.services.pdf_service import PDFExtractionService
# from src.services.ai_service import AIService # DEPRECATED for this flow
from src.services.radar_matcher import RadarMatcher
from src.crew.radar_crew import RadarCrew # NEW IMPORT

logger = logging.getLogger("radar_service")
logger.setLevel(logging.INFO)

def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("Supabase credentials not found")
    return create_client(url, key)

class RadarService:
    """
    Domain Service for Radar Premium.
    Handles background processing, data extraction, and heavy lifting.
    """

    @staticmethod
    def extract_promises_background(
        campaign_id: str,
        mandate_id: str,
        politician_id: str,
        exec_id: str
    ):
        """Phase 1: PDF Extraction & Promise Mining with RadarCrew"""
        logger.info(f"🚀 [Service] Starting Phase 1 for campaign {campaign_id[:8]}")
        supabase = get_supabase_client()
        
        try:
            # 1. Find Document
            docs_res = supabase.table("documents") \
                .select("id, filename, file_url, content_text") \
                .eq("person_id", politician_id) \
                .eq("doc_type", "government_plan") \
                .limit(1) \
                .execute()
            
            if not docs_res.data:
                RadarService._fail_execution(supabase, exec_id, "Documento não encontrado")
                return

            doc = docs_res.data[0]
            full_text = doc.get("content_text", "")

            # 2. Extract Text (if needed)
            if not full_text or len(full_text) < 100:
                extraction = PDFExtractionService().extract_text(doc.get("file_url", ""))
                if extraction.success:
                    full_text = extraction.text
                    supabase.table("documents").update({"content_text": full_text}).eq("id", doc["id"]).execute()
                else:
                    RadarService._fail_execution(supabase, exec_id, f"PDF Extraction Failed: {extraction.error}")
                    return

            # 3. AI Extraction via RadarCrew (Pydantic)
            logger.info(f"🤖 AI Extracting from {len(full_text)} chars using RadarCrew...")
            
            crew = RadarCrew(campaign_id=campaign_id, run_id=exec_id)
            extraction_result = crew.run_extraction(full_text)
            
            # Helper to get promises list regardless of specific return shape
            promessas = extraction_result.get("promises", [])
            
            if not promessas and "error" in extraction_result:
                 raise Exception(str(extraction_result.get("error")))
            
            # 4. Save Promises (Idempotent Delete first)
            supabase.table("promises").delete().match({
                "campaign_id": campaign_id,
                "politico_id": politician_id,
                "mandate_id": mandate_id,
                "origem": "Plano de Governo"
            }).execute()

            inserted_count = 0
            for p in promessas:
                # Handle Pydantic dict structure
                # keys: resumo_promessa, categoria, verbos_chave, entidades_citadas, local, origem, trecho_original, confidence_score
                
                # We map to DB columns. DB likely has: resumo_promessa, categoria, origem, data_promessa, etc.
                # Adjust as per your DB schema. Assuming standard fields.
                
                p_data = {
                    "campaign_id": campaign_id,
                    "politico_id": politician_id,
                    "mandate_id": mandate_id,
                    "resumo_promessa": p.get("resumo_promessa", "")[:500],
                    "categoria": p.get("categoria", "Outro"),
                    "origem": "Plano de Governo",
                    "source_type": "PLANO_GOVERNO",
                    "data_promessa": datetime.now().date().isoformat(),
                    # Store extra metadata if needed, or mapped columns
                    "status": "pendente"
                }
                
                if p_data["resumo_promessa"]:
                    supabase.table("promises").insert(p_data).execute()
                    inserted_count += 1

            # 5. Success
            RadarService._complete_execution(supabase, exec_id, {
                "promises_count": inserted_count,
                "document": doc.get("filename"),
                "summary": extraction_result.get("document_summary", "")
            })

        except Exception as e:
            logger.error(f"❌ Phase 1 Error: {e}")
            RadarService._fail_execution(supabase, exec_id, str(e))

    @staticmethod
    def process_phase2_background(
        campaign_id: str,
        mandate_id: str,
        politician_id: str,
        municipio_slug: str,
        exec_id: str,
        target_year: int = None
    ):
        """Phase 2: Hybrid Data Matching (Heuristic + AI Analysis)"""
        logger.info(f"🏗️ [Service] Starting Phase 2 (Hybrid) for {municipio_slug}")
        supabase = get_supabase_client()
        
        try:
            # 1. Heuristic Matching (RadarMatcher)
            matcher = RadarMatcher()
            matcher_result = matcher.run_matching(
                politico_id=politician_id,
                municipio_slug=municipio_slug,
                campaign_id=str(campaign_id),
                target_year=target_year
            )
            
            # 2. AI Semantic Analysis (RadarCrew)
            logger.info(f"🧠 [Service] Starting AI Semantic Audit...")
            crew = RadarCrew(campaign_id=campaign_id, run_id=exec_id)
            
            # Prepare inputs from Matcher Result
            promises_summary = []
            if "data" in matcher_result and "categorias" in matcher_result["data"]:
                # Flatten the grouped data back to a list for the AI
                for cat in matcher_result["data"]["categorias"]:
                    for det in cat.get("detalhes", []):
                        promises_summary.append({
                            "promessa": det.get("promessa_relacionada"),
                            "valor_gasto": det.get("valor"),
                            "fornecedor": det.get("fornecedor"),
                            "data": det.get("data")
                        })
            
            # Run AI Analysis
            ai_analysis = {}
            if promises_summary:
                ai_analysis = crew.run_fiscal_analysis(
                    promises_summary=promises_summary[:20], # Limit context window
                    expenses_summary={"total_auditado": matcher_result.get("total_evidence_value")}
                )
            
            # 3. Merge Results
            final_result = {
                **matcher_result,
                "ai_analysis": ai_analysis
            }
            
            # Save Summary
            try:
                supabase.table("promise_budget_summaries").insert({
                    "campaign_id": campaign_id,
                    "mandate_id": mandate_id,
                    "payload_json": {"matching_result": final_result, "source": "radar_service_hybrid"}
                }).execute()
            except: pass

            RadarService._complete_execution(supabase, exec_id, final_result)

        except Exception as e:
            logger.error(f"❌ Phase 2 Error: {e}")
            RadarService._fail_execution(supabase, exec_id, str(e))

    @staticmethod
    def run_phase3_background(
        campaign_id: str,
        mandate_id: str,
        agent_slug: str,
        exec_id: str,
        search_params: dict
    ):
        """Phase 3: Web/Media Scan using RadarCrew"""
        logger.info(f"🕵️ [Service] Starting Phase 3 with {agent_slug}")
        supabase = get_supabase_client()
        
        try:
            # 1. Get Context (Politician Name, City)
            mandate = supabase.table("mandates").select("politicians(name), cities(name)").eq("id", mandate_id).single().execute()
            pol_name = mandate.data["politicians"]["name"]
            city_name = mandate.data["cities"]["name"]
            
            # 2. Execute Crew
            crew = RadarCrew(campaign_id=campaign_id, run_id=exec_id)
            
            result = crew.run_google_scan(
                politician_name=pol_name,
                city_name=city_name,
                agent_name=agent_slug,
                target_sites=search_params.get("target_sites", []),
                search_mode=search_params.get("search_mode", "hybrid"),
                max_results=search_params.get("max_results", 10)
            )
            
            if result.get("status") == "error":
                raise Exception(result.get("message"))
            
            RadarService._complete_execution(supabase, exec_id, result)
            
        except Exception as e:
            logger.error(f"❌ Phase 3 Error: {e}")
            RadarService._fail_execution(supabase, exec_id, str(e))

    # --- Helpers ---

    @staticmethod
    def _fail_execution(supabase, exec_id, error_msg):
        supabase.table("radar_executions").update({
            "status": "error",
            "finished_at": datetime.now().isoformat(),
            "error_message": error_msg
        }).eq("id", exec_id).execute()

    @staticmethod
    def _complete_execution(supabase, exec_id, summary):
        supabase.table("radar_executions").update({
            "status": "ok",
            "finished_at": datetime.now().isoformat(),
            "summary": summary
        }).eq("id", exec_id).execute()
