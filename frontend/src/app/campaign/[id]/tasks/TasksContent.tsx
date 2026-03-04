"use client";

import { ConsoleMaster } from "@/components/console/ConsoleMaster";
import React, { useState, useEffect } from "react";
import { useQueryState } from 'nuqs';
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ExamplesRenderer } from "@/components/tasks/ExamplesRenderer";
import {
    Search,
    Plus,
    Filter,
    LayoutList,
    LayoutGrid,
    Sparkles,
    Loader2,
    ArrowRight,
    Edit,
    CheckCircle2,
    Circle,
    Timer,
    Grid,
    Trash2,
    Calendar,
    List,
    Terminal,
    User
} from "lucide-react";
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    DragStartEvent,
    DragEndEvent,
} from "@dnd-kit/core";
import {
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TaskDetailsDialog } from "@/components/tasks/task-details-dialog";
import { TaskStatusSelector } from "@/components/tasks/TaskStatusSelector";

interface Task {
    id: string;
    title: string;
    description: string;
    status: "pending" | "in_progress" | "review" | "completed";
    priority: "low" | "medium" | "high" | "urgent";
    tags: string[];
    assignee_id?: string | null;
    assignee?: {
        full_name: string;
        avatar_url: string;
    };
    ai_suggestion?: string;
    created_at?: string;
    due_date?: string | null;
    pillar?: string;
    examples?: string[]; // Parsed examples from AI output
}

