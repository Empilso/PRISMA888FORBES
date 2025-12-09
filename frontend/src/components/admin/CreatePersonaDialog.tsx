"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Users, Zap, Target, Brain, Search, Shield } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// Definição dos agentes disponíveis
export interface AgentDefinition {
    id: string;
    role: string;
    goal: string;
    backstory: string;
    icon: string;
    color: string;
}

// Templates de equipe pré-definidos
export interface TeamTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    agentCount: number;
    agents: string[]; // IDs dos agentes
}

// Banco de Agentes Disponíveis
const AVAILABLE_AGENTS: Record<string, AgentDefinition> = {
    analyst: {
        id: "analyst",
        role: "Analista Político Sênior",
        goal: "Analisar dados eleitorais e identificar tendências críticas",
        backstory: "Especialista com 20 anos de experiência em análise de dados eleitorais, focado em encontrar padrões ocultos.",
        icon: "🔍",
        color: "blue"
    },
    strategist: {
        id: "strategist",
        role: "Estrategista de Campanha",
        goal: "Desenvolver narrativas vencedoras e posicionamento",
        backstory: "Consultor renomado que já coordenou diversas campanhas vitoriosas, mestre em Sun Tzu e Maquiavel.",
        icon: "🎯",
        color: "purple"
    },
    planner: {
        id: "planner",
        role: "Gerente de Planejamento Tático",
        goal: "Transformar estratégias em planos de ação concretos",
        backstory: "Especialista em logística e execução de campanhas, focado em resultados mensuráveis e cronogramas.",
        icon: "📋",
        color: "green"
    },
    writer: {
        id: "writer",
        role: "Redator Criativo",
        goal: "Criar textos persuasivos e discursos memoráveis",
        backstory: "Copywriter premiado, especialista em comunicação política e storytelling emocional.",
        icon: "✍️",
        color: "orange"
    },
    psychologist: {
        id: "psychologist",
        role: "Psicólogo Eleitoral",
        goal: "Entender as motivações e medos do eleitorado",
        backstory: "PhD em Psicologia Social, especialista em comportamento de massa e persuasão política.",
        icon: "🧠",
        color: "pink"
    },
    critic: {
        id: "critic",
        role: "Advogado do Diabo",
        goal: "Encontrar falhas e vulnerabilidades nas estratégias propostas",
        backstory: "Consultor de crise com experiência em campanhas negativas, antecipa ataques do adversário.",
        icon: "👹",
        color: "red"
    },
    researcher: {
        id: "researcher",
        role: "Pesquisador de Campo",
        goal: "Coletar insights direto das comunidades locais",
        backstory: "Sociólogo com vasta experiência em pesquisas qualitativas e grupos focais.",
        icon: "🔬",
        color: "teal"
    }
};

// Templates de Equipe
const TEAM_TEMPLATES: TeamTemplate[] = [
    {
        id: "compact",
        name: "Compacta",
        description: "Rápida e objetiva. Ideal para campanhas menores.",
        icon: "⚡",
        agentCount: 2,
        agents: ["strategist", "writer"]
    },
    {
        id: "standard",
        name: "Padrão",
        description: "Equipe balanceada para maioria das campanhas.",
        icon: "🎯",
        agentCount: 3,
        agents: ["analyst", "strategist", "planner"]
    },
    {
        id: "warroom",
        name: "War Room",
        description: "Equipe completa para campanhas competitivas.",
        icon: "🏛️",
        agentCount: 5,
        agents: ["analyst", "strategist", "planner", "psychologist", "critic"]
    },
    {
        id: "elite",
        name: "Elite Squad",
        description: "Força máxima. Para campanhas de alto risco.",
        icon: "🦅",
        agentCount: 7,
        agents: ["analyst", "strategist", "planner", "writer", "psychologist", "critic", "researcher"]
    }
];

interface CreatePersonaDialogProps {
    onPersonaCreated: (persona: any) => void;
    trigger?: React.ReactNode;
}

