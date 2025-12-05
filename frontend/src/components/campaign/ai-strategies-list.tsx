"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Loader2, RefreshCw, Rocket, CheckCircle2, X, ChevronDown, Target, Users, Zap } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Strategy {
    id: string;
    title: string;
    description: string;
    pillar: string;
    phase: string;
    status: string;
}

// Mapeamento de fases para labels amigáveis
const PHASE_CONFIG = {
    pre_campaign: { label: "Diagnóstico", icon: Target, color: "bg-blue-100 text-blue-800" },
    campaign: { label: "Campanha", icon: Users, color: "bg-green-100 text-green-800" },
    final_sprint: { label: "Reta Final", icon: Zap, color: "bg-orange-100 text-orange-800" },
} as const;

// Mapa de normalização: converte valores do banco para as chaves das abas
// O banco pode ter: 'diagnostico', 'campanha_rua', 'reta_final'  
// Ou alternativas: 'Diagnóstico', 'Campanha de Rua', 'Reta Final'
// As abas usam: 'pre_campaign', 'campaign', 'final_sprint'
const PHASE_NORMALIZATION: Record<string, string> = {
    // Valores técnicos do banco (snake_case)
    'diagnostico': 'pre_campaign',
    'campanha_rua': 'campaign',
    'campanha': 'campaign',
    'reta_final': 'final_sprint',
    // Labels amigáveis (caso venham assim)
    'Diagnóstico': 'pre_campaign',
    'Campanha de Rua': 'campaign',
    'Campanha': 'campaign',
    'Reta Final': 'final_sprint',
    // Valores já normalizados (passthrough)
    'pre_campaign': 'pre_campaign',
    'campaign': 'campaign',
    'final_sprint': 'final_sprint',
};

// Função para normalizar o valor da fase
const normalizePhase = (phase: string | null | undefined): string => {
    if (!phase) return 'unknown';
    return PHASE_NORMALIZATION[phase] || PHASE_NORMALIZATION[phase.toLowerCase()] || phase;
};

