"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FloppyDisk, Trash, CircleNotch, X, TerminalWindow, CaretUp, Play, ArrowSquareOut, BookBookmark } from "@phosphor-icons/react";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import CrewVisualizer from "@/components/admin/CrewVisualizer";
import { ExecutionConsole } from "@/components/admin/ExecutionConsole";
import { CreatePersonaDialog, AVAILABLE_AGENTS } from "@/components/admin/CreatePersonaDialog";
import { Agent } from "@/types/agent";

// Opções de modelos LLM disponíveis
const LLM_OPTIONS = [
    {
        label: "⚡ Groq Cloud (Grátis & Ultra-Rápido)",
        options: [
            // O novo Flagship da Meta (Grátis na Groq)
            { value: "groq/llama-3.3-70b-versatile", label: "Llama 3.3 70B (Novo & Potente) 🚀" },
            // O modelo de velocidade instantânea
            { value: "groq/llama-3.1-8b-instant", label: "Llama 3.1 8B (Instantâneo)" },
            // O Mixtral continua valendo
            { value: "groq/mixtral-8x7b-32768", label: "Mixtral 8x7B" }
        ]
    },
    {
        label: "✨ Gratuitos / Experimental (OpenRouter)",
        options: [
            // O Gemini 2.0 é o novo rei do Free Tier (Contexto gigante)
            { value: "openrouter/google/gemini-2.0-flash-exp:free", label: "Gemini 2.0 Flash Exp (Free) 🚀" },
            { value: "openrouter/deepseek/deepseek-r1:free", label: "DeepSeek R1 (Free)" },
            { value: "openrouter/meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B (Free)" }
        ]
    },
    {
        label: "OpenAI (Nativo)",
        options: [
            { value: "gpt-4o-mini", label: "GPT-4o Mini (Rápido & Econômico)" },
            { value: "gpt-4o", label: "GPT-4o (Alta Inteligência)" }
        ]
    },
    {
        label: "Alta Performance (OpenRouter)",
        options: [
            { value: "openrouter/anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet (Melhor Texto)" },
            { value: "openrouter/deepseek/deepseek-chat", label: "DeepSeek V3 (Custo/Benefício)" }
        ]
    }
];

interface AgentConfig {
    role: string;
    goal: string;
    backstory: string;
}

// Tipos de agentes válidos para index
type AgentName = 'analyst' | 'strategist' | 'planner';

interface PersonaConfig {
    // Parâmetros de Execução
    task_count?: number;
    temperature?: number;
    max_iter?: number;
    num_examples?: number;
    tone?: string;
    process_type?: 'sequential' | 'hierarchical';
    manager_model?: string;  // LLM do Manager Agent (hierárquico only)

    // Metadados do Template (novo formato dinâmico)
    template_id?: string;
    template_name?: string;
    agents?: Record<string, AgentConfig>;

    // Configuração dos Agentes (legado)
    analyst: AgentConfig;
    strategist: AgentConfig;
    planner: AgentConfig;
}

interface Persona {
    id: string;
    name: string;
    display_name: string;
    description: string;
    icon: string;
    config: PersonaConfig;
    llm_model?: string;  // Modelo LLM (ex: "gpt-4o-mini", "openrouter/x-ai/grok-beta")
    type?: 'strategy' | 'tactical';  // Tipo: estratégico (Genesis) ou tático (Micro-Targeting)
    is_active: boolean;
}

