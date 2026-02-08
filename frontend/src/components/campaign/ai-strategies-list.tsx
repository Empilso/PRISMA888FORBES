"use client";

import React, { useEffect, useState } from "react";
import { ExamplesRenderer } from "@/components/tasks/ExamplesRenderer";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, RefreshCw, CheckCircle2, Target, Users, Zap, LayoutGrid, ListFilter, Pencil, Rocket, X, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { StrategyDetailModal } from "@/components/campaign/StrategyDetailSheet";

interface Strategy {
    id: string;
    title: string;
    description: string;
    pillar: string;
    phase: string;
    status: "suggested" | "approved" | "published" | "executed";
    examples?: string[];
}

// Mapeamento de fases para labels amigáveis
const PHASE_CONFIG = {
    pre_campaign: { label: "Diagnóstico", icon: Target, color: "bg-blue-50 text-blue-700 border-blue-200" },
    campaign: { label: "Campanha", icon: Users, color: "bg-green-50 text-green-700 border-green-200" },
    final_sprint: { label: "Reta Final", icon: Zap, color: "bg-orange-50 text-orange-700 border-orange-200" },
} as const;

// Mapa de normalização
const PHASE_NORMALIZATION: Record<string, string> = {
    'diagnostico': 'pre_campaign',
    'campanha_rua': 'campaign',
    'campanha': 'campaign',
    'reta_final': 'final_sprint',
    'Diagnóstico': 'pre_campaign',
    'Campanha de Rua': 'campaign',
    'Campanha': 'campaign',
    'Reta Final': 'final_sprint',
    'pre_campaign': 'pre_campaign',
    'campaign': 'campaign',
    'final_sprint': 'final_sprint',
};

const normalizePhase = (phase: string | null | undefined): string => {
    if (!phase) return 'unknown';
    return PHASE_NORMALIZATION[phase] || PHASE_NORMALIZATION[phase.toLowerCase()] || phase;
};

