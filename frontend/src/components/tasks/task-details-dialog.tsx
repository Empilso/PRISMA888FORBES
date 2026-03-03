"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import {
    Calendar,
    User,
    Paperclip,
    Send,
    Sparkles,
    Clock,
    Tag,
    CheckCircle2,
    MessageSquare,
    History as HistoryIcon,
    X,
    ChevronDown
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ExamplesRenderer } from "@/components/tasks/ExamplesRenderer";

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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
    campaign_id?: string;
    assignee_id?: string | null;
}

interface TaskDetailsDialogProps {
    task: Task | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function TaskDetailsDialog({
    task,
    open,
    onOpenChange,
}: TaskDetailsDialogProps) {
    const { toast } = useToast();
    const [comment, setComment] = React.useState("");
    const [status, setStatus] = React.useState<TaskStatus>(
        task?.status || "pending"
    );
    const [priority, setPriority] = React.useState<TaskPriority>(
        task?.priority || "medium"
    );
    const [description, setDescription] = React.useState(task?.description || "");
    const [comments, setComments] = React.useState<any[]>([]);
    const [history, setHistory] = React.useState<any[]>([]);
    const [members, setMembers] = React.useState<any[]>([]);
    const [loadingComments, setLoadingComments] = React.useState(false);
    const [assigneeId, setAssigneeId] = React.useState<string | null>(task?.assignee_id || null);

    React.useEffect(() => {
        if (task) {
            setStatus(task.status);
            setPriority(task.priority);
            setDescription(task.description);
            setAssigneeId(task.assignee_id || null);
        }
    }, [task]);

    const fetchTaskDetails = async () => {
        if (!task?.id) return;
        setLoadingComments(true);
        try {
            const supabase = createClient();
            const commentsRes = await fetch(`/api/campaign/${task.campaign_id || 'default'}/tasks/${task.id}/comments`);
            if (commentsRes.ok) {
                const commentsData = await commentsRes.json();
                setComments(commentsData);
            }

            const historyRes = await fetch(`/api/campaign/${task.campaign_id || 'default'}/tasks/${task.id}/history`);
            if (historyRes.ok) {
                const historyData = await historyRes.json();
                setHistory(historyData);
            }

            const { data: membersData } = await supabase
                .from("profiles")
                .select("id, full_name, email, avatar_url, role")
                .eq("campaign_id", task.campaign_id)
                .in("role", ["staff", "candidate", "super_admin"]);

            if (membersData) setMembers(membersData);
        } catch (error) {
            console.error("Erro ao carregar detalhes da tarefa:", error);
        } finally {
            setLoadingComments(false);
        }
    };

    const handleSendComment = async () => {
        if (!comment.trim() || !task?.id) return;

        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) return;

            const res = await fetch(`/api/campaign/${task.campaign_id || 'default'}/tasks/${task.id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    profile_id: user.id,
                    content: comment
                })
            });

            if (res.ok) {
                setComment("");
                fetchTaskDetails();
            } else {
                toast({
                    title: "Erro ao comentar",
                    description: "Não foi possível enviar seu comentário.",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error("Erro ao enviar comentário:", error);
        }
    };

    React.useEffect(() => {
        if (open && task?.id) {
            fetchTaskDetails();
        }
    }, [open, task?.id]);

    if (!task) return null;

    const statusOptions: { value: TaskStatus; label: string; color: string }[] = [
        { value: "pending", label: "Pendente", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
        { value: "in_progress", label: "Em Progresso", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20" },
        { value: "review", label: "Em Revisão", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20" },
        { value: "completed", label: "Concluído", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" },
    ];

    const priorityOptions: { value: TaskPriority; label: string; color: string }[] = [
        { value: "low", label: "Baixa", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
        { value: "medium", label: "Média", color: "bg-blue-500/10 text-blue-600" },
        { value: "high", label: "Alta", color: "bg-orange-500/10 text-orange-600" },
        { value: "urgent", label: "Urgente", color: "bg-red-500/10 text-red-600" },
    ];


    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-none bg-white dark:bg-[#0a0a0b] shadow-2xl">
                {/* Close Button UI-less */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onOpenChange(false)}
                    className="absolute right-6 top-6 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 z-50 transition-all opacity-40 hover:opacity-100"
                >
                    <X className="h-5 w-5" />
                </Button>

                <div className="mx-auto max-w-4xl w-full">
                    {/* Header Section */}
                    <div className="p-12 pb-6 space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Badge variant="outline" className="text-[10px] uppercase tracking-widest font-bold opacity-30 border-slate-400">
                                    Strategic Task
                                </Badge>
                                <span className="text-[10px] text-slate-400 font-mono opacity-50">#{task.id.slice(0, 8)}</span>
                            </div>
                            <DialogTitle className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50 leading-[1.1]">
                                {task.title}
                            </DialogTitle>
                        </div>

                        {/* Floating Metadata Line */}
                        <div className="flex flex-wrap items-center gap-6 py-4 border-y border-slate-100 dark:border-slate-800/50">
                            {/* Status Popover */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button className="flex items-center gap-2 group outline-none">
                                        <div className={cn("w-2 h-2 rounded-full", statusOptions.find(o => o.value === status)?.color.split(' ')[0])} />
                                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">
                                            {statusOptions.find(o => o.value === status)?.label}
                                        </span>
                                        <ChevronDown className="h-3 w-3 opacity-20 group-hover:opacity-100" />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-48 p-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                    <div className="flex flex-col gap-1">
                                        {statusOptions.map((opt) => (
                                            <button
                                                key={opt.value}
                                                onClick={() => setStatus(opt.value)}
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-slate-50 dark:hover:bg-slate-800",
                                                    status === opt.value ? "text-primary bg-primary/5" : "text-slate-600 dark:text-slate-400"
                                                )}
                                            >
                                                <div className={cn("w-1.5 h-1.5 rounded-full", opt.color.split(' ')[0])} />
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </PopoverContent>
                            </Popover>

                            <div className="h-4 w-[1px] bg-slate-100 dark:bg-slate-800" />

                            {/* Assignee Popover */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button className="flex items-center gap-2 group outline-none">
                                        <User className="h-4 w-4 opacity-40 group-hover:opacity-100" />
                                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">
                                            {members.find(m => m.id === assigneeId)?.full_name || task.assignee?.name || "Atribuir"}
                                        </span>
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="p-1 w-64 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                    <p className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 mb-1">Responsável</p>
                                    <div className="flex flex-col gap-1 max-h-60 overflow-y-auto custom-scrollbar">
                                        <button
                                            onClick={() => setAssigneeId(null)}
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800",
                                                !assigneeId ? "text-primary bg-primary/5 font-bold" : "text-slate-600 dark:text-slate-400"
                                            )}
                                        >
                                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                                                <X className="h-3 w-3" />
                                            </div>
                                            Ninguém
                                        </button>
                                        {members.map((member) => (
                                            <button
                                                key={member.id}
                                                onClick={() => setAssigneeId(member.id)}
                                                className={cn(
                                                    "flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800",
                                                    assigneeId === member.id ? "text-primary bg-primary/5 font-bold" : "text-slate-600 dark:text-slate-400"
                                                )}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-6 w-6">
                                                        <AvatarImage src={member.avatar_url} />
                                                        <AvatarFallback className="text-[10px]">{member.full_name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="truncate max-w-[120px] text-left">{member.full_name || member.email}</span>
                                                </div>
                                                <Badge variant="outline" className="text-[8px] h-4 opacity-50">{member.role}</Badge>
                                            </button>
                                        ))}
                                    </div>
                                </PopoverContent>
                            </Popover>

                            {/* Due Date Popover */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button className="flex items-center gap-2 group outline-none font-medium">
                                        <Calendar className="h-4 w-4 opacity-40 group-hover:opacity-100" />
                                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">
                                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString("pt-BR") : "Prazo"}
                                        </span>
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="p-0 bg-white dark:bg-slate-900">
                                    <div className="p-4 text-sm">Seletor de Data v2</div>
                                </PopoverContent>
                            </Popover>

                            {/* Tags Popover */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button className="flex items-center gap-2 group outline-none">
                                        <Tag className="h-4 w-4 opacity-40 group-hover:opacity-100" />
                                        <div className="flex gap-1 overflow-hidden max-w-[200px]">
                                            {(task.tags || []).length > 0 ? (
                                                task.tags.slice(0, 2).map(tag => (
                                                    <Badge key={tag} variant="secondary" className="bg-slate-50 dark:bg-slate-800/50 border-none text-[10px] font-bold text-slate-400">
                                                        {tag}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <span className="text-sm font-semibold text-slate-400">Tags</span>
                                            )}
                                            {task.tags.length > 2 && <span className="text-[10px] font-bold text-slate-400">+{task.tags.length - 2}</span>}
                                        </div>
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="p-4 bg-white dark:bg-slate-900">
                                    <div className="flex flex-wrap gap-2">
                                        {task.tags.map(tag => <Badge key={tag}>{tag}</Badge>)}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    <div className="p-12 pt-0 space-y-12">
                        {/* Description Section - Single Column Zen */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-2 text-slate-300 dark:text-slate-700">
                                <CheckCircle2 className="h-4 w-4" />
                                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em]">Contexto Editorial</h3>
                            </div>
                            <div className="max-w-none">
                                <Textarea
                                    className="text-xl leading-[1.8] min-h-[300px] border-none focus-visible:ring-0 bg-transparent p-0 resize-none placeholder:italic text-slate-700 dark:text-slate-300 font-normal"
                                    placeholder="Nenhum detalhe adicional..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                        </section>

                        {/* IA & Examples Section */}
                        <div className="space-y-8">
                            {task.aiSuggestion && (
                                <div className="p-8 rounded-[32px] bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 transition-all duration-500 hover:border-purple-500/20">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl shadow-lg shadow-purple-500/20">
                                            <Sparkles className="h-4 w-4 text-white" />
                                        </div>
                                        <span className="text-[10px] font-bold text-purple-500 uppercase tracking-widest">Inteligência Estratégica</span>
                                    </div>
                                    <p className="text-xl leading-relaxed text-slate-600 dark:text-slate-300 font-medium">
                                        {task.aiSuggestion}
                                    </p>
                                </div>
                            )}

                            {(() => {
                                const safeExamples = Array.isArray(task?.examples) ? task.examples : [];
                                return safeExamples.length > 0 ? (
                                    <div className="rounded-[32px] border border-slate-100 dark:border-white/5 overflow-hidden bg-slate-50/50 dark:bg-white/[0.02]">
                                        <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                                            <h4 className="text-xs font-bold flex items-center gap-2 text-slate-400 uppercase tracking-widest">
                                                <Paperclip className="h-4 w-4" /> Referências de Campo
                                            </h4>
                                        </div>
                                        <div className="p-8">
                                            <ExamplesRenderer
                                                examples={safeExamples}
                                                mode="workbench"
                                                onInsert={(text) => setDescription(prev => prev + "\n\n" + text)}
                                            />
                                        </div>
                                    </div>
                                ) : null;
                            })()}
                        </div>

                        {/* Interaction Section - Zen Style */}
                        <Tabs defaultValue="comments" className="w-full pt-12">
                            <TabsList className="bg-transparent border-b border-slate-100 dark:border-slate-800/50 rounded-none h-auto p-0 gap-10">
                                <TabsTrigger
                                    value="comments"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-4 text-[10px] font-bold uppercase tracking-[0.2em] gap-2 opacity-40 data-[state=active]:opacity-100 transition-all"
                                >
                                    Discussão <span className="text-slate-400 font-mono">[{comments.length}]</span>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="history"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-4 text-[10px] font-bold uppercase tracking-[0.2em] gap-2 opacity-40 data-[state=active]:opacity-100 transition-all"
                                >
                                    Log de Atividade
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="comments" className="pt-10 space-y-10">
                                <div className="space-y-8 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                                    {comments.length === 0 && !loadingComments && (
                                        <div className="py-12 text-center opacity-30 italic text-sm">Nenhuma contribuição ainda. Seja o primeiro a comentar.</div>
                                    )}
                                    {comments.map((c) => (
                                        <div key={c.id} className="flex gap-4">
                                            <Avatar className="h-10 w-10 shrink-0">
                                                <AvatarImage src={c.profiles?.avatar_url} />
                                                <AvatarFallback className="bg-slate-100 text-slate-400 font-bold text-xs uppercase">
                                                    {c.profiles?.full_name?.slice(0, 2)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{c.profiles?.full_name}</span>
                                                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter opacity-50">
                                                        {new Date(c.created_at).toLocaleString("pt-BR", { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                                                    </span>
                                                </div>
                                                <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl whitespace-pre-wrap">
                                                    {c.content}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-6">
                                    <div className="relative group">
                                        <Textarea
                                            placeholder="Digite sua contribuição..."
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            className="min-h-[120px] rounded-[24px] p-6 bg-slate-50 dark:bg-white/[0.02] border-slate-100 dark:border-white/5 focus:ring-primary focus:ring-offset-0 text-base leading-relaxed"
                                        />
                                        <div className="absolute bottom-4 right-4 flex gap-3 opacity-0 group-focus-within:opacity-100 transition-all duration-300 transform translate-y-2 group-focus-within:translate-y-0">
                                            <Button onClick={handleSendComment} size="sm" className="gap-2 font-bold px-6 rounded-full shadow-lg shadow-primary/20 h-10">
                                                <Send className="h-4 w-4" /> Comentar
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="history" className="pt-10">
                                <div className="space-y-8">
                                    {history.length === 0 && (
                                        <div className="py-12 text-center opacity-30 italic text-sm">Nenhum evento registrado.</div>
                                    )}
                                    {history.map((h, i) => (
                                        <div key={h.id} className="flex gap-6 items-start">
                                            <div className="h-2 w-2 rounded-full bg-slate-200 dark:bg-slate-800 mt-[7px] shadow-[0_0_0_4px_rgba(var(--primary),0.05)]" />
                                            <div className="space-y-1">
                                                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{h.action}</p>
                                                {h.from_value && h.to_value && (
                                                    <p className="text-xs text-slate-500">
                                                        de <span className="font-mono text-[10px] text-slate-400 uppercase">{h.from_value}</span> para{" "}
                                                        <span className="font-mono text-[10px] text-primary uppercase">{h.to_value}</span>
                                                    </p>
                                                )}
                                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest opacity-40">
                                                    {new Date(h.created_at).toLocaleString("pt-BR")}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>
                        </Tabs>

                        {/* Final Actions - Minimalist Sticky */}
                        <div className="flex gap-4 pt-12 border-t border-slate-100 dark:border-slate-800/50 sticky bottom-0 bg-white/80 dark:bg-[#0a0a0b]/80 backdrop-blur-md pb-12">
                            <Button
                                variant="default"
                                className="flex-1 h-14 text-lg font-bold gap-3 rounded-[20px] shadow-2xl shadow-primary/10 hover:scale-[1.01] active:scale-[0.99] transition-all"
                                onClick={async () => {
                                    try {
                                        const supabase = createClient();
                                        const { data: { user } } = await supabase.auth.getUser();

                                        const res = await fetch(`/api/campaign/${task.campaign_id || 'default'}/tasks/${task.id}`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                status,
                                                priority,
                                                description,
                                                assignee_id: assigneeId,
                                                last_modified_by: user?.id
                                            })
                                        });

                                        if (res.ok) {
                                            toast?.({ title: "Sincronizado", description: "As alterações foram salvas e registradas no histórico." });
                                            fetchTaskDetails();
                                        } else {
                                            throw new Error("Falha na sincronização");
                                        }
                                    } catch (err) {
                                        toast?.({ variant: "destructive", title: "Erro", description: "Não foi possível salvar as alterações." });
                                    }
                                }}
                            >
                                <CheckCircle2 className="h-5 w-5" />
                                Sincronizar Alterações
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
