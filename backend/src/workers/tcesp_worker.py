"""
TCESP Worker
Worker for ingesting municipal expenses from TCESP API into raw table.
Also includes normalization worker for transforming raw data to analytics-ready format.
"""

import os
import json
import logging
import hashlib
from datetime import datetime
from typing import Optional, List, Dict, Any
from supabase import create_client

from src.integrations.tcesp_client import get_despesas, TCESPClientError

# Configure logging
logger = logging.getLogger(__name__)


def get_supabase_client():
    """Get Supabase client instance."""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("Supabase credentials not found")
    return create_client(url, key)


def parse_br_date(date_str: str) -> Optional[str]:
    """
    Parse Brazilian date format (dd/MM/yyyy) to ISO format (yyyy-MM-dd).
    
    Args:
        date_str: Date in format "dd/MM/yyyy"
        
    Returns:
        Date in ISO format or None if parsing fails
    """
    if not date_str:
        return None
    try:
        parts = date_str.strip().split("/")
        if len(parts) == 3:
            day, month, year = parts
            return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
    except Exception as e:
        logger.warning(f"[TCESP Worker] Failed to parse date '{date_str}': {e}")
    return None


def parse_br_value(value_str: str) -> Optional[float]:
    """
    Parse Brazilian currency format (9.999,99) to float.
    
    Args:
        value_str: Value in format "9999,99" or "9.999,99"
        
    Returns:
        Float value or None if parsing fails
    """
    if not value_str:
        return None
    try:
        # Remove thousand separators (.) and replace decimal separator (,) with (.)
        cleaned = value_str.strip().replace(".", "").replace(",", ".")
        return float(cleaned)
    except Exception as e:
        logger.warning(f"[TCESP Worker] Failed to parse value '{value_str}': {e}")
    return None


def generate_expense_hash(
    municipio_slug: str,
    ano: int,
    mes: int,
    nr_empenho: str,
    evento: str,
    vl_despesa: str,
    dt_emissao: str
) -> str:
    """
    Generate MD5 hash for expense record to prevent duplicates.
    
    Combines key fields into a unique identifier.
    """
    key = f"{municipio_slug}|{ano}|{mes}|{nr_empenho}|{evento}|{vl_despesa}|{dt_emissao}"
    return hashlib.md5(key.encode()).hexdigest()


def fetch_and_store_municipal_expenses(
    municipio_slug: str,
    ano: int,
    mes: int
) -> int:
    """
    Fetch expenses from TCESP API and store in municipal_expenses_raw table.
    
    Args:
        municipio_slug: Municipality identifier (e.g., "municipio-slug")
        ano: Year (e.g., 2024)
        mes: Month (1-12)
        
    Returns:
        Number of expense records fetched
        
    Raises:
        TCESPClientError: If API request fails
        ValueError: If Supabase credentials are missing
    """
    logger.info(f"[TCESP Worker] Starting fetch for {municipio_slug}/{ano}/{mes}")
    
    # 1. Fetch data from TCESP API
    try:
        despesas = get_despesas(municipio_slug, ano, mes)
    except TCESPClientError as e:
        logger.error(f"[TCESP Worker] Failed to fetch from TCESP: {e}")
        raise
    
    records_count = len(despesas)
    logger.info(f"[TCESP Worker] Fetched {records_count} records")
    
    if records_count == 0:
        logger.warning(f"[TCESP Worker] No data returned for {municipio_slug}/{ano}/{mes}")
        return 0
    
    # 2. Store in Supabase (UPSERT by unique key)
    try:
        supabase = get_supabase_client()
        
        # Check if record exists
        existing = supabase.table("municipal_expenses_raw") \
            .select("id") \
            .eq("municipio_slug", municipio_slug) \
            .eq("ano", ano) \
            .eq("mes", mes) \
            .execute()
        
        payload_data = {
            "municipio_slug": municipio_slug,
            "ano": ano,
            "mes": mes,
            "payload": despesas,
            "fetched_at": datetime.utcnow().isoformat()
        }
        
        if existing.data:
            # Update existing record
            record_id = existing.data[0]["id"]
            logger.info(f"[TCESP Worker] Updating existing record {record_id}")
            
            supabase.table("municipal_expenses_raw") \
                .update(payload_data) \
                .eq("id", record_id) \
                .execute()
        else:
            # Insert new record
            logger.info(f"[TCESP Worker] Inserting new record")
            
            supabase.table("municipal_expenses_raw") \
                .insert(payload_data) \
                .execute()
        
        logger.info(f"[TCESP Worker] Successfully stored {records_count} records for {municipio_slug}/{ano}/{mes}")
        return records_count
        
    except Exception as e:
        logger.error(f"[TCESP Worker] Failed to store in Supabase: {e}")
        raise