export function CreatePersonaDialog({ onPersonaCreated, trigger }: CreatePersonaDialogProps) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form state
    const [name, setName] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [processType, setProcessType] = useState<"sequential" | "hierarchical">("sequential");
    const [selectedTemplate, setSelectedTemplate] = useState<string>("standard");

    const handleCreate = async () => {
        if (!displayName.trim()) {
            toast({ title: "Nome obrigatório", variant: "destructive" });
            return;
        }

        setLoading(true);

        try {
            const template = TEAM_TEMPLATES.find(t => t.id === selectedTemplate)!;
            const agents: Record<string, AgentDefinition> = {};

            // Monta o objeto de agentes baseado no template
            template.agents.forEach(agentId => {
                agents[agentId] = AVAILABLE_AGENTS[agentId];
            });

            // Cria o config dinâmico
            const config = {
                // Parâmetros de execução
                task_count: 10,
                temperature: 0.7,
                max_iter: 15,
                num_examples: 2,
                process_type: processType,

                // Metadata do template
                template_id: template.id,
                template_name: template.name,

                // Agentes dinâmicos
                agents: agents,

                // Legacy support (mantém para compatibilidade)
                analyst: agents.analyst || AVAILABLE_AGENTS.analyst,
                strategist: agents.strategist || AVAILABLE_AGENTS.strategist,
                planner: agents.planner || AVAILABLE_AGENTS.planner
            };

            const response = await fetch("/api/personas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim() || `persona_${Date.now()}`,
                    display_name: displayName.trim(),
                    description: `Equipe ${template.name} com ${template.agentCount} agentes em modo ${processType === 'hierarchical' ? 'hierárquico' : 'sequencial'}.`,
                    icon: template.icon,
                    llm_model: "gpt-4o-mini",
                    config: config,
                    is_active: true,
                    type: "strategy"
                }),
            });

            if (!response.ok) throw new Error("Falha ao criar persona");

            const newPersona = await response.json();

            toast({
                title: "✅ Persona Criada!",
                description: `Equipe "${template.name}" com ${template.agentCount} agentes pronta.`,
            });

            onPersonaCreated(newPersona);
            setOpen(false);

            // Reset form
            setName("");
            setDisplayName("");
            setProcessType("sequential");
            setSelectedTemplate("standard");

        } catch (error) {
            console.error("Erro ao criar persona:", error);
            toast({
                title: "Erro ao criar",
                description: "Não foi possível criar a persona.",
                variant: "destructive",
            });
        }

        setLoading(false);
    };

    const selectedTemplateData = TEAM_TEMPLATES.find(t => t.id === selectedTemplate);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        Nova Persona
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Criar Nova Equipe de IA
                    </DialogTitle>
                    <DialogDescription>
                        Configure o tamanho da equipe e o modo de trabalho dos agentes.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Nome da Persona */}
                    <div className="space-y-2">
                        <Label>Nome da Equipe</Label>
                        <Input
                            placeholder="Ex: Equipe Eleição 2024"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                        />
                    </div>

                    {/* Template de Equipe */}
                    <div className="space-y-3">
                        <Label>Template da Equipe</Label>
                        <div className="grid grid-cols-2 gap-3">
                            {TEAM_TEMPLATES.map((template) => (
                                <button
                                    key={template.id}
                                    type="button"
                                    onClick={() => setSelectedTemplate(template.id)}
                                    className={`
                                        relative p-4 rounded-lg border-2 text-left transition-all
                                        ${selectedTemplate === template.id
                                            ? "border-purple-500 bg-purple-50 ring-2 ring-purple-200"
                                            : "border-border bg-muted/30 hover:border-purple-300"
                                        }
                                    `}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <span className="text-2xl">{template.icon}</span>
                                        <Badge variant="secondary" className="text-xs">
                                            {template.agentCount} agentes
                                        </Badge>
                                    </div>
                                    <div className="font-semibold text-sm">{template.name}</div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {template.description}
                                    </p>

                                    {/* Preview dos agentes */}
                                    <div className="flex gap-1 mt-3">
                                        {template.agents.map((agentId) => (
                                            <span
                                                key={agentId}
                                                className="text-xs"
                                                title={AVAILABLE_AGENTS[agentId]?.role}
                                            >
                                                {AVAILABLE_AGENTS[agentId]?.icon}
                                            </span>
                                        ))}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Processo */}
                    <div className="space-y-2">
                        <Label>Modo de Trabalho</Label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setProcessType("sequential")}
                                className={`
                                    p-3 rounded-lg border-2 text-left transition-all
                                    ${processType === "sequential"
                                        ? "border-blue-500 bg-blue-50"
                                        : "border-border bg-muted/30 hover:border-blue-300"
                                    }
                                `}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <span>🔗</span>
                                    <span className="font-medium text-sm">Sequencial</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Linha de montagem. Rápido e previsível.
                                </p>
                            </button>
                            <button
                                type="button"
                                onClick={() => setProcessType("hierarchical")}
                                className={`
                                    p-3 rounded-lg border-2 text-left transition-all
                                    ${processType === "hierarchical"
                                        ? "border-amber-500 bg-amber-50"
                                        : "border-border bg-muted/30 hover:border-amber-300"
                                    }
                                `}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <span>🎩</span>
                                    <span className="font-medium text-sm">Hierárquico</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Gerente delega. Mais qualidade.
                                </p>
                            </button>
                        </div>
                    </div>

                    {/* Preview da Equipe Selecionada */}
                    {selectedTemplateData && (
                        <div className="bg-slate-50 rounded-lg p-4 border">
                            <div className="text-xs font-medium text-muted-foreground mb-3">
                                PREVIEW DA EQUIPE
                            </div>
                            <div className="space-y-2">
                                {selectedTemplateData.agents.map((agentId, index) => {
                                    const agent = AVAILABLE_AGENTS[agentId];
                                    return (
                                        <div key={agentId} className="flex items-center gap-3 p-2 bg-white rounded-md border">
                                            <span className="text-lg">{agent.icon}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm truncate">{agent.role}</div>
                                                <div className="text-xs text-muted-foreground truncate">{agent.goal}</div>
                                            </div>
                                            <Badge variant="outline" className="text-[10px]">
                                                #{index + 1}
                                            </Badge>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleCreate} disabled={loading || !displayName.trim()}>
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Criando...
                            </>
                        ) : (
                            <>
                                <Plus className="mr-2 h-4 w-4" />
                                Criar Equipe
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Export para uso em outros componentes
export { AVAILABLE_AGENTS, TEAM_TEMPLATES };
