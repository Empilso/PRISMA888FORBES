import requests

def probe_2020():
    # Try to find election ID for 2020
    # Usually we can look at some common endpoint
    base_url = "https://divulgacandcontas.tse.jus.br/divulga/rest/v1"
    
    # Try fetching elections for 2020
    # or just try a likely ID for Votorantim (SP)
    
    # Let's try to list states/elections
    print("Fetching elections list...")
    # This endpoint is speculative, let's try to fetch for a known city
    
    # 2020 ID is often 2030402020 for 1st round
    candidate_id_try = "2030402020"
    
    try:
        url = f"{base_url}/eleicao/buscar/SP/{candidate_id_try}/municipios"
        print(f"Trying {url}")
        resp = requests.get(url)
        if resp.status_code == 200:
            print(f"Success! {candidate_id_try} seems valid for SP")
        else:
            print(f"Failed {candidate_id_try}: {resp.status_code}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    probe_2020()
