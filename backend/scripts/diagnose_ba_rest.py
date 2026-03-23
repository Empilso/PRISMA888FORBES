import urllib.request
import json

URL = "https://gsmmanjpsdbfwmnmtgpg.supabase.co/rest/v1/politicians?select=name,tipo,cities!inner(name,state)&cities.state=eq.BA"
HEADERS = {
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzbW1hbmpwc2RiZndtbm10Z3BnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI5NzI1MywiZXhwIjoyMDc4ODczMjUzfQ.kmXCryVGBRJ4FctN2tb0zJsTNFfI69D9uWCcndv-nDE",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzbW1hbmpwc2RiZndtbm10Z3BnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzI5NzI1MywiZXhwIjoyMDc4ODczMjUzfQ.kmXCryVGBRJ4FctN2tb0zJsTNFfI69D9uWCcndv-nDE"
}

print("=== CANDIDATOS ATRELADOS À BAHIA ===")
req = urllib.request.Request(URL, headers=HEADERS)
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        for p in data:
            city_name = p.get('cities', {}).get('name', 'N/A')
            print(f"- {p['name']} | Tipo: {p['tipo']} | Ref. Cidade: {city_name}")
except Exception as e:
    print("ERRO:", e)

print("\n=== TODOS OS DEPUTADOS ===")
URL_DEP = "https://gsmmanjpsdbfwmnmtgpg.supabase.co/rest/v1/politicians?select=name,tipo&tipo=ilike.*Deputado*"
req_dep = urllib.request.Request(URL_DEP, headers=HEADERS)
try:
    with urllib.request.urlopen(req_dep) as response:
        data = json.loads(response.read().decode())
        tipos = set()
        for p in data:
            print(f"- {p['name']} | Tipo Exato: {p['tipo']}")
            tipos.add(p['tipo'])
        print("\\n=> Tipos detalhados encontrados para Deputados:", list(tipos))
except Exception as e:
    print("ERRO:", e)
