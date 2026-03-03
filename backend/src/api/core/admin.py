from fastapi import APIRouter, HTTPException, Depends
from supabase import create_client, Client
import os
from typing import Dict

router = APIRouter(prefix="/api/admin", tags=["admin"])

def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("Supabase credentials not found")
    return create_client(url, key)

@router.post("/reset-city/{city_slug}")
async def reset_city_data(city_slug: str):
    """
    Hard Reset: Deletes all expenses, revenues, promises, politicians, mandates, and the city itself.
    Ensures complete removal of any data associated with a city from the Radar system.
    """
    supabase = get_supabase_client()
    
    # 1. Verify City Exists
    city_res = supabase.table("cities").select("id, name").eq("slug", city_slug).single().execute()
    if not city_res.data:
        raise HTTPException(status_code=404, detail="City not found")
        
    city_id = city_res.data["id"]
    print(f"🧹 Cleaning up data for city: {city_slug} ({city_id})...")
    
    counts = {"expenses": 0, "revenues": 0, "promises": 0, "politicians": 0, "mandates": 0, "documents": 0, "executions": 0}
    
    try:
        # 2. Delete Expenses & Revenues (using slug)
        exp_res = supabase.table("municipal_expenses").delete().eq("municipio_slug", city_slug).execute()
        counts["expenses"] = len(exp_res.data) if hasattr(exp_res, "data") and exp_res.data else 0
        
        try:
            rev_res = supabase.table("municipal_revenues").delete().eq("municipio_slug", city_slug).execute()
            counts["revenues"] = len(rev_res.data) if hasattr(rev_res, "data") and rev_res.data else 0
        except:
            pass # Table might not exist yet
            
        # 3. Find Politicians in City
        pols_res = supabase.table("politicians").select("id").eq("city_id", city_id).execute()
        
        if pols_res.data:
            pol_ids = [p["id"] for p in pols_res.data]
            
            # --- Delete Promises & Verifications ---
            # By politician
            prom_res = supabase.table("promises").select("id").in_("politico_id", pol_ids).execute()
            if prom_res.data:
                prom_ids = [p["id"] for p in prom_res.data]
                supabase.table("promise_verifications").delete().in_("promise_id", prom_ids).execute()
                del_prom = supabase.table("promises").delete().in_("id", prom_ids).execute()
                counts["promises"] += len(del_prom.data) if hasattr(del_prom, "data") and del_prom.data else 0

            # --- Delete Documents ---
            doc_res = supabase.table("documents").delete().in_("person_id", pol_ids).execute()
            counts["documents"] += len(doc_res.data) if hasattr(doc_res, "data") and doc_res.data else 0
                
            # --- Delete Mandates ---
            mandates_res = supabase.table("mandates").select("id").in_("politician_id", pol_ids).execute()
            if mandates_res.data:
                mandate_ids = [m["id"] for m in mandates_res.data]
                
                # Delete Radar Executions linked to mandates
                execs = supabase.table("radar_executions").select("id").in_("mandate_id", mandate_ids).execute()
                if execs.data:
                    exec_ids = [e["id"] for e in execs.data]
                    # Logs are cascade or we can delete manually
                    supabase.table("agent_logs").delete().in_("run_id", exec_ids).execute()
                    del_exec = supabase.table("radar_executions").delete().in_("id", exec_ids).execute()
                    counts["executions"] += len(del_exec.data) if hasattr(del_exec, "data") and del_exec.data else 0
                    
                # Delete remaining promises by mandate
                prom_m_res = supabase.table("promises").select("id").in_("mandate_id", mandate_ids).execute()
                if prom_m_res.data:
                    prom_m_ids = [p["id"] for p in prom_m_res.data]
                    supabase.table("promise_verifications").delete().in_("promise_id", prom_m_ids).execute()
                    del_m_prom = supabase.table("promises").delete().in_("id", prom_m_ids).execute()
                    counts["promises"] += len(del_m_prom.data) if hasattr(del_m_prom, "data") and del_m_prom.data else 0
                    
                del_mandate = supabase.table("mandates").delete().in_("id", mandate_ids).execute()
                counts["mandates"] += len(del_mandate.data) if hasattr(del_mandate, "data") and del_mandate.data else 0

            # Delete the Politicians finally
            del_pol = supabase.table("politicians").delete().in_("id", pol_ids).execute()
            counts["politicians"] += len(del_pol.data) if hasattr(del_pol, "data") and del_pol.data else 0

        # We also attempt to delete any direct Mandates linked to city fallback
        try:
            mandates_fallback = supabase.table("mandates").delete().eq("city_id", city_id).execute()
            counts["mandates"] += len(mandates_fallback.data) if hasattr(mandates_fallback, "data") and mandates_fallback.data else 0
        except Exception:
            pass

        # Finally: Delete the City
        del_city = supabase.table("cities").delete().eq("id", city_id).execute()
        
        print(f"✅ Cleanup complete: {counts}")
        return {"status": "ok", "deleted_counts": counts, "message": f"Dados de {city_slug} removidos com sucesso e cidade apagada."}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error resetting city: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao limpar dados da cidade: {str(e)}")
