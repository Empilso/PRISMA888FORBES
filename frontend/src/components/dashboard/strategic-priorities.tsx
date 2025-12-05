"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Plus } from "lucide-react";

interface Priority {
    id: string;
    phase: number;
    title: string;
    description: string;
    status: "pending" | "in_progress" | "completed";
    dueDate: string;
}

interface StrategicPrioritiesProps {
    priorities: Priority[];
    totalCount: number;
}

const statusLabels = {
    pending: "Pendente",
    in_progress: "Em Progresso",
    completed: "Concluído",
};

const statusVariants = {
    pending: "outline" as const,
    in_progress: "warning" as const,
    completed: "success" as const,
};

const phaseColors = {
    1: "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
    2: "border-l-purple-500 bg-purple-50/50 dark:bg-purple-950/20",
    3: "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20",
};

export function StrategicPriorities({
    priorities,
    totalCount,
}: StrategicPrioritiesProps) {
    return (
        <Card className="col-span-full">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Prioridades Estratégicas</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            {priorities.length} tarefas em plano recente
                        </p>
                    </div>
                    <Button size="sm" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Novo Plano
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {priorities.map((priority) => (
                    <div
                        key={priority.id}
                        className={`relative border-l-4 rounded-lg p-4 transition-all hover:shadow-md ${phaseColors[priority.phase as keyof typeof phaseColors]
                            }`}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="font-mono">
                                        FASE {priority.phase}
                                    </Badge>
                                    <Badge variant={statusVariants[priority.status]}>
                                        {statusLabels[priority.status]}
                                    </Badge>
                                </div>
                                <h4 className="font-semibold text-sm">{priority.title}</h4>
                                <p className="text-sm text-muted-foreground">
                                    {priority.description}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Prazo: {priority.dueDate}
                                </p>
                            </div>
                            <Button variant="ghost" size="sm" className="gap-1">
                                EXECUTAR
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}

                {totalCount > priorities.length && (
                    <Button variant="outline" className="w-full mt-4">
                        Ver todas as {totalCount} tarefas do Plano Operacional
                        <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
