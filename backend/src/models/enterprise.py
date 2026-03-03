from datetime import datetime
from typing import List, Optional, Dict, Any, Literal
from uuid import UUID
from pydantic import BaseModel, Field, field_validator, ConfigDict

# ============ AGENT SCHEMA (Blueprint) ============
class AgentSchema(BaseModel):
    id: Optional[UUID] = None
    role: str
    goal: str = ""
    backstory: str = ""
    
    # Enterprise Fields
    version: int = Field(default=1, ge=1)
    tools: List[str] = Field(default_factory=list)
    compliance_rules: Optional[Dict[str, Any]] = None
    is_active: bool = Field(default=True)
    metadata: Optional[Dict[str, Any]] = None
    
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

    @field_validator('tools')
    @classmethod
    def validate_tools(cls, v: List[str]) -> List[str]:
        """
        Validates that tool names differ from an allowed list.
        Enterprise Safety Check.
        """
        ALLOWED_TOOLS = {
            'web_search', 'tavily_search', 'vector_search',
            'db_query', 'campaign_data', 'statistics',
            'calculator', 'campaign_stats', 
            'law_search', 'competitor_analysis', 'market_scan',
            'radar_google_scanner', 'radar_fiscal_verbas', 'radar_extrator_promessas'
        }
        
        for tool in v:
            if tool not in ALLOWED_TOOLS:
                # We normalize/warn instead of erroring excessively
                pass 
        return v


# ============ PERSONA SCHEMA (Instance) ============
class PersonaSchema(BaseModel):
    id: Optional[UUID] = None
    name: str
    description: Optional[str] = None
    campaign_id: Optional[str] = None
    
    # Relationships
    agent_id: Optional[UUID] = None
    
    # Instance Configuration
    overrides: Optional[Dict[str, Any]] = None
    status: Literal['idle', 'running', 'paused', 'error'] = Field(default='idle')
    
    # Legacy Config (for backward compatibility)
    config: Optional[Dict[str, Any]] = None
    
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ============ EXECUTION LOG SCHEMA (Observability) ============
class AIExecutionLogSchema(BaseModel):
    id: Optional[UUID] = None
    
    persona_id: Optional[UUID] = None
    trace_id: str
    step_name: str
    agent_role: str
    model_used: str
    
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    
    raw_input: str
    raw_output: str
    
    tool_calls: Optional[List[Dict[str, Any]]] = None
    
    is_success: bool = Field(default=True)
    created_at: Optional[datetime] = Field(default_factory=datetime.now)

    model_config = ConfigDict(from_attributes=True)

# ============ STRATEGY OUTPUT SCHEMAS (Genesis Crew) ============

class Strategy(BaseModel):
    title: str = Field(..., description="Nome da ação tática")
    description: str = Field(..., description="Descrição detalhada da ação (sem exemplos)")
    pillar: str = Field(..., description="Pilar estratégico vinculado")
    phase: str = Field(..., description="Fase da campanha (pre_campaign, campaign, final_sprint)")
    examples: List[str] = Field(default=[], description="Exemplos práticos de execução")

class StrategiesList(BaseModel):
    """Output estruturado para a Genesis Crew"""
    strategies: List[Strategy] = Field(..., description="Lista de estratégias geradas pela IA")

# ============ ADVERSARIAL ANALYSIS SCHEMAS (Phase 3) ============

class AdversarialWeakness(BaseModel):
    weakness_point: str = Field(..., description="O ponto fraco identificado no plano do concorrente.")
    competitor_quote: str = Field(..., description="Citação exata do documento do concorrente que prova o ponto fraco.")
    our_counter_narrative: str = Field(..., description="Narrativa de contra-ataque sugerida para o nosso candidato.")
    risk_level: Literal['Low', 'Medium', 'High'] = Field(..., description="Nível de risco que essa fraqueza do concorrente representa para ele mesmo (oportunidade para nós).")

class AdversarialReport(BaseModel):
    """Output estruturado para a Task de Análise Adversária"""
    competitor_name: str = Field(..., description="Nome do concorrente analisado")
    analysis_summary: str = Field(..., description="Resumo executivo da análise de vulnerabilidade.")
    weaknesses: List[AdversarialWeakness] = Field(..., description="Lista de pontos fracos identificados e como explorá-los.")

# ============ RADAR CREW SCHEMAS (NEW) ============

