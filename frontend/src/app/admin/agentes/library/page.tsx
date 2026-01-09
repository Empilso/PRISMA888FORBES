"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Agent, AgentCreate } from "@/types/agent";
import { Button } from "@/components/ui/button";
import {
    Plus, Search, Edit2, Trash2, Bot,
    ChevronLeft, ChevronRight, LayoutGrid,
    FileInput, FileText, Database, Activity,
    Users, MessageSquare, Cpu, CheckCircle2,
    ShieldAlert, FileCheck, Network, Layers, Target, Terminal, Radar
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { AgentForm } from "@/components/admin/agent-editor/AgentForm";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// --- Types & Constants ---

// Mapping types to PT-BR Labels and Icons
const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
    ingress: { label: "Entrada", icon: FileInput },
    evidence: { label: "Evidência", icon: FileText }, // Changed from Search to avoid dup
    data_integrator: { label: "Dados", icon: Database },
    policy_modeler: { label: "Modelagem", icon: Activity },
    demographics: { label: "Demografia", icon: Users },
    linguistic: { label: "Linguística", icon: MessageSquare },
    simulator: { label: "Simulador", icon: Cpu },
    validator: { label: "Validador", icon: CheckCircle2 },
    compliance: { label: "Compliance", icon: ShieldAlert },
    auditor: { label: "Auditor", icon: FileCheck },
    orchestrator: { label: "Orquestrador", icon: Network },
    scanning: { label: "Varredura", icon: Radar },
    radar: { label: "Python", icon: Terminal },
    generic: { label: "Geral", icon: Bot },
};

// Fallback for unknown types
const getCategoryConfig = (type: string) => {
    return CATEGORY_CONFIG[type.toLowerCase()] || { label: type, icon: Bot };
};

// API Fetchers
const fetchAgents = async (): Promise<Agent[]> => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agents`);
    if (!res.ok) throw new Error("Falha ao buscar agentes");
    return res.json();
};

const createAgent = async (data: AgentCreate): Promise<Agent> => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Falha ao criar agente");
    }
    return res.json();
};

const updateAgent = async ({ id, data }: { id: string; data: AgentCreate }): Promise<Agent> => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Falha ao atualizar agente");
    }
    return res.json();
};

const deleteAgent = async (id: string): Promise<void> => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agents/${id}`, {
        method: "DELETE",
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Falha ao excluir agente");
    }
};

