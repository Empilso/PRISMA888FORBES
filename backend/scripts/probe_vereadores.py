import sys
import os

# Add parent dir to path to import src
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.services.tse_service import TSEService

def probe_vereadores():
    service = TSEService()
    
    # city_name = "Votorantim"
    # uf = "SP"
    # Manual TSE code for Votorantim if known or fetch it.
    # From previous context, Votorantim TSE code is likely 72450 but let's fetch it to be sure.
    
    city_code = service.get_city_code("SP", "Votorantim", year="2024")
    print(f"City Code for Votorantim: {city_code}")
    
    if not city_code:
        print("Could not find city code.")
        return

    # Cargo 13 = Vereador
    print("Fetching candidates for Vereador (13)...")
    candidates = service.get_candidates(city_code, cargo_code="13", year="2024")
    
    print(f"Total candidates found: {len(candidates)}")
    
    # Check status values
    statuses = {}
    results = {}
    
    for c in candidates:
        s = c.get("status")
        r = c.get("resultado")
        
        statuses[s] = statuses.get(s, 0) + 1
        results[r] = results.get(r, 0) + 1
        
        if r in ["Eleito", "Eleito por QP", "Eleito por média"]:
            print(f"ELECTED: {c['nome_urna']} ({c['partido']}) - {r}")

    print("\n--- Summary ---")
    print("Statuses:", statuses)
    print("Results:", results)

if __name__ == "__main__":
    probe_vereadores()
