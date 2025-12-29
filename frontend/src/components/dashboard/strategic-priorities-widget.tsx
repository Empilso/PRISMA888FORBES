"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRight, Zap, AlertCircle, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface PriorityTask {
    id: string;
    title: string;
    description: string;
    status: "pending" | "in_progress" | "review" | "completed";
    priority: "low" | "medium" | "high" | "urgent";
    pillar?: string;
    created_at: string;
}

export function StrategicPrioritiesWidget({ campaignId }: { campaignId: string }) {
    const [tasks, setTasks] = useState<PriorityTask[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        async function fetchPriorities() {
            setLoading(true);
            const supabase = createClient();

            // Buscar tarefas de alta prioridade ou urgentes que não estejam concluídas
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('campaign_id', campaignId)
                .in('priority', ['high', 'urgent'])
                .neq('status', 'completed')
                .order('created_at', { ascending: false }) // Mais recentes primeiro
                .limit(4);

            if (error) {
                console.error("Erro ao buscar prioridades:", error);
            } else {
                setTasks(data || []);
            }
            setLoading(false);
        }

        fetchPriorities();
    }, [campaignId]);

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'in_progress': return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200">Em Execução</Badge>;
            case 'pending': return <Badge variant="outline" className="text-slate-500">Pendente</Badge>;
            case 'review': return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200">Revisão</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getPriorityIcon = (priority: string) => {
        if (priority === 'urgent') return <AlertCircle className="h-4 w-4 text-rose-500" />;
        return <Zap className="h-4 w-4 text-amber-500" />;
    };

    return (
        <Card className="rounded-[2rem] border border-slate-100 shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b border-slate-50 pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            Prioridades Estratégicas
                            <Badge variant="secondary" className="text-xs font-normal">IA Recomendada</Badge>
                        </CardTitle>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                            Ações de alto impacto baseadas no cenário atual
                        </p>
                    </div>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        onClick={() => router.push(`/campaign/${campaignId}/plan`)}
                    >
                        Ver Plano Completo <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {loading ? (
                    <div className="p-12 flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        <p>Nenhuma prioridade crítica detectada no momento.</p>
                        <Button variant="link" onClick={() => router.push(`/campaign/${campaignId}/plan`)}>
                            Gerar novas estratégias
                        </Button>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {tasks.map((task) => (
                            <div
                                key={task.id}
                                className="p-6 hover:bg-slate-50/50 transition-colors group cursor-pointer"
                                onClick={() => router.push(`/campaign/${campaignId}/tasks?taskId=${task.id}`)}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-2 flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            {getPriorityIcon(task.priority)}
                                            {task.pillar && (
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border px-1.5 py-0.5 rounded">
                                                    {task.pillar}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-base font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
                                            {task.title}
                                        </h3>
                                        <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                                            {task.description}
                                        </p>

                                        <div className="flex items-center gap-3 mt-3">
                                            {getStatusLabel(task.status)}
                                            <div className="flex items-center text-[10px] text-slate-400 gap-1">
                                                <Clock className="h-3 w-3" />
                                                <span>Sugerido pela IA recentemente</span>
                                            </div>
                                        </div>
                                    </div>

                                    <Button size="sm" className="hidden group-hover:flex bg-indigo-600 text-white rounded-full h-8 px-4 shadow-indigo-200 shadow-md">
                                        Executar
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
