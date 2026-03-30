# ARQUIVO LEGADO - movido da raiz em 2026-03-30
# Vinculação de pagamentos + total_entidades
import os
import json
from dotenv import load_dotenv
from supabase import create_client

load_dotenv("../backend/.env")

def get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, key)

if __name__ == "__main__":
    print("Script legado. Ver legacy_archive/README.md")
