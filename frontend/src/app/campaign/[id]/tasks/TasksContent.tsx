"use client";

import React, { useState, useEffect } from "react";
import { useQueryState } from 'nuqs';
import { createClient } from "@/lib/supabase/client";
import {
    Search,
    Plus,
    Filter,
    LayoutList,
    LayoutGrid,
    Sparkles,
    Loader2,
    ArrowLeft,
    ArrowRight,
    Edit,
    MoreVertical,
} from "lucide-react";
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskDetailsSheet } from "@/components/tasks/task-details-sheet";
// import { MOCK_TASKS, Task } from "@/lib/mock-db"; // Removido mock

// Interface Task baseada no Supabase
interface Task {
    id: string;
    title: string;
    description: string;
    status: "pending" | "in_progress" | "review" | "completed";
    priority: "low" | "medium" | "high" | "urgent";
    tags: string[];
    dueDate?: string;
    assignee?: {
        name: string;
        avatar: string;
    };
    ai_suggestion?: string;
}

export default function TasksContent({ campaignId }: { campaignId: string }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [currentView, setCurrentView] = useQueryState('view', { defaultValue: 'tasks' });
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const { toast } = useToast();

    // Estado para dados reais
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    // Dnd Kit Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // Previne cliques acidentais ao arrastar
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const [activeId, setActiveId] = useState<string | null>(null);

    useEffect(() => {
        const fetchTasks = async () => {
            setLoading(true);
            const supabase = createClient();
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('campaign_id', campaignId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Erro ao buscar tarefas:", error);
            } else {
                setTasks(data || []);
            }
            setLoading(false);
        };

        fetchTasks();
    }, [campaignId]);

    const handleTaskClick = (task: Task) => {
        setSelectedTask(task);
        setIsSheetOpen(true);
    };

    const handleMoveTask = async (taskId: string, newStatus: Task["status"]) => {
        // Optimistic Update
        setTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
        );

        const supabase = createClient();
        const { error } = await supabase
            .from("tasks")
            .update({ status: newStatus })
            .eq("id", taskId);

        if (error) {
            console.error("Erro ao atualizar status:", error);
            toast({
                title: "Erro ao mover tarefa",
                description: "Não foi possível salvar a alteração.",
                variant: "destructive",
            });
            // Rollback (opcional, mas recomendado)
            // fetchTasks(); 
        } else {
            toast({
                title: "Tarefa atualizada",
                description: `Status alterado para ${newStatus}`,
            });
        }
    };

    // Dnd Handlers
    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        // Encontrar a tarefa ativa
        const activeTask = tasks.find((t) => t.id === activeId);
        if (!activeTask) return;

        // Verificar se soltou em uma coluna (droppable container)
        // O ID das colunas será o próprio status: "pending", "in_progress", etc.
        const isOverColumn = ["pending", "in_progress", "review", "completed"].includes(overId);

        if (isOverColumn && activeTask.status !== overId) {
            handleMoveTask(activeId, overId as Task["status"]);
        }
        // Se soltou sobre outra tarefa, precisamos descobrir a coluna dessa tarefa
        else if (!isOverColumn) {
            const overTask = tasks.find(t => t.id === overId);
            if (overTask && activeTask.status !== overTask.status) {
                handleMoveTask(activeId, overTask.status);
            }
        }
    };

    // Mock AI Insights (ainda mockado por enquanto)
    const aiInsights = [
        {
            id: "1",
            type: "suggestion",
            title: "Priorize Zona Oeste esta semana",
            description: "Análise de dados indica 34% de indecisos na região oeste. Recomenda-se aumento de 40% nas atividades de campo.",
            impact: "high",
        },
        {
            id: "2",
            type: "alert",
            title: "Atenção: Tema Saúde em alta",
            description: "Menções a 'saúde pública' cresceram 67% nas últimas 48h. Considere criar conteúdo sobre propostas na área.",
            impact: "medium",
        },
    ];

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">IA & Tarefas</h1>
                    <p className="text-sm text-muted-foreground">
                        Gestão inteligente de tarefas com insights de IA
                    </p>
                </div>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nova Tarefa
                </Button>
            </div>

            {/* Search and Filters */}
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Buscar tarefas, tags, responsáveis..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Button variant="outline" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filtros
                </Button>
            </div>

            {/* View Toggle com Nuqs */}
            <Tabs value={currentView || 'tasks'} onValueChange={setCurrentView} className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="tasks" className="gap-2">
                        <LayoutList className="h-4 w-4" />
                        Tarefas
                    </TabsTrigger>
                    <TabsTrigger value="kanban" className="gap-2">
                        <LayoutGrid className="h-4 w-4" />
                        Kanban
                    </TabsTrigger>
                </TabsList>

                {/* Tasks List View */}
                <TabsContent value="tasks" className="space-y-4">
                    <div className="rounded-lg border bg-card text-card-foreground">
                        <div className="p-6">
                            <div className="text-sm text-muted-foreground mb-4">
                                {tasks.length} tarefas encontradas
                            </div>
                            <div className="space-y-3">
                                {tasks.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        Nenhuma tarefa encontrada. Crie uma nova ou ative uma estratégia do Plano.
                                    </div>
                                ) : (
                                    tasks.map((task) => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            onClick={() => handleTaskClick(task)}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* Kanban View */}
                <TabsContent value="kanban">
                    <KanbanBoard
                        tasks={tasks}
                        onTaskClick={handleTaskClick}
                        onMoveTask={handleMoveTask}
                        sensors={sensors}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        activeId={activeId}
                    />
                </TabsContent>
            </Tabs>

            {/* AI Insights Section */}
            <div className="mt-8">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    Insights da IA
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                    {aiInsights.map((insight) => (
                        <AIInsightCard key={insight.id} insight={insight} />
                    ))}
                </div>
            </div>

            {/* Task Details Sheet */}
            <TaskDetailsSheet
                task={selectedTask as any} // Cast temporário se a interface do Sheet for diferente
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
            />
        </div>
    );
}

