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
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Save, Trash2, Loader2, X, Terminal, ChevronUp, Play, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
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

interface PersonaConfig {
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
    is_active: boolean;
}

export default function AgentesPage() {
    const router = useRouter();
    const [personas, setPersonas] = useState<Persona[]>([]);
    const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchPersonas();
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
                }),
            });

            if (!response.ok) throw new Error("Falha ao salvar");

            toast({
                title: "Sucesso!",
                description: "Persona atualizada com sucesso.",
            });

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

        setSelectedPersona({
            ...selectedPersona,
            config: {
                ...selectedPersona.config,
                [agentType]: {
                    ...selectedPersona.config[agentType],
                    [field]: value,
                },
            },
        });
    };

    // --- NOVAS FUNCIONALIDADES ---

    // 1. Template Padrão para Novas Personas
    const DEFAULT_PERSONA_CONFIG = {
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

    const handleSimulate = async () => {
        if (!selectedCampaignId || !selectedPersona) return;

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
            toast({
                title: "Erro na simulação",
                description: "Verifique se o backend está rodando.",
                variant: "destructive"
            });
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
            // Remove o destaque após 3 segundos (tempo suficiente para ler o log)
            setTimeout(() => setActiveExecutionAgent(null), 3000);
        }
    };

    // ... (fetchPersonas and handleSave logic remains same)

    // 🔧 FIX: Open panel when a persona is selected from the list
    // Só executa quando o ID da persona muda, NÃO quando campos são editados
    useEffect(() => {
        if (selectedPersona) {
            setIsRightPanelOpen(true); // Abre o painel em modo "Geral"
            setSelectedAgent(null); // Garante que estamos no modo Geral, não Inspector
        }
    }, [selectedPersona?.id]); // ✅ Só observa mudanças no ID, não em todo o objeto

    // Handler para cliques no nó (agente)
    const handleNodeClick = (nodeId: string | null) => {
        if (nodeId) {
            setIsRightPanelOpen(true); // Abre o painel
            setSelectedAgent(nodeId); // Modo Inspector
        } else {
            // Click no pane (fundo) - fecha tudo
            setIsRightPanelOpen(false);
            setSelectedAgent(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }



    // ... (fetchPersonas, handleSave, updateAgentField logic)

    return (
        <div className="relative h-[calc(100vh-60px)] w-full overflow-hidden bg-background">
            {/* Layer 0: The Infinite Canvas (Background) */}
            <div className="absolute inset-0 z-0">
                <CrewVisualizer
                    persona={selectedPersona}
                    selectedNodeId={selectedAgent}
                    activeExecutionAgent={activeExecutionAgent} // ⭐ Passando o agente ativo
                    onNodeClick={handleNodeClick}
                />
            </div>

            {/* Sidebar Toggle Button */}
            <Button
                variant="outline"
                size="icon"
                className="absolute top-4 left-4 z-20 bg-background/80 backdrop-blur"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
                {isSidebarOpen ? <ChevronUp className="h-4 w-4 rotate-[-90deg]" /> : <ChevronUp className="h-4 w-4 rotate-90" />}
            </Button>

            {/* Layer 1: Floating Left Panel (Persona List) */}
            <div className={`absolute top-16 left-4 w-80 bottom-20 z-10 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-[120%]'}`}>
                <Card className="h-full shadow-xl border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex flex-col">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <span className="text-xl">🤖</span> Personas
                        </CardTitle>
                        <CardDescription>Gerencie suas equipes de IA</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto space-y-2">
                        {loading ? (
                            <div className="flex justify-center p-4">
                                <Loader2 className="animate-spin" />
                            </div>
                        ) : personas && personas.length > 0 ? (
                            personas.map((persona) => (
                                <div
                                    key={persona.id}
                                    onClick={() => setSelectedPersona(persona)}
                                    className={`p-3 rounded-lg cursor-pointer transition-all border ${selectedPersona?.id === persona.id
                                        ? "bg-primary/10 border-primary shadow-sm"
                                        : "hover:bg-muted border-transparent hover:border-border"
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{persona.icon}</span>
                                        <div>
                                            <div className="font-medium">{persona.display_name}</div>
                                            <div className="text-xs text-muted-foreground line-clamp-1">
                                                {persona.description}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 text-center">
                                <p className="text-muted-foreground text-sm mb-2">Nenhuma persona encontrada</p>
                                <p className="text-xs text-muted-foreground">Clique em "Nova Persona" para criar</p>
                            </div>
                        )}
                    </CardContent>
                    <div className="p-4 border-t mt-auto">
                        <Button className="w-full" variant="outline" onClick={handleCreatePersona}>
                            <Plus className="mr-2 h-4 w-4" /> Nova Persona
                        </Button>
                    </div>
                </Card>
            </div>

            {/* Layer 2: Floating Right Panel (Editor Drawer) */}
            <div className={`absolute top-4 right-4 bottom-20 w-96 z-20 transition-transform duration-300 ease-in-out ${selectedPersona && isRightPanelOpen ? 'translate-x-0 pointer-events-auto' : 'translate-x-[120%] pointer-events-none'}`}>
                {selectedPersona && isRightPanelOpen && (
                    <Card className="h-full flex flex-col shadow-xl border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                        <CardHeader className="pb-2 border-b">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1 mr-4">
                                    <span className="text-3xl">{selectedPersona.icon}</span>
                                    <div className="flex-1 space-y-1">
                                        <Input
                                            className="text-lg font-bold h-9 px-2 border-transparent hover:border-input focus:border-input transition-all bg-transparent"
                                            value={selectedPersona.display_name}
                                            onChange={(e) => setSelectedPersona({ ...selectedPersona, display_name: e.target.value })}
                                            placeholder="Nome da Persona"
                                        />
                                        <Textarea
                                            className="text-xs text-muted-foreground min-h-[40px] px-2 py-1 border-transparent hover:border-input focus:border-input transition-all resize-none bg-transparent shadow-none focus-visible:ring-1"
                                            value={selectedPersona.description}
                                            onChange={(e) => setSelectedPersona({ ...selectedPersona, description: e.target.value })}
                                            placeholder="Descrição curta da persona..."
                                            rows={2}
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <Button onClick={handleSave} disabled={saving} size="sm">
                                        {saving ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Save className="h-4 w-4" />
                                        )}
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => {
                                        setIsRightPanelOpen(false);
                                        setSelectedAgent(null);
                                    }}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="pt-2 space-y-2">
                                {/* Seletor de Campanha */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-medium text-muted-foreground uppercase">
                                        Campanha para Simulação
                                    </label>
                                    <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                                        <SelectTrigger className="w-full h-8 text-xs">
                                            <SelectValue placeholder="Selecione uma campanha..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {campaigns.length === 0 ? (
                                                <SelectItem value="none" disabled>
                                                    Nenhuma campanha cadastrada
                                                </SelectItem>
                                            ) : (
                                                campaigns.map(c => (
                                                    <SelectItem key={c.id} value={c.id}>
                                                        {c.title}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Botão Simular */}
                                <Button
                                    className="w-full bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                    size="sm"
                                    onClick={handleSimulate}
                                    disabled={!selectedCampaignId}
                                >
                                    <Play className="h-4 w-4 mr-2" />
                                    {selectedCampaignId ? 'Simular Execução' : 'Selecione uma Campanha'}
                                </Button>

                                {/* Botão para ir ao Setup manualmente */}
                                {selectedCampaignId && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full mt-2"
                                        onClick={() => router.push(`/admin/campaign/${selectedCampaignId}/setup`)}
                                    >
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        Ver Resultado no Setup
                                    </Button>
                                )}
                            </div>
                        </CardHeader>

                        <CardContent className="flex-1 overflow-y-auto p-4">
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
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium uppercase text-muted-foreground">Papel (Role)</label>
                                            <Input
                                                value={selectedPersona.config[selectedAgent as keyof PersonaConfig].role}
                                                onChange={(e) =>
                                                    updateAgentField(selectedAgent as any, "role", e.target.value)
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium uppercase text-muted-foreground">Objetivo (Goal)</label>
                                            <Textarea
                                                value={selectedPersona.config[selectedAgent as keyof PersonaConfig].goal}
                                                onChange={(e) =>
                                                    updateAgentField(selectedAgent as any, "goal", e.target.value)
                                                }
                                                rows={4}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium uppercase text-muted-foreground">História (Backstory)</label>
                                            <Textarea
                                                value={selectedPersona.config[selectedAgent as keyof PersonaConfig].backstory}
                                                onChange={(e) =>
                                                    updateAgentField(selectedAgent as any, "backstory", e.target.value)
                                                }
                                                rows={8}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                // MODO CONFIGURAÇÃO GERAL DA PERSONA
                                <div className="space-y-6 animate-in fade-in-50 duration-300">
                                    <div className="flex items-center gap-3 pb-4 border-b">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl bg-gradient-to-br from-purple-100 to-indigo-100 border-2 border-purple-500">
                                            🤖
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg">Configuração Geral</h3>
                                            <p className="text-xs text-muted-foreground">Ajustes da Persona</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {/* LLM Model Selector */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium uppercase text-muted-foreground flex items-center gap-2">
                                                🧠 Motor de Inteligência (LLM)
                                            </label>
                                            <p className="text-xs text-muted-foreground mb-2">
                                                Escolha qual modelo de IA esta Persona utilizará para processar e gerar conteúdo.
                                            </p>
                                            <Select
                                                value={selectedPersona.llm_model || "gpt-4o-mini"}
                                                onValueChange={(value) => {
                                                    setSelectedPersona({
                                                        ...selectedPersona,
                                                        llm_model: value
                                                    });
                                                }}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Selecione um modelo LLM" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {LLM_OPTIONS.map((group) => (
                                                        <SelectGroup key={group.label}>
                                                            <SelectLabel>{group.label}</SelectLabel>
                                                            {group.options.map((option) => (
                                                                <SelectItem key={option.value} value={option.value}>
                                                                    {option.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectGroup>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Info sobre o modelo selecionado */}
                                        <div className="bg-muted/50 p-3 rounded-lg border">
                                            <p className="text-xs text-muted-foreground">
                                                <strong>Modelo Atual:</strong> {selectedPersona.llm_model || "gpt-4o-mini"}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground mt-1">
                                                Modelos com prefixo "openrouter/" usam o OpenRouter. Modelos sem prefixo usam OpenAI nativo.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="border-t pt-4 space-y-4">
                                        <p className="text-sm text-muted-foreground">
                                            💡 <strong>Dica:</strong> Clique em um dos agentes no visualizador para editar suas configurações específicas.
                                        </p>

                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" className="w-full opacity-90 hover:opacity-100" disabled={saving}>
                                                    <Trash2 className="mr-2 h-4 w-4" /> Excluir Persona
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Esta ação marcará a persona <strong>{selectedPersona.display_name}</strong> como inativa.
                                                        Você poderá restaurá-la posteriormente via banco de dados se necessário.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                                                        Sim, excluir
                                                    </AlertDialogAction>
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
                isOpen={isConsoleOpen}
                onToggle={() => setIsConsoleOpen(!isConsoleOpen)}
                onNewLog={handleNewLog} // ⭐ Callback de logs
            />
        </div>
    );
}
