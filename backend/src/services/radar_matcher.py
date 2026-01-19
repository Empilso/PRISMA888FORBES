"""
Radar Matcher Engine - Enterprise Grade
Correlates campaign promises with municipal expenses using keyword matching.

This is Phase 3 of the Radar system - connecting existing data.
"""

import os
import re
from typing import List, Dict, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass
from supabase import create_client, Client

# Category to search keywords mapping
CATEGORY_KEYWORDS = {
    "Saúde": ["saude", "saúde", "ubs", "upa", "hospital", "medico", "médico", "enferm", "vacina", "farmac", "ambulan"],
    "Educação": ["educação", "educacao", "escola", "creche", "professor", "ensino", "infantil", "alfabetiza", "merenda"],
    "Infraestrutura": ["obra", "asfalto", "paviment", "construção", "construcao", "reforma", "ponte", "viaduto", "drenagem"],
    "Segurança": ["segurança", "seguranca", "policia", "guarda", "camera", "iluminação", "iluminacao"],
    "Transporte": ["transporte", "ônibus", "onibus", "mobilidade", "ciclovia", "terminal"],
    "Social": ["social", "assistência", "assistencia", "bolsa", "benefício", "beneficio", "cras", "creas"],
    "Meio Ambiente": ["ambiente", "ambiental", "verde", "parque", "praça", "praca", "arboriza", "lixo", "reciclagem"],
    "Cultura": ["cultura", "cultural", "teatro", "museu", "biblioteca", "evento"],
    "Esporte": ["esporte", "esportivo", "quadra", "ginásio", "ginasio", "futebol", "atletismo"],
    "Economia": ["economia", "emprego", "empreendedor", "microcrédito", "microcredito", "fomento"],
    "Administração": ["administração", "administracao", "gestão", "gestao", "servidor", "concurso", "eficiência"],
}


@dataclass
class MatchResult:
    promise_id: str
    promise_resumo: str
    categoria: str
    matched_expenses: List[Dict]
    total_value: float
    status: str  # "em_andamento", "nao_iniciada", "parcial"