export default function AgentesPage() {
    const router = useRouter();
    const [personas, setPersonas] = useState<Persona[]>([]);
    const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
    const [originalPersona, setOriginalPersona] = useState<Persona | null>(null); // Para detectar mudanças
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [typeFilter, setTypeFilter] = useState<'all' | 'strategy' | 'tactical'>('all');
    const [libraryAgents, setLibraryAgents] = useState<Agent[]>([]); // Agents from Library
    const { toast } = useToast();

    // Detecta mudanças não salvas
    useEffect(() => {
        if (selectedPersona && originalPersona) {
            const hasChanges = JSON.stringify(selectedPersona) !== JSON.stringify(originalPersona);
            setHasUnsavedChanges(hasChanges);
        } else {
            setHasUnsavedChanges(false);
        }
    }, [selectedPersona, originalPersona]);

    useEffect(() => {
        fetchPersonas();
        // Fetch library agents
        const fetchLibraryAgents = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                const res = await fetch(`${apiUrl}/api/agents`);
                if (res.ok) {
                    const data = await res.json();
                    console.log("[Library Agents] Loaded:", data.length, "agents");
                    setLibraryAgents(data);
                } else {
                    console.warn("[Library Agents] Fetch failed:", res.status);
                }
            } catch (e) { console.error("[Library Agents] Failed to fetch:", e); }
        };
        fetchLibraryAgents();
    }, []);


    const fetchPersonas = async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/personas");
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            // Garante que personas seja sempre um array
            const personasArray = Array.isArray(data.personas) ? data.personas : [];
            setPersonas(personasArray);
            if (personasArray.length > 0 && !selectedPersona) {
                setSelectedPersona(personasArray[0]);
                setOriginalPersona(personasArray[0]);
            }
        } catch (error) {
            console.error("Erro ao carregar personas:", error);
            setPersonas([]); // Garante array vazio em caso de erro
            toast({
                title: "Erro",
                description: "Não foi possível carregar as personas.",
                variant: "destructive",
            });
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!selectedPersona) return;

        setSaving(true);
        try {
            const response = await fetch(`/api/personas/${selectedPersona.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    display_name: selectedPersona.display_name,
                    description: selectedPersona.description,
                    icon: selectedPersona.icon,
                    config: selectedPersona.config,
                    llm_model: selectedPersona.llm_model || "gpt-4o-mini",
                    type: selectedPersona.type || "strategy",  // Inclui o tipo
                }),
            });

            if (!response.ok) throw new Error("Falha ao salvar");

            toast({
                title: "Sucesso!",
                description: "Persona atualizada com sucesso.",
            });

            // Reset original para limpar indicador de mudanças
            setOriginalPersona(JSON.parse(JSON.stringify(selectedPersona)));
            fetchPersonas();
        } catch (error) {
            toast({
                title: "Erro",
                description: "Não foi possível salvar a persona.",
                variant: "destructive",
            });
        }
        setSaving(false);
    };

    const handleDelete = async () => {
        if (!selectedPersona) return;

        setSaving(true); // Reutiliza estado de saving para loading visual
        try {
            const response = await fetch(`/api/personas/${selectedPersona.id}`, {
                method: "DELETE",
            });

            if (!response.ok) throw new Error("Falha ao excluir");

            toast({
                title: "Persona Removida",
                description: "A persona foi movida para a lixeira (inativa).",
            });

            // Atualiza a lista e limpa a seleção
            await fetchPersonas();
            setSelectedPersona(null);
            setIsRightPanelOpen(false);

        } catch (error) {
            toast({
                title: "Erro ao excluir",
                description: "Não foi possível remover a persona.",
                variant: "destructive",
            });
        }
        setSaving(false);
    };

    const updateAgentField = (
        agentType: "analyst" | "strategist" | "planner",
        field: keyof AgentConfig,
        value: string
    ) => {
        if (!selectedPersona) return;

        const legacyKeys = ['analyst', 'strategist', 'planner'];
        const isLegacyKey = legacyKeys.includes(agentType);

        if (isLegacyKey) {
            // Legacy format
            setSelectedPersona({
                ...selectedPersona,
                config: {
                    ...selectedPersona.config,
                    [agentType]: {
                        ...(selectedPersona.config as any)[agentType],
                        [field]: value,
                    },
                },
            });
        } else {
            // Dynamic format: config.agents[key]
            const currentAgents = selectedPersona.config.agents || {};
            setSelectedPersona({
                ...selectedPersona,
                config: {
                    ...selectedPersona.config,
                    agents: {
                        ...currentAgents,
                        [agentType]: {
                            ...(currentAgents[agentType] || {}),
                            [field]: value,
                        },
                    },
                },
            });
        }
    };

    // Helper para acessar config de agente de forma type-safe
    const getAgentConfig = (agentName: string): AgentConfig | null => {
        if (!selectedPersona?.config) return null;

        const legacyKeys = ['analyst', 'strategist', 'planner'];
        if (legacyKeys.includes(agentName)) {
            return (selectedPersona.config as any)[agentName] || null;
        }

        // Dynamic format: config.agents[key]
        return selectedPersona.config.agents?.[agentName] || null;
    };

    // --- NOVAS FUNCIONALIDADES ---

    // 1. Template Padrão para Novas Personas (COM PARÂMETROS DE EXECUÇÃO)
    const DEFAULT_PERSONA_CONFIG = {
        // Parâmetros de Execução
        task_count: 10,          // Quantidade de tarefas a gerar (5-50)
        temperature: 0.7,        // Criatividade: 0.3 (baixa), 0.7 (média), 1.0 (alta)
        max_iter: 15,            // Máximo de iterações por agente (1-50)
        num_examples: 2,         // Exemplos por tarefa (0-5)
        process_type: 'sequential' as const,  // Dinâmica: sequential ou hierarchical
        manager_model: 'gpt-4o', // LLM do Manager (hierárquico only)

        // Configuração dos Agentes
        analyst: {
            role: "Analista Político Sênior",
            goal: "Analisar dados eleitorais e identificar tendências críticas",
            backstory: "Especialista com 20 anos de experiência em análise de dados eleitorais, focado em encontrar padrões ocultos."
        },
        strategist: {
            role: "Estrategista de Campanha",
            goal: "Desenvolver narrativas vencedoras e posicionamento",
            backstory: "Consultor renomado que já coordenou diversas campanhas vitoriosas, mestre em Sun Tzu e Maquiavel."
        },
        planner: {
            role: "Gerente de Planejamento Tático",
            goal: "Transformar estratégias em planos de ação concretos",
            backstory: "Especialista em logística e execução de campanhas, focado em resultados mensuráveis e cronogramas."
        }
    };

    const handleCreatePersona = async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/personas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: `nova_estrategia_${Date.now()}`, // Nome único
                    display_name: "Nova Estratégia",
                    description: "Descreva o comportamento desta persona...",
                    icon: "🤖",
                    llm_model: "openrouter/x-ai/grok-beta", // Padrão Grok Free
                    config: DEFAULT_PERSONA_CONFIG,
                    is_active: true
                }),
            });

            if (!response.ok) throw new Error("Falha ao criar");

            const newPersona = await response.json();

            toast({
                title: "Persona Criada!",
                description: "Template padrão aplicado. Edite conforme necessário.",
            });

            // Atualiza lista e seleciona a nova
            await fetchPersonas();
            // Pequeno delay para garantir que o estado atualizou antes de selecionar (opcional, mas seguro)
            // Na verdade, fetchPersonas atualiza 'personas', mas precisamos encontrar a nova para setar em 'selectedPersona'
            // Vamos assumir que o backend retorna o objeto criado corretamente.
            if (newPersona) {
                setSelectedPersona(newPersona);
            }

        } catch (error) {
            toast({
                title: "Erro ao criar",
                description: "Não foi possível criar a nova persona.",
                variant: "destructive",
            });
        }
        setLoading(false);
    };

    // 2. Seletor de Campanhas para Simulação
    interface Campaign {
        id: string;
        title: string; // ou name, dependendo da sua API
    }
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");

    useEffect(() => {
        const fetchCampaigns = async () => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('campaigns')
                .select('id, name')  // CORRIGIDO: era 'title', mas o schema usa 'name'
                .order('created_at', { ascending: false });

            if (data) {
                // Mapeia para garantir compatibilidade
                const formattedCampaigns = data.map(c => ({
                    id: c.id,
                    title: c.name || "Campanha sem nome"  // Mantém 'title' internamente para compatibilidade
                }));
                setCampaigns(formattedCampaigns);
            }
        };
        fetchCampaigns();
    }, []);

    const [isSimulating, setIsSimulating] = useState(false); // ⭐ NOVO: Estado de loading da simulação

    const handleSimulate = async () => {
        if (!selectedCampaignId || !selectedPersona) return;

        setIsSimulating(true); // Inicia loading
        toast({
            title: "🚀 Iniciando Simulação",
            description: `Disparando Genesis Crew com ${selectedPersona.llm_model}...`
        });

        try {
            const res = await fetch(`/api/campaign/${selectedCampaignId}/genesis`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ persona: selectedPersona.name })
            });

            if (res.ok) {
                const data = await res.json();

                // ⭐ NOVO: Captura o run_id da resposta
                if (data.run_id) {
                    setCurrentRunId(data.run_id);
                    setIsConsoleOpen(true); // Abre o console automaticamente
                }

                toast({
                    title: "Sucesso!",
                    description: "A IA está trabalhando. Acompanhe os logs no console abaixo."
                });
            } else {
                throw new Error("Falha na requisição");
            }
        } catch (e) {
            console.error(e);
            toast({
                title: "Erro na simulação",
                description: "Verifique se o backend está rodando.",
                variant: "destructive"
            });
        } finally {
            setIsSimulating(false); // Finaliza loading
        }
    };

    const [isEditorOpen, setIsEditorOpen] = useState(true);
    const [isConsoleOpen, setIsConsoleOpen] = useState(false);
    const [currentRunId, setCurrentRunId] = useState<string | null>(null); // ⭐ NOVO: ID da execução
    const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isRightPanelOpen, setIsRightPanelOpen] = useState(false); // Controla se o painel direito está aberto
    const [activeExecutionAgent, setActiveExecutionAgent] = useState<string | null>(null); // ⭐ NOVO: Agente ativo na execução

    // Função para processar novos logs e animar o visualizador
    const handleNewLog = (log: any) => {
        const agentName = log.agent_name || "";
        let agentId = null;

        if (agentName.includes("Analista")) agentId = "analyst";
        else if (agentName.includes("Estrategista")) agentId = "strategist";
        else if (agentName.includes("Planejador")) agentId = "planner";

        if (agentId) {
            setActiveExecutionAgent(agentId);
            // Remove o destaque após 3 segundos
            setTimeout(() => setActiveExecutionAgent(null), 3000);
        }

        // DETECÇÃO DE FIM DE PROCESSO (AUTO-STOP)
        // Se receber sucesso ou mensagem de finalização, para o loading
        if (log.status === 'success' || log.message.includes("finalizada com sucesso") || log.message.includes("Resultados salvos")) {
            setIsSimulating(false);

            // Só dispara o toast se ainda estava simulando (para evitar duplicidade)
            if (isSimulating) {
                toast({
                    title: "Simulação Concluída! 🏁",
                    description: "O Plano Tático foi gerado com sucesso.",
                    action: (
                        <ToastAction
                            altText="Ver no Setup"
                            onClick={() => router.push(`/admin/campaign/${selectedCampaignId}/setup`)}
                        >
                            Ver no Setup
                        </ToastAction>
                    ),
                    duration: 10000, // Fica mais tempo na tela
                });
            }
        }

        // Se der erro crítico
        if (log.status === 'error') {
            setIsSimulating(false);
        }
    };

    // ... (fetchPersonas and handleSave logic remains same)

    // 🔧 FIX: Open panel when a persona is selected from the list
    // Só executa quando o ID da persona muda, NÃO quando campos são editados
    useEffect(() => {
        if (selectedPersona) {
            setIsRightPanelOpen(true);
            setSelectedAgent(null);
            // Salva cópia para detectar mudanças
            setOriginalPersona(JSON.parse(JSON.stringify(selectedPersona)));
        }
    }, [selectedPersona?.id]);

    // ⌨️ ATALHOS DE TECLADO
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd+S ou Ctrl+S -> Salvar
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                if (selectedPersona && hasUnsavedChanges && !saving) {
                    handleSave();
                }
            }
            // Cmd+Enter ou Ctrl+Enter -> Simular
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                if (selectedPersona && selectedCampaignId && !isSimulating) {
                    handleSimulate();
                }
            }
            // Esc -> Fechar painel
            if (e.key === 'Escape') {
                setIsRightPanelOpen(false);
                setSelectedAgent(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedPersona, hasUnsavedChanges, saving, selectedCampaignId, isSimulating]);

    // Handler para cliques no nó (agente)
    const handleNodeClick = (nodeId: string | null) => {
        if (nodeId) {
            setIsRightPanelOpen(true);
            setSelectedAgent(nodeId);
        } else {
            setIsRightPanelOpen(false);
            setSelectedAgent(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <CircleNotch className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    // ... (fetchPersonas, handleSave, updateAgentField logic)

    return (
        <div className="relative h-screen w-full overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
            {/* ============================================= */}
            {/* LAYER 0: INFINITE CANVAS (Full Screen) */}
            {/* ============================================= */}
            <div className="absolute inset-0 z-0">
                <CrewVisualizer
                    persona={selectedPersona}
                    selectedNodeId={selectedAgent}
                    activeExecutionAgent={activeExecutionAgent}
                    onNodeClick={handleNodeClick}
                />
            </div>

            {/* ============================================= */}
            {/* LAYER 1: FLOATING ISLAND - Navigation (Top Left) */}
            {/* ============================================= */}
            <div className="absolute top-4 left-4 z-20">
                <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg border border-white/50 p-2">
                    <div className="flex items-center gap-2">
                        {/* Persona Selector */}
                        <Select
                            value={selectedPersona?.id || ""}
                            onValueChange={(id) => {
                                const p = personas.find(p => p.id === id);
                                if (p) setSelectedPersona(p);
                            }}
                        >
                            <SelectTrigger className="w-[220px] h-10 bg-transparent border-0 shadow-none hover:bg-slate-100 transition-colors">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">{selectedPersona?.icon || '🤖'}</span>
                                    <span className="font-medium truncate">
                                        {selectedPersona?.display_name || 'Selecione uma Equipe'}
                                    </span>
                                </div>
                            </SelectTrigger>
                            <SelectContent className="max-h-[400px]">
                                {/* Filter Tabs inside Dropdown */}
                                <div className="p-2 border-b sticky top-0 bg-white z-10">
                                    <div className="flex gap-1 p-1 bg-muted rounded-lg">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setTypeFilter('all'); }}
                                            className={`flex-1 py-1 px-2 text-xs font-medium rounded-md transition-all ${typeFilter === 'all' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                                                }`}
                                        >
                                            Todos
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setTypeFilter('strategy'); }}
                                            className={`flex-1 py-1 px-2 text-xs font-medium rounded-md transition-all ${typeFilter === 'strategy' ? 'bg-purple-600 text-white' : 'text-muted-foreground'
                                                }`}
                                        >
                                            🎯 Estratégia
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setTypeFilter('tactical'); }}
                                            className={`flex-1 py-1 px-2 text-xs font-medium rounded-md transition-all ${typeFilter === 'tactical' ? 'bg-orange-600 text-white' : 'text-muted-foreground'
                                                }`}
                                        >
                                            ⚔️ Tático
                                        </button>
                                    </div>
                                </div>

                                {personas
                                    .filter(p => typeFilter === 'all' || p.type === typeFilter || (!p.type && typeFilter === 'strategy'))
                                    .map((persona) => (
                                        <SelectItem key={persona.id} value={persona.id}>
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">{persona.icon}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">{persona.display_name}</span>
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-[9px] px-1 py-0 ${persona.type === 'tactical'
                                                                ? 'border-orange-400 text-orange-600'
                                                                : 'border-purple-400 text-purple-600'
                                                                }`}
                                                        >
                                                            {persona.config?.template_name || (persona.type === 'tactical' ? '⚔️' : '🎯')}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>

                        {/* Divider */}
                        <div className="h-6 w-px bg-slate-200" />

                        {/* Create New Button */}
                        <CreatePersonaDialog
                            onPersonaCreated={(newPersona) => {
                                fetchPersonas();
                                setSelectedPersona(newPersona);
                            }}
                            trigger={
                                <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-slate-100">
                                    <Plus className="h-5 w-5 text-slate-600" />
                                </Button>
                            }
                        />
                    </div>
                </div>
            </div>

            {/* ============================================= */}
            {/* LAYER 2: FLOATING ISLAND - Actions (Top Right) */}
            {/* ============================================= */}
            <div className="absolute top-4 right-4 z-20">
                <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg border border-white/50 p-2 flex items-center gap-2">
                    {/* Simulate Button */}
                    <Button
                        className="bg-green-600 hover:bg-green-700 text-white gap-2 shadow-md"
                        onClick={handleSimulate}
                        disabled={!selectedCampaignId || !selectedPersona || isSimulating}
                    >
                        {isSimulating ? (
                            <CircleNotch className="h-4 w-4 animate-spin" />
                        ) : (
                            <Play className="h-4 w-4" />
                        )}
                        {isSimulating ? 'Executando...' : 'Simular'}
                    </Button>

                    {/* Campaign Selector Mini */}
                    <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                        <SelectTrigger className="w-[160px] h-9 bg-slate-50 border-0">
                            <SelectValue placeholder="Campanha..." />
                        </SelectTrigger>
                        <SelectContent>
                            {campaigns.length === 0 ? (
                                <SelectItem value="none" disabled>Nenhuma campanha</SelectItem>
                            ) : (
                                campaigns.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>

                    {/* Divider */}
                    <div className="h-6 w-px bg-slate-200" />

                    {/* Settings Toggle */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`h-9 w-9 transition-colors ${isRightPanelOpen ? 'bg-slate-100' : ''}`}
                        onClick={() => {
                            if (selectedPersona) {
                                setIsRightPanelOpen(!isRightPanelOpen);
                                setSelectedAgent(null);
                            }
                        }}
                        disabled={!selectedPersona}
                    >
                        <TerminalWindow className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* ============================================= */}
            {/* LAYER 3: RIGHT DRAWER - Settings Panel */}
            {/* ============================================= */}
            <div className={`
                absolute top-4 right-4 bottom-20 w-[40%] min-w-[420px] max-w-[600px] z-30
                transition-all duration-300 ease-out
                ${selectedPersona && isRightPanelOpen
                    ? 'translate-x-0 opacity-100 pointer-events-auto'
                    : 'translate-x-[120%] opacity-0 pointer-events-none'
                }
            `}>
                {selectedPersona && isRightPanelOpen && (
                    <Card className="h-full flex flex-col rounded-2xl shadow-2xl border-0 bg-white/98 backdrop-blur-xl overflow-hidden">
                        {/* Header */}
                        <div className="p-6 pb-4 border-b bg-gradient-to-b from-slate-50 to-white">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center text-3xl shadow-sm">
                                        {selectedPersona.icon}
                                    </div>
                                    <div className="space-y-1">
                                        <Input
                                            className="text-xl font-bold h-8 px-0 border-0 shadow-none focus-visible:ring-0 bg-transparent"
                                            value={selectedPersona.display_name}
                                            onChange={(e) => setSelectedPersona({ ...selectedPersona, display_name: e.target.value })}
                                        />
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="text-xs">
                                                {selectedPersona.config?.template_name || 'Padrão'}
                                            </Badge>
                                            <Badge
                                                variant="outline"
                                                className={`text-xs ${selectedPersona.config?.process_type === 'hierarchical'
                                                    ? 'border-amber-400 text-amber-700 bg-amber-50'
                                                    : 'border-blue-400 text-blue-700 bg-blue-50'
                                                    }`}
                                            >
                                                {selectedPersona.config?.process_type === 'hierarchical' ? '🎩 Hierárquico' : '🔗 Sequencial'}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <Button
                                        onClick={handleSave}
                                        disabled={saving || !hasUnsavedChanges}
                                        size="icon"
                                        className="h-9 w-9 relative"
                                        title="Salvar (Cmd+S)"
                                    >
                                        {saving ? (
                                            <CircleNotch className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <FloppyDisk className="h-4 w-4" />
                                        )}
                                        {/* Badge de "não salvo" */}
                                        {hasUnsavedChanges && !saving && (
                                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                                        )}
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => { setIsRightPanelOpen(false); setSelectedAgent(null); }}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Description */}
                            <Textarea
                                className="text-sm text-muted-foreground min-h-[48px] px-0 border-0 shadow-none focus-visible:ring-0 resize-none bg-transparent"
                                value={selectedPersona.description}
                                onChange={(e) => setSelectedPersona({ ...selectedPersona, description: e.target.value })}
                                placeholder="Descrição da equipe..."
                                rows={2}
                            />
                        </div>

                        {/* ========== SEÇÃO: MOTOR DE IA ========== */}
                        <div className="px-6 py-4 border-b bg-gradient-to-r from-purple-50/50 to-indigo-50/50">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-base">🧠</span>
                                <h3 className="text-xs font-semibold text-purple-800 uppercase tracking-wide">Motor de IA</h3>
                            </div>

                            {/* LLM Principal dos Workers */}
                            <div className="space-y-2 mb-3">
                                <label className="text-[10px] font-medium text-purple-700 uppercase">LLM dos Agentes (Workers)</label>
                                <Select
                                    value={selectedPersona.llm_model || 'gpt-4o-mini'}
                                    onValueChange={(value) => setSelectedPersona({
                                        ...selectedPersona,
                                        llm_model: value
                                    })}
                                    disabled={saving || isSimulating}
                                >
                                    <SelectTrigger className="h-9 bg-white border-purple-200">
                                        <SelectValue placeholder="Selecione o LLM" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {LLM_OPTIONS.map((group) => (
                                            <SelectGroup key={group.label}>
                                                <SelectLabel>{group.label}</SelectLabel>
                                                {group.options.map((opt) => (
                                                    <SelectItem key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* LLM do Manager (apenas hierárquico) */}
                            {selectedPersona.config?.process_type === 'hierarchical' && (
                                <div className="space-y-2 pt-3 border-t border-dashed border-amber-200">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-medium text-amber-700 uppercase flex items-center gap-1">
                                            <span>🎩</span> LLM do Manager (Coordenador)
                                        </label>
                                        <Badge variant="outline" className="text-[9px] border-amber-300 text-amber-600 bg-amber-50">
                                            Hierárquico
                                        </Badge>
                                    </div>
                                    <Select
                                        value={selectedPersona.config?.manager_model || 'gpt-4o'}
                                        onValueChange={(value) => setSelectedPersona({
                                            ...selectedPersona,
                                            config: { ...selectedPersona.config, manager_model: value }
                                        })}
                                        disabled={saving || isSimulating}
                                    >
                                        <SelectTrigger className="h-9 bg-white border-amber-200">
                                            <SelectValue placeholder="Selecione o LLM do Manager" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {LLM_OPTIONS.map((group) => (
                                                <SelectGroup key={group.label}>
                                                    <SelectLabel>{group.label}</SelectLabel>
                                                    {group.options.map((opt) => (
                                                        <SelectItem key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectGroup>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[9px] text-amber-600/80">
                                        Recomendado: GPT-4o para evitar erros de delegação.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <CardContent className="flex-1 overflow-y-auto p-6">
                            {selectedAgent ? (
                                // MODO INSPECTOR (AGENTE)
                                <div key={selectedAgent} className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                    <div className="flex items-center gap-3 pb-4 border-b">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl border-2 ${selectedAgent === 'analyst' ? 'bg-blue-100 border-blue-500' :
                                            selectedAgent === 'strategist' ? 'bg-purple-100 border-purple-500' :
                                                'bg-green-100 border-green-500'
                                            }`}>
                                            {selectedAgent === 'analyst' ? '🕵️‍♂️' :
                                                selectedAgent === 'strategist' ? '🧠' : '⚡'}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg capitalize">
                                                {selectedAgent === 'analyst' ? 'Analista' :
                                                    selectedAgent === 'strategist' ? 'Estrategista' : 'Planejador'}
                                            </h3>
                                            <p className="text-xs text-muted-foreground">Editando configurações</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {/* Library Agent Selector */}
                                        <div className="space-y-2 p-3 rounded-lg border border-dashed border-purple-200 bg-purple-50/30">
                                            <label className="text-xs font-medium uppercase text-purple-600 flex items-center gap-1.5">
                                                <BookBookmark className="w-3.5 h-3.5" />
                                                Carregar da Biblioteca (Opcional)
                                            </label>
                                            <Select
                                                value=""
                                                onValueChange={(agentId) => {
                                                    const libAgent = libraryAgents.find(a => a.id === agentId);
                                                    if (libAgent && selectedAgent && selectedPersona) {
                                                        const agentKey = selectedAgent;
                                                        const newAgentData = {
                                                            role: libAgent.role,
                                                            goal: libAgent.description || libAgent.role,
                                                            backstory: libAgent.system_prompt?.slice(0, 500) || '',
                                                        };

                                                        // Check if it's a legacy key or dynamic agents key
                                                        const legacyKeys = ['analyst', 'strategist', 'planner'];
                                                        const isLegacyKey = legacyKeys.includes(agentKey);

                                                        if (isLegacyKey) {
                                                            // Legacy format: config.analyst, config.strategist, config.planner
                                                            setSelectedPersona({
                                                                ...selectedPersona,
                                                                config: {
                                                                    ...selectedPersona.config,
                                                                    [agentKey]: {
                                                                        ...(selectedPersona.config as any)[agentKey],
                                                                        ...newAgentData,
                                                                    },
                                                                },
                                                            });
                                                        } else {
                                                            // Dynamic format: config.agents[key]
                                                            const currentAgents = selectedPersona.config.agents || {};
                                                            setSelectedPersona({
                                                                ...selectedPersona,
                                                                config: {
                                                                    ...selectedPersona.config,
                                                                    agents: {
                                                                        ...currentAgents,
                                                                        [agentKey]: {
                                                                            ...(currentAgents[agentKey] || {}),
                                                                            ...newAgentData,
                                                                        },
                                                                    },
                                                                },
                                                            });
                                                        }
                                                        toast({ title: "✅ Modelo Aplicado!", description: `${libAgent.display_name} carregado em ${agentKey.toUpperCase()}.` });
                                                    }
                                                }}
                                            >
                                                <SelectTrigger className="bg-white border-purple-300 focus:ring-purple-400">
                                                    <SelectValue placeholder="Selecionar modelo enterprise..." />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white shadow-xl border rounded-xl z-[100]">
                                                    {libraryAgents.length === 0 ? (
                                                        <SelectItem value="loading" disabled>Carregando...</SelectItem>
                                                    ) : (
                                                        libraryAgents.map(agent => (
                                                            <SelectItem key={agent.id} value={agent.id}>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-medium">{agent.display_name}</span>
                                                                    <Badge variant="outline" className="text-[9px]">{agent.type}</Badge>
                                                                </div>
                                                            </SelectItem>
                                                        ))
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            <p className="text-[10px] text-muted-foreground">
                                                Selecione um agente enterprise para herdar Role, Goal e Backstory.
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium uppercase text-muted-foreground">Papel (Role)</label>
                                            <Input
                                                value={getAgentConfig(selectedAgent)?.role || ''}
                                                onChange={(e) =>
                                                    updateAgentField(selectedAgent as any, "role", e.target.value)
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium uppercase text-muted-foreground">Objetivo (Goal)</label>
                                            <Textarea
                                                value={getAgentConfig(selectedAgent)?.goal || ''}
                                                onChange={(e) =>
                                                    updateAgentField(selectedAgent as any, "goal", e.target.value)
                                                }
                                                rows={4}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium uppercase text-muted-foreground">História (Backstory)</label>
                                            <Textarea
                                                value={getAgentConfig(selectedAgent)?.backstory || ''}
                                                onChange={(e) =>
                                                    updateAgentField(selectedAgent as any, "backstory", e.target.value)
                                                }
                                                rows={8}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                // MODO CONFIGURAÇÃO GERAL DA PERSONA (REFACTORED)
                                <div className="space-y-8 animate-in fade-in-50 duration-300 px-1">

                                    {/* (A) CABEÇALHO DO AGENTE */}
                                    <div className="space-y-3">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                                                    {selectedPersona.display_name}
                                                </h2>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 uppercase tracking-widest">
                                                        {selectedPersona.type === 'tactical' ? 'Tático' : 'Estratégico'}
                                                    </Badge>
                                                    <Badge variant="outline" className="text-[10px] uppercase tracking-widest text-muted-foreground">
                                                        {selectedPersona.config?.process_type === 'hierarchical' ? 'Hierárquico' : 'Sequencial'}
                                                    </Badge>
                                                    <Badge variant="outline" className="text-[10px] uppercase tracking-widest text-muted-foreground border-purple-200 text-purple-700 bg-purple-50/50">
                                                        {selectedPersona.llm_model?.split('/')[1] || selectedPersona.llm_model || 'GPT-4o'}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-indigo-50 border border-purple-100 flex items-center justify-center text-2xl shadow-sm">
                                                {selectedPersona.icon || '🤖'}
                                            </div>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {selectedPersona.description?.slice(0, 80) || "Agente de inteligência artificial da campanha."}...
                                        </p>
                                    </div>

                                    {/* (B) PAPEL & DESCRIÇÃO */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Papel na Crew</h3>
                                            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">Core Identity</span>
                                        </div>
                                        <Textarea
                                            value={selectedPersona.description || ''}
                                            onChange={(e) => setSelectedPersona({
                                                ...selectedPersona,
                                                description: e.target.value
                                            })}
                                            className="min-h-[100px] text-sm leading-relaxed resize-none bg-muted/20 border-border/50 focus:border-purple-300 focus:bg-background transition-all"
                                            placeholder="Descreva o papel detalhado deste agente..."
                                        />
                                    </div>

                                    {/* (C) PARÂMETROS DE EXECUÇÃO */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Parâmetros de Execução</h3>
                                        </div>

                                        <div className="grid grid-cols-1 gap-6 p-4 rounded-xl border border-border/50 bg-slate-50/50">
                                            {/* Temperatura */}
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center bg-white p-1 rounded-full border shadow-sm">
                                                    {[
                                                        { value: 0.3, label: 'Precisa', icon: '🎯' },
                                                        { value: 0.7, label: 'Balanceada', icon: '⚖️' },
                                                        { value: 1.0, label: 'Criativa', icon: '🎨' }
                                                    ].map((opt) => (
                                                        <button
                                                            key={opt.value}
                                                            type="button"
                                                            onClick={() => setSelectedPersona({
                                                                ...selectedPersona,
                                                                config: { ...selectedPersona.config, temperature: opt.value }
                                                            })}
                                                            className={`flex-1 py-1.5 px-3 rounded-full text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${(selectedPersona.config?.temperature || 0.7) === opt.value
                                                                ? 'bg-purple-600 text-white shadow-md'
                                                                : 'text-muted-foreground hover:bg-slate-100 hover:text-foreground'
                                                                }`}
                                                        >
                                                            <span>{opt.icon}</span>
                                                            <span>{opt.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                                <p className="text-[10px] text-center text-muted-foreground">
                                                    Define o "calor" da criatividade (Temperatura: {selectedPersona.config?.temperature || 0.7})
                                                </p>
                                            </div>

                                            {/* Inputs Numéricos (Grid) */}
                                            <div className="grid grid-cols-2 gap-4">
                                                {/* Tasks */}
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-slate-600">Qtd. Tarefas</label>
                                                    <div className="relative">
                                                        <Input
                                                            type="number"
                                                            className="h-9 bg-white text-center font-mono text-sm"
                                                            value={selectedPersona.config?.task_count || 10}
                                                            onChange={(e) => setSelectedPersona({
                                                                ...selectedPersona,
                                                                config: { ...selectedPersona.config, task_count: parseInt(e.target.value) }
                                                            })}
                                                        />
                                                        <div className="absolute right-2 top-2.5 text-[10px] text-muted-foreground pointer-events-none">itens</div>
                                                    </div>
                                                </div>

                                                {/* Max Iter */}
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-slate-600">Max Iterações</label>
                                                    <div className="relative">
                                                        <Input
                                                            type="number"
                                                            className="h-9 bg-white text-center font-mono text-sm"
                                                            value={selectedPersona.config?.max_iter || 15}
                                                            onChange={(e) => setSelectedPersona({
                                                                ...selectedPersona,
                                                                config: { ...selectedPersona.config, max_iter: parseInt(e.target.value) }
                                                            })}
                                                        />
                                                        <div className="absolute right-2 top-2.5 text-[10px] text-muted-foreground pointer-events-none">loops</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Exemplos Slider */}
                                            <div className="space-y-3 pt-2 border-t border-dashed">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-xs font-medium text-slate-600">Exemplos por Tarefa: <span className="text-purple-600 font-bold">{selectedPersona.config?.num_examples ?? 2}</span></label>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="5"
                                                    step="1"
                                                    value={selectedPersona.config?.num_examples ?? 2}
                                                    onChange={(e) => setSelectedPersona({
                                                        ...selectedPersona,
                                                        config: { ...selectedPersona.config, num_examples: parseInt(e.target.value) }
                                                    })}
                                                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                                />
                                            </div>


                                        </div>
                                    </div>

                                    {/* (D) DIRETRIZES DE ESTILO & PROMPT */}
                                    <div className="space-y-4 pt-2">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Estilo & Tom</h3>
                                            <div className="flex items-center gap-2">
                                                <Label htmlFor="custom-prompt" className="text-[10px] text-muted-foreground cursor-pointer">Prompt Custom</Label>
                                                <Switch id="custom-prompt" checked={true} disabled />
                                            </div>
                                        </div>

                                        <div className="relative group">
                                            <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-300 via-purple-300 to-indigo-300 rounded-xl opacity-30 blur group-hover:opacity-60 transition duration-1000"></div>
                                            <div className="relative bg-white rounded-xl">
                                                <Textarea
                                                    value={selectedPersona.config?.tone || "Seja formal, analítico e use terminologia política adequada."}
                                                    onChange={(e) => setSelectedPersona({
                                                        ...selectedPersona,
                                                        config: {
                                                            ...selectedPersona.config,
                                                            tone: e.target.value
                                                        }
                                                    })}
                                                    placeholder="Ex: 'Seja agressivo, use metáforas de guerra e foque nos erros do adversário...'"
                                                    className="min-h-[120px] p-4 text-sm resize-none border-0 bg-transparent focus-visible:ring-0"
                                                />
                                                <div className="absolute bottom-2 right-3 text-[10px] text-muted-foreground bg-white/80 px-2 py-0.5 rounded-full backdrop-blur-sm border">
                                                    {selectedPersona.config?.tone?.length || 0} chars
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground text-center">
                                            Esta instrução será injetada em <strong>todas</strong> as tarefas da crew.
                                        </p>
                                    </div>

                                    {/* FOOTER ACTIONS */}
                                    <div className="pt-8 pb-4">
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 text-xs h-9">
                                                    <Trash className="mr-2 h-3.5 w-3.5" /> Excluir esta Persona
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Excluir Persona?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        "{selectedPersona.display_name}" será arquivada.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={handleDelete} className="bg-red-600">Excluir</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Toggle Editor Button (when closed) */}
            {/* {!isEditorOpen && selectedPersona && (
                <Button
                    className="absolute top-4 right-4 z-10"
                    onClick={() => setIsEditorOpen(true)}
                >
                    Abrir Editor
                </Button>
            )}

            {/* Layer 3: Execution Console (Bottom Sheet) - REAL */}
            <ExecutionConsole
                runId={currentRunId}
                campaignId={selectedCampaignId} // Passa o ID da campanha para habilitar o Stop
                isOpen={isConsoleOpen}
                onToggle={() => setIsConsoleOpen(!isConsoleOpen)}
                onNewLog={handleNewLog} // ⭐ Callback de logs
            />
        </div>
    );
}
