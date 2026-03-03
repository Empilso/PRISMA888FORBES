import os
import sys
from dotenv import load_dotenv

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

from src.services.radar_matcher import RadarMatcher

def test_radar_2025():
    matcher = RadarMatcher()
    
    # IDs from previous context (Weber Manga)
    politician_id = "f079648a-a722-4f35-aa37-1b466005d5d1"
    municipio_slug = "votorantim"
    target_year = 2025
    
    print(f"Running Matcher for {municipio_slug} - Year {target_year}...")
    
    try:
        result = matcher.run_matching(
            politico_id=politician_id,
            municipio_slug=municipio_slug,
            target_year=target_year
        )
        
        print("\n--- RESULT ---")
        print(f"Status: {result.get('status')}")
        print(f"Matches Found: {result.get('matches_found')}")
        print(f"Total Value: {result.get('total_evidence_value')}")
        
        if result.get("matches_found") == 0:
            print("\n⚠️  No matches found! Checking expenses table directly...")
            # Direct query check
            supabase = matcher.supabase
            expenses = supabase.table("municipal_expenses") \
                .select("count", count="exact") \
                .eq("municipio_slug", municipio_slug) \
                .eq("ano", target_year) \
                .execute()
            print(f"Direct Count in 'municipal_expenses' for {target_year}: {expenses.count}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_radar_2025()