export default function AgentLibraryPage() {
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState<Agent | undefined>(undefined);
    const [search, setSearch] = useState("");
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null); // null = All

    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: agents = [], isLoading } = useQuery({
        queryKey: ["agents"],
        queryFn: fetchAgents,
    });

    const createMutation = useMutation({
        mutationFn: createAgent,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["agents"] });
            setIsSheetOpen(false);
        },
    });

    const updateMutation = useMutation({
        mutationFn: updateAgent,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["agents"] });
            setIsSheetOpen(false);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteAgent,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["agents"] });
            toast({
                title: "Sucesso",
                description: "Agente excluído com sucesso",
            });
        },
    });

    // --- Derived Data ---

    // Get unique categories present in the data + predefined ones used in config
    const availableCategories = useMemo(() => {
        const types = new Set(agents.map(a => a.type));
        // Force 'radar' (Python) category to always appear
        types.add('radar');

        // Sort based on config order if possible, or alphabetical?
        // Let's rely on map iteration order or sort alphabetically by label
        return Array.from(types).sort();
    }, [agents]);

    const filteredAgents = useMemo(() => {
        return agents.filter(a => {
            const matchesSearch =
                a.display_name.toLowerCase().includes(search.toLowerCase()) ||
                a.role.toLowerCase().includes(search.toLowerCase());

            const matchesCategory = selectedCategory ? a.type === selectedCategory : true;

            return matchesSearch && matchesCategory;
        });
    }, [agents, search, selectedCategory]);

    // --- Handlers ---

    const handleEdit = (agent: Agent) => {
        setSelectedAgent(agent);
        setIsSheetOpen(true);
    };

    const handleCreate = () => {
        setSelectedAgent(undefined);
        setIsSheetOpen(true);
    };

    const handleSubmit = async (data: AgentCreate) => {
        if (selectedAgent) {
            await updateMutation.mutateAsync({ id: selectedAgent.id, data });
        } else {
            await createMutation.mutateAsync(data);
        }
    };

    return (
        <TooltipProvider>
            <div className="flex h-screen overflow-hidden bg-background">
                {/* --- Sidebar --- */}
                <div
                    className={cn(
                        "flex flex-col border-r bg-muted/10 transition-all duration-300 ease-in-out relative",
                        isSidebarCollapsed ? "w-[64px]" : "w-[240px]"
                    )}
                >
                    <div className={cn("p-4 flex items-center h-[60px]", isSidebarCollapsed ? "justify-center" : "justify-between")}>
                        {!isSidebarCollapsed && <span className="font-semibold text-sm uppercase text-muted-foreground tracking-wider">Categorias</span>}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        >
                            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                        </Button>
                    </div>

                    <Separator />

                    <ScrollArea className="flex-1 py-4">
                        <div className="px-2 space-y-1">
                            {/* All Categories Button */}
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={selectedCategory === null ? "secondary" : "ghost"}
                                        className={cn(
                                            "w-full justify-start gap-3",
                                            isSidebarCollapsed ? "px-2 justify-center" : "px-3"
                                        )}
                                        onClick={() => setSelectedCategory(null)}
                                    >
                                        <LayoutGrid className="w-4 h-4" />
                                        {!isSidebarCollapsed && <span className="truncate">Todos</span>}
                                    </Button>
                                </TooltipTrigger>
                                {isSidebarCollapsed && <TooltipContent side="right">Todos</TooltipContent>}
                            </Tooltip>

                            {availableCategories.map(type => {
                                const config = getCategoryConfig(type);
                                const Icon = config.icon;
                                const count = agents.filter(a => a.type === type).length;
                                const isActive = selectedCategory === type;

                                return (
                                    <Tooltip key={type} delayDuration={0}>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant={isActive ? "secondary" : "ghost"}
                                                className={cn(
                                                    "w-full justify-start gap-3",
                                                    isSidebarCollapsed ? "px-2 justify-center" : "px-3"
                                                )}
                                                onClick={() => setSelectedCategory(type)}
                                            >
                                                <Icon className="w-4 h-4" />
                                                {!isSidebarCollapsed && (
                                                    <>
                                                        <span className="truncate flex-1 text-left">{config.label}</span>
                                                        <span className="text-xs text-muted-foreground ml-auto">{count}</span>
                                                    </>
                                                )}
                                            </Button>
                                        </TooltipTrigger>
                                        {isSidebarCollapsed && (
                                            <TooltipContent side="right">
                                                {config.label} ({count})
                                            </TooltipContent>
                                        )}
                                    </Tooltip>
                                );
                            })}
                        </div>
                    </ScrollArea>
                </div>

                {/* --- Main Content --- */}
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                    {/* Header Toolbar */}
                    <div className="h-[60px] border-b flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm z-10">
                        <div className="flex items-center gap-4">
                            <h1 className="text-xl font-bold tracking-tight">Biblioteca de Agentes</h1>
                            <div className="h-4 w-px bg-border mx-2" />
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar..."
                                    className="pl-9 h-8 w-[250px] bg-background"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                        <Button onClick={handleCreate} className="gap-2 h-8">
                            <Plus className="w-4 h-4" /> Novo Agente
                        </Button>
                    </div>

                    {/* Content Scroll Area */}
                    <ScrollArea className="flex-1 p-6 bg-muted/5">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
                            {isLoading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <div key={i} className="h-[250px] bg-muted/50 rounded-xl animate-pulse" />
                                ))
                            ) : filteredAgents.length === 0 ? (
                                <div className="col-span-full flex flex-col items-center justify-center p-12 text-muted-foreground border-2 border-dashed rounded-xl">
                                    <Bot className="w-12 h-12 mb-4 opacity-50" />
                                    <p>Nenhum agente encontrado nesta categoria.</p>
                                </div>
                            ) : (
                                filteredAgents.map((agent) => {
                                    const config = getCategoryConfig(agent.type);
                                    const Icon = config.icon;

                                    return (
                                        <div key={agent.id} className="group relative bg-card border rounded-xl p-5 hover:shadow-lg hover:border-primary/20 transition-all flex flex-col justify-between h-[200px]">
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-start">
                                                    <div className="p-2.5 bg-primary/10 rounded-lg text-primary">
                                                        <Icon className="w-5 h-5" />
                                                    </div>
                                                    <Badge variant="outline" className="uppercase text-[10px] tracking-wider bg-background/50">
                                                        {config.label}
                                                    </Badge>
                                                </div>

                                                <div>
                                                    <h3 className="font-semibold text-base line-clamp-1" title={agent.display_name}>
                                                        {agent.display_name}
                                                    </h3>
                                                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 min-h-[2.5em]">
                                                        {agent.role}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => deleteMutation.mutate(agent.id)}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 text-xs px-3"
                                                    onClick={() => handleEdit(agent)}
                                                >
                                                    <Edit2 className="w-3 h-3 mr-1.5" /> Editar
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </ScrollArea>
                </div>

                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetContent className="sm:max-w-2xl w-full p-0 flex flex-col bg-background">
                        <SheetHeader className="px-6 py-4 border-b">
                            <SheetTitle>
                                {selectedAgent ? `Editar ${selectedAgent.display_name}` : "Novo Agente"}
                            </SheetTitle>
                            <SheetDescription>
                                Configure os detalhes, prompt e regras do agente Enterprise.
                            </SheetDescription>
                        </SheetHeader>

                        <div className="flex-1 overflow-hidden">
                            <AgentForm
                                initialData={selectedAgent}
                                onSubmit={handleSubmit}
                                onCancel={() => setIsSheetOpen(false)}
                            />
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </TooltipProvider>
    );
}
