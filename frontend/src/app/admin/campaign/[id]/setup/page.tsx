"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners, PointerSensor, useSensor, useSensors, useDroppable, useDraggable } from "@dnd-kit/core";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, CheckCircle, Send, GripVertical, Grid3x3, LayoutList, Clock, Bot, RefreshCcw, AlertTriangle, Trash2, ArrowRight, ArrowLeft, Edit } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StrategyEditorSheet } from "@/components/campaign/StrategyEditorSheet";
import { StrategicMatrix } from "@/components/campaign/StrategicMatrix";
import { CampaignManifesto } from "@/components/campaign/CampaignManifesto";
import { GeneratorDialog } from "@/components/campaign/GeneratorDialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Strategy {
    id: string;
    title: string;
    description: string;
    pillar: string;
    phase: string;
    status: "suggested" | "approved";
    campaign_id: string;
    run_id?: string;
}

interface AnalysisRun {
    id: string;
    campaign_id: string;
    persona_name: string;
    llm_model: string;
    strategic_plan_text: string;
    created_at: string;
}

interface Campaign {
    id: string;
    candidate_name: string;
    role: string;
}

const pillarColors: Record<string, string> = {
    "Credibilidade": "bg-blue-100 text-blue-800 border-blue-300",
    "Proximidade": "bg-green-100 text-green-800 border-green-300",
    "Transformação": "bg-purple-100 text-purple-800 border-purple-300",
    "Segurança": "bg-orange-100 text-orange-800 border-orange-300",
    "Competência": "bg-indigo-100 text-indigo-800 border-indigo-300",
};

const phaseIcons: Record<string, string> = {
    "Pré-Campanha": "🔍",
    "1ª Fase": "🚀",
    "2ª Fase": "⚡",
    "Final": "🎯",
};

function DraggableStrategyCard({
    strategy,
    onClick,
    onMove
}: {
    strategy: Strategy;
    onClick?: () => void;
    onMove?: (strategyId: string, newStatus: "suggested" | "approved") => void;
}) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: strategy.id,
    });

    const colorClass = pillarColors[strategy.pillar] || "bg-gray-100 text-gray-800 border-gray-300";

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
    } : undefined;

    const handleQuickMove = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onMove) {
            const newStatus = strategy.status === "suggested" ? "approved" : "suggested";
            onMove(strategy.id, newStatus);
        }
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onClick) {
            onClick();
        }
    };

    return (
        <div ref={setNodeRef} style={style}>
            <Card
                className="cursor-grab active:cursor-grabbing border-l-4 hover:shadow-lg transition-shadow"
                style={{ borderLeftColor: strategy.pillar === "Credibilidade" ? "#3b82f6" : strategy.pillar === "Proximidade" ? "#22c55e" : "#9333ea" }}
            >
                <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2 mb-2">
                        <div className="flex items-center gap-2" {...listeners} {...attributes}>
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <Badge variant="outline" className={`${colorClass} border text-xs`}>
                                {strategy.pillar}
                            </Badge>
                        </div>
                        <span className="text-lg" title={strategy.phase}>
                            {phaseIcons[strategy.phase] || "📌"}
                        </span>
                    </div>
                    <CardTitle className="text-sm leading-tight">{strategy.title}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{strategy.description}</p>

                    {/* Botões de Ação Rápida */}
                    <div className="flex items-center gap-2 pt-2 border-t">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleEdit}
                            className="h-7 text-xs flex-1"
                        >
                            <Edit className="h-3 w-3 mr-1" />
                            Editar
                        </Button>

                        {strategy.status === "suggested" ? (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleQuickMove}
                                className="h-7 text-xs border-green-300 text-green-700 hover:bg-green-50"
                            >
                                <ArrowRight className="h-3 w-3 mr-1" />
                                Aprovar
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleQuickMove}
                                className="h-7 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                            >
                                <ArrowLeft className="h-3 w-3 mr-1" />
                                Voltar
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function DroppableColumn({
    id,
    title,
    icon,
    children,
    count,
    actionButton
}: {
    id: string;
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    count: number;
    actionButton?: React.ReactNode;
}) {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <div ref={setNodeRef} className={`h-full flex flex-col transition-colors ${isOver ? "ring-2 ring-primary ring-offset-2 rounded-xl" : ""}`}>
            <div className="flex items-center justify-between mb-4 pb-3 border-b">
                <div className="flex items-center gap-2">
                    {icon}
                    <h3 className="text-lg font-semibold">{title} ({count})</h3>
                </div>
                {actionButton}
            </div>
            <div className={`flex-1 space-y-3 overflow-y-auto pr-2 ${count === 0 ? "border-2 border-dashed border-muted rounded-lg flex items-center justify-center" : ""}`}>
                {count === 0 ? (
                    <p className="text-muted-foreground text-sm text-center p-8 max-w-xs mx-auto">
                        Arraste estratégias aqui para {id === "approved" ? "aprovar" : "revisar"}
                    </p>
                ) : (
                    children
                )}
            </div>
        </div>
    );
}

