
import asyncio
import logging
from src.workers.tcesp_worker import (
    fetch_and_store_municipal_expenses,
    normalize_municipal_expenses,
    extract_and_link_suppliers
)
from dotenv import load_dotenv

# Setup
load_dotenv("backend/.env")
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ingest_2025")

MUNICIPIO = "votorantim"
YEAR = 2025
MONTHS = [1, 2, 3] # Jan, Feb, Mar

def run_ingestion():
    print(f"🚀 Starting Ingestion for {MUNICIPIO} - {YEAR}")
    
    total_records = 0
    
    for month in MONTHS:
        print(f"\n📅 Processing Month {month}/{YEAR}...")
        
        # 1. Fetch Raw
        try:
            count = fetch_and_store_municipal_expenses(MUNICIPIO, YEAR, month)
            print(f"   ✅ Fetched {count} raw records.")
            
            if count > 0:
                # 2. Normalize
                norm_count = normalize_municipal_expenses(MUNICIPIO, YEAR, month)
                print(f"   ✅ Normalized {norm_count} records.")
                
                # 3. Suppliers
                supp_count = extract_and_link_suppliers(MUNICIPIO, YEAR, month)
                print(f"   ✅ Processed {supp_count} suppliers.")
                
                total_records += norm_count
            else:
                print("   ⚠️ No data available for this month.")
                
        except Exception as e:
            print(f"   ❌ Error processing month {month}: {e}")

    print(f"\n✨ Ingestion Complete! Total Normalized Records: {total_records}")

if __name__ == "__main__":
    run_ingestion()
