import os
import csv
import io
import pandas as pd
from typing import List, Dict, Optional, BinaryIO
from datetime import datetime
from uuid import uuid4
import hashlib
from fastapi import UploadFile, HTTPException

from supabase import create_client, Client

class DataIngestionService:
    def __init__(self):
        self.supabase = self._get_client()

    def _get_client(self) -> Client:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise ValueError("Supabase credentials not found")
        return create_client(url, key)

    async def ingest_expenses(self, city_slug: str, file_content: bytes):
        """
        Ingest municipal expenses from CSV with robust handling.
        """
        try:
            # 1. Robust CSV Loading
            encodings = ['utf-8', 'latin-1', 'cp1252']
            delimiters = [';', ',', '\t']
            
            df = None
            used_encoding = None
            used_sep = None
            
            for encoding in encodings:
                for sep in delimiters:
                    try:
                        # Determine if this combination works
                        temp_df = pd.read_csv(io.BytesIO(file_content), encoding=encoding, sep=sep, nrows=5)
                        if len(temp_df.columns) > 1:
                            # It worked and parsed columns
                            df = pd.read_csv(io.BytesIO(file_content), encoding=encoding, sep=sep)
                            used_encoding = encoding
                            used_sep = sep
                            break
                    except:
                        continue
                if df is not None:
                    break
            
            if df is None:
                raise ValueError("Could not decode CSV with common encodings/delimiters.")

            print(f"✅ CSV loaded with encoding={used_encoding}, sep='{used_sep}'")

            # 2. Sanitize Headers
            df.columns = [c.strip().lower() for c in df.columns]
            
            # 3. Column Mapping
            column_map = {
                "fornecedor": "nm_fornecedor",
                "nm_fornecedor": "nm_fornecedor",
                "razao_social": "nm_fornecedor",
                "credor": "nm_fornecedor",
                "valor": "vl_despesa",
                "vl_despesa": "vl_despesa",
                "vl_pago": "vl_despesa",
                "data": "dt_emissao_despesa",
                "dt_emissao_despesa": "dt_emissao_despesa",
                "data_emissao": "dt_emissao_despesa",
                "dt_emissao": "dt_emissao_despesa",
                "empenho": "nr_empenho",
                "nr_empenho": "nr_empenho",
                "historico": "historico",
                "historico_despesa": "historico",
                "orgao": "orgao",
                "funcao": "funcao",
                "subfuncao": "subfuncao",
                "evento": "evento",
                "tp_evento": "evento",
                "cpf_cnpj": "cpf_cnpj",
                "nr_documento": "cpf_cnpj",
                "documento": "cpf_cnpj",
                "nr_cpf_cnpj": "cpf_cnpj",
                "elemento": "elemento_despesa",
                "ds_elemento": "elemento_despesa",
                "elemento_despesa": "elemento_despesa"
            }
            
            # Apply map only if column exists
            df = df.rename(columns=lambda x: column_map.get(x, x))
            
            # 4. Process Rows
            data_to_insert = []
            
            for _, row in df.iterrows():
                # Value Cleaning
                raw_val = str(row.get("vl_despesa", "0"))
                try:
                    val = float(raw_val.replace("R$", "").replace(".", "").replace(",", "."))
                except:
                    val = 0.0
                
                # Date & Month
                raw_date = row.get("dt_emissao_despesa", datetime.now())
                try:
                    date_obj = pd.to_datetime(raw_date, dayfirst=True) # Assume BR format often
                except:
                    date_obj = datetime.now()
                
                # Defaults
                historico = str(row.get("historico", ""))[:2000]
                nm_fornecedor = str(row.get("nm_fornecedor", "DESCONHECIDO"))[:255]
                nr_empenho = str(row.get("nr_empenho", ""))[:50]
                orgao = str(row.get("orgao", "PREFEITURA"))[:100]
                evento = str(row.get("evento", "Despesa Ordinária"))[:100]
                if not evento or evento == "nan": evento = "Despesa Ordinária"
                
                # Forensic Fields
                cpf_cnpj = str(row.get("cpf_cnpj", "")).strip()[:20]
                if not cpf_cnpj or cpf_cnpj == "nan": cpf_cnpj = None
                
                elemento_despesa = str(row.get("elemento_despesa", "")).strip()[:50]
                if not elemento_despesa or elemento_despesa == "nan": elemento_despesa = None
                
                # Raw Hash for Idempotency
                raw_data_str = f"{city_slug}{nr_empenho}{val}{date_obj.isoformat()}{nm_fornecedor}"
                raw_hash = hashlib.md5(raw_data_str.encode()).hexdigest()

                expense = {
                    "municipio_slug": city_slug,
                    "nm_fornecedor": nm_fornecedor,
                    "vl_despesa": val,
                    "dt_emissao_despesa": date_obj.strftime("%Y-%m-%d"),
                    "nr_empenho": nr_empenho,
                    "historico": historico,
                    "orgao": orgao,
                    "evento": evento,
                    "funcao": str(row.get("funcao", ""))[:100],
                    "subfuncao": str(row.get("subfuncao", ""))[:100],
                    "cpf_cnpj": cpf_cnpj,
                    "elemento_despesa": elemento_despesa,
                    "ano": date_obj.year,
                    "mes": date_obj.month,
                    "raw_hash": raw_hash,
                    "created_at": datetime.now().isoformat()
                }
                data_to_insert.append(expense)
            
            # 5. Transactional Strategy: Delete-Insert by Year (Safra)
            # Identify years in the dataset
            years = df['dt_emissao_despesa'].apply(lambda x: pd.to_datetime(x, dayfirst=True, errors='coerce').year).dropna().unique()
            years = [int(y) for y in years if y > 1900] # Basic validation
            
            print(f"🔄 Transactional Update: Cleaning safras {years} for city {city_slug}...")
            
            # Delete existing data for these years (Clean Slate)
            if len(years) > 0:
                self.supabase.table("municipal_expenses").delete().eq("municipio_slug", city_slug).in_("ano", years).execute()
            
            # Insert in chunks
            chunk_size = 1000
            inserted_count = 0
            for i in range(0, len(data_to_insert), chunk_size):
                chunk = data_to_insert[i:i + chunk_size]
                self.supabase.table("municipal_expenses").insert(chunk).execute()
                inserted_count += len(chunk)
                
            return {"status": "ok", "inserted": inserted_count, "strategy": "delete-insert-by-year", "years_affected": years}

        except Exception as e:
            print(f"Error ingesting expenses: {e}")
            raise HTTPException(status_code=400, detail=f"Erro ao processar CSV de despesas: {str(e)}")

    async def ingest_revenues(self, city_slug: str, file_content: bytes):
        """
        Ingest municipal revenues from CSV with robust handling.
        """
        try:
            # 1. Robust CSV Loading
            encodings = ['utf-8', 'latin-1', 'cp1252']
            delimiters = [';', ',', '\t']
            
            df = None
            used_encoding = None
            used_sep = None
            
            for encoding in encodings:
                for sep in delimiters:
                    try:
                        temp_df = pd.read_csv(io.BytesIO(file_content), encoding=encoding, sep=sep, nrows=5)
                        if len(temp_df.columns) > 1:
                            df = pd.read_csv(io.BytesIO(file_content), encoding=encoding, sep=sep)
                            used_encoding = encoding
                            used_sep = sep
                            break
                    except:
                        continue
                if df is not None:
                    break
            
            if df is None:
                raise ValueError("Could not decode CSV with common encodings/delimiters.")

            print(f"✅ Revenue CSV loaded with encoding={used_encoding}, sep='{used_sep}'")

            # 2. Sanitize Headers
            df.columns = [c.strip().lower() for c in df.columns]
            
            # 3. Column Mapping for Revenues
            column_map = {
                "ds_categoria": "ds_categoria",
                "categoria": "ds_categoria",
                "ds_subcategoria": "ds_subcategoria",
                "subcategoria": "ds_subcategoria",
                "ds_fonte_recurso": "ds_fonte_recurso",
                "fonte_recurso": "ds_fonte_recurso",
                "fonte": "ds_fonte_recurso",
                "ds_cd_aplicacao_fixo": "ds_cd_aplicacao_fixo",
                "ds_alinea": "ds_alinea",
                "ds_subalinea": "ds_subalinea",
                "vl_arrecadacao": "vl_receita",
                "valor": "vl_receita",
                "vl_receita": "vl_receita",
                "data": "dt_arrecadacao",
                "dt_arrecadacao": "dt_arrecadacao",
                "data_arrecadacao": "dt_arrecadacao"
            }
            
            df = df.rename(columns=lambda x: column_map.get(x, x))
            
            # 4. Process Rows
            data_to_insert = []
            
            for _, row in df.iterrows():
                # Value Cleaning
                raw_val = str(row.get("vl_receita", "0"))
                try:
                    val = float(raw_val.replace("R$", "").replace(".", "").replace(",", "."))
                except:
                    val = 0.0
                
                # Date & Month
                raw_date = row.get("dt_arrecadacao", datetime.now())
                try:
                    date_obj = pd.to_datetime(raw_date, dayfirst=True)
                except:
                    date_obj = datetime.now()
                
                # Defaults & Strings
                ds_categoria = str(row.get("ds_categoria", "Outras Receitas"))[:255]
                ds_subcategoria = str(row.get("ds_subcategoria", ""))[:255]
                ds_fonte_recurso = str(row.get("ds_fonte_recurso", "Tesouro"))[:255]
                ds_cd_aplicacao_fixo = str(row.get("ds_cd_aplicacao_fixo", ""))[:255]
                ds_alinea = str(row.get("ds_alinea", ""))[:255]
                ds_subalinea = str(row.get("ds_subalinea", ""))[:255]
                
                # Raw Hash for Idempotency
                raw_data_str = f"{city_slug}{ds_categoria}{ds_subcategoria}{val}{date_obj.isoformat()}{ds_alinea}"
                raw_hash = hashlib.md5(raw_data_str.encode()).hexdigest()

                revenue = {
                    "municipio_slug": city_slug,
                    "ds_categoria": ds_categoria,
                    "ds_subcategoria": ds_subcategoria,
                    "ds_fonte_recurso": ds_fonte_recurso,
                    "ds_cd_aplicacao_fixo": ds_cd_aplicacao_fixo,
                    "ds_alinea": ds_alinea,
                    "ds_subalinea": ds_subalinea,
                    "vl_receita": val,
                    "dt_receita": date_obj.strftime("%Y-%m-%d"),
                    "ano": date_obj.year,
                    "mes": date_obj.month,
                    "raw_hash": raw_hash,
                    "created_at": datetime.now().isoformat()
                }
                data_to_insert.append(revenue)
            
            # 5. Transactional Strategy
            years = [int(y) for y in df['dt_arrecadacao'].apply(lambda x: pd.to_datetime(x, dayfirst=True, errors='coerce').year).dropna().unique() if y > 1900]
            
            print(f"🔄 Cleaning revenue safras {years} for city {city_slug}...")
            
            if len(years) > 0:
                self.supabase.table("municipal_revenues").delete().eq("municipio_slug", city_slug).in_("ano", years).execute()
            
            # Insert in chunks
            chunk_size = 1000
            inserted_count = 0
            for i in range(0, len(data_to_insert), chunk_size):
                chunk = data_to_insert[i:i + chunk_size]
                self.supabase.table("municipal_revenues").insert(chunk).execute()
                inserted_count += len(chunk)
                
            return {"status": "ok", "inserted": inserted_count, "strategy": "delete-insert-by-year", "years_affected": years}

        except Exception as e:
            print(f"Error ingesting revenues: {e}")
            raise HTTPException(status_code=400, detail=f"Erro ao processar CSV de receitas: {str(e)}")

    async def upload_government_plan(self, city_slug: str, file: UploadFile):
        """
        Upload Government Plan PDF to Supabase Storage and register in 'documents' table.
        Ensures 'city-documents' bucket exists.
        """
        try:
            content = await file.read()
            filename = f"{city_slug}/{uuid4()}_{file.filename}"
            bucket = "city-documents" 
            
            # 1. Ensure Bucket Exists (Robustness)
            try:
                buckets = self.supabase.storage.list_buckets()
                bucket_names = [b.name for b in buckets]
                
                if bucket not in bucket_names:
                    print(f"🪣 Bucket '{bucket}' not found. Creating...")
                    self.supabase.storage.create_bucket(bucket, options={"public": True})
            except Exception as b_err:
                print(f"⚠️ Warning checking/creating bucket: {b_err}")
                # We continue, maybe it exists but we lack permissions to list, but can upload.
            
            # 2. Upload to Storage
            # Path: city-documents/{city_slug}/filename.pdf
            self.supabase.storage.from_(bucket).upload(filename, content)
            
            # Get Public URL
            public_url = self.supabase.storage.from_(bucket).get_public_url(filename)
            
            return {"status": "ok", "url": public_url, "filename": filename, "bucket": bucket}

        except Exception as e:
            print(f"Error uploading PDF: {e}")
            raise HTTPException(status_code=500, detail=f"Erro ao fazer upload do PDF: {str(e)}")
