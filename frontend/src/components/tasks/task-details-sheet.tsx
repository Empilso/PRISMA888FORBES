"use client";

import React from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
    Calendar,
    User,
    Paperclip,
    Send,
    Sparkles,
    Clock,
    Tag,
    CheckCircle2,
} from "lucide-react";
import { ExamplesRenderer } from "@/components/tasks/ExamplesRenderer";
export type TaskStatus = "pending" | "in_progress" | "review" | "completed";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    aiSuggestion?: string;
    assignee?: { name: string; avatar?: string };
    dueDate?: string;
    createdAt: string;
    tags: string[];
    examples?: string[];
}

interface TaskDetailsSheetProps {
    task: Task | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function TaskDetailsSheet({
    task,
    open,
    onOpenChange,
}: TaskDetailsSheetProps) {
    const [comment, setComment] = React.useState("");
    const [status, setStatus] = React.useState<TaskStatus>(
        task?.status || "pending"
    );
    const [priority, setPriority] = React.useState<TaskPriority>(
        task?.priority || "medium"
    );
    const [description, setDescription] = React.useState(task?.description || "");

    React.useEffect(() => {
        if (task) {
            setStatus(task.status);
            setPriority(task.priority);
            setDescription(task.description);
        }
    }, [task]);

    if (!task) return null;

    const statusOptions: { value: TaskStatus; label: string; color: string }[] =
        [
            {
                value: "pending",
                label: "Pendente",
                color: "bg-gray-100 text-gray-700",
            },
            {
                value: "in_progress",
                label: "Em Progresso",
                color: "bg-blue-100 text-blue-700",
            },
            {
                value: "review",
                label: "Em Revisão",
                color: "bg-purple-100 text-purple-700",
            },
            {
                value: "completed",
                label: "Concluído",
                color: "bg-green-100 text-green-700",
            },
        ];

    const priorityOptions: {
        value: TaskPriority;
        label: string;
        color: string;
    }[] = [
            { value: "low", label: "Baixa", color: "bg-gray-100 text-gray-700" },
            { value: "medium", label: "Média", color: "bg-blue-100 text-blue-700" },
            { value: "high", label: "Alta", color: "bg-orange-100 text-orange-700" },
            { value: "urgent", label: "Urgente", color: "bg-red-100 text-red-700" },
        ];

    const handleSendComment = () => {
        if (comment.trim()) {
            // TODO: Enviar comentário para API
            console.log("Comentário:", comment);
            setComment("");
        }
    };

    // Mock comments
    const comments = [
        {
            id: "1",
            author: "João Silva",
            content: "Iniciamos o mapeamento da zona oeste conforme sugestão da IA",
            timestamp: "Há 2 horas",
        },
        {
            id: "2",
            author: "Maria Costa",
            content: "Identificamos 3 áreas críticas que precisam de atenção",
            timestamp: "Há 5 horas",
        },
    ];

    // Mock history
    const history = [
        {
            id: "1",
            action: "Status alterado",
            from: "Pendente",
            to: "Em Progresso",
            user: "João Silva",
            timestamp: "Há 3 horas",
        },
        {
            id: "2",
            action: "Prioridade alterada",
            from: "Média",
            to: "Alta",
            user: "Gerente",
            timestamp: "Há 1 dia",
        },
        {
            id: "3",
            action: "Tarefa criada",
            user: "Sistema",
            timestamp: "Há 7 dias",
        },
    ];

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                <SheetHeader className="space-y-4 pb-6">
                    <div className="flex items-start justify-between">
                        <SheetTitle className="text-xl pr-8">{task.title}</SheetTitle>
                    </div>

                    {/* Status and Priority Selectors */}
                    <div className="flex gap-3">
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as TaskStatus)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer ${statusOptions.find((o) => o.value === status)?.color
                                }`}
                        >
                            {statusOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>

                        <select
                            value={priority}
                            onChange={(e) => setPriority(e.target.value as TaskPriority)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer ${priorityOptions.find((o) => o.value === priority)?.color
                                }`}
                        >
                            {priorityOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </SheetHeader>

                {/* Description */}
                <div className="space-y-6">
                    <div>
                        <h3 className="text-sm font-semibold mb-2">Descrição</h3>
                        <Textarea
                            className="min-h-[120px]"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>


                    {/* Examples Section */}
                    {(() => {
                        const safeExamples = Array.isArray(task?.examples) ? task.examples : [];
                        return safeExamples.length > 0 ? (
                            <ExamplesRenderer
                                examples={safeExamples}
                                mode="workbench"
                                onInsert={(text) => setDescription(prev => prev + "\n\n" + text)}
                            />
                        ) : null;
                    })()}

                    {/* AI Suggestion */}
                    {task.aiSuggestion && (
                        <div className="flex items-start gap-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                            <Sparkles className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-purple-900 dark:text-purple-300 mb-1">
                                    Sugestão de IA
                                </p>
                                <p className="text-sm text-purple-800 dark:text-purple-400">
                                    {task.aiSuggestion}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <User className="h-4 w-4" />
                                <span>Responsável</span>
                            </div>
                            <p className="text-sm font-medium">
                                {task.assignee?.name || "Não atribuído"}
                            </p>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span>Data de Vencimento</span>
                            </div>
                            <p className="text-sm font-medium">
                                {task.dueDate
                                    ? new Date(task.dueDate).toLocaleDateString("pt-BR")
                                    : "Sem prazo"}
                            </p>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>Criado em</span>
                            </div>
                            <p className="text-sm font-medium">
                                {new Date(task.createdAt).toLocaleDateString("pt-BR")}
                            </p>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Tag className="h-4 w-4" />
                                <span>Tags</span>
                            </div>
                            <div className="flex gap-1 flex-wrap">
                                {(Array.isArray(task?.tags) ? task.tags : []).map((tag) => (
                                    <Badge key={tag} variant="secondary" className="text-xs">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Tabs: Comments & History */}
                    <Tabs defaultValue="comments" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="comments">
                                Comentários ({comments.length})
                            </TabsTrigger>
                            <TabsTrigger value="history">Histórico</TabsTrigger>
                        </TabsList>

                        {/* Comments Tab */}
                        <TabsContent value="comments" className="space-y-4 mt-4">
                            {/* Comments List */}
                            <div className="space-y-4 max-h-64 overflow-y-auto">
                                {comments.length === 0 ? (
                                    <div className="text-center py-8 text-sm text-muted-foreground">
                                        <p>Nenhum comentário ainda</p>
                                        <p className="text-xs mt-1">
                                            Seja o primeiro a comentar!
                                        </p>
                                    </div>
                                ) : (
                                    comments.map((c) => (
                                        <div
                                            key={c.id}
                                            className="border rounded-lg p-3 space-y-2"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-semibold">
                                                    {c.author}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {c.timestamp}
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {c.content}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Add Comment */}
                            <div className="space-y-2">
                                <Textarea
                                    placeholder="Digite sua mensagem... (Enter para enviar)"
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendComment();
                                        }
                                    }}
                                    className="min-h-[80px] resize-none"
                                />
                                <div className="flex items-center justify-between">
                                    <Button variant="ghost" size="sm" className="gap-2">
                                        <Paperclip className="h-4 w-4" />
                                        Anexar arquivo
                                    </Button>
                                    <Button
                                        onClick={handleSendComment}
                                        size="sm"
                                        className="gap-2"
                                    >
                                        <Send className="h-4 w-4" />
                                        Enviar
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>

                        {/* History Tab */}
                        <TabsContent value="history" className="space-y-3 mt-4">
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {history.map((h) => (
                                    <div key={h.id} className="flex gap-3 text-sm">
                                        <div className="mt-1">
                                            <div className="h-2 w-2 rounded-full bg-primary" />
                                        </div>
                                        <div className="flex-1 space-y-1 pb-3 border-b last:border-0">
                                            <p className="font-medium">{h.action}</p>
                                            {h.from && h.to && (
                                                <p className="text-xs text-muted-foreground">
                                                    de <strong>{h.from}</strong> para{" "}
                                                    <strong>{h.to}</strong>
                                                </p>
                                            )}
                                            <p className="text-xs text-muted-foreground">
                                                por {h.user} • {h.timestamp}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </TabsContent>
                    </Tabs>

                    {/* Actions */}
                    <div className="flex gap-2 pt-4 border-t">
                        <Button variant="default" className="flex-1 gap-2" onClick={() => console.log({ id: task.id, status, priority, description })}>
                            <CheckCircle2 className="h-4 w-4" />
                            Salvar Alterações
                        </Button>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Fechar
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet >
    );
}