export function AIStrategiesList({ campaignId, onTaskCreated, activePhase = "all" }: { campaignId: string; onTaskCreated?: () => void; activePhase?: string }) {
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    // const [activeTab, setActiveTab] = useState("all"); // Removed internal state
    const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    // Novas States para Bulk Actions e feedback
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [activatingIds, setActivatingIds] = useState<string[]>([]);
    const [successIds, setSuccessIds] = useState<string[]>([]);
    const [bulkActivating, setBulkActivating] = useState(false);

    const supabase = createClient();
    const { toast } = useToast();

    const authFailedRef = React.useRef(false);

    const fetchStrategies = async () => {
        if (authFailedRef.current) return; // Stop polling if already got 401
        setLoading(true);
        try {
            const response = await fetch(`/api/campaign/${campaignId}/strategies?status=published`, {
                cache: "no-store",
            });

            if (!response.ok) {
                let errorDetails;
                try {
                    const text = await response.text();
                    try {
                        errorDetails = JSON.parse(text);
                    } catch {
                        errorDetails = text;
                    }
                } catch (e) {
                    errorDetails = "Erro desconhecido ao ler resposta";
                }

                console.error(`Erro ao buscar estratégias (Proxy) [${response.status}]:`, errorDetails);

                if (response.status === 401) {
                    authFailedRef.current = true; // Stop future polling
                    // Show toast only once
                    toast({
                        title: "Sessão Expirada",
                        description: "Faça login novamente para ver as estratégias.",
                        variant: "destructive",
                    });
                } else {
                    toast({
                        title: "Erro de Conexão",
                        description: `Falha ${response.status} ao carregar estratégias.`,
                        variant: "destructive",
                    });
                }
            } else {
                const result = await response.json();
                // Handle both array response (new API) and wrapped response (legacy/fallback)
                const strategiesData = Array.isArray(result) ? result : result.data;
                setStrategies(strategiesData || []);
            }
        } catch (err) {
            console.error("Erro inesperado:", err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchStrategies();
        const interval = setInterval(fetchStrategies, 10000);
        return () => clearInterval(interval);
    }, [campaignId]);

    const handleGenerate = async () => {
        setGenerating(true);
        toast({
            title: "🚀 Processando...",
            description: "A IA está analisando o cenário...",
        });

        try {
            const response = await fetch(`/api/campaign/${campaignId}/genesis`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ persona: "standard" }),
            });

            if (!response.ok) throw new Error("Falha na requisição");

            toast({
                title: "✅ Iniciado!",
                description: "Novas estratégias aparecerão em breve.",
            });
        } catch (error) {
            toast({
                title: "Erro",
                description: "Não foi possível iniciar a geração.",
                variant: "destructive",
            });
            setGenerating(false);
        }
    };

    const activateSingle = async (strategyId: string, strategyTitle: string) => {
        setActivatingIds(prev => [...prev, strategyId]);
        try {
            const response = await fetch(
                `/api/campaign/${campaignId}/strategies/${strategyId}/activate`,
                { method: "POST", headers: { "Content-Type": "application/json" } }
            );

            if (!response.ok) throw new Error("Falha ao ativar");

            // Sucesso Visual e Callback
            setSuccessIds(prev => [...prev, strategyId]);
            if (onTaskCreated) onTaskCreated();

            // Aguarda 1s para o usuário ver o sucesso
            setTimeout(() => {
                setStrategies(prev =>
                    prev.map(s => s.id === strategyId ? { ...s, status: "executed" } : s)
                );
                setSuccessIds(prev => prev.filter(id => id !== strategyId));
                setActivatingIds(prev => prev.filter(id => id !== strategyId));
                setSelectedIds(prev => prev.filter(id => id !== strategyId));
            }, 1000);

        } catch (error) {
            console.error("Erro ao ativar:", error);
            toast({
                title: "Erro",
                description: "Não foi possível ativar.",
                variant: "destructive",
            });
            setActivatingIds(prev => prev.filter(id => id !== strategyId));
        }
    };

    const handleActivateStrategy = async (strategyId: string, strategyTitle: string) => {
        if (activatingIds.includes(strategyId) || successIds.includes(strategyId)) return;
        await activateSingle(strategyId, strategyTitle);
    };

    const handleBulkActivate = async () => {
        if (selectedIds.length === 0) return;

        setBulkActivating(true);
        toast({ title: "Ativando estratégias..." });

        // Ativa sequencialmente para evitar sobrecarga de rede/backend
        setActivatingIds(prev => [...prev, ...selectedIds]);

        for (const id of selectedIds) {
            const strategy = strategies.find(s => s.id === id);
            await activateSingle(id, strategy?.title || "Estratégia");
        }

        setBulkActivating(false);
        toast({ title: "✅ Processo finalizado!" });
    };

    const handleRejectStrategy = async (strategyId: string, strategyTitle: string) => {
        try {
            const response = await fetch(
                `/api/campaign/${campaignId}/strategies/${strategyId}/reject`,
                { method: "POST", headers: { "Content-Type": "application/json" } }
            );

            if (!response.ok) throw new Error("Falha ao rejeitar");

            toast({
                title: "🗑️ Sugestão Descartada",
                description: `"${strategyTitle}" foi removida da lista.`,
            });

            setStrategies(prev => prev.filter(s => s.id !== strategyId));
            setSelectedIds(prev => prev.filter(id => id !== strategyId));
        } catch (error: any) {
            toast({
                title: "Erro",
                description: "Não foi possível rejeitar.",
                variant: "destructive",
            });
        }
    };

    const handleCardClick = (strategy: Strategy) => {
        setSelectedStrategy(strategy);
        setIsSheetOpen(true);
    };

    // Filter Logic
    const visibleStrategies = strategies.filter(s => s.status !== "executed");

    const counts = {
        all: visibleStrategies.length,
        pre_campaign: visibleStrategies.filter(s => normalizePhase(s.phase) === "pre_campaign").length,
        campaign: visibleStrategies.filter(s => normalizePhase(s.phase) === "campaign").length,
        final_sprint: visibleStrategies.filter(s => normalizePhase(s.phase) === "final_sprint").length,
    };

    const filteredStrategies = activePhase === "all"
        ? visibleStrategies
        : visibleStrategies.filter(s => normalizePhase(s.phase) === activePhase);

    // Bulk Select Logic
    const allSelected = filteredStrategies.length > 0 && filteredStrategies.every(s => selectedIds.includes(s.id));

    const toggleSelectAll = () => {
        if (allSelected) {
            const idsToRemove = filteredStrategies.map(s => s.id);
            setSelectedIds(prev => prev.filter(id => !idsToRemove.includes(id)));
        } else {
            const idsToAdd = filteredStrategies.map(s => s.id);
            setSelectedIds(prev => Array.from(new Set([...prev, ...idsToAdd])));
        }
    };

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    if (loading && strategies.length === 0) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20">
            {/* Header and Tabs removed - Controlled by Parent */}

            {/* Content */}
            <div className="animate-in fade-in-50 duration-500">

                {/* Bulk Action Bar */}
                {filteredStrategies.length > 0 && (
                    <div className="flex items-center justify-between mb-4 px-1">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="select-all"
                                checked={allSelected}
                                onCheckedChange={toggleSelectAll}
                            />
                            <label htmlFor="select-all" className="text-sm text-slate-500 cursor-pointer select-none">
                                Selecionar tudo
                            </label>
                        </div>

                        {selectedIds.length > 0 && (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-5 duration-300">
                                <span className="text-xs text-slate-400 font-medium">
                                    {selectedIds.length} selecionadas
                                </span>
                                <Button
                                    size="sm"
                                    className="h-8 rounded-full bg-primary text-white shadow-md hover:shadow-lg transition-all"
                                    onClick={handleBulkActivate}
                                    disabled={bulkActivating}
                                >
                                    {bulkActivating ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Rocket className="w-3 h-3 mr-2" />}
                                    Aprovar Seleção
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {filteredStrategies.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                            <CheckCircle2 className="h-8 w-8 text-green-500" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">Tudo limpo por aqui!</h3>
                        <p className="text-slate-500 max-w-sm mx-auto mt-2">
                            Todas as estratégias desta fase já foram processadas. Gere novas análises para continuar.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredStrategies.map((strategy) => {
                            const phaseConfig = PHASE_CONFIG[normalizePhase(strategy.phase) as keyof typeof PHASE_CONFIG];
                            const isSelected = selectedIds.includes(strategy.id);
                            const isActivating = activatingIds.includes(strategy.id);
                            const isSuccess = successIds.includes(strategy.id);

                            return (
                                <div
                                    key={strategy.id}
                                    className={`group relative bg-white rounded-2xl p-5 shadow-sm border transition-all duration-300 flex flex-col h-auto min-h-[260px] ${isSelected ? 'border-primary/50 shadow-md bg-primary/5' : 'border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1'}`}
                                >
                                    {/* Selection Checkbox (Top Left) */}
                                    <div className="absolute top-3 left-3 z-20">
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() => toggleSelection(strategy.id)}
                                            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary border-slate-300 h-5 w-5 rounded-md"
                                        />
                                    </div>

                                    {/* Discrete Reject Button (Top Right) */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRejectStrategy(strategy.id, strategy.title);
                                        }}
                                        className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all z-20"
                                        title="Descartar"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>

                                    {/* Clickable Body */}
                                    <div className="flex-1 cursor-pointer flex flex-col pl-6" onClick={() => handleCardClick(strategy)}>
                                        {/* Badge Header */}
                                        <div className="flex items-start justify-end mb-3 pr-8 min-h-[24px]">
                                            {/* Moved Badge to Right to allow Checkbox on Left */}
                                            <Badge variant="outline" className="rounded-full font-normal border-purple-100 bg-purple-50 text-purple-700 text-[10px] px-2 py-0.5">
                                                {strategy.pillar}
                                            </Badge>
                                            {phaseConfig && (
                                                <div className={`ml-2 p-1 rounded-full ${phaseConfig.color} bg-opacity-20`}>
                                                    <phaseConfig.icon className="w-3 h-3" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 mb-2">
                                            <h3 className="font-bold text-base text-slate-900 mb-2 leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                                                {strategy.title}
                                            </h3>
                                            <p className="text-sm text-slate-500 line-clamp-4 leading-relaxed">
                                                {strategy.description}
                                            </p>

                                            {/* Examples Section */}
                                            <div className="mt-auto">
                                                <ExamplesRenderer
                                                    examples={strategy.examples}
                                                    mode="card"
                                                    onViewAll={() => {
                                                        handleCardClick(strategy);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Minimalist Footer Action Bar */}
                                    <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-slate-50 rounded-full"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCardClick(strategy);
                                            }}
                                            title="Revisar e Editar"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>

                                        <Button
                                            size={isSuccess ? "default" : "icon"}
                                            className={`h-8 rounded-full shadow-md transition-all active:scale-95 ${isSuccess
                                                ? 'bg-green-500 hover:bg-green-600 text-white w-auto px-4'
                                                : 'bg-primary hover:bg-primary/90 text-white w-8'
                                                }`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleActivateStrategy(strategy.id, strategy.title);
                                            }}
                                            title="Aprovar"
                                            disabled={isActivating || isSuccess}
                                        >
                                            {isSuccess ? (
                                                <><CheckCircle2 className="w-4 h-4 mr-2" /> Adicionada!</>
                                            ) : isActivating ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Check className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <StrategyDetailModal
                strategy={selectedStrategy}
                isOpen={isSheetOpen}
                onClose={() => setIsSheetOpen(false)}
                onActivate={handleActivateStrategy}
                onReject={handleRejectStrategy}
            />
        </div >
    );
}
