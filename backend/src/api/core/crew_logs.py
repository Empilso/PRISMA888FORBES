import os
from fastapi import APIRouter, Query, HTTPException
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api/crew", tags=["crew"])

def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("Supabase credentials not found")
    return create_client(url, key)

@router.get("/runs/{run_id}/logs")
async def get_run_logs(run_id: str, after: str = None):
    """
    Retorna logs de execução estruturados para o Console Master.
    """
    try:
        supabase = get_supabase_client()
        
        query = supabase.table("crew_run_logs")\
            .select("*")\
            .eq("run_id", run_id)\
            .order("created_at", desc=False)
        
        if after:
            query = query.gt("created_at", after)
        
        result = query.execute()
        
        # Also fetching legacy logs for compatibility/debugging if needed, but for now just returning structured logs
        
        return {"logs": result.data, "run_id": run_id}
    except Exception as e:
        # Fallback empty list if table doesn't exist yet or query fails
        print(f"Error fetching logs: {e}")
        return {"logs": [], "run_id": run_id, "error": str(e)}
