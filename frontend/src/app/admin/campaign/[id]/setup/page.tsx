"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners, PointerSensor, useSensor, useSensors, useDroppable, useDraggable } from "@dnd-kit/core";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, CheckCircle, Send, GripVertical, Grid3x3, LayoutList, Clock, Bot, RefreshCcw, AlertTriangle, Trash2, ArrowRight, ArrowLeft, Edit, Calendar } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useParams, useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StrategyEditorSheet } from "@/components/campaign/StrategyEditorSheet";
import { StrategicMatrix } from "@/components/campaign/StrategicMatrix";
import { CampaignManifesto } from "@/components/campaign/CampaignManifesto";
import { GeneratorDialog } from "@/components/campaign/GeneratorDialog";
import { StrategicTimeline } from "@/components/campaign/StrategicTimeline";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ExecutionConsole } from "@/components/admin/ExecutionConsole";

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

    const colorClass = pillarColors[strategy.pillar] || "bg-gray-100 text-gray-800";

    // Removing borders from color class if they exist in pillarColors map
    const badgeClass = colorClass.replace(/border-[a-z]+-[0-9]+/, "");

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.8 : 1,
        zIndex: isDragging ? 50 : 0,
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
        <div ref={setNodeRef} style={style} className="group">
            <Card
                className={`
                    cursor-grab active:cursor-grabbing border border-slate-100
                    bg-white rounded-xl shadow-sm hover:shadow-md 
                    transition-all duration-200 hover:border-slate-200
                    ${isDragging ? 'shadow-xl rotate-2 ring-2 ring-primary/20' : ''}
                `}
            >
                <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start gap-2 mb-2">
                        <div className="flex items-center gap-2" {...listeners} {...attributes}>
                            <Badge variant="secondary" className={`${badgeClass} border-none rounded-full px-2 py-0.5 font-normal`}>
                                {strategy.pillar}
                            </Badge>
                        </div>
                        <span className="text-sm bg-slate-50 p-1 rounded-full" title={strategy.phase}>
                            {phaseIcons[strategy.phase] || "📌"}
                        </span>
                    </div>
                    <CardTitle className="text-base font-semibold leading-tight text-slate-800">{strategy.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-1">
                    <p className="text-sm text-slate-500 line-clamp-3 mb-4 leading-relaxed">{strategy.description}</p>

                    {/* Botões de Ação Rápida - Invisíveis até hover (exceto em mobile/touch) */}
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-50 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleEdit}
                            className="h-8 text-xs flex-1 rounded-full hover:bg-slate-100 text-slate-600"
                        >
                            <Edit className="h-3.5 w-3.5 mr-1.5" />
                            Editar
                        </Button>

                        {strategy.status === "suggested" ? (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleQuickMove}
                                className="h-8 text-xs text-green-700 hover:text-green-800 hover:bg-green-50 rounded-full"
                            >
                                <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
                                Aprovar
                            </Button>
                        ) : (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleQuickMove}
                                className="h-8 text-xs text-orange-700 hover:text-orange-800 hover:bg-orange-50 rounded-full"
                            >
                                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
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
        <div
            ref={setNodeRef}
            className={`
                h-full flex flex-col p-4 rounded-3xl transition-all duration-300
                ${isOver
                    ? "bg-slate-100/80 ring-2 ring-primary/20 scale-[1.01]"
                    : "bg-slate-50/40 border-2 border-dashed border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                }
            `}
        >
            <div className="flex items-center justify-between mb-4 pl-1 pr-1">
                <div className="flex items-center gap-3 opacity-80">
                    {icon}
                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">{title} <span className="text-slate-400 ml-1">({count})</span></h3>
                </div>
                {actionButton}
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                {count === 0 ? (
                    <div className="h-40 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-100 rounded-2xl bg-white/50">
                        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                            <Sparkles className="w-5 h-5 text-slate-300" />
                        </div>
                        <p className="text-sm text-slate-400 font-medium">
                            {id === "approved" ? "Arraste para aprovar" : "Lista vazia"}
                        </p>
                    </div>
                ) : (
                    children
                )}
            </div>
        </div>
    );
}

