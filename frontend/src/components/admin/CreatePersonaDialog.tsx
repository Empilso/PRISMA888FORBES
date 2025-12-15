    "use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Users, Zap, Target, Brain, Search, Shield, ChevronRight, Library } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";

// ENTERPRISE ROADMAP (resumo técnico)
// - Já pronto:
//   - Biblioteca de Agentes Enterprise (/api/agents, /admin/agentes/library)
//   - Personas com config.agents complexo (ex.: conselho_analise_revista)
// - Faltando para fluxo 100% enterprise:
//   1) Conectar cada slot da equipe a um agent_id da Biblioteca (além do config inline).
//   2) Adaptar GenesisCrew para:
//      - Ler a lista de agentes enterprise da persona.
//      - Criar tarefas específicas para tipos como ingress, evidence, policy_modeler, feynman_style, hormozi_style, compliance, auditor.
//   3) Implementar UI para editar a ordem e o tipo de cada agente (especialmente para equipes grandes, até 12 membros).
//   4) Padronizar logs e outputs (JSON final) para que orquestrador, simuladores de estilo e compliance escrevam em campos bem definidos.

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
    },
    // Enterprise Agents
    auditor: { id: "auditor", role: "Auditor de Processos", goal: "Auditar qualidade e consistência", backstory: "Auditor implacável.", icon: "📋", color: "gray" },
    ingress: { id: "ingress", role: "Ingress Agent", goal: "Processar entradas e dados brutos", backstory: "Portão de entrada de dados.", icon: "📥", color: "blue" },
    evidence: { id: "evidence", role: "Evidence Collector", goal: "Coletar evidências factuais", backstory: "Investigador forense de dados.", icon: "🔎", color: "cyan" },
    explainer: { id: "explainer", role: "Explainer Agent", goal: "Explicar decisões complexas", backstory: "Professor didático.", icon: "💡", color: "yellow" },
    validator: { id: "validator", role: "Validator Agent", goal: "Validar premissas e lógica", backstory: "Lógico rigoroso.", icon: "✅", color: "green" },
    compliance: { id: "compliance", role: "Compliance Officer", goal: "Garantir conformidade legal e ética", backstory: "Advogado constitucionalista.", icon: "⚖️", color: "red" },
    feynman_style: { id: "feynman_style", role: "Simulador Feynman", goal: "Simplificar conceitos complexos", backstory: "Físico teórico comunicador.", icon: "⚛️", color: "purple" },
    hormozi_style: { id: "hormozi_style", role: "Simulador Hormozi", goal: "Maximizar valor percebido", backstory: "Empresário focado em escala.", icon: "💰", color: "orange" },
    policy_modeler: { id: "policy_modeler", role: "Policy Modeler", goal: "Modelar impacto de políticas públicas", backstory: "Economista sênior.", icon: "🏛️", color: "blue" },
    data_integrator: { id: "data_integrator", role: "Data Integrator", goal: "Integrar múltiplas fontes de dados", backstory: "Engenheiro de dados expert.", icon: "🔄", color: "indigo" },
    demographics_analyzer: { id: "demographics_analyzer", role: "Demographics Analyzer", goal: "Análise demográfica profunda", backstory: "Estatístico populacional.", icon: "👥", color: "pink" },
    orchestrator: { id: "orchestrator", role: "Orchestrator", goal: "Coordenar o fluxo de trabalho", backstory: "Gerente de projetos sênior.", icon: "🎼", color: "gray" }
};

