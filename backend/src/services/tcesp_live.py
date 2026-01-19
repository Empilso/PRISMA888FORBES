import requests
import pandas as pd
from typing import Dict, List, Optional

def fetch_live_totals(year: int, municipio_id: str = "votorantim-2025") -> Dict:
    """
    Fetches live totals from TCESP API for all months available in the given year.
    Returns aggregated data by Event and Top Suppliers.
    Does NOT save to database.
    """
    # Note: TCESP API requires fetching month by month
    
    total_empenhado = 0.0
    total_liquidado = 0.0
    total_pago = 0.0
    
    # We will aggregate top organizations/suppliers
    all_expenses = []
    
    # Try fetching all 12 months (or until current month)
    # Optimistically fetch 1-12. If empty, ignore.
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    print(f"📡 Fetching LIVE TCESP Data for {year}...")
    
    months_found = 0
    
    for month in range(1, 13):
        # We need the numeric code for municipality? The client usually handles this.
        # Let's assume standardized endpoints as per verify_tcesp_live.py logic
        # https://transparencia.tce.sp.gov.br/api/json/despesas/{municipio}/{ano}/{mes}
        
        url = f"https://transparencia.tce.sp.gov.br/api/json/despesas/votorantim/{year}/{month}"
        
        try:
            resp = requests.get(url, headers=headers, timeout=5)
            if resp.status_code != 200:
                continue
                
            data = resp.json()
            if not data:
                continue
                
            months_found += 1
            
            for item in data:
                # Convert values
                try:
                    val = item.get("valor", "0").replace(".", "").replace(",", ".")
                    val_float = float(val)
                except:
                    val_float = 0.0
                
                evt = item.get("evento", "")
                
                if evt == "Empenhado":
                    total_empenhado += val_float
                elif evt == "Liquidado" or evt == "Valor Liquidado":
                    total_liquidado += val_float
                elif evt == "Pago" or evt == "Valor Pago":
                    total_pago += val_float
                    
                # Collect sample for simple top list (only Empenhado)
                if evt == "Empenhado":
                    all_expenses.append({
                        "fornecedor": item.get("fornecedor", "N/A"),
                        "valor": val_float,
                        "data": item.get("data", "")
                    })
                    
        except Exception as e:
            print(f"⚠️ Error fetching month {month}: {e}")
            
    # Sort top 5 expenses
    all_expenses.sort(key=lambda x: x["valor"], reverse=True)
    top_5 = all_expenses[:5]
    
    return {
        "year": year,
        "months_analyzed": months_found,
        "total_empenhado": total_empenhado,
        "total_liquidado": total_liquidado,
        "total_pago": total_pago,
        "top_expenses": top_5,
        "status": "success" if months_found > 0 else "no_data"
    }
