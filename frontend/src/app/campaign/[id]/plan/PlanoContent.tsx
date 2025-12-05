"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, AlertCircle, Undo2, Trash2 } from "lucide-react";
import { AIStrategiesList } from "@/components/campaign/ai-strategies-list";
import { CampaignManifesto } from "@/components/campaign/CampaignManifesto";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface Task {
    id: string;
    title: string;
    description: string;
    status: "pending" | "in_progress" | "review" | "completed";
    priority: "low" | "medium" | "high" | "urgent";
    due_date: string | null;
    created_at: string;
    strategy_id: string | null;
}

export default function PlanoContent({ campaignId }: { campaignId: string }) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [revertingTaskId, setRevertingTaskId] = useState<string | null>(null);
    const supabase = createClient();
    const { toast } = useToast();

    // Buscar tarefas ativas do banco
    useEffect(() => {
        fetchTasks();
    }, [campaignId]);

    const fetchTasks = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from("tasks")
                .select("*")
                .eq("campaign_id", campaignId)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setTasks(data || []);
        } catch (err) {
            console.error("Erro ao buscar tarefas:", err);
            setError("Não foi possível carregar as tarefas.");
        } finally {
            setLoading(false);
        }
    };

    const handleRevertTask = async (taskId: string, taskTitle: string) => {
        // Confirmação
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

            const data = await res.json();

            toast({
                title: "✅ Tarefa Revertida!",
                description: `"${taskTitle}" foi devolvida para as sugestões aprovadas.`,
                variant: "default",
            });

            // Atualizar lista de tarefas
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed":
                return "bg-green-100 text-green-800 border-green-200";
            case "in_progress":
                return "bg-blue-100 text-blue-800 border-blue-200";
            case "review":
                return "bg-yellow-100 text-yellow-800 border-yellow-200";
            default:
                return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "urgent":
                return "bg-red-100 text-red-800";
            case "high":
                return "bg-orange-100 text-orange-800";
            case "medium":
                return "bg-yellow-100 text-yellow-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            pending: "Pendente",
            in_progress: "Em Progresso",
            review: "Em Revisão",
            completed: "Concluída",
        };
        return labels[status] || status;
    };

    const getPriorityLabel = (priority: string) => {
        const labels: Record<string, string> = {
            urgent: "Urgente",
            high: "Alta",
            medium: "Média",
            low: "Baixa",
        };
        return labels[priority] || priority;
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Dossiê Estratégico - MANIFESTO */}
            <CampaignManifesto campaignId={campaignId} />

            {/* AI Strategies Section - NO TOPO (LOJA DE SUGESTÕES) */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 p-6 rounded-xl border-2 border-purple-200 dark:border-purple-800 shadow-md">
                <AIStrategiesList campaignId={campaignId} />
            </div>

            {/* Tarefas Ativadas */}
            <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-2xl font-bold flex items-center gap-2">
                                <CheckCircle2 className="h-6 w-6 text-blue-600" />
                                Minhas Tarefas Ativas
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                Tarefas criadas a partir de estratégias aprovadas
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl font-bold text-blue-600">{tasks.length}</p>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">
                                Total
                            </p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            <span className="ml-3 text-muted-foreground">
                                Carregando tarefas...
                            </span>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <AlertCircle className="h-12 w-12 text-red-500 mb-3" />
                            <p className="text-red-600 font-medium">{error}</p>
                            <Button
                                variant="outline"
                                onClick={fetchTasks}
                                className="mt-4"
                            >
                                Tentar Novamente
                            </Button>
                        </div>
                    ) : tasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 className="h-12 w-12 text-purple-600" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">
                                Nenhuma tarefa ativada ainda
                            </h3>
                            <p className="text-muted-foreground max-w-md mb-6">
                                Aprove estratégias na seção acima e clique em "Ativar" para
                                transformá-las em tarefas executáveis.
                            </p>
                            <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg max-w-lg">
                                <p className="font-medium mb-2">💡 Como funciona:</p>
                                <ol className="text-left space-y-1 list-decimal list-inside">
                                    <li>A IA gera sugestões de estratégias</li>
                                    <li>Admin aprova as melhores no painel de Setup</li>
                                    <li>Você ativa as aprovadas aqui para criar tarefas</li>
                                    <li>Tarefas aparecem nesta seção para execução</li>
                                </ol>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {tasks.map((task) => (
                                <Card
                                    key={task.id}
                                    className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500"
                                >
                                    <CardContent className="p-5 space-y-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <span
                                                className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider border ${getStatusColor(
                                                    task.status
                                                )}`}
                                            >
                                                {getStatusLabel(task.status)}
                                            </span>
                                            <span
                                                className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${getPriorityColor(
                                                    task.priority
                                                )}`}
                                            >
                                                {getPriorityLabel(task.priority)}
                                            </span>
                                        </div>

                                        <div>
                                            <h5 className="font-bold text-base mb-1">
                                                {task.title}
                                            </h5>
                                            <p className="text-sm text-muted-foreground line-clamp-3">
                                                {task.description}
                                            </p>
                                        </div>

                                        {task.due_date && (
                                            <div className="text-xs text-muted-foreground">
                                                📅 Prazo:{" "}
                                                {new Date(task.due_date).toLocaleDateString(
                                                    "pt-BR"
                                                )}
                                            </div>
                                        )}

                                        <div className="pt-2 flex gap-2">
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                className="flex-1 text-xs gap-1"
                                                onClick={() => handleRevertTask(task.id, task.title)}
                                                disabled={revertingTaskId === task.id}
                                                title="Remover do Kanban e devolver para Sugestões"
                                            >
                                                {revertingTaskId === task.id ? (
                                                    <>
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                        Revertendo...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Undo2 className="h-3 w-3" />
                                                        Desfazer
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 text-xs"
                                                disabled={revertingTaskId === task.id}
                                            >
                                                Gerenciar →
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