export default function CampaignSetupPage() {
    const params = useParams();
    const router = useRouter();
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
    const [viewMode, setViewMode] = useState<'kanban' | 'matrix' | 'timeline'>('kanban');
    const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    // 🔍 Estados para verificação de saúde dos dados
    const [locationsCount, setLocationsCount] = useState<number | null>(null);
    const [chunksCount, setChunksCount] = useState<number | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [documents, setDocuments] = useState<{ file_url: string; file_type: string }[]>([]);

    // 🖥️ Console de Execução Global
    const [currentRunId, setCurrentRunId] = useState<string | null>(null);
    const [isConsoleOpen, setIsConsoleOpen] = useState(false);

    const handleRunStarted = (runId: string) => {
        console.log('🎧 Console listening to:', runId); // DEBUG
        setCurrentRunId(runId);
        setIsConsoleOpen(true);
        toast({ title: "IA Iniciada", description: "Acompanhe o progresso no console abaixo e as estratégias em tempo real." });
    };

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
        fetchDataHealth(); // Verificar saúde dos dados
    }, [campaignId]);

    // 🔍 Verificar saúde dos dados (locations e chunks)
    const fetchDataHealth = async () => {
        console.log('🔍 [DATA HEALTH] Verificando dados processados para campanha:', campaignId);

        // Buscar documentos da campanha
        const { data: docs } = await supabase
            .from('documents')
            .select('file_url, file_type')
            .eq('campaign_id', campaignId);

        setDocuments(docs || []);
        console.log('📄 [DATA HEALTH] Documentos encontrados:', docs?.length || 0);

        // Contar locations
        const { count: locCount } = await supabase
            .from('locations')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaignId);

        setLocationsCount(locCount || 0);
        console.log('📍 [DATA HEALTH] Locations:', locCount);

        // Contar chunks (document_chunks)
        const { count: chunkCount } = await supabase
            .from('document_chunks')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaignId);

        setChunksCount(chunkCount || 0);
        console.log('📝 [DATA HEALTH] Chunks:', chunkCount);

        console.log('DEBUG DADOS:', { locationsCount: locCount, chunksCount: chunkCount });
    };

    // 🔄 Processar arquivos pendentes
    const handleProcessFiles = async () => {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        console.log("🔌 Tentando conectar ao Backend em:", backendUrl);

        setIsProcessing(true);
        toast({
            title: '🔄 Processando arquivos...',
            description: 'Isso pode levar alguns segundos.',
        });

        try {
            // Processar CSV (locations)
            const csvDoc = documents.find(d => d.file_type === 'csv');
            if (csvDoc && locationsCount === 0) {
                console.log('📊 [PROCESS] Processando CSV:', csvDoc.file_url);
                const csvResponse = await fetch(`${backendUrl}/api/ingest/locations`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        campaign_id: campaignId,
                        file_url: csvDoc.file_url
                    })
                });
                if (!csvResponse.ok) {
                    const errorData = await csvResponse.json().catch(() => ({}));
                    throw new Error(`CSV Error: ${csvResponse.status} - ${errorData.detail || 'Unknown'}`);
                }
            }

            // Processar PDF (chunks)
            const pdfDoc = documents.find(d => d.file_type === 'pdf');
            if (pdfDoc && chunksCount === 0) {
                console.log('📄 [PROCESS] Processando PDF:', pdfDoc.file_url);
                const pdfResponse = await fetch(`${backendUrl}/api/ingest/pdf`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        campaign_id: campaignId,
                        file_url: pdfDoc.file_url
                    })
                });
                if (!pdfResponse.ok) {
                    const errorData = await pdfResponse.json().catch(() => ({}));
                    throw new Error(`PDF Error: ${pdfResponse.status} - ${errorData.detail || 'Unknown'}`);
                }
            }

            toast({
                title: '✅ Processamento concluído!',
                description: 'Os dados foram processados. Mapa pronto para visualização!',
                action: (
                    <ToastAction
                        altText="Ver Mapa"
                        onClick={() => router.push(`/campaign/${campaignId}/map`)}
                    >
                        🗺️ Ver Mapa
                    </ToastAction>
                ),
            });

            // Recarregar contagens
            await fetchDataHealth();

        } catch (error) {
            console.error("❌ Erro CRÍTICO de Conexão:", error);
            toast({
                title: "Erro de Conexão",
                description: "Não foi possível contatar o servidor Python. Verifique se ele está rodando na porta 8000.",
                variant: "destructive"
            });
        } finally {
            setIsProcessing(false);
        }
    };

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

            // Sincroniza console para mostrar logs históricos
            setCurrentRunId(selectedRunId);
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
        <div className="flex h-screen overflow-hidden bg-background">
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header Compacto (App Layout) */}
                <header className="h-16 sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-6 flex items-center justify-between gap-4 shrink-0">
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-bold truncate flex items-center gap-2">
                                🎯 Simulador
                                {campaign && (
                                    <span className="text-muted-foreground font-normal text-base border-l pl-2 ml-2">
                                        {campaign.candidate_name.split(' ')[0]} <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{campaign.role}</span>
                                    </span>
                                )}
                            </h1>
                        </div>

                        {/* Seletor de Versão Compacto */}
                        {runs.length > 0 && (
                            <div className="flex items-center gap-1 border-l pl-4 ml-2">
                                <Select value={selectedRunId || ""} onValueChange={setSelectedRunId}>
                                    <SelectTrigger className="h-8 w-[180px] text-xs">
                                        <SelectValue placeholder="Versão" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {runs.map((run, index) => (
                                            <SelectItem key={run.id} value={run.id} className="text-xs">
                                                v{runs.length - index} • {new Date(run.created_at).toLocaleDateString()}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <div className="flex items-center gap-0.5 bg-slate-100 rounded-md p-0.5">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { fetchRuns(); fetchStrategies(); }} title="Recarregar">
                                        <RefreshCcw className="h-3.5 w-3.5 text-slate-500" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-red-600" onClick={handleDeleteRun} disabled={!selectedRunId || deleting} title="Deletar Versão">
                                        {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        {/* View Toggle Compacto */}
                        <div className="flex bg-slate-100/50 rounded-lg p-1 gap-1">
                            <Button
                                variant={viewMode === 'kanban' ? 'white' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('kanban')}
                                className={`h-8 px-3 text-xs ${viewMode === 'kanban' ? 'bg-white shadow-sm' : 'text-muted-foreground'}`}
                            >
                                <LayoutList className="h-3.5 w-3.5 mr-2" />
                                Kanban
                            </Button>
                            <Button
                                variant={viewMode === 'matrix' ? 'white' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('matrix')}
                                className={`h-8 px-3 text-xs ${viewMode === 'matrix' ? 'bg-white shadow-sm' : 'text-muted-foreground'}`}
                            >
                                <Grid3x3 className="h-3.5 w-3.5 mr-2" />
                                Matriz
                            </Button>
                            <Button
                                variant={viewMode === 'timeline' ? 'white' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('timeline')}
                                className={`h-8 px-3 text-xs ${viewMode === 'timeline' ? 'bg-white shadow-sm' : 'text-muted-foreground'}`}
                            >
                                <Calendar className="h-3.5 w-3.5 mr-2" />
                                Cronograma
                            </Button>
                        </div>

                        <div className="h-6 w-px bg-border mx-1" />

                        {/* Actions */}
                        <GeneratorDialog
                            campaignId={campaignId}
                            onSuccess={handleGenerationSuccess}
                            onRunStarted={handleRunStarted}
                            trigger={
                                <Button size="sm" variant="outline" className="h-9 gap-2 border-purple-200 text-purple-700 hover:bg-purple-50">
                                    <Sparkles className="h-4 w-4" />
                                    Gerar Novo
                                </Button>
                            }
                        />

                        <Button
                            onClick={handlePublish}
                            disabled={approvedStrategies.length === 0 || publishing}
                            size="sm"
                            className="h-9 bg-green-600 hover:bg-green-700 text-white shadow-sm gap-2"
                        >
                            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            Publicar
                        </Button>
                    </div>
                </header>

                {/* 🔴 Alert de Documentos Não Encontrados */}
                {documents.length === 0 && locationsCount !== null && (
                    <div className="px-6 pt-4">
                        <Alert className="bg-red-50 border-red-200">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <AlertTitle className="text-red-800">❌ Nenhum arquivo encontrado</AlertTitle>
                            <AlertDescription className="text-red-700 flex justify-between items-center">
                                <span>
                                    Esta campanha não possui CSV ou PDF cadastrados. Vá em "Editar Candidato" e faça upload dos arquivos.
                                </span>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="bg-white border-red-300 hover:bg-red-100 text-red-900 ml-4"
                                    onClick={() => window.location.href = `/admin/candidatos/novo?id=${campaignId}`}
                                >
                                    📂 Ir para Upload
                                </Button>
                            </AlertDescription>
                        </Alert>
                    </div>
                )}

                {/* 🟡 Alert de Dados Não Processados */}
                {locationsCount !== null && chunksCount !== null && (locationsCount === 0 || chunksCount === 0) && documents.length > 0 && (
                    <div className="px-6 pt-4">
                        <Alert className="bg-yellow-50 border-yellow-200">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            <AlertTitle className="text-yellow-800">⚠️ Dados não processados</AlertTitle>
                            <AlertDescription className="text-yellow-700 flex justify-between items-center">
                                <span>
                                    {locationsCount === 0 && chunksCount === 0
                                        ? 'O CSV do mapa e o PDF não foram processados. O mapa estará vazio e a IA não terá contexto.'
                                        : locationsCount === 0
                                            ? 'O CSV do mapa não foi processado. O mapa estará vazio.'
                                            : 'O PDF não foi processado. A IA não terá contexto do plano de governo.'
                                    }
                                </span>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="bg-white border-yellow-300 hover:bg-yellow-100 text-yellow-900 ml-4"
                                    onClick={handleProcessFiles}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? (
                                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processando...</>
                                    ) : (
                                        '🔄 Processar Agora'
                                    )}
                                </Button>
                            </AlertDescription>
                        </Alert>
                    </div>
                )}

                {/* ✅ Data Context Dashboard - Dados Sincronizados */}
                {locationsCount !== null && chunksCount !== null && locationsCount > 0 && chunksCount > 0 && (
                    <div className="px-6 pt-4">
                        <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">📍</span>
                                    <div>
                                        <span className="text-xs text-blue-600 font-medium">Mapa Tático</span>
                                        <p className="text-sm font-bold text-blue-900">
                                            {locationsCount.toLocaleString()} <span className="font-normal text-blue-700">locais</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="h-8 w-px bg-blue-200" />
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">📚</span>
                                    <div>
                                        <span className="text-xs text-blue-600 font-medium">Memória Vetorial</span>
                                        <p className="text-sm font-bold text-blue-900">
                                            {chunksCount.toLocaleString()} <span className="font-normal text-blue-700">fragmentos</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Badge className="bg-green-100 text-green-800 border-green-300 hover:bg-green-100">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Base de Dados Sincronizada
                                </Badge>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => { fetchDataHealth(); }}
                                    className="h-8 px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                                    title="Recarregar contagens"
                                >
                                    <RefreshCcw className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Content Area - Full Height no Kanban, Auto no resto */}
                <div className={`flex-1 flex flex-col ${viewMode === 'kanban' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                    {/* Dossiê Fixo no Topo (Opcional, pode rolar se quiser, mas aqui vou deixar fixo ou scrollando com conteúdo) */}
                    {/* Vou colocar dentro do container de conteúdo mas acima do scroll das colunas */}

                    {strategies.length > 0 && (
                        <div className="px-6 pt-4 pb-2 shrink-0">
                            <CampaignManifesto
                                campaignId={campaignId}
                                planContent={selectedRun?.strategic_plan_text}
                            />
                        </div>
                    )}

                    <div className={`flex-1 px-6 pb-6 ${viewMode === 'kanban' ? 'overflow-hidden' : ''}`}>
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
                                    onRunStarted={handleRunStarted}
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
                                            <div className="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col h-full">
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
                                            <div className="bg-white rounded-xl shadow-sm border border-l-4 border-l-emerald-500 overflow-hidden flex flex-col h-full">
                                                <DroppableColumn
                                                    id="approved"
                                                    title="Aprovado para Publicação"
                                                    icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
                                                    count={approvedStrategies.length}
                                                >
                                                    <div className="space-y-3 pb-4">
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

                        {viewMode === 'timeline' && (
                            <div className="h-full overflow-hidden">
                                <StrategicTimeline
                                    strategies={strategiesForMatrix}
                                    onStrategyClick={handleStrategyClick}
                                    onStrategyUpdate={handleStrategySave}
                                />
                            </div>
                        )}
                    </div>

                    {/* Strategy Editor Sheet */}
                    <StrategyEditorSheet
                        strategy={selectedStrategy}
                        isOpen={isEditorOpen}
                        onClose={() => setIsEditorOpen(false)}
                        onSave={handleStrategySave}
                    />

                    {/* 🖥️ Console Global */}
                    <ExecutionConsole
                        runId={currentRunId}
                        campaignId={campaignId}
                        isOpen={isConsoleOpen}
                        onToggle={() => setIsConsoleOpen(!isConsoleOpen)}
                    />
                </div>
            </div>
        </div>
    );
}
