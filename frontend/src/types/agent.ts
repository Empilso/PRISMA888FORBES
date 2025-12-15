
export interface Agent {
    id: string;
    name: string; // Slug
    display_name: string;
    role: string;
    type: 'evidence' | 'policy' | 'demographics' | 'validator' | 'compliance' | 'auditor' | 'simulator' | 'generic';
    description?: string;
    system_prompt: string;
    tools: string[]; // Array of tool identifiers
    knowledge_base: any[]; // Placeholder for KB structure - ex: { type: 'pdf', url: '...' }
    compliance_rules: string[]; // Array of rule identifiers
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export type AgentCreate = Omit<Agent, 'id' | 'created_at' | 'updated_at'>;
export type AgentUpdate = Partial<AgentCreate>;

export const AGENT_TYPES = [
    { value: 'evidence', label: 'Coletor de Evidências', icon: 'MagnifyingGlass' },
    { value: 'policy', label: 'Modelador de Políticas', icon: 'Scales' },
    { value: 'demographics', label: 'Analista Demográfico', icon: 'Users' },
    { value: 'validator', label: 'Validador de Fatos', icon: 'CheckCircle' },
    { value: 'compliance', label: 'Auditor de Compliance', icon: 'ShieldCheck' },
    { value: 'auditor', label: 'Auditor Geral', icon: 'ClipboardText' },
    { value: 'simulator', label: 'Simulador de Cenários', icon: 'GameController' },
    { value: 'generic', label: 'Genérico', icon: 'Robot' },
];

export const AVAILABLE_TOOLS = [
    { value: 'vector_search', label: 'Busca Vetorial (Knowledge Base)', description: 'Acessa documentos internos e planos de governo.' },
    { value: 'web_search', label: 'Pesquisa Web', description: 'Realiza buscas no Google/Bing para informações recentes.' },
    { value: 'campaign_stats', label: 'Estatísticas da Campanha', description: 'Acessa dados numéricos e demográficos da base.' },
    { value: 'competitor_analysis', label: 'Análise de Competidores', description: 'Monitora e compara dados de adversários.' },
    { value: 'sentiment_analysis', label: 'Análise de Sentimento', description: 'Avalia o tom de textos e menções.' },
    { value: 'pdf_reader', label: 'Leitor de PDF', description: 'Extrai texto de arquivos PDF fornecidos.' },
];

export const COMPLIANCE_RULES = [
    { value: 'no_hatespeech', label: '🚫 Proibir Discurso de Ódio', description: 'Bloqueia conteúdo ofensivo ou discriminatório.' },
    { value: 'impartiality', label: '⚖️ Exigir Imparcialidade', description: 'Obriga o agente a apresentar múltiplos pontos de vista.' },
    { value: 'fact_check', label: '🔍 Verificar Fatos', description: 'Exige confirmação de dados antes de afirmar.' },
    { value: 'lgpd_strict', label: '🔒 Compliance LGPD', description: 'Evita exposição de dados pessoais sensíveis.' },
    { value: 'tone_formal', label: '👔 Tom Formal', description: 'Mantém linguagem estritamente profissional.' },
    { value: 'tone_empathetic', label: '❤️ Tom Empático', description: 'Prioriza acolhimento e compreensão na resposta.' },
];