export default function CampaignSetupPage() {
    const params = useParams();
    const campaignId = params.id as string;
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [runs, setRuns] = useState<AnalysisRun[]>([]);
    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [publishing, setPublishing] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [approvingAll, setApprovingAll] = useState(false);
    const [viewMode, setViewMode] = useState<'kanban' | 'matrix'>('kanban');
    const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const supabase = createClient();
    const { toast } = useToast();

    console.log('🚀 [INIT] Setup page loaded');
    console.log('🚀 [INIT] Campaign ID from params:', campaignId);
    console.log('🚀 [INIT] Supabase client created:', !!supabase);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const fetchCampaign = async () => {
        const { data, error } = await supabase
            .from("campaigns")
            .select("id, candidate_name, role")
            .eq("id", campaignId)
            .single();

        if (error) {
            console.error("❌ [ERROR] Erro ao buscar campanha:", error);
        } else {
            console.log('✅ [SUCCESS] Campanha carregada:', data);
            setCampaign(data);
        }
    };

    const fetchRuns = async () => {
        console.log('📦 [RUNS] Fetching analysis runs for campaign:', campaignId);

        const { data, error } = await supabase
            .from("analysis_runs")
            .select("*")
            .eq("campaign_id", campaignId)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("❌ [ERROR] Erro ao buscar runs:", error);
        } else {
            console.log('✅ [SUCCESS] Runs carregadas:', data?.length || 0);
            setRuns(data || []);

            // Auto-seleciona a run mais recente
            if (data && data.length > 0 && !selectedRunId) {
                setSelectedRunId(data[0].id);
                console.log('📌 [AUTO-SELECT] Run mais recente selecionada:', data[0].id);
            }
        }
    };

    const fetchStrategies = async () => {
        setLoading(true);
        console.log('🔍 [DEBUG] Fetching strategies for campaign:', campaignId);
        console.log('🔍 [DEBUG] Campaign ID type:', typeof campaignId, 'Length:', campaignId?.length);

        const { data, error, count } = await supabase
            .from("strategies")
            .select("*", { count: 'exact' })
            .eq("campaign_id", campaignId)
            .order("created_at", { ascending: false });

        console.log('📡 [RESPONSE] Raw Supabase response:', { data, error, count });

        if (error) {
            console.error("❌ [ERROR] Erro ao buscar estratégias:", error);
            console.error("❌ [ERROR] Error details:", JSON.stringify(error, null, 2));
            toast({
                title: "Erro",
                description: `Não foi possível carregar as estratégias: ${error.message}`,
                variant: "destructive",
            });
        } else {
            console.log('✅ [SUCCESS] Estratégias carregadas:', data?.length || 0, 'total (count:', count, ')');
            console.log('📊 [DATA] Primeiros 3 registros:', data?.slice(0, 3));

            if (data && data.length > 0) {
                console.log('📊 [DATA] Sample strategy:', data[0]);
                console.log('📊 [DATA] Status values:', data.map(s => s.status));
            }

            setStrategies(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchCampaign();
        fetchRuns();
        fetchStrategies();
    }, [campaignId]);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const strategyId = active.id as string;
        const newStatus = over.id as "suggested" | "approved";

        const strategy = strategies.find((s) => s.id === strategyId);
        if (!strategy || strategy.status === newStatus) return;

        // Optimistic UI Update
        setStrategies((prev) =>
            prev.map((s) =>
                s.id === strategyId ? { ...s, status: newStatus } : s
            )
        );

        // Persist to Database
        const { error } = await supabase
            .from("strategies")
            .update({ status: newStatus })
            .eq("id", strategyId);

        if (error) {
            toast({
                title: "Erro",
                description: "Não foi possível atualizar a estratégia.",
                variant: "destructive",
            });
            // Rollback
            fetchStrategies();
        } else {
            toast({
                title: newStatus === "approved" ? "✅ Aprovado!" : "↩️ Movido para Sugestões",
                description: `A estratégia foi ${newStatus === "approved" ? "aprovada" : "retornada para sugestões"}.`,
            });
        }
    };

    const handlePublish = async () => {
        setPublishing(true);
        toast({
            title: "📤 Publicando Campanha",
            description: "Enviando estratégias aprovadas para o candidato...",
        });

        // Simular envio de email/atualização de status
        await new Promise((resolve) => setTimeout(resolve, 2000));

        toast({
            title: "✅ Campanha Publicada!",
            description: "As estratégias foram disponibilizadas para o candidato.",
        });
        setPublishing(false);
    };

    const handleGenerationSuccess = async () => {
        console.log('🎉 [GENERATION] Nova análise concluída! Recarregando dados...');

        // Recarrega as runs
        const { data: newRuns } = await supabase
            .from("analysis_runs")
            .select("*")
            .eq("campaign_id", campaignId)
            .order("created_at", { ascending: false });

        if (newRuns && newRuns.length > 0) {
            setRuns(newRuns);
            // FORÇA a seleção da run mais recente (mesmo se já houver uma selecionada)
            setSelectedRunId(newRuns[0].id);
            console.log('🆕 [AUTO-SELECT] Nova run selecionada automaticamente:', newRuns[0].id);

            // Aguarda um pouco e recarrega as estratégias
            setTimeout(() => {
                fetchStrategies();
            }, 1000);
        }
    };

    const handleMove = async (strategyId: string, newStatus: "suggested" | "approved") => {
        // Optimistic UI Update
        setStrategies((prev) =>
            prev.map((s) => (s.id === strategyId ? { ...s, status: newStatus } : s))
        );

        // Persist to Database
        const { error } = await supabase
            .from("strategies")
            .update({ status: newStatus })
            .eq("id", strategyId);

        if (error) {
            toast({
                title: "Erro",
                description: "Não foi possível atualizar a estratégia.",
                variant: "destructive",
            });
            // Rollback
            fetchStrategies();
        } else {
            toast({
                title: newStatus === "approved" ? "✅ Aprovado!" : "↩️ Movido para Sugestões",
                description: `Estratégia atualizada.`,
            });
        }
    };

    const handleApproveAll = async () => {
        if (suggestedStrategies.length === 0) return;

        const confirmApprove = confirm(
            `✅ Aprovar ${suggestedStrategies.length} estratégias?\n\nTodas as sugestões visíveis serão aprovadas.`
        );

        if (!confirmApprove) return;

        setApprovingAll(true);

        try {
            // Atualizar todas as estratégias sugeridas para aprovadas
            const updates = suggestedStrategies.map((s) =>
                supabase
                    .from("strategies")
                    .update({ status: "approved" })
                    .eq("id", s.id)
            );

            await Promise.all(updates);

            toast({
                title: "✅ Sucesso!",
                description: `${suggestedStrategies.length} estratégias aprovadas.`,
            });

            // Recarregar estratégias
            fetchStrategies();
        } catch (error) {
            console.error("Erro ao aprovar todas:", error);
            toast({
                title: "Erro",
                description: "Não foi possível aprovar todas as estratégias.",
                variant: "destructive",
            });
        } finally {
            setApprovingAll(false);
        }
    };

    const handleDeleteRun = async () => {
        if (!selectedRunId) return;

        const confirmDelete = confirm(
            "⚠️ Tem certeza que deseja apagar esta análise?\n\nIsso vai remover permanentemente todas as estratégias e logs associados."
        );

        if (!confirmDelete) return;

        setDeleting(true);

        try {
            const response = await fetch(
                `http://localhost:8000/api/campaign/${campaignId}/run/${selectedRunId}`,
                { method: "DELETE" }
            );

            if (!response.ok) {
                throw new Error("Falha ao deletar run");
            }

            toast({
                title: "🗑️ Análise Deletada",
                description: "A versão foi removida com sucesso.",
            });

            // Recarregar runs
            await fetchRuns();

            // Selecionar próxima run disponível
            const { data: remainingRuns } = await supabase
                .from("analysis_runs")
                .select("*")
                .eq("campaign_id", campaignId)
                .order("created_at", { ascending: false });

            if (remainingRuns && remainingRuns.length > 0) {
                setSelectedRunId(remainingRuns[0].id);
            } else {
                setSelectedRunId(null);
            }

            // Recarregar estratégias
            fetchStrategies();
        } catch (error) {
            console.error("Erro ao deletar run:", error);
            toast({
                title: "Erro",
                description: "Não foi possível deletar a análise.",
                variant: "destructive",
            });
        } finally {
            setDeleting(false);
        }
    };

    // 🔧 FIX: Filtros com versão correta
    // - "Sugestões da IA": Filtra por run_id (versão selecionada) E status=suggested
    // - "Aprovados": Mostra TODOS aprovados (de qualquer versão)
    const suggestedStrategies = strategies.filter((s) =>
        s.status === "suggested" && s.run_id === selectedRunId
    );
    const approvedStrategies = strategies.filter((s) => s.status === "approved");

    // 🔧 FIX: Filtro para Matriz - Sugestões da Versão Atual + Todos Aprovados
    const strategiesForMatrix = strategies.filter((s) =>
        (s.status === "suggested" && s.run_id === selectedRunId) || s.status === "approved"
    );

    // 🔧 DEBUG: Log quando versão muda
    useEffect(() => {
        if (selectedRunId) {
            console.log('🔄 [VERSION CHANGE] Trocando versão para:', selectedRunId);
            console.log('🔄 [VERSION CHANGE] Sugestões filtradas:', suggestedStrategies.length);
            console.log('🔄 [VERSION CHANGE] Aprovados (todas versões):', approvedStrategies.length);
            console.log('🔄 [VERSION CHANGE] Total na Matriz:', strategiesForMatrix.length);
        }
    }, [selectedRunId]);

    const handleStrategyClick = (strategy: Strategy) => {
        setSelectedStrategy(strategy);
        setIsEditorOpen(true);
    };

    const handleStrategySave = (updatedStrategy: Strategy) => {
        setStrategies(prev =>
            prev.map(s => s.id === updatedStrategy.id ? updatedStrategy : s)
        );
    };

    // Buscar run selecionada para exibir o manifesto
    const selectedRun = runs.find(r => r.id === selectedRunId);

    console.log('🎨 [RENDER] Total strategies:', strategies.length);
    console.log('🎨 [RENDER] Selected Run:', selectedRunId);
    console.log('🎨 [RENDER] Suggested (from selected run):', suggestedStrategies.length, 'Approved:', approvedStrategies.length);

    return (
        <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
            <DashboardSidebar campaignId={campaignId} />

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="border-b bg-white/90 backdrop-blur-sm px-6 py-4 shadow-sm space-y-4">
                    {/* Manifesto da Campanha */}
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4">
                        <h2 className="text-sm font-semibold text-purple-900 mb-1">📜 Manifesto da Campanha</h2>
                        <p className="text-xs text-purple-700 leading-relaxed">
                            Uma campanha construída sobre pilares de credibilidade, proximidade e transformação.
                            Estratégias geradas pela Genesis AI focam em conectar o candidato com a população através
                            de ações tangíveis nas áreas de saúde, educação e segurança.
                        </p>
                    </div>

                    {/* Controles */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div>
                                <h1 className="text-2xl font-bold">
                                    🎯 Simulador de Homologação
                                    {campaign && (
                                        <span className="text-purple-600">: {campaign.candidate_name} - {campaign.role}</span>
                                    )}
                                </h1>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Revise e aprove as estratégias geradas pela Genesis AI
                                </p>
                            </div>

                            {/* Seletor de Versão */}
                            {runs.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <Select value={selectedRunId || ""} onValueChange={setSelectedRunId}>
                                        <SelectTrigger className="w-[280px]">
                                            <SelectValue placeholder="Selecione uma versão" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {runs.map((run, index) => (
                                                <SelectItem key={run.id} value={run.id}>
                                                    Versão {runs.length - index} - {new Date(run.created_at).toLocaleDateString('pt-BR')} ({run.persona_name})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    {/* Botão de Deletar */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDeleteRun}
                                        disabled={!selectedRunId || deleting}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
                                    >
                                        {deleting ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            {/* View Toggle */}
                            <div className="flex gap-1 bg-white border rounded-lg p-1">
                                <Button
                                    variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setViewMode('kanban')}
                                    className="h-8"
                                >
                                    <LayoutList className="h-4 w-4 mr-2" />
                                    Kanban
                                </Button>
                                <Button
                                    variant={viewMode === 'matrix' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setViewMode('matrix')}
                                    className="h-8"
                                >
                                    <Grid3x3 className="h-4 w-4 mr-2" />
                                    Matriz
                                </Button>
                            </div>

                            {/* Generator Dialog (Novo) */}
                            <GeneratorDialog campaignId={campaignId} onSuccess={handleGenerationSuccess} />

                            {/* Publish Button */}
                            <Button
                                onClick={handlePublish}
                                disabled={approvedStrategies.length === 0 || publishing}
                                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-md"
                                size="lg"
                            >
                                {publishing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publicando...
                                    </>
                                ) : (
                                    <>
                                        <Send className="mr-2 h-4 w-4" /> Publicar Campanha
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-6 overflow-auto space-y-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        </div>
                    ) : strategies.length === 0 ? (
                        // EMPTY STATE
                        <div className="flex flex-col items-center justify-center h-full space-y-6 text-center animate-in fade-in zoom-in duration-500">
                            <div className="relative">
                                <div className="absolute inset-0 bg-purple-500/20 blur-3xl rounded-full" />
                                <Bot className="h-32 w-32 text-purple-600 relative z-10" />
                            </div>
                            <div className="max-w-md space-y-2">
                                <h3 className="text-2xl font-bold text-slate-900">Nenhuma estratégia gerada</h3>
                                <p className="text-muted-foreground">
                                    A IA ainda não analisou o perfil deste candidato. Escolha um estrategista para começar.
                                </p>
                            </div>
                            <GeneratorDialog
                                campaignId={campaignId}
                                onSuccess={handleGenerationSuccess}
                                trigger={
                                    <Button size="lg" className="gap-2 bg-purple-600 hover:bg-purple-700 text-lg px-8 py-6 h-auto shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                                        <Sparkles className="h-6 w-6" />
                                        Iniciar Inteligência Artificial
                                    </Button>
                                }
                            />
                        </div>
                    ) : (
                        <>
                            {/* Dossiê Estratégico - SEMPRE NO TOPO */}
                            <CampaignManifesto
                                campaignId={campaignId}
                                planContent={selectedRun?.strategic_plan_text}
                            />

                            {/* Visualizações: Kanban ou Matriz */}
                            {viewMode === 'matrix' ? (
                                <StrategicMatrix
                                    strategies={strategiesForMatrix}
                                    onStrategyClick={handleStrategyClick}
                                />
                            ) : (
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCorners}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                >
                                    <div className="grid grid-cols-2 gap-6 h-full">
                                        {/* Sugestões da IA */}
                                        <div className="bg-white rounded-xl shadow-md border p-6 overflow-hidden flex flex-col">
                                            <DroppableColumn
                                                id="suggested"
                                                title="Sugestões da IA"
                                                icon={<Sparkles className="h-5 w-5 text-purple-600" />}
                                                count={suggestedStrategies.length}
                                                actionButton={
                                                    suggestedStrategies.length > 0 && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={handleApproveAll}
                                                            disabled={approvingAll}
                                                            className="h-8 text-xs border-green-300 text-green-700 hover:bg-green-50"
                                                        >
                                                            {approvingAll ? (
                                                                <>
                                                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                                    Aprovando...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <CheckCircle className="h-3 w-3 mr-1" />
                                                                    Aprovar Todas
                                                                </>
                                                            )}
                                                        </Button>
                                                    )
                                                }
                                            >
                                                <div className="space-y-3">
                                                    {suggestedStrategies.map((strategy) => (
                                                        <DraggableStrategyCard
                                                            key={strategy.id}
                                                            strategy={strategy}
                                                            onClick={() => handleStrategyClick(strategy)}
                                                            onMove={handleMove}
                                                        />
                                                    ))}
                                                </div>
                                            </DroppableColumn>
                                        </div>

                                        {/* Aprovado para Candidato */}
                                        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl shadow-md border-2 border-green-200 p-6 overflow-hidden flex flex-col">
                                            <DroppableColumn
                                                id="approved"
                                                title="Aprovado para Publicação"
                                                icon={<CheckCircle className="h-5 w-5 text-green-600" />}
                                                count={approvedStrategies.length}
                                            >
                                                <div className="space-y-3">
                                                    {approvedStrategies.map((strategy) => (
                                                        <DraggableStrategyCard
                                                            key={strategy.id}
                                                            strategy={strategy}
                                                            onClick={() => handleStrategyClick(strategy)}
                                                            onMove={handleMove}
                                                        />
                                                    ))}
                                                </div>
                                            </DroppableColumn>
                                        </div>
                                    </div>

                                    <DragOverlay>
                                        {activeId && strategies.find(s => s.id === activeId) ? (
                                            <div className="opacity-95 scale-105 rotate-2 shadow-2xl">
                                                <Card className="border-l-4" style={{ borderLeftColor: strategies.find(s => s.id === activeId)?.pillar === "Credibilidade" ? "#3b82f6" : strategies.find(s => s.id === activeId)?.pillar === "Proximidade" ? "#22c55e" : "#9333ea" }}>
                                                    <CardHeader className="pb-3">
                                                        <CardTitle className="text-sm">{strategies.find(s => s.id === activeId)?.title}</CardTitle>
                                                    </CardHeader>
                                                </Card>
                                            </div>
                                        ) : null}
                                    </DragOverlay>
                                </DndContext>
                            )}
                        </>
                    )}
                </div>

                {/* Strategy Editor Sheet */}
                <StrategyEditorSheet
                    strategy={selectedStrategy}
                    isOpen={isEditorOpen}
                    onClose={() => setIsEditorOpen(false)}
                    onSave={handleStrategySave}
                />
            </div>
        </div>
    );
}