class RadarMatcher:
    """
    Enterprise Matcher Engine for correlating promises with expenses.
    """
    
    def __init__(self):
        self.supabase = self._get_client()
    
    def _get_client(self) -> Client:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        return create_client(url, key)
    
    def run_matching(
        self, 
        politico_id: str, 
        municipio_slug: str = "votorantim",
        campaign_id: str = None,
        target_year: int = None
    ) -> Dict:
        """
        Main entry point: Match all promises for a politician against municipal expenses.
        
        Args:
            politico_id: UUID of the politician
            municipio_slug: Slug for filtering expenses
            campaign_id: Optional campaign_id filter
            target_year: Year to filter expenses (defaults to current year)
            
        Returns:
            Summary with match counts and details
        """
        if target_year is None:
            target_year = datetime.now().year

        print(f"🔄 Starting Matcher for politico_id={politico_id[:8]} (Year: {target_year})...")
        
        # 1. Fetch all promises for this politician
        promises = self._fetch_promises(politico_id, campaign_id)
        print(f"📋 Found {len(promises)} promises to analyze")
        
        if not promises:
            return {"status": "no_promises", "message": "Nenhuma promessa encontrada para este político"}
        
        # 2. Process each promise
        results = []
        matches_found = 0
        
        # Track unique expenses to avoid double counting in global total
        unique_expenses_map = {}  # id -> value
        
        for promise in promises:
            match_result = self._match_promise(promise, municipio_slug, target_year)
            results.append(match_result)
            
            if match_result.matched_expenses:
                matches_found += 1
                # Add found expenses to unique map
                for exp in match_result.matched_expenses:
                    unique_expenses_map[exp['id']] = exp.get('vl_despesa', 0)
            
            # Save verification to DB
            self._save_verification(promise, match_result)
        
        # Calculate TRUE deduplicated total
        total_evidence_value = sum(unique_expenses_map.values())
        
        # 3. Summary
        # Group by category for frontend display
        by_category = self._group_by_category(results)
        
        summary = {
            "status": "completed",
            "total_promises": len(promises),
            "matches_found": matches_found,
            "match_rate": f"{(matches_found / len(promises) * 100):.1f}%",
            "total_evidence_value": total_evidence_value,
            "target_year": target_year,
            "status_breakdown": self._count_statuses(results),
            "sample_matches": [r.__dict__ for r in results if r.matched_expenses][:5],
            # Add data structure expected by Frontend
            "data": {
                "observacoes_gerais": f"Análise do ano {target_year} concluída com {matches_found} evidências encontradas, totalizando R$ {total_evidence_value:,.2f} em investimentos (valor auditado e deduplicado).",
                "categorias": by_category
            }
        }
        
        print(f"✅ Matching complete: {matches_found}/{len(promises)} promises matched")
        print(f"💰 Total evidence value: R$ {total_evidence_value:,.2f}")
        
        return summary
    
    def _fetch_promises(self, politico_id: str, campaign_id: str = None) -> List[Dict]:
        """Fetch all active promises for a politician."""
        query = self.supabase.table("promises").select("*").eq("politico_id", politico_id)
        
        if campaign_id:
            query = query.eq("campaign_id", campaign_id)
        
        result = query.execute()
        return result.data or []
    
    def _match_promise(self, promise: Dict, municipio_slug: str, target_year: int) -> MatchResult:
        """
        Match a single promise against municipal expenses.
        Uses category keywords + promise text for ILIKE matching.
        """
        categoria = promise.get("categoria", "Outro")
        resumo = promise.get("resumo_promessa", "")
        promise_id = promise.get("id")
        
        # Get keywords for this category
        keywords = CATEGORY_KEYWORDS.get(categoria, [])
        
        # Also extract keywords from resumo
        text_keywords = self._extract_keywords_from_text(resumo)
        all_keywords = list(set(keywords + text_keywords))
        
        if not all_keywords:
            return MatchResult(
                promise_id=promise_id,
                promise_resumo=resumo[:100],
                categoria=categoria,
                matched_expenses=[],
                total_value=0.0,
                status="nao_iniciada"
            )
        
        # Build OR query for each keyword
        # We'll use PostgreSQL's OR by making multiple calls and deduping
        matched_expenses = []
        seen_ids = set()
        
        for keyword in all_keywords[:5]:  # Limit to 5 keywords for performance
            expenses = self._search_expenses(keyword, municipio_slug, target_year)
            for exp in expenses:
                if exp["id"] not in seen_ids:
                    seen_ids.add(exp["id"])
                    matched_expenses.append(exp)
        
        # Calculate total value
        total_value = sum(exp.get("vl_despesa", 0) or 0 for exp in matched_expenses)
        
        # Determine status
        if matched_expenses:
            if total_value > 50000:
                status = "em_andamento"
            else:
                status = "parcial"
        else:
            status = "nao_iniciada"
        
        return MatchResult(
            promise_id=promise_id,
            promise_resumo=resumo[:100],
            categoria=categoria,
            matched_expenses=matched_expenses[:10],  # Limit for storage
            total_value=total_value,
            status=status
        )
    
    def _search_expenses(self, keyword: str, municipio_slug: str, target_year: int) -> List[Dict]:
        """Search expenses by keyword in various fields."""
        # Search in nm_fornecedor and orgao
        result = self.supabase.table("municipal_expenses") \
            .select("id, nm_fornecedor, orgao, vl_despesa, dt_emissao_despesa, ano, nr_empenho") \
            .eq("municipio_slug", municipio_slug) \
            .eq("ano", target_year) \
            .or_(f"nm_fornecedor.ilike.%{keyword}%,orgao.ilike.%{keyword}%") \
            .order("vl_despesa", desc=True) \
            .limit(100) \
            .execute()
        
        return result.data or []
    
    def _extract_keywords_from_text(self, text: str) -> List[str]:
        """Extract potential keywords from promise text."""
        if not text:
            return []
        
        # Normalize and extract words
        text = text.lower()
        text = re.sub(r'[^\w\s]', ' ', text)
        words = text.split()
        
        # Filter to meaningful words (>4 chars, not stopwords)
        stopwords = {"para", "como", "mais", "será", "sera", "fazer", "todos", "todas", "muito", "nossa", "nosso"}
        keywords = [w for w in words if len(w) > 4 and w not in stopwords]
        
        return keywords[:3]  # Top 3
    
    def _save_verification(self, promise: Dict, match: MatchResult):
        """Save or update promise verification in the database."""
        promise_id = promise.get("id")
        
        # Check if verification exists
        existing = self.supabase.table("promise_verifications") \
            .select("id") \
            .eq("promise_id", promise_id) \
            .limit(1) \
            .execute()
        
        verification_data = {
            "promise_id": promise_id,
            "status": match.status,
            "score_similaridade": min(len(match.matched_expenses) / 10, 1.0) if match.matched_expenses else 0.0,
            "justificativa_ia": f"Encontradas {len(match.matched_expenses)} despesas relacionadas. Total: R$ {match.total_value:,.2f}",
            "fontes": [{"expense_id": e["id"], "value": e.get("vl_despesa"), "supplier": e.get("nm_fornecedor", "")[:50]} for e in match.matched_expenses[:5]],
            "last_updated_at": datetime.now().isoformat()
        }
        
        try:
            if existing.data:
                # Update
                self.supabase.table("promise_verifications") \
                    .update(verification_data) \
                    .eq("id", existing.data[0]["id"]) \
                    .execute()
            else:
                # Insert
                self.supabase.table("promise_verifications") \
                    .insert(verification_data) \
                    .execute()
        except Exception as e:
            print(f"⚠️ Error saving verification for promise {promise_id[:8]}: {e}")
    
    def _count_statuses(self, results: List[MatchResult]) -> Dict[str, int]:
        """Count results by status."""
        counts = {"em_andamento": 0, "parcial": 0, "nao_iniciada": 0}
        for r in results:
            counts[r.status] = counts.get(r.status, 0) + 1
        return counts
    
    def _group_by_category(self, results: List[MatchResult]) -> List[Dict]:
        """Group results by category for frontend display."""
        categories = {}
        
        for r in results:
            if r.categoria not in categories:
                categories[r.categoria] = {
                    "nome": r.categoria,
                    "qtd_promessas": 0,
                    "valor_pago_total": 0.0,
                    "matches_count": 0,
                    "detalhes": []
                }
            
            categories[r.categoria]["qtd_promessas"] += 1
            if r.matched_expenses:
                categories[r.categoria]["matches_count"] += 1
                categories[r.categoria]["valor_pago_total"] += r.total_value
                
                # Add details for modal
                for exp in r.matched_expenses:
                    categories[r.categoria]["detalhes"].append({
                        "fornecedor": exp.get("nm_fornecedor"),
                        "valor": exp.get("vl_despesa"),
                        "data": exp.get("dt_emissao_despesa"),
                        "orgao": exp.get("orgao"),
                        "empenho": exp.get("nr_empenho"),
                        "promessa_relacionada": r.promise_resumo[:100] + "..." if len(r.promise_resumo) > 100 else r.promise_resumo
                    })
        
        # Format output
        output = []
        for cat in categories.values():
            # Evaluation logic
            if cat["matches_count"] == 0:
                avaliacao = "sem dados"
            elif cat["matches_count"] / cat["qtd_promessas"] > 0.5:
                avaliacao = "alta eficácia"
            elif cat["matches_count"] / cat["qtd_promessas"] > 0.2:
                avaliacao = "média eficácia"
            else:
                avaliacao = "baixa eficácia"
                
            output.append({
                "nome": cat["nome"],
                "qtd_promessas": cat["qtd_promessas"],
                "valor_pago_total": cat["valor_pago_total"],
                "avaliacao": avaliacao,
                "detalhes": cat["detalhes"]
            })

            
        # Sort by value desc
        return sorted(output, key=lambda x: x["valor_pago_total"], reverse=True)


# CLI Entry point for testing
if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    
    matcher = RadarMatcher()
    
    # Weber Manga's politician_id
    result = matcher.run_matching(
        politico_id="f079648a-a722-4f35-aa37-1b466005d5d1",
        municipio_slug="votorantim"
    )
    
    print("\n📊 RESULTADO:")
    print(f"Total promessas: {result.get('total_promises', 0)}")
    print(f"Matches encontrados: {result.get('matches_found', 0)}")
    print(f"Taxa de match: {result.get('match_rate', '0%')}")
    print(f"Valor total evidências: R$ {result.get('total_evidence_value', 0):,.2f}")