// Componentes Auxiliares

function TaskCard({ task, onClick }: { task: Task; onClick?: () => void }) {
    const priorityColors: Record<string, string> = {
        low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
        medium: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
        high: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
        urgent: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    };

    const statusColors: Record<string, string> = {
        pending: "bg-gray-100 text-gray-700",
        in_progress: "bg-blue-100 text-blue-700",
        review: "bg-purple-100 text-purple-700",
        completed: "bg-green-100 text-green-700",
    };

    const statusLabels: Record<string, string> = {
        pending: "Pendente",
        in_progress: "Em Progresso",
        review: "Em Revisão",
        completed: "Concluído",
    };

    return (
        <div
            className="flex items-start gap-4 border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={onClick}
        >
            <input type="checkbox" className="mt-1" />
            <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <h3 className="font-semibold text-sm">{task.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {task.description}
                        </p>
                        {task.ai_suggestion && (
                            <div className="mt-2 flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded w-fit">
                                <Sparkles className="h-3 w-3" />
                                Sugestão IA
                            </div>
                        )}
                    </div>
                    <span
                        className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${priorityColors[task.priority] || priorityColors.medium}`}
                    >
                        {task.priority === "urgent" ? "Urgente" : task.priority === "high" ? "Alta" : task.priority === "medium" ? "Média" : "Baixa"}
                    </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[task.status] || statusColors.pending}`}>
                        {statusLabels[task.status] || "Pendente"}
                    </span>
                    {task.tags && task.tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium">
                            {tag}
                        </span>
                    ))}
                    {task.dueDate && (
                        <span className="text-xs text-muted-foreground">
                            📅 {new Date(task.dueDate).toLocaleDateString("pt-BR")}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

function KanbanBoard({
    tasks,
    onTaskClick,
    onMoveTask,
    sensors,
    onDragStart,
    onDragEnd,
    activeId,
}: {
    tasks: Task[];
    onTaskClick?: (task: Task) => void;
    onMoveTask: (taskId: string, newStatus: Task["status"]) => void;
    sensors: any;
    onDragStart: (event: DragStartEvent) => void;
    onDragEnd: (event: DragEndEvent) => void;
}) {
    const columns = [
        { status: "pending", label: "Pendente" },
        { status: "in_progress", label: "Em Progresso" },
        { status: "review", label: "Em Revisão" },
        { status: "completed", label: "Concluído" },
    ];

    const activeTask = tasks.find((t) => t.id === activeId);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full min-h-[500px]">
                {columns.map((column) => (
                    <KanbanColumn
                        key={column.status}
                        id={column.status}
                        title={column.label}
                        tasks={tasks.filter((t) => t.status === column.status)}
                        onTaskClick={onTaskClick}
                        onMoveTask={onMoveTask}
                    />
                ))}
            </div>

            <DragOverlay>
                {activeId && activeTask ? (
                    <div className="opacity-80 rotate-2 cursor-grabbing">
                        <TaskCardContent task={activeTask} />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

function KanbanColumn({
    id,
    title,
    tasks,
    onTaskClick,
    onMoveTask,
}: {
    id: string;
    title: string;
    tasks: Task[];
    onTaskClick?: (task: Task) => void;
    onMoveTask: (taskId: string, newStatus: Task["status"]) => void;
}) {
    const { setNodeRef } = useSortable({ id });

    return (
        <Card className="h-full flex flex-col bg-muted/30">
            <CardHeader className="pb-3 p-4">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <span>{title}</span>
                    <span className="bg-background border px-2 py-0.5 rounded-full text-xs text-muted-foreground">
                        {tasks.length}
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-2 space-y-2 min-h-[150px]" ref={setNodeRef}>
                <SortableContext
                    id={id}
                    items={tasks.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {tasks.map((task) => (
                        <SortableTaskCard
                            key={task.id}
                            task={task}
                            onTaskClick={onTaskClick}
                            onMoveTask={onMoveTask}
                        />
                    ))}
                </SortableContext>
                {tasks.length === 0 && (
                    <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic p-4 border-2 border-dashed border-muted-foreground/10 rounded-lg">
                        Arraste tarefas aqui
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function SortableTaskCard({
    task,
    onTaskClick,
    onMoveTask,
}: {
    task: Task;
    onTaskClick?: (task: Task) => void;
    onMoveTask: (taskId: string, newStatus: Task["status"]) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <TaskCardContent
                task={task}
                onTaskClick={onTaskClick}
                onMoveTask={onMoveTask}
            />
        </div>
    );
}

function TaskCardContent({
    task,
    onTaskClick,
    onMoveTask,
}: {
    task: Task;
    onTaskClick?: (task: Task) => void;
    onMoveTask?: (taskId: string, newStatus: Task["status"]) => void;
}) {
    const statusOrder = ["pending", "in_progress", "review", "completed"];
    const currentStatusIndex = statusOrder.indexOf(task.status);

    const handleMove = (direction: "prev" | "next", e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onMoveTask) return;

        const newIndex = direction === "next" ? currentStatusIndex + 1 : currentStatusIndex - 1;
        if (newIndex >= 0 && newIndex < statusOrder.length) {
            onMoveTask(task.id, statusOrder[newIndex] as Task["status"]);
        }
    };

    return (
        <div
            className="group relative bg-background border rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing"
            onClick={() => onTaskClick?.(task)}
        >
            <div className="space-y-2">
                <div className="flex justify-between items-start gap-2">
                    <h4 className="text-sm font-semibold line-clamp-2 leading-tight">
                        {task.title}
                    </h4>
                    {task.priority === "urgent" && (
                        <span className="h-2 w-2 rounded-full bg-red-500 shrink-0 mt-1" title="Urgente" />
                    )}
                </div>

                <div className="flex flex-wrap gap-1">
                    {task.tags &&
                        task.tags.slice(0, 2).map((tag) => (
                            <span
                                key={tag}
                                className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-medium"
                            >
                                {tag}
                            </span>
                        ))}
                </div>

                <div className="flex items-center justify-between pt-2 mt-1 border-t border-dashed">
                    {/* Botão Voltar */}
                    {currentStatusIndex > 0 ? (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-orange-600 hover:bg-orange-50"
                            onClick={(e) => handleMove("prev", e)}
                            title="Voltar status"
                        >
                            <ArrowLeft className="h-3 w-3" />
                        </Button>
                    ) : (
                        <div className="w-6" /> // Spacer
                    )}

                    {/* Botão Editar */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
                        onClick={(e) => {
                            e.stopPropagation();
                            onTaskClick?.(task);
                        }}
                    >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                    </Button>

                    {/* Botão Avançar */}
                    {currentStatusIndex < statusOrder.length - 1 ? (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-green-600 hover:bg-green-50"
                            onClick={(e) => handleMove("next", e)}
                            title="Avançar status"
                        >
                            <ArrowRight className="h-3 w-3" />
                        </Button>
                    ) : (
                        <div className="w-6" /> // Spacer
                    )}
                </div>
            </div>

            {task.ai_suggestion && (
                <div className="absolute top-2 right-2">
                    <Sparkles className="h-3 w-3 text-purple-500 animate-pulse" />
                </div>
            )}
        </div>
    );
}

function AIInsightCard({ insight }: { insight: any }) {
    return (
        <Card className="border-l-4 border-l-purple-500">
            <CardHeader>
                <CardTitle className="text-base">{insight.title}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">{insight.description}</p>
            </CardContent>
        </Card>
    );
}
