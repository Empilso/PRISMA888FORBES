import logging
import os
import json
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
            # 0. Get City Context
            mandate = supabase.table("mandates").select("city_id").eq("id", mandate_id).single().execute()
            if not mandate.data:
                RadarService._fail_execution(supabase, exec_id, "Mandato não encontrado")
                return
            city_id = mandate.data["city_id"]

            # 1. Find Document in KNOWLEDGE_FILES (Central Knowledge Base)
            # Prioritize 'plano_governo' category linked to the city
            docs_query = supabase.table("knowledge_files") \
                .select("id, filename, file_path, category") \
                .eq("city_id", city_id) \
                .eq("category", "plano_governo") \
                .order("created_at", desc=True) \
                .limit(1) \
                .execute()
            
            doc_data = None
            if docs_query.data:
                doc_data = docs_query.data[0]
            else:
                 # Fallback: Try legacy documents table just in case
                 pass

            if not doc_data:
                RadarService._fail_execution(supabase, exec_id, "Plano de Governo não encontrado em 'Conhecimento' (Categoria: Plano de Governo).")
                return

            file_url_or_path = doc_data.get("file_path")
            
            # Construct URL if it's a relative path in storage
            # Assuming 'knowledge' bucket or similar. 
            # If knowledge_files stores full URL, great. If path, we need public URL.
            # We'll try to guess or use as is if http.
            if not file_url_or_path.startswith("http"):
                 # Retrieve public URL from storage. We don't know the bucket easily from here without mapping
                 # But usually it's in a standard bucket. Let's assume 'knowledge' or 'government-plans'
                 # If we can't find it, we might fail.
                 # Let's try to get a signed URL or Public URL if bucket is known.
                 # HACK: For now, if it fails, the PDF Service handles local paths or URL.
                 # We will assume it's a resolvable path/url.
                 # Ideally, knowledge_files should allow us to resolve it.
                 # Let's try to get public url from 'knowledge' bucket.
                 try:
                     file_url_or_path = supabase.storage.from_("knowledge").get_public_url(file_url_or_path)
                 except: pass

            # 2. Extract Text
            # We don't store full text in knowledge_files (it's in vector store).
            # So we re-extract to pass FULL TEXT to the Agent (better for 'mining').
            extraction = PDFExtractionService().extract_text(file_url_or_path)
            if extraction.success:
                full_text = extraction.text
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
            # 1. Execute Radar 2.0 Matching (Includes 3D AI Judge Audit)
            matcher = RadarMatcher()
            final_result = matcher.run_matching(
                politico_id=politician_id,
                municipio_slug=municipio_slug,
                campaign_id=str(campaign_id),
                target_year=target_year
            )
            
            # 2. Save Summary for Dashboard
            try:
                supabase.table("promise_budget_summaries").upsert({
                    "campaign_id": campaign_id,
                    "mandate_id": mandate_id,
                    "payload_json": {"matching_result": final_result, "source": "radar_2.0_ai_judge"}
                }, on_conflict="campaign_id, mandate_id").execute()
            except Exception as e:
                logger.warning(f"Failed to save budget summary: {e}")

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

    @staticmethod
    def run_phase4_background(
        campaign_id: str,
        mandate_id: str,
        exec_id: str
    ):
        """Phase 4: Final Verdict (Triangulation)"""
        logger.info(f"⚖️ [Service] Starting Phase 4 (Judgment Day)")
        supabase = get_supabase_client()
        
        try:
            # 0. Fetch Context Info (Role)
            mandate_info = supabase.table("mandates") \
                .select("offices(slug)") \
                .eq("id", mandate_id) \
                .single().execute()
            
            pol_role = "prefeito"
            if mandate_info.data and "offices" in mandate_info.data:
                pol_role = mandate_info.data["offices"].get("slug", "prefeito")

            # 1. Fetch Context Data
            # A. Promises
            promises = supabase.table("promises").select("*").eq("mandate_id", mandate_id).execute().data
            if not promises:
                raise Exception("Nenhuma promessa encontrada. Execute Phase 1.")
            
            # B. Fiscal Evidence (Verifications)
            verifications = supabase.table("promise_verifications").select("*").in_("promise_id", [p["id"] for p in promises]).execute().data
            ver_map = {v["promise_id"]: v for v in verifications}
            
            # C. Media Evidence (Phase 3 Result)
            media_exec = supabase.table("radar_executions").select("summary").eq("mandate_id", mandate_id).eq("phase", "phase3").eq("status", "ok").order("finished_at", desc=True).limit(1).execute()
            media_items = []
            if media_exec.data:
                summary = media_exec.data[0].get("summary", {})
                media_items = summary.get("details", [])
                
            # 2. Iterate Promises and Judge
            crew = RadarCrew(campaign_id=campaign_id, run_id=exec_id)
            updates = []
            
            for promise in promises:
                p_id = promise["id"]
                p_text = promise.get("resumo_promessa", "")
                
                # Get specific evidence
                fiscal_data = ver_map.get(p_id, {})
                fiscal_evidence = fiscal_data.get("fontes", [])
                fiscal_val = fiscal_data.get("score_similaridade", 0)
                
                # Filter media context (Basic Keyword Match)
                # In a real scenario, we would use vector search again, but for now we pass relevant items
                relevant_media = [
                    m for m in media_items 
                    if any(w in m.get("title", "").lower() for w in p_text.lower().split() if len(w) > 5)
                ]
                
                # RUN JUDGE AGENT
                verdict = crew.run_verdict(
                    promise_text=p_text,
                    fiscal_evidence=fiscal_evidence,
                    media_evidence=relevant_media[:3], # Limit context
                    politician_role=pol_role
                )
                
                # Prepare Update
                status = verdict.get("status", "NAO_INICIADA")
                justification = verdict.get("justification_ptbr", "Sem justificativa.")
                confidence = verdict.get("confidence_score", 0.0)
                
                updates.append({
                    "id": fiscal_data.get("id"), # Update existing verification row if exists
                    "promise_id": p_id,
                    "status": status, # OVERWRITE heuristic status
                    "justificativa_ia": justification,
                    "confidence_score": confidence,
                    "last_updated_at": datetime.now().isoformat()
                })
                
                # Also update the promise row itself for easy access?
                # Maybe just the verification table is enough.
            
            # 3. Batch Update Database
            for up in updates:
                # If ID exists, update. If not, insert (Upsert)
                # We need to remove 'id' if it is None
                if not up.get("id"):
                    del up["id"]
                    supabase.table("promise_verifications").insert(up).execute()
                else:
                    supabase.table("promise_verifications").update(up).eq("id", up["id"]).execute()
            
            # 4. Finish
            summary = {
                "verdicts_issued": len(updates),
                "breakdown": {
                    "CUMPRIDA": len([u for u in updates if u["status"] == "CUMPRIDA"]),
                    "QUEBRADA": len([u for u in updates if u["status"] == "QUEBRADA"]),
                    "EM_ANDAMENTO": len([u for u in updates if u["status"] == "EM_ANDAMENTO"])
                }
            }
            RadarService._complete_execution(supabase, exec_id, summary)

        except Exception as e:
            logger.error(f"❌ Phase 4 Error: {e}")
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
