"""
Script de importação de emendas parlamentares do Deputado Bobô.

Fonte: BOBO_LOA_2022_2026_FINAL.csv
Tabela destino: public.parliamentary_amendments
Estratégia: Upsert por raw_hash (md5 de ano+acao+valor_orcado_atual+municipio)

Uso:
    cd backend
    python scripts/import_bobo_amendments.py

Requisitos (já no .venv do projeto):
    pip install supabase python-dotenv pandas
"""

import os
import sys
import hashlib
import pandas as pd
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# ── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
PROJECT_DIR = BACKEND_DIR.parent

CSV_PATH = PROJECT_DIR / "IBGE" / "EMENDAS DEPUTADOS" / "BOBO_LOA_2022_2026_FINAL.csv"

# ── Configuração ──────────────────────────────────────────────────────────────
load_dotenv(BACKEND_DIR / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontradas no .env")
    sys.exit(1)

# politician_id fixo do Deputado Bobô
BOBO_POLITICIAN_ID = "fe0fce5b-cd46-48e2-8277-5a89c369fe31"

# Mapeamento de Ação → área temática (gerado dinamicamente, sem depender de coluna no CSV)
AREA_MAP: dict[str, str] = {
    "Ampliação da Frota de Ambulância": "Saúde",
    "Aparelhamento de Unidade de Saúde": "Saúde",
    "Gerenciamento do Serviço Hospitalar": "Saúde",
    "Apoio Financeiro a Município": "Saúde",
    "Ampliação e Renovação Frota de Veículos": "Saúde",
    "Odontomóvel": "Saúde",
    "Construção de Unidade Básica de Saúde": "Saúde",
    "Apoio a Município na Implantação": "Saúde",
    "Apoio Financeiro a Unidade de Saúde": "Saúde",
    "Apoio Preventivo a Ataque de Animais": "Saúde",
    "Aparelhamento de Unidade Escolar": "Educação",
    "Oferta de Transporte Escolar Município": "Educação",
    "Veículo para Transporte Escolar": "Educação",
    "Implementação de Fanfarra": "Educação",
    "Apoio Técnico-Financeiro Escola Família": "Educação",
    "Realização do Projeto na Educação Básica": "Educação",
    "Assistência para Cultura Corporal e Espo": "Educação",
    "Assistência para Aparelhamento de Unidad": "Educação",
    "Assistência a Projetos Artísticos": "Educação",
    "Realização de Ação de Extensão": "Educação",
    "Desenvolvimento Ações Socioeducacionais": "Educação",
    "Realização do Projeto de Fortalecimento": "Educação",
    "Apoio Financeiro para a Melhoria": "Educação",
    "Aparelhamento de Unidade de Educação": "Educação",
    "Promoção de Atividade de Esporte": "Esporte",
    "Requalificação de Equipamento Esportivo": "Esporte",
    "Implantação de Infraestrutura Viária": "Infraestrutura",
    "Implantação de Infraestrutura Hídrica": "Infraestrutura",
    "Produção de Unidade Habitacional": "Infraestrutura",
    "Distribuição de Equipamento de Apoio": "Agricultura",
    "Apoio à Comercialização Produção Rural": "Agricultura",
    "Apoio à Realização de Evento": "Turismo",
    "Apoio a Evento de Interesse Turístico": "Turismo",
    "Aquisição de Armamento para o Sistema": "Segurança",
    "Ampliação e Renovação da Frota": "Segurança",
    "Aquisição de Equipamento para o Serviço": "Segurança",
    "Apoio a Projeto de Empoderamento": "Social",
    "Apoio a Projeto": "Social",
    "Apoio a Ações de Segurança Alimentar": "Social",
    "Alimento da Agricultura Familiar": "Social",
    "Capacitação Social e Profissional": "Social",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def generate_raw_hash(ano: str, acao: str, valor_orcado_atual: str, municipio: str) -> str:
    """MD5 de ano + acao + valor_orcado_atual + municipio (conforme spec)."""
    content = f"{ano}{acao}{valor_orcado_atual}{municipio}"
    return hashlib.md5(content.encode("utf-8")).hexdigest()


def build_city_map(supabase: Client) -> dict[str, str]:
    """Busca todas as cidades e retorna {name: id}."""
    result = supabase.table("cities").select("id, name").execute()
    city_map = {}
    for row in (result.data or []):
        city_map[row["name"].strip().lower()] = row["id"]
    print(f"📍 {len(city_map)} cidades carregadas do Supabase.")
    return city_map


def resolve_city_id(municipio: str, city_map: dict[str, str]) -> str | None:
    """
    Tenta encontrar um city_id pelo nome do município.
    Municípios como 'Estado da Bahia' retornam None (emenda estadual sem beneficiário específico).
    """
    if not municipio or municipio.strip().lower() in ("estado da bahia", "bahia", ""):
        return None
    return city_map.get(municipio.strip().lower())


# ── Importação ────────────────────────────────────────────────────────────────

def import_amendments():
    print("🚀 Iniciando importação de emendas do Deputado Bobô...")
    print(f"   CSV: {CSV_PATH}")

    if not CSV_PATH.exists():
        print(f"❌ Arquivo não encontrado: {CSV_PATH}")
        sys.exit(1)

    # Leitura do CSV — separador ";" e encoding UTF-8
    df = pd.read_csv(
        CSV_PATH,
        sep=";",
        encoding="utf-8",
        dtype=str,          # lê tudo como string para evitar problemas de parsing
        quotechar='"',
    )
    df.columns = [c.strip() for c in df.columns]

    # Remove linhas totalmente vazias
    df.dropna(how="all", inplace=True)

    # Normaliza colunas numéricas
    numeric_cols = ["Orçado Inicial", "Orçado Atual", "Empenhado", "Liquidado", "Pago"]
    for col in numeric_cols:
        df[col] = (
            pd.to_numeric(
                df[col].astype(str).str.strip().str.replace(",", ".", regex=False),
                errors="coerce",
            ).fillna(0.0)
        )

    print(f"📄 {len(df)} linhas lidas do CSV.")

    # Conecta ao Supabase
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    city_map = build_city_map(supabase)

    success_count = 0
    skip_count = 0
    error_count = 0
    not_found_cities: set[str] = set()

    records = []
    for idx, row in df.iterrows():
        try:
            ano          = str(row["Ano Exercício"]).strip()
            orgao        = str(row["Órgão"]).strip()
            unidade      = str(row["Unidade Orçamentária"]).strip()
            municipio    = str(row["Municipio"]).strip()
            acao         = str(row["Ação do Programa de Governo"]).strip()
            objeto       = str(row["Objeto_Detalhado"]).strip()
            area         = AREA_MAP.get(acao, "Outros")  # gerado dinamicamente

            val_inicial  = float(row["Orçado Inicial"])
            val_atual    = float(row["Orçado Atual"])
            val_emp      = float(row["Empenhado"])
            val_liq      = float(row["Liquidado"])
            val_pago     = float(row["Pago"])

            raw_hash = generate_raw_hash(
                ano=ano,
                acao=acao,
                valor_orcado_atual=str(val_atual),
                municipio=municipio,
            )

            city_id = resolve_city_id(municipio, city_map)
            if municipio.strip().lower() not in ("estado da bahia", "bahia", "") and city_id is None:
                not_found_cities.add(municipio)

            record = {
                "politician_id":         BOBO_POLITICIAN_ID,
                "ano_exercicio":         int(ano),
                "orgao":                 orgao,
                "unidade_orcamentaria":  unidade,
                "municipio_original":    municipio,
                "beneficiary_city_id":   city_id,       # None se estadual ou cidade não mapeada
                "acao_programa":         acao,
                "objeto_detalhado":      objeto,
                "area_tematica":         area,
                "valor_orcado_inicial":  val_inicial,
                "valor_orcado_atual":    val_atual,
                "valor_empenhado":       val_emp,
                "valor_liquidado":       val_liq,
                "valor_pago":            val_pago,
                "raw_hash":              raw_hash,
            }
            records.append(record)

        except Exception as e:
            print(f"   ⚠️  Linha {idx}: {e}")
            error_count += 1

    print(f"\n🔄 Enviando {len(records)} registros para o Supabase (upsert por raw_hash)...")

    # ── Deduplicação local ──────────────────────────────────────────────────
    # O Supabase rejeita upserts onde o mesmo hash aparece mais de uma vez
    # no mesmo batch (erro 21000). Mantemos apenas a última ocorrência.
    seen: dict[str, dict] = {}
    for rec in records:
        seen[rec["raw_hash"]] = rec          # sobrescreve duplicatas, fica com a última
    unique_records = list(seen.values())
    duplicates_removed = len(records) - len(unique_records)
    if duplicates_removed > 0:
        print(f"   ⚠️  {duplicates_removed} linha(s) duplicada(s) removidas antes do upsert (mesmo raw_hash).")
    print(f"   📦 {len(unique_records)} registros únicos a enviar.")


    # Upsert em lote (Supabase limita ~500 por request; enviamos em chunks de 100)
    CHUNK_SIZE = 100
    for i in range(0, len(unique_records), CHUNK_SIZE):
        chunk = unique_records[i : i + CHUNK_SIZE]
        try:
            result = (
                supabase.table("parliamentary_amendments")
                .upsert(chunk, on_conflict="raw_hash")
                .execute()
            )
            success_count += len(chunk)
            print(f"   ✅ Chunk {i // CHUNK_SIZE + 1}: {len(chunk)} registros inseridos/atualizados.")
        except Exception as e:
            print(f"   ❌ Erro no chunk {i // CHUNK_SIZE + 1}: {e}")
            error_count += len(chunk)

    print("\n" + "═" * 55)
    print(f"✅ Importação concluída!")
    print(f"   Total lido no CSV:   {len(df)}")
    print(f"   Únicos processados:  {len(unique_records)}")
    print(f"   Duplicatas skip.:    {duplicates_removed}")
    print(f"   Sucesso (upsert):    {success_count}")
    print(f"   Erros de parseo:     {error_count}")
    print(f"   Cidades não mapeadas ({len(not_found_cities)}):")
    for city in sorted(not_found_cities):
        print(f"      • {city}")
    print("═" * 55)


if __name__ == "__main__":
    import_amendments()
