import os
import asyncio
from src.services.ingestion import process_electoral_csv
from dotenv import load_dotenv

load_dotenv()

file_url = "https://gsmmanjpsdbfwmnmtgpg.supabase.co/storage/v1/object/public/campaign-files/campaigns/1772891757665_-FUNCIONA-VOTORANTIM-PREFEITOS-COM-COORDENADAS-FINAL-MODELO%20QUE%20FUNCIONA.csv"
campaign_id = "8f01a03d-cbee-4395-8245-9353dc8c62cb"

async def test():
    print(f"--- TESTANDO PROCESSAMENTO DE CSV ---")
    print(f"URL: {file_url}")
    print(f"Campanha: {campaign_id}")
    
    result = await process_electoral_csv(file_url, campaign_id)
    print("\nRESULTADO:")
    print(result)

if __name__ == "__main__":
    asyncio.run(test())
