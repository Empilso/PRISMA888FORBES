"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, AlertCircle, Undo2, ArrowUpRight, Sparkles, ChevronDown, ChevronUp, LayoutGrid, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AIStrategiesList } from "@/components/campaign/ai-strategies-list";
import { CampaignManifesto } from "@/components/campaign/CampaignManifesto";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { TaskDetailsDialog } from "@/components/tasks/task-details-dialog";
import { ExamplesRenderer } from "@/components/tasks/ExamplesRenderer";
import { StrategySwipeDeck } from "@/components/campaign/StrategySwipeDeck";

interface Task {
    id: string;
    title: string;
    description: string;
    status: "pending" | "in_progress" | "review" | "completed";
    priority: "low" | "medium" | "high" | "urgent";
    due_date: string | null;
    created_at: string;
    strategy_id: string | null;
    tags?: string[];
    examples?: string[];
    pillar?: string | null;
    phase?: string | null;
}

export default function PlanoContent({ campaignId }: { campaignId: string }) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [revertingTaskId, setRevertingTaskId] = useState<string | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isFeedOpen, setIsFeedOpen] = useState(true);
    const [feedViewMode, setFeedViewMode] = useState<"feed" | "deck">("feed");

    const supabase = createClient();
    const { toast } = useToast();

    // Buscar tarefas ativas do banco
    useEffect(() => {
        fetchTasks(true);
    }, [campaignId]);

    const fetchTasks = async (isInitial = false) => {
        // Se já tem tarefas, não mostre loading full screen para update silencioso
        if (tasks.length === 0) setLoading(true);
        setError(null);
        try {
            // Use API proxy to bypass RLS issues
            const res = await fetch(`/api/campaign/${campaignId}/tasks`, {
                cache: 'no-store'
            });

            if (!res.ok) throw new Error("Falha ao buscar tarefas");

            const fetchedTasks: Task[] = await res.json();


            // Auto-collapse logic:
            // 1. Initial load with tasks -> Collapse
            // 2. New tasks created (fetched > current) -> Collapse to show new task
            if (isInitial && fetchedTasks.length > 0) {
                setIsFeedOpen(false);
            } else if (fetchedTasks.length > tasks.length && !isInitial) {
                setIsFeedOpen(false);
            }

            setTasks(fetchedTasks);
        } catch (err) {
            console.error("Erro ao buscar tarefas:", err);
            setError("Não foi possível carregar as tarefas.");
        } finally {
            setLoading(false);
        }
    };

    const handleRevertTask = async (taskId: string, taskTitle: string) => {
        const confirm = window.confirm(
            `Tem certeza que deseja remover "${taskTitle}" do Kanban?\n\nA tarefa será devolvida para a lista de sugestões aprovadas.`
        );

        if (!confirm) return;

        setRevertingTaskId(taskId);
        try {
            const res = await fetch(
                `/api/campaign/${campaignId}/tasks/${taskId}/revert`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || "Falha ao reverter tarefa");
            }

            toast({
                title: "✅ Tarefa Revertida!",
                description: `"${taskTitle}" foi devolvida para as sugestões aprovadas.`,
            });

            await fetchTasks();
        } catch (error: any) {
            console.error("Erro ao reverter tarefa:", error);
            toast({
                title: "Erro",
                description: error.message || "Não foi possível reverter a tarefa.",
                variant: "destructive",
            });
        } finally {
            setRevertingTaskId(null);
        }
    };

    const handleOpenTask = (task: Task) => {
        setSelectedTask(task);
        setIsSheetOpen(true);
    };

    const getStatusConfig = (status: string) => {
        const configs: Record<string, { label: string; color: string }> = {
            pending: { label: "Pendente", color: "bg-slate-100 text-slate-700 border-slate-200" },
            in_progress: { label: "Em Progresso", color: "bg-blue-50 text-blue-700 border-blue-200" },
            review: { label: "Em Revisão", color: "bg-purple-50 text-purple-700 border-purple-200" },
            completed: { label: "Concluída", color: "bg-green-50 text-green-700 border-green-200" },
        };
        return configs[status] || configs.pending;
    };

    const getPriorityConfig = (priority: string) => {
        const configs: Record<string, { label: string; color: string }> = {
            urgent: { label: "Urgente", color: "bg-red-50 text-red-700 border-red-200" },
            high: { label: "Alta", color: "bg-orange-50 text-orange-700 border-orange-200" },
            medium: { label: "Média", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
            low: { label: "Baixa", color: "bg-slate-50 text-slate-600 border-slate-200" },
        };
        return configs[priority] || configs.medium;
    };

    return (
        <div className="space-y-8 pb-20 px-4 sm:px-8">
            {/* Dossiê Estratégico - MANIFESTO */}
            <CampaignManifesto campaignId={campaignId} />

            {/* Feed Toggle Section */}
            <div className="bg-white rounded-xl shadow-sm border border-indigo-100 overflow-hidden transition-all duration-300">
                <div
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 select-none"
                >
                    {/* Left: title (clickable to toggle collapse) */}
                    <div
                        onClick={() => setIsFeedOpen(!isFeedOpen)}
                        className="flex items-center gap-3 cursor-pointer group flex-1"
                    >
                        <div className="bg-white p-1.5 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                            <Sparkles className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div className="flex flex-col">
                            <h3 className="font-bold text-indigo-950 text-sm flex items-center gap-2">
                                Feed de Oportunidades
                                {isFeedOpen && <Badge variant="secondary" className="h-5 text-[10px] bg-white text-indigo-600 shadow-none border max-md:hidden">IA Powered</Badge>}
                            </h3>
                            {!isFeedOpen && <p className="text-[10px] text-indigo-500 font-medium">Clique para ver sugestões estratégicas</p>}
                        </div>
                    </div>

                    {/* Right: view mode toggle + collapse */}
                    <div className="flex items-center gap-2">
                        {isFeedOpen && (
                            <div className="flex items-center bg-indigo-50 rounded-full p-1 gap-1">
                                <button
                                    onClick={() => setFeedViewMode("feed")}
                                    title="Modo Feed (Grade)"
                                    className={`rounded-full p-1.5 transition-all ${feedViewMode === "feed"
                                        ? "bg-white shadow text-indigo-600"
                                        : "text-indigo-300 hover:text-indigo-500"
                                        }`}
                                >
                                    <LayoutGrid className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => setFeedViewMode("deck")}
                                    title="Modo Deck (Swipe)"
                                    className={`rounded-full p-1.5 transition-all ${feedViewMode === "deck"
                                        ? "bg-white shadow text-indigo-600"
                                        : "text-indigo-300 hover:text-indigo-500"
                                        }`}
                                >
                                    <Layers className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 rounded-full text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100/50"
                            onClick={() => setIsFeedOpen(!isFeedOpen)}
                        >
                            {isFeedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isFeedOpen ? 'max-h-[4000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="p-4 border-t border-indigo-50 bg-slate-50/30">
                        {feedViewMode === "deck" ? (
                            <StrategySwipeDeck
                                campaignId={campaignId}
                                onTaskCreated={() => fetchTasks(false)}
                            />
                        ) : (
                            <AIStrategiesList campaignId={campaignId} onTaskCreated={() => fetchTasks(false)} />
                        )}
                    </div>
                </div>
            </div>

            {/* Tarefas Ativas */}
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
                            <CheckCircle2 className="h-6 w-6 text-blue-600" />
                            Minhas Tarefas Ativas
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Tarefas em execução criadas a partir do plano
                        </p>
                    </div>
                    <Badge variant="secondary" className="px-3 py-1 text-sm font-semibold bg-blue-50 text-blue-700">
                        {tasks.length} {tasks.length === 1 ? 'Tarefa' : 'Tarefas'}
                    </Badge>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        <span className="ml-3 text-slate-500">Carregando plano...</span>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center bg-red-50/50 rounded-xl border border-red-100">
                        <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
                        <p className="text-red-600 font-medium">{error}</p>
                        <Button variant="outline" onClick={() => fetchTasks(false)} className="mt-4 bg-white">
                            Tentar Novamente
                        </Button>
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                            <CheckCircle2 className="h-8 w-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 mb-2">Nenhuma tarefa ativa</h3>
                        <p className="text-slate-500 max-w-md">
                            Aprove estratégias na seção acima para começar a preencher seu plano de execução.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tasks.map((task) => {
                            const status = getStatusConfig(task.status);
                            const priority = getPriorityConfig(task.priority);

                            return (
                                <div
                                    key={task.id}
                                    onClick={() => handleOpenTask(task)}
                                    className="group relative bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 flex flex-col min-h-[260px] cursor-pointer"
                                >
                                    {/* Header Badges */}
                                    <div className="flex items-center justify-between mb-3 flex-wrap gap-1.5">
                                        <div className="flex items-center gap-1.5">
                                            <Badge variant="outline" className={`font-normal ${status.color}`}>
                                                {status.label}
                                            </Badge>
                                            {task.pillar && (
                                                <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-medium">
                                                    {task.pillar}
                                                </Badge>
                                            )}
                                        </div>
                                        <Badge variant="outline" className={`font-normal ${priority.color}`}>
                                            {priority.label}
                                        </Badge>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1">
                                        <h3 className="font-bold text-base text-slate-900 mb-2 leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors">
                                            {task.title}
                                        </h3>
                                        <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                                            {task.description}
                                        </p>

                                        {/* Exemplos - ExamplesRenderer */}
                                        {(() => {
                                            const safeExamples = Array.isArray(task.examples) ? task.examples : [];
                                            return safeExamples.length > 0 ? (
                                                <ExamplesRenderer
                                                    examples={safeExamples}
                                                    mode="card"
                                                    maxPreview={2}
                                                    onViewAll={() => handleOpenTask(task)}
                                                />
                                            ) : null;
                                        })()}
                                    </div>

                                    {/* Footer Meta & Actions */}
                                    <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRevertTask(task.id, task.title);
                                                }}
                                                disabled={revertingTaskId === task.id}
                                                title="Devolver para sugestões"
                                            >
                                                {revertingTaskId === task.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                                                ) : (
                                                    <Undo2 className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>

                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 rounded-full text-xs font-medium border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenTask(task);
                                            }}
                                        >
                                            Gerenciar
                                            <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Rich Task Modal - Focused Dialog */}
            <TaskDetailsDialog
                task={selectedTask as any}
                open={isSheetOpen}
                onOpenChange={(open) => {
                    setIsSheetOpen(open);
                    if (!open) {
                        setSelectedTask(null);
                        // Atualiza lista ao fechar
                        fetchTasks(false);
                    }
                }}
            />
        </div>
    );
}