def normalize_municipal_expenses(
    municipio_slug: str,
    ano: int,
    mes: int
) -> int:
    """
    Read raw payload from municipal_expenses_raw and normalize into municipal_expenses table.
    
    Args:
        municipio_slug: Municipality identifier (e.g., "municipio-slug")
        ano: Year (e.g., 2024)
        mes: Month (1-12)
        
    Returns:
        Number of expense records normalized
        
    Raises:
        ValueError: If no raw data exists for the specified period
    """
    logger.info(f"[TCESP Normalizer] Starting normalization for {municipio_slug}/{ano}/{mes}")
    
    supabase = get_supabase_client()
    
    # 1. Fetch raw payload
    raw_result = supabase.table("municipal_expenses_raw") \
        .select("payload") \
        .eq("municipio_slug", municipio_slug) \
        .eq("ano", ano) \
        .eq("mes", mes) \
        .order("fetched_at", desc=True) \
        .limit(1) \
        .execute()
    
    if not raw_result.data:
        raise ValueError(
            f"No raw data found for {municipio_slug}/{ano}/{mes}. "
            "Run /admin/tcesp/fetch-expenses first."
        )
    
    payload = raw_result.data[0].get("payload", [])
    
    if not payload:
        logger.warning(f"[TCESP Normalizer] Empty payload for {municipio_slug}/{ano}/{mes}")
        return 0
    
    logger.info(f"[TCESP Normalizer] Processing {len(payload)} raw records")
    
    # 2. Transform and insert each record
    normalized_count = 0
    errors = 0
    
    for item in payload:
        try:
            # Extract and transform fields
            nr_empenho = item.get("nr_empenho", "")
            evento = item.get("evento", "")
            vl_despesa_str = item.get("vl_despesa", "0")
            dt_emissao_str = item.get("dt_emissao_despesa", "")
            
            # Generate unique hash
            raw_hash = generate_expense_hash(
                municipio_slug, ano, mes,
                nr_empenho, evento, vl_despesa_str, dt_emissao_str
            )
            
            # Build normalized record
            record = {
                "municipio_slug": municipio_slug,
                "ano": ano,
                "mes": mes,
                "orgao": item.get("orgao", ""),
                "evento": evento,
                "nr_empenho": nr_empenho,
                "id_fornecedor": item.get("id_fornecedor", ""),
                "nm_fornecedor": item.get("nm_fornecedor", ""),
                "dt_emissao_despesa": parse_br_date(dt_emissao_str),
                "vl_despesa": parse_br_value(vl_despesa_str),
                "raw_hash": raw_hash
            }
            
            # Upsert (insert or ignore if hash exists)
            try:
                supabase.table("municipal_expenses") \
                    .upsert(record, on_conflict="raw_hash") \
                    .execute()
                normalized_count += 1
            except Exception as insert_err:
                # Check if it's a duplicate key error (expected with upsert)
                if "duplicate" not in str(insert_err).lower():
                    logger.warning(f"[TCESP Normalizer] Insert error: {insert_err}")
                    errors += 1
                else:
                    normalized_count += 1  # Count as success (already exists)
                    
        except Exception as e:
            logger.error(f"[TCESP Normalizer] Error processing record: {e}")
            errors += 1
    
    logger.info(
        f"[TCESP Normalizer] Completed {municipio_slug}/{ano}/{mes}: "
        f"{normalized_count} normalized, {errors} errors"
    )
    
    return normalized_count


def fetch_municipal_expenses_range(
    municipio_slug: str,
    ano_inicio: int,
    mes_inicio: int,
    ano_fim: int,
    mes_fim: int
) -> dict:
    """
    Fetch expenses for a range of months.
    
    Args:
        municipio_slug: Municipality identifier
        ano_inicio: Start year
        mes_inicio: Start month (1-12)
        ano_fim: End year
        mes_fim: End month (1-12)
        
    Returns:
        Dict with summary: {"total_months": int, "total_records": int, "errors": list}
    """
    results = {
        "total_months": 0,
        "total_records": 0,
        "errors": []
    }
    
    current_ano = ano_inicio
    current_mes = mes_inicio
    
    while (current_ano < ano_fim) or (current_ano == ano_fim and current_mes <= mes_fim):
        try:
            records = fetch_and_store_municipal_expenses(municipio_slug, current_ano, current_mes)
            results["total_months"] += 1
            results["total_records"] += records
            logger.info(f"[TCESP Worker] Completed {municipio_slug}/{current_ano}/{current_mes}: {records} records")
            
        except Exception as e:
            error_msg = f"{municipio_slug}/{current_ano}/{current_mes}: {str(e)}"
            results["errors"].append(error_msg)
            logger.error(f"[TCESP Worker] Error: {error_msg}")
        
        # Move to next month
        current_mes += 1
        if current_mes > 12:
            current_mes = 1
            current_ano += 1
    
    return results


