import os
import asyncio
from dotenv import load_dotenv
from src.services.radar_matcher import RadarMatcher

load_dotenv()

# Configuration for Weber Manga (Votorantim)
POLITICO_ID = "f079648a-a722-4f35-aa37-1b466005d5d1"
MUNICIPIO_SLUG = "votorantim-sp"
CAMPAIGN_ID = "045a77c6-38b2-4641-a963-7896c9f2179b"

async def run_manual_match():
    print(f"🚀 Iniciando RadarMatcher Manual para {MUNICIPIO_SLUG}...")
    
    matcher = RadarMatcher()
    
    # We can run this synchronously as the method itself is synchronous (or wraps sync logic)
    # The run_matching method prints progress to stdout
    result = matcher.run_matching(
        politico_id=POLITICO_ID,
        municipio_slug=MUNICIPIO_SLUG,
        campaign_id=CAMPAIGN_ID
    )
    
    print("\n✅ Resultado Final:")
    print(f"Total Promessas: {result.get('total_promises')}")
    print(f"Matches Encontrados: {result.get('matches_found')}")
    print(f"Valor Total Auditado: R$ {result.get('total_evidence_value', 0):,.2f}")

if __name__ == "__main__":
    # Since run_matching is synchronous in the class definition you showed earlier
    # (it does not use async/await), we can call it directly.
    # If it was async, we would use asyncio.run(run_manual_match())
    
    # Double check: run_matching signature in file view: def run_matching(self, ...): -> Sync
    
    matcher = RadarMatcher()
    result = matcher.run_matching(
        politico_id=POLITICO_ID,
        municipio_slug=MUNICIPIO_SLUG,
        campaign_id=CAMPAIGN_ID
    )
    
    print("\n✅ CONFIGURAÇÃO APLICADA COM SUCESSO:")
    print(f"- {result.get('matches_found')} promessas cruzadas com despesas de Votorantim.")
    print(f"- R$ {result.get('total_evidence_value', 0):,.2f} em empenhos vinculados.")