// ENTERPRISE TEMPLATE NOTE:
// - Template 'enterprise_12' cria uma equipe com 12 agentes (ingress, evidence, policy_modeler, demographics, feynman_style, hormozi_style, validator, compliance, auditor, explainer, data_integrator, orchestrator).
// - Próximo passo: ligar cada slot a um agent_id da Biblioteca de Agentes Enterprise para reuse completo.

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
    },
    {
        id: "enterprise_12",
        name: "Conselho Enterprise",
        description: "Arquitetura enterprise com 12 agentes especializados.",
        icon: "🏢",
        agentCount: 12,
        agents: [
            "orchestrator", "ingress", "evidence", "data_integrator",
            "demographics_analyzer", "policy_modeler", "explainer", "validator",
            "compliance", "auditor", "feynman_style", "hormozi_style"
        ]
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
                    <Button className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md border-0 transition-all">
                        <Plus className="h-4 w-4" />
                        Nova Persona
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[95vh] p-0 gap-0 overflow-hidden bg-[#fafafa]">
                {/* (A) Header Clean */}
                <DialogHeader className="p-6 bg-white border-b">
                    <DialogTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight text-gray-900">
                        <Users className="h-5 w-5 text-purple-600" />
                        Criar Nova Equipe de IA
                    </DialogTitle>
                    <DialogDescription className="text-gray-500">
                        Configure o perfil da sua crew, escolha um template de agentes e o modo de operação.
                    </DialogDescription>

                    <div className="pt-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Nome da Equipe</Label>
                            <Input
                                placeholder="Ex: War Room Eleições 2026"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="h-11 bg-slate-50 border-slate-200 focus:border-purple-500 focus:ring-purple-200 text-base"
                            />
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="max-h-[60vh] overflow-y-auto">
                    <div className="p-6 space-y-8">

                        {/* (B) Templates Grid */}
                        <div className="space-y-3">
                            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Template da Equipe</Label>
                            <div className="grid grid-cols-2 gap-3">
                                {TEAM_TEMPLATES.map((template) => (
                                    <button
                                        key={template.id}
                                        type="button"
                                        onClick={() => setSelectedTemplate(template.id)}
                                        className={`
                                            relative flex flex-col items-start p-4 rounded-xl border transition-all duration-200
                                            ${selectedTemplate === template.id
                                                ? "border-purple-600 bg-purple-50/50 shadow-sm ring-1 ring-purple-500"
                                                : "border-slate-200 bg-white hover:border-purple-300 hover:shadow-sm"
                                            }
                                        `}
                                    >
                                        <div className="flex w-full items-start justify-between mb-2">
                                            <span className="text-2xl p-2 bg-white rounded-lg border shadow-sm">{template.icon}</span>
                                            {selectedTemplate === template.id && (
                                                <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-[10px] uppercase font-bold border-0">
                                                    Selecionado
                                                </Badge>
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-gray-900 flex items-center gap-2">
                                                {template.name}
                                                <span className="text-[10px] font-normal text-gray-400">({template.agentCount} agentes)</span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1 leading-relaxed text-left">
                                                {template.description}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* (C) Modo de Trabalho */}
                        <div className="space-y-3">
                            <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Modo de Operação</Label>
                            <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100/50 rounded-xl border border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setProcessType("sequential")}
                                    className={`
                                        flex items-center gap-3 p-3 rounded-lg transition-all
                                        ${processType === "sequential"
                                            ? "bg-white text-blue-700 shadow-sm ring-1 ring-black/5"
                                            : "text-gray-500 hover:bg-slate-200/50 hover:text-gray-900"
                                        }
                                    `}
                                >
                                    <div className={`p-1.5 rounded-md ${processType === 'sequential' ? 'bg-blue-50 text-blue-600' : 'bg-slate-200 text-gray-400'}`}>
                                        <Zap className="w-4 h-4" />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-sm font-semibold">Sequencial</div>
                                        <p className="text-[10px] opacity-80">Linha de montagem rápida</p>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setProcessType("hierarchical")}
                                    className={`
                                        flex items-center gap-3 p-3 rounded-lg transition-all
                                        ${processType === "hierarchical"
                                            ? "bg-white text-amber-700 shadow-sm ring-1 ring-black/5"
                                            : "text-gray-500 hover:bg-slate-200/50 hover:text-gray-900"
                                        }
                                    `}
                                >
                                    <div className={`p-1.5 rounded-md ${processType === 'hierarchical' ? 'bg-amber-50 text-amber-600' : 'bg-slate-200 text-gray-400'}`}>
                                        <Target className="w-4 h-4" />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-sm font-semibold">Hierárquico</div>
                                        <p className="text-[10px] opacity-80">Gerente delega tarefas</p>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* (D) & (E) Agentes da Equipe (Lista Editável Mockada) */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Membros da Equipe ({selectedTemplateData?.agents.length})</Label>
                                <span className="text-[10px] text-purple-600 font-medium">Editar Agentes (Em breve)</span>
                            </div>

                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                {selectedTemplateData?.agents.map((agentId, index) => {
                                    const agent = AVAILABLE_AGENTS[agentId];
                                    return (
                                        <div key={agentId} className="group flex items-center gap-3 p-3 border-b last:border-0 hover:bg-slate-50 transition-colors">
                                            <div className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-lg text-lg border border-slate-200">
                                                {agent.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-sm text-gray-900">{agent.role}</span>
                                                    {/* Badge simulando origem */}
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 font-medium tracking-wide">
                                                        CORE
                                                    </span>
                                                </div>
                                                <div className="text-xs text-muted-foreground truncate max-w-[90%]">{agent.goal}</div>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500">
                                                {"×"}
                                            </Button>
                                        </div>
                                    );
                                })}

                                {/* Botão Mock de Adicionar */}
                                <button
                                    type="button"
                                    className="w-full py-3 flex items-center justify-center gap-2 text-xs font-medium text-purple-600 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                                    onClick={() => toast({ title: "Em Breve: Integração Enterprise", description: "A seleção de agentes da Biblioteca Enterprise será habilitada na próxima sprint." })}
                                >
                                    <Library className="w-3.5 h-3.5" />
                                    Adicionar Agente da Biblioteca (Enterprise)
                                </button>
                            </div>
                        </div>

                    </div>
                </ScrollArea>

                {/* (F) Footer */}
                <DialogFooter className="p-6 bg-slate-50 border-t gap-2 sm:gap-0">
                    <Button variant="outline" className="h-11 border-slate-200 hover:bg-white hover:text-red-600" onClick={() => setOpen(false)}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleCreate}
                        disabled={loading || !displayName.trim()}
                        className="h-11 px-8 bg-gray-900 text-white hover:bg-gray-800"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Criando Crew...
                            </>
                        ) : (
                            <>
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