export function AIStrategiesList({ campaignId }: { campaignId: string }) {
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [activatingIds, setActivatingIds] = useState<Set<string>>(new Set());
    const [rejectingIds, setRejectingIds] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState("all");
    const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
    const supabase = createClient();
    const { toast } = useToast();

    const fetchStrategies = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("strategies")
                .select("*")
                .eq("campaign_id", campaignId)
                .in("status", ["suggested", "approved", "executed"])
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Erro ao buscar estratégias:", error);
            } else {
                setStrategies(data || []);
            }
        } catch (err) {
            console.error("Erro inesperado:", err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchStrategies();
        const interval = setInterval(fetchStrategies, 10000); // Aumentado para 10s
        return () => clearInterval(interval);
    }, [campaignId]);

    const handleGenerate = async () => {
        setGenerating(true);
        toast({
            title: "🚀 Iniciando Genesis Crew",
            description: "A IA está analisando os dados e gerando estratégias...",
        });

        try {
            const response = await fetch(`/api/campaign/${campaignId}/genesis`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ persona: "standard" }),
            });

            if (!response.ok) throw new Error("Falha na requisição");

            toast({
                title: "✅ Processo iniciado",
                description: "Aguarde alguns instantes enquanto as estratégias são criadas.",
            });
        } catch (error) {
            toast({
                title: "Erro",
                description: "Não foi possível iniciar a geração de estratégias.",
                variant: "destructive",
            });
            setGenerating(false);
        }
    };

    const handleActivateStrategy = async (strategyId: string, strategyTitle: string) => {
        setActivatingIds(prev => new Set(prev).add(strategyId));

        try {
            const response = await fetch(
                `/api/campaign/${campaignId}/strategies/${strategyId}/activate`,
                { method: "POST", headers: { "Content-Type": "application/json" } }
            );

            let data;
            try {
                data = await response.json();
            } catch {
                throw new Error("Resposta inválida do servidor");
            }

            if (!response.ok) {
                throw new Error(data?.detail || data?.error || "Falha ao ativar");
            }

            toast({
                title: "✅ Missão Ativada!",
                description: `"${strategyTitle}" foi adicionada ao Kanban.`,
            });

            setStrategies(prev =>
                prev.map(s => s.id === strategyId ? { ...s, status: "executed" } : s)
            );
        } catch (error: any) {
            console.error("Erro ao ativar:", error);
            toast({
                title: "❌ Erro na Ativação",
                description: error.message || "Não foi possível ativar.",
                variant: "destructive",
            });
        } finally {
            setActivatingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(strategyId);
                return newSet;
            });
        }
    };

    const handleRejectStrategy = async (strategyId: string, strategyTitle: string) => {
        setRejectingIds(prev => new Set(prev).add(strategyId));

        try {
            const response = await fetch(
                `/api/campaign/${campaignId}/strategies/${strategyId}/reject`,
                { method: "POST", headers: { "Content-Type": "application/json" } }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || "Falha ao rejeitar");
            }

            toast({
                title: "🗑️ Sugestão Removida",
                description: `"${strategyTitle}" foi removida da lista.`,
            });

            setStrategies(prev => prev.filter(s => s.id !== strategyId));
        } catch (error: any) {
            toast({
                title: "Erro",
                description: error.message || "Não foi possível rejeitar.",
                variant: "destructive",
            });
        } finally {
            setRejectingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(strategyId);
                return newSet;
            });
        }
    };

    const toggleCard = (id: string) => {
        setExpandedCards(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    // Filtro: ocultar executadas
    const visibleStrategies = strategies.filter(s => s.status !== "executed");

    // Contadores por fase (usando normalizePhase para compatibilidade com diferentes formatos do banco)
    const counts = {
        all: visibleStrategies.length,
        pre_campaign: visibleStrategies.filter(s => normalizePhase(s.phase) === "pre_campaign").length,
        campaign: visibleStrategies.filter(s => normalizePhase(s.phase) === "campaign").length,
        final_sprint: visibleStrategies.filter(s => normalizePhase(s.phase) === "final_sprint").length,
    };

    // Filtrar por tab ativa (usando normalizePhase)
    const filteredStrategies = activeTab === "all"
        ? visibleStrategies
        : visibleStrategies.filter(s => normalizePhase(s.phase) === activeTab);

    // Agrupar por pilar
    const groupedByPillar = filteredStrategies.reduce((acc, strategy) => {
        const pillar = strategy.pillar || "Outros";
        if (!acc[pillar]) acc[pillar] = [];
        acc[pillar].push(strategy);
        return acc;
    }, {} as Record<string, Strategy[]>);

    if (loading && strategies.length === 0) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold">🧠 Sugestões da Genesis AI</h3>
                    <p className="text-sm text-muted-foreground">
                        {visibleStrategies.length} estratégias disponíveis para ativação
                    </p>
                </div>
                <Button onClick={handleGenerate} disabled={generating} variant="outline">
                    {generating ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...</>
                    ) : (
                        <><RefreshCw className="mr-2 h-4 w-4" /> Gerar Novas</>
                    )}
                </Button>
            </div>

            {/* Tabs por Fase */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 h-12">
                    <TabsTrigger value="all" className="gap-2">
                        Todas
                        <Badge variant="secondary" className="ml-1">{counts.all}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="pre_campaign" className="gap-2">
                        <Target className="h-4 w-4" />
                        Diagnóstico
                        <Badge variant="secondary" className="ml-1">{counts.pre_campaign}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="campaign" className="gap-2">
                        <Users className="h-4 w-4" />
                        Campanha
                        <Badge variant="secondary" className="ml-1">{counts.campaign}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="final_sprint" className="gap-2">
                        <Zap className="h-4 w-4" />
                        Reta Final
                        <Badge variant="secondary" className="ml-1">{counts.final_sprint}</Badge>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-6">
                    {filteredStrategies.length === 0 ? (
                        <Card className="bg-muted/50 border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                                <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                                <p className="text-lg font-semibold mb-2">
                                    {activeTab === "all"
                                        ? "🎉 Todas as Estratégias Foram Ativadas!"
                                        : `Nenhuma estratégia pendente nesta fase.`}
                                </p>
                                <p className="text-muted-foreground text-sm">
                                    Gere novas estratégias ou mude de aba.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-6">
                            {Object.entries(groupedByPillar).map(([pillar, pillarStrategies]) => (
                                <div key={pillar} className="space-y-3">
                                    {/* Título do Pilar */}
                                    <div className="flex items-center gap-2">
                                        <div className="h-1 w-1 rounded-full bg-primary" />
                                        <h4 className="font-semibold text-base text-primary">{pillar}</h4>
                                        <Badge variant="outline" className="text-xs">
                                            {pillarStrategies.length} itens
                                        </Badge>
                                    </div>

                                    {/* Cards do Pilar */}
                                    <div className="grid gap-3">
                                        {pillarStrategies.map((strategy) => {
                                            const isActivating = activatingIds.has(strategy.id);
                                            const isRejecting = rejectingIds.has(strategy.id);
                                            const isExpanded = expandedCards.has(strategy.id);
                                            const phaseConfig = PHASE_CONFIG[normalizePhase(strategy.phase) as keyof typeof PHASE_CONFIG];

                                            return (
                                                <Collapsible
                                                    key={strategy.id}
                                                    open={isExpanded}
                                                    onOpenChange={() => toggleCard(strategy.id)}
                                                >
                                                    <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
                                                        {/* Header Sempre Visível */}
                                                        <CollapsibleTrigger asChild>
                                                            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-3 flex-1">
                                                                        <ChevronDown
                                                                            className={`h-5 w-5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                                                        />
                                                                        <div className="flex-1">
                                                                            <CardTitle className="text-sm font-medium line-clamp-1">
                                                                                {strategy.title}
                                                                            </CardTitle>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        {phaseConfig && (
                                                                            <Badge className={`text-[10px] ${phaseConfig.color}`}>
                                                                                {phaseConfig.label}
                                                                            </Badge>
                                                                        )}
                                                                        {/* Botão X para Rejeitar */}
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleRejectStrategy(strategy.id, strategy.title);
                                                                            }}
                                                                            disabled={isRejecting || isActivating}
                                                                            className="p-1 rounded-full hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                                                                            title="Rejeitar Sugestão"
                                                                        >
                                                                            {isRejecting ? (
                                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                                            ) : (
                                                                                <X className="h-4 w-4" />
                                                                            )}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </CardHeader>
                                                        </CollapsibleTrigger>

                                                        {/* Body Retrátil */}
                                                        <CollapsibleContent>
                                                            <CardContent className="pt-0 pb-4">
                                                                <p className="text-sm text-muted-foreground mb-4">
                                                                    {strategy.description}
                                                                </p>

                                                                {/* Footer com Ações */}
                                                                <div className="flex justify-end gap-2">
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => handleActivateStrategy(strategy.id, strategy.title)}
                                                                        disabled={isActivating || isRejecting}
                                                                        className="gap-1"
                                                                    >
                                                                        {isActivating ? (
                                                                            <><Loader2 className="h-3 w-3 animate-spin" /> Ativando...</>
                                                                        ) : (
                                                                            <><Rocket className="h-3 w-3" /> Ativar Missão</>
                                                                        )}
                                                                    </Button>
                                                                </div>
                                                            </CardContent>
                                                        </CollapsibleContent>
                                                    </Card>
                                                </Collapsible>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