export default function TasksContent({ campaignId, simpleMode = false }: { campaignId: string; simpleMode?: boolean }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [currentView, setCurrentView] = useQueryState('view', { defaultValue: 'grid' }); // Default alterado para grid para mostrar o redesign
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'pending' | 'in_progress' | 'completed'>('ALL'); // Filter for Grid view
    const { toast } = useToast();

    // Estado para dados reais
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    const [activeId, setActiveId] = useState<string | null>(null);
    const [activeRunId, setActiveRunId] = useState<string | null>(null);

    // Sensors config for DnD
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        fetchTasks();
    }, [campaignId]);

    useEffect(() => {
        if (currentView === 'console') {
            const fetchLatestRun = async () => {
                const supabase = createClient();
                const { data } = await supabase
                    .from('crew_run_logs')
                    .select('run_id')
                    .eq('campaign_id', campaignId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (data) setActiveRunId(data.run_id);
            };
            fetchLatestRun();
        }
    }, [currentView, campaignId]);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            // Busca o perfil para saber a ROLE
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user?.id)
                .single();

            const res = await fetch(`/api/campaign/${campaignId}/tasks`, {
                cache: 'no-store',
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            if (!res.ok) throw new Error("Falha ao buscar tarefas");
            let data = await res.json();

            // Lógica Enterprise: Staff só vê as suas tarefas se simpleMode estiver ativo (Portal SQUAD)
            if (simpleMode && profile?.role === 'staff' && user) {
                data = data.filter((t: any) => t.assignee_id === user.id);
            }

            setTasks(data || []);
        } catch (error) {
            console.error("Erro ao buscar tarefas:", error);
            toast({ title: "Erro", description: "Falha ao carregar tarefas", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleTaskClick = (task: Task) => {
        setSelectedTask(task);
        setIsSheetOpen(true);
    };

    // Unificada: Status Change e Move Task (DnD) usam a mesma lógica
    const handleStatusChange = async (taskId: string, newStatus: Task["status"]) => {
        // Optimistic Update
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));

        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            const res = await fetch(`/api/campaign/${campaignId}/tasks/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({
                    status: newStatus,
                    last_modified_by: user?.id
                })
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Falha ao atualizar status: ${res.status} - ${errorText}`);
            }
        } catch (error: any) {
            console.error("[TasksContent] Erro crítico na atualização:", error);
            toast({
                title: "Erro de Sincronização",
                description: `O servidor respondeu: ${error.message || "Erro desconhecido"}`,
                variant: "destructive"
            });
            fetchTasks(); // Rollback
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm("Tem certeza que deseja excluir esta tarefa?")) return;

        try {
            const res = await fetch(`/api/campaign/${campaignId}/tasks/${taskId}`, {
                method: 'DELETE',
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });

            if (!res.ok) throw new Error("Falha ao excluir");

            setTasks(prev => prev.filter(t => t.id !== taskId));
            toast({ title: "Tarefa excluída" });
        } catch (error) {
            toast({ title: "Erro", description: "Falha ao excluir", variant: "destructive" });
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
        const activeTask = tasks.find((t) => t.id === activeId);
        if (!activeTask) return;

        const isOverColumn = ["pending", "in_progress", "review", "completed"].includes(overId);

        if (isOverColumn && activeTask.status !== overId) {
            handleStatusChange(activeId, overId as Task["status"]);
        } else if (!isOverColumn) {
            const overTask = tasks.find(t => t.id === overId);
            if (overTask && activeTask.status !== overTask.status) {
                handleStatusChange(activeId, overTask.status);
            }
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "urgent": return "bg-red-50 text-red-700 border-red-100";
            case "high": return "bg-orange-50 text-orange-700 border-orange-100";
            case "medium": return "bg-yellow-50 text-yellow-700 border-yellow-100";
            default: return "bg-slate-50 text-slate-600 border-slate-100";
        }
    };

    const getPriorityLabel = (priority: string) => {
        const labels: any = { urgent: "Urgente", high: "Alta", medium: "Média", low: "Baixa" };
        return labels[priority] || priority;
    };


    if (loading && tasks.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-4 px-4 sm:px-8 pt-4 sm:pt-6">
            {!simpleMode && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Minhas Tarefas</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                            Gerencie a execução da campanha.
                        </p>
                    </div>
                </div>
            )}

            <div className="sticky top-0 z-10 bg-white/95 -mx-4 px-4 py-3 border-b border-slate-200/50 md:static md:bg-transparent md:border-0 md:px-0 md:py-0">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="Buscar tarefas..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-10 bg-white/80 dark:bg-slate-900/80 border-slate-200/50 rounded-lg shadow-sm focus-visible:ring-indigo-500/30"
                            />
                        </div>
                        <Button size="icon" className="h-10 w-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-lg shrink-0">
                            <Plus className="h-5 w-5" />
                        </Button>
                    </div>

                    <div className="flex overflow-x-auto pb-1 gap-1 no-scrollbar md:hidden">
                        {[
                            { id: 'list', icon: List, label: 'Lista' },
                            { id: 'grid', icon: Grid, label: 'Grade' },
                            { id: 'kanban', icon: LayoutGrid, label: 'Kanban' },
                            { id: 'console', icon: Terminal, label: 'Console IA' }
                        ].map((v) => (
                            <button
                                key={v.id}
                                onClick={() => setCurrentView(v.id)}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all",
                                    currentView === v.id ? "bg-indigo-600 text-white shadow-md" : "bg-white text-slate-500 border border-slate-200/50"
                                )}
                            >
                                <v.icon className="h-3.5 w-3.5" />
                                {v.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Metrics - Clickable in Grid view */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: "Total", value: tasks.length, icon: Circle, color: "text-slate-500", filterValue: 'ALL' as const },
                    { label: "A Fazer", value: tasks.filter(t => t.status === 'pending').length, icon: Circle, color: "text-slate-400", filterValue: 'pending' as const },
                    { label: "Em Progresso", value: tasks.filter(t => t.status === 'in_progress').length, icon: Timer, color: "text-blue-500", filterValue: 'in_progress' as const },
                    { label: "Concluídas", value: tasks.filter(t => t.status === 'completed').length, icon: CheckCircle2, color: "text-green-500", filterValue: 'completed' as const },
                ].map((metric, i) => (
                    <Card
                        key={i}
                        className={cn(
                            "shadow-[0_2px_8px_rgb(0,0,0,0.04)] border border-slate-100/80 transition-all cursor-pointer hover:shadow-md rounded-xl",
                            statusFilter === metric.filterValue
                                ? 'ring-2 ring-indigo-500/30 border-indigo-200/80 bg-white'
                                : 'bg-white/60'
                        )}
                        onClick={() => setStatusFilter(metric.filterValue)}
                    >
                        <CardContent className="p-3.5 sm:p-4 flex items-center justify-between gap-2">
                            <div>
                                <p className="text-[9px] sm:text-[10px] text-slate-400 font-black uppercase tracking-widest">{metric.label}</p>
                                <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-0.5 leading-none">{metric.value}</p>
                            </div>
                            <div className={cn("p-2 rounded-xl", metric.color === 'text-slate-500' || metric.color === 'text-slate-400' ? 'bg-slate-100' : metric.color === 'text-blue-500' ? 'bg-blue-50' : 'bg-green-50')}>
                                <metric.icon className={cn("h-4 w-4", metric.color)} />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Views Tabs */}
            <Tabs value={currentView || 'grid'} onValueChange={setCurrentView} className="w-full">
                <div className="hidden md:flex items-center justify-between mb-6">
                    <TabsList className="bg-slate-100/50 p-1 rounded-lg">
                        <TabsTrigger value="list" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <List className="h-4 w-4" /> Lista
                        </TabsTrigger>
                        <TabsTrigger value="grid" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Grid className="h-4 w-4" /> Grade
                        </TabsTrigger>
                        <TabsTrigger value="kanban" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <LayoutGrid className="h-4 w-4" /> Kanban
                        </TabsTrigger>
                        <TabsTrigger value="console" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Terminal className="h-4 w-4" /> Console IA
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="console" className="mt-0">
                    <ConsoleMaster runId={activeRunId} campaignId={campaignId} />
                </TabsContent>

                {/* LIST VIEW (SLIM e INTEBRATED) */}
                <TabsContent value="list" className="mt-0">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        {tasks.length === 0 ? (
                            <EmptyState />
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {tasks
                                    .filter(task => statusFilter === 'ALL' || task.status === statusFilter)
                                    .map((task) => (
                                        <div
                                            key={task.id}
                                            onClick={() => handleTaskClick(task)}
                                            className="group flex items-center gap-4 p-3 hover:bg-slate-50 transition-colors cursor-pointer"
                                        >
                                            <div className="pl-2">
                                                <div className={`w-2 h-2 rounded-full ${task.priority === 'urgent' ? 'bg-red-500' : task.priority === 'high' ? 'bg-orange-500' : 'bg-slate-300'}`} />
                                            </div>

                                            <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 items-center">
                                                <div className="col-span-12 md:col-span-5">
                                                    <h3 className="text-sm font-semibold text-slate-900 truncate">{task.title}</h3>
                                                    <p className="text-xs text-muted-foreground truncate">{task.description}</p>
                                                </div>

                                                <div className="col-span-6 md:col-span-3 flex items-center gap-2">
                                                    <TaskStatusSelector
                                                        status={task.status}
                                                        onStatusChange={(s) => handleStatusChange(task.id, s)}
                                                    />
                                                </div>

                                                <div className="col-span-6 md:col-span-2 flex items-center gap-2 text-xs text-muted-foreground">
                                                    {task.due_date && (
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            {new Date(task.due_date).toLocaleDateString('pt-BR')}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="col-span-12 md:col-span-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-blue-600">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-slate-400 hover:text-red-600"
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* GRID VIEW (PREMIUM & CONSISTENT) */}
                <TabsContent value="grid" className="mt-0">
                    {tasks.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {tasks
                                .filter(task => statusFilter === 'ALL' || task.status === statusFilter)
                                .map((task) => (
                                    <div
                                        key={task.id}
                                        onClick={() => handleTaskClick(task)}
                                        className="group relative bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 flex flex-col h-auto min-h-[260px] cursor-pointer"
                                    >
                                        {/* Header: Status Pill e Prioridade */}
                                        <div className="flex flex-col gap-2 mb-4">
                                            {task.pillar && (
                                                <Badge variant="outline" className="w-fit rounded-full font-normal border-purple-100 bg-purple-50 text-purple-700 text-[10px] px-2 py-0.5">
                                                    {task.pillar}
                                                </Badge>
                                            )}
                                            <div className="flex items-center justify-between">
                                                <TaskStatusSelector
                                                    status={task.status}
                                                    onStatusChange={(s) => handleStatusChange(task.id, s)}
                                                />
                                                <Badge variant="outline" className={`font-normal rounded-md ${getPriorityColor(task.priority)}`}>
                                                    {getPriorityLabel(task.priority)}
                                                </Badge>
                                            </div>
                                        </div>

                                        {/* Body */}
                                        <div className="flex-1 mb-4">
                                            <h3 className="font-bold text-lg text-slate-900 mb-2 leading-tight group-hover:text-primary transition-colors line-clamp-2">
                                                {task.title}
                                            </h3>
                                            <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed">
                                                {task.description}
                                            </p>

                                            {/* Examples Section */}
                                            <div className="mt-auto pt-2">
                                                <ExamplesRenderer
                                                    examples={task.examples}
                                                    mode="card"
                                                    onViewAll={() => handleTaskClick(task)}
                                                />
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-7 w-7 border border-slate-200">
                                                    <AvatarImage src={task.assignee?.avatar_url} />
                                                    <AvatarFallback className="text-[10px] bg-slate-100 text-slate-600 font-bold">
                                                        {task.assignee?.full_name?.substring(0, 2) || <User className="h-3 w-3" />}
                                                    </AvatarFallback>
                                                </Avatar>
                                                {task.due_date && (
                                                    <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                                                        <Calendar className="h-3 w-3" />
                                                        {new Date(task.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-slate-100">
                                                    <Edit className="h-4 w-4 text-slate-500" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 rounded-full hover:bg-red-50 hover:text-red-600"
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                                                >
                                                    <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-600" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </TabsContent>

                {/* KANBAN VIEW */}
                <TabsContent value="kanban" className="mt-0 h-[calc(100vh-250px)]">
                    <KanbanBoard
                        tasks={tasks}
                        onTaskClick={handleTaskClick}
                        onMoveTask={handleStatusChange}
                        sensors={sensors}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        activeId={activeId}
                        statusFilter={statusFilter}
                    />
                </TabsContent>
            </Tabs>

            {/* Task Details Dialog (Refactored for focus) */}
            <TaskDetailsDialog
                task={selectedTask as any}
                open={isSheetOpen}
                onOpenChange={(open) => {
                    setIsSheetOpen(open);
                    if (!open) setSelectedTask(null);
                }}
            />
        </div>
    );
}

function EmptyState() {
    return (
        <div className="text-center py-12">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <LayoutList className="h-6 w-6 text-slate-300" />
            </div>
            <h3 className="text-sm font-medium text-slate-900">Nenhuma tarefa encontrada</h3>
            <p className="text-xs text-muted-foreground mt-1">Crie uma nova ou ajuste os filtros.</p>
        </div>
    );
}

// Kanban Components
function KanbanBoard({
    tasks,
    onTaskClick,
    onMoveTask,
    sensors,
    onDragStart,
    onDragEnd,
    activeId,
    statusFilter = 'ALL'
}: any) {
    const allColumns = [
        { status: "pending", label: "A Fazer", color: "bg-blue-50 text-blue-700 border-blue-100" },
        { status: "in_progress", label: "Em Progresso", color: "bg-orange-50 text-orange-700 border-orange-100" },
        { status: "review", label: "Em Revisão", color: "bg-purple-50 text-purple-700 border-purple-100" },
        { status: "completed", label: "Concluído", color: "bg-green-50 text-green-700 border-green-100" },
    ];

    // Filter columns based on statusFilter (ALL shows all columns)
    const columns = statusFilter === 'ALL'
        ? allColumns
        : allColumns.filter(c => c.status === statusFilter);

    const activeTask = tasks.find((t: Task) => t.id === activeId);

    return (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-full p-2">
                {columns.map((column) => (
                    <div key={column.status} className="flex flex-col h-full rounded-xl">
                        {/* Header Vivido */}
                        <div className="mb-4 flex items-center justify-between">
                            <div className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border ${column.color}`}>
                                {column.label}
                            </div>
                            <span className="text-xs text-slate-400 font-medium">
                                {tasks.filter((t: Task) => t.status === column.status).length}
                            </span>
                        </div>

                        {/* Column Body - Arejado */}
                        <div className="flex-1 space-y-3 min-h-[100px]">
                            <SortableContext id={column.status} items={tasks.filter((t: Task) => t.status === column.status).map((t: Task) => t.id)} strategy={verticalListSortingStrategy}>
                                {tasks.filter((t: Task) => t.status === column.status).map((task: Task) => (
                                    <SortableTaskCard
                                        key={task.id}
                                        task={task}
                                        onTaskClick={onTaskClick}
                                        onMoveTask={onMoveTask}
                                    />
                                ))}
                            </SortableContext>
                        </div>
                    </div>
                ))}
            </div>
            <DragOverlay>
                {activeId && activeTask ? (
                    <div className="opacity-90 rotate-2 scale-105 cursor-grabbing">
                        <KanbanCardContent task={activeTask} />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

function SortableTaskCard({ task, onTaskClick, onMoveTask }: any) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        zIndex: isDragging ? 999 : 1
    };
    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={() => onTaskClick(task)}>
            <KanbanCardContent task={task} onMoveTask={onMoveTask} />
        </div>
    );
}

function KanbanCardContent({ task, onMoveTask }: { task: Task; onMoveTask?: (id: string, status: any) => void }) {

    // Logic for Quick Move
    const statusOrder = ["pending", "in_progress", "review", "completed"];
    const currentIdx = statusOrder.indexOf(task.status);
    const nextStatus = currentIdx < statusOrder.length - 1 ? statusOrder[currentIdx + 1] : null;

    const handleQuickMove = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (nextStatus && onMoveTask) {
            onMoveTask(task.id, nextStatus as any);
        }
    };

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border-none hover:shadow-md transition-all cursor-grab active:cursor-grabbing group relative">
            <div className="flex items-center justify-between mb-3">
                <div className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${task.priority === 'urgent' ? 'bg-red-50 text-red-700' :
                    task.priority === 'high' ? 'bg-orange-50 text-orange-700' :
                        task.priority === 'medium' ? 'bg-yellow-50 text-yellow-700' :
                            'bg-slate-100 text-slate-500'
                    }`}>
                    {task.priority === 'urgent' ? 'Urgente' : task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                </div>
                {/* Selector Discreto no Kanban tbm, se o usuário quiser mudar para status não sequencial */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* <MoreHorizontal ... /> // Opcional, ou manter clean. */}
                </div>
            </div>

            <h4 className="text-sm font-bold text-slate-900 leading-tight mb-2 line-clamp-3">
                {task.title}
            </h4>

            <TaskStatusSelector status={task.status} onStatusChange={(s) => onMoveTask && onMoveTask(task.id, s)} />

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                <div className="flex items-center gap-1">
                    <Avatar className="h-6 w-6 border-2 border-white">
                        <AvatarImage src={task.assignee?.avatar_url} />
                        <AvatarFallback className="text-[9px] bg-indigo-50 text-indigo-700 font-bold">
                            {task.assignee?.full_name?.substring(0, 2) || "IA"}
                        </AvatarFallback>
                    </Avatar>
                    {task.due_date && (
                        <span className="ml-2 text-[10px] font-medium text-slate-400 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(task.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </span>
                    )}
                </div>

                {/* Quick Action Button - Visible on Hover/Mobile */}
                {nextStatus && (
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 rounded-full text-slate-300 hover:text-primary hover:bg-indigo-50 opacity-0 group-hover:opacity-100 transition-all"
                        onClick={handleQuickMove}
                        title={`Mover para ${nextStatus.replace('_', ' ')}`}
                    >
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}