import re

def extract_document_from_id(id_fornecedor: str) -> tuple:
    """
    Extract CNPJ/CPF from id_fornecedor string.
    
    Args:
        id_fornecedor: Raw string like "CNPJ - PESSOA JURÍDICA - 46634051000176"
        
    Returns:
        Tuple of (documento, tipo) where:
        - documento: extracted digits (14 for CNPJ, 11 for CPF) or None
        - tipo: "CNPJ_PJ", "CPF_PF", or "OUTRO"
    """
    if not id_fornecedor:
        return None, "OUTRO"
    
    # Extract all digit sequences
    digits = re.findall(r'\d+', id_fornecedor)
    all_digits = ''.join(digits)
    
    # Check for CNPJ (14 digits)
    if len(all_digits) >= 14:
        # Take last 14 digits (most likely the document)
        cnpj = all_digits[-14:]
        return cnpj, "CNPJ_PJ"
    
    # Check for CPF (11 digits)
    if len(all_digits) >= 11:
        cpf = all_digits[-11:]
        return cpf, "CPF_PF"
    
    # No valid document found
    return None, "OUTRO"


def extract_and_link_suppliers(
    municipio_slug: str,
    ano: int,
    mes: int
) -> int:
    """
    Extract suppliers from municipal_expenses and create/link in suppliers table.
    
    Args:
        municipio_slug: Municipality identifier
        ano: Year
        mes: Month (1-12)
        
    Returns:
        Number of distinct suppliers processed
        
    Raises:
        ValueError: If no expenses found for the period
    """
    logger.info(f"[Suppliers Worker] Starting extraction for {municipio_slug}/{ano}/{mes}")
    
    supabase = get_supabase_client()
    
    # 1. Fetch all expenses for this period
    expenses_res = supabase.table("municipal_expenses") \
        .select("id, id_fornecedor, nm_fornecedor") \
        .eq("municipio_slug", municipio_slug) \
        .eq("ano", ano) \
        .eq("mes", mes) \
        .execute()
    
    if not expenses_res.data:
        raise ValueError(
            f"No expenses found for {municipio_slug}/{ano}/{mes}. "
            "Run /fetch-expenses and /normalize-expenses first."
        )
    
    expenses = expenses_res.data
    logger.info(f"[Suppliers Worker] Processing {len(expenses)} expense records")
    
    # 2. Track unique suppliers
    processed_suppliers = set()
    links_created = 0
    
    for expense in expenses:
        expense_id = expense.get("id")
        id_fornecedor = expense.get("id_fornecedor", "")
        nm_fornecedor = expense.get("nm_fornecedor", "")
        
        if not id_fornecedor:
            continue
        
        # Extract document info
        documento, tipo = extract_document_from_id(id_fornecedor)
        
        try:
            # 3. UPSERT supplier
            # Check if supplier exists
            existing = supabase.table("suppliers") \
                .select("id") \
                .eq("raw_id_fornecedor", id_fornecedor) \
                .execute()
            
            if existing.data:
                supplier_id = existing.data[0]["id"]
                # Optionally update nome/documento if empty
                update_data = {}
                if nm_fornecedor:
                    update_data["nome"] = nm_fornecedor.strip()
                if documento:
                    update_data["documento"] = documento
                    update_data["tipo"] = tipo
                
                if update_data:
                    supabase.table("suppliers") \
                        .update(update_data) \
                        .eq("id", supplier_id) \
                        .execute()
            else:
                # Insert new supplier
                new_supplier = {
                    "raw_id_fornecedor": id_fornecedor,
                    "documento": documento,
                    "tipo": tipo,
                    "nome": nm_fornecedor.strip() if nm_fornecedor else None
                }
                insert_res = supabase.table("suppliers").insert(new_supplier).execute()
                supplier_id = insert_res.data[0]["id"]
            
            processed_suppliers.add(supplier_id)
            
            # 4. Create junction link (ON CONFLICT DO NOTHING equivalent)
            try:
                supabase.table("municipal_expenses_suppliers") \
                    .upsert({
                        "expense_id": expense_id,
                        "supplier_id": supplier_id
                    }, on_conflict="expense_id,supplier_id") \
                    .execute()
                links_created += 1
            except Exception as link_err:
                # Ignore duplicate key errors
                if "duplicate" not in str(link_err).lower():
                    logger.warning(f"[Suppliers Worker] Link error: {link_err}")
                    
        except Exception as e:
            logger.error(f"[Suppliers Worker] Error processing supplier '{id_fornecedor}': {e}")
    
    logger.info(
        f"[Suppliers Worker] Completed {municipio_slug}/{ano}/{mes}: "
        f"{len(processed_suppliers)} suppliers, {links_created} links"
    )
    
    return len(processed_suppliers)