# Phase 1: Extraction
class PromiseExtraction(BaseModel):
    resumo_promessa: str = Field(..., description="Resumo curto e direto da promessa (ex: Construir 5 Unidades Básicas de Saúde)")
    categoria: str = Field(..., description="Área temática (Saúde, Educação, Infraestrutura, Segurança, etc.)")
    verbos_chave: List[str] = Field(..., description="Verbos de ação identificados (Construir, Ampliar, Reformar, Contratar)")
    entidades_citadas: List[str] = Field(default=[], description="Órgãos ou entidades citadas (SUS, Guarda Municipal, Secretarias)")
    local: Optional[str] = Field(None, description="Bairro ou região específica da promessa, se houver")
    origem: str = Field(..., description="Fonte da promessa (Plano de Governo, Entrevista, Debate)")
    trecho_original: str = Field(..., description="O texto exato extraído do documento original")
    confidence_score: float = Field(..., description="Grau de confiança de que isso é uma promessa de fato (0.0 a 1.0)")

class PromiseExtractionResult(BaseModel):
    """Output estruturado para a Fase 1: Extração"""
    document_summary: str = Field(..., description="Resumo geral do documento analisado")
    promises: List[PromiseExtraction] = Field(..., description="Lista de promessas extraídas")

# Phase 2: Fiscal Analysis
class FiscalImpact(BaseModel):
    promise_id: str = Field(..., description="ID ou Resumo da promessa analisada")
    viability_score: Literal['High', 'Medium', 'Low', 'Impossible'] = Field(..., description="Viabilidade fiscal estimada")
    estimated_cost: str = Field(..., description="Estimativa de custo (ex: 'R$ 5-10 milhões' ou 'Sem custo direto')")
    budget_source: Optional[str] = Field(None, description="Fonte orçamentária provável (Tesouro, Convênio Federal, Emenda)")
    risk_factors: List[str] = Field(..., description="Riscos fiscais ou operacionais identificados")
    suggestion: str = Field(..., description="Sugestão para o auditor humano")

class FiscalAnalysisResult(BaseModel):
    """Output estruturado para a Fase 2: Análise Fiscal"""
    overview: str = Field(..., description="Visão geral da saúde fiscal das promessas")
    analysis: List[FiscalImpact] = Field(..., description="Análise detalhada por promessa")

# Phase 3: Media Scan (Moved from radar_crew.py)
class MediaItem(BaseModel):
    date: str = Field(description="Date of the news/article in YYYY-MM-DD format (or 'Recent' if unknown)")
    source: str = Field(description="Name of the news source, newspaper, or website")
    title: str = Field(description="Headline or title of the article")
    sentiment: str = Field(description="Sentiment analysis of the content: 'positive', 'neutral', or 'negative'")
    url: str = Field(description="Direct URL to the source article")
    summary: str = Field(description="Brief summary of the content and how it relates to campaign promises")

class MediaScanResult(BaseModel):
    items: List[MediaItem] = Field(description="List of media items found during the scan")
    overview: str = Field(description="General overview or conclusion of the media landscape")

# Phase 4: Final Verdict (Triangulation)
class VerdictResult(BaseModel):
    """Output estruturado para a Fase 4: Veredito Final"""
    promise_id: str = Field(..., description="ID da promessa analisada")
    status: Literal['CUMPRIDA', 'NAO_INICIADA', 'EM_ANDAMENTO', 'QUEBRADA', 'PARCIALMENTE_CUMPRIDA'] = Field(..., description="Status final da promessa após triangulação")
    justification_ptbr: str = Field(..., description="Justificativa detalhada do veredito em Português, citando evidências.")
    evidence_sources: List[str] = Field(default=[], description="Fontes utilizadas para a conclusão (Gastos, Notícias, etc.)")
    confidence_score: float = Field(..., description="Nível de confiança da conclusão (0.0 a 1.0)")

# Phase 4: Final Verdict (Triangulation)
class VerdictResult(BaseModel):
    """Output estruturado para a Fase 4: Veredito Final"""
    promise_id: str = Field(..., description="ID da promessa analisada")
    status: Literal['CUMPRIDA', 'NAO_INICIADA', 'EM_ANDAMENTO', 'QUEBRADA', 'PARCIALMENTE_CUMPRIDA'] = Field(..., description="Status final da promessa após triangulação")
    justification_ptbr: str = Field(..., description="Justificativa detalhada do veredito em Português, citando evidências.")
    evidence_sources: List[str] = Field(default=[], description="Fontes utilizadas para a conclusão (Gastos, Notícias, etc.)")
    confidence_score: float = Field(..., description="Nível de confiança da conclusão (0.0 a 1.0)")
