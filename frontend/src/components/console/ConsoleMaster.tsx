import { useState, useEffect, useRef } from "react";
import { Terminal, Play, CheckCircle2, Wrench, Package, Brain, XCircle, ChevronDown, ChevronRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ConsoleLog {
    id: string;
    run_id: string;
    event_type: 'system' | 'task_start' | 'task_end' | 'tool_start' | 'tool_end' | 'ai_thought' | 'error';
    agent_name?: string;
    task_name?: string;
    tool_name?: string;
    message: string;
    payload: Record<string, any>;
    created_at: string;
}

interface Props {
    runId: string | null;
    campaignId: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function ConsoleMaster({ runId, campaignId }: Props) {
    const [logs, setLogs] = useState<ConsoleLog[]>([]);
    const [isRunning, setIsRunning] = useState(false); // Only 'running' if checking logs and they are recent
    const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
    const scrollRef = useRef<HTMLDivElement>(null);
    const lastLogCountRef = useRef(0);

    const toggleExpand = (id: string) => {
        const newSet = new Set(expandedLogs);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setExpandedLogs(newSet);
    };

    const fetchLogs = async () => {
        if (!runId) return;
        try {
            const res = await fetch(`${API_URL}/api/crew/runs/${runId}/logs`);
            if (res.ok) {
                const data = await res.json();
                if (data.logs) {
                    setLogs(data.logs);

                    // Auto-scroll if new logs arrived
                    if (data.logs.length > lastLogCountRef.current) {
                        setTimeout(() => {
                            if (scrollRef.current) {
                                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                            }
                        }, 100);
                        lastLogCountRef.current = data.logs.length;
                    }

                    // Simple logic to detect if still running: check if last log is not "task_end" of last task or error
                    // For now, let's assume it's running if logs are less than 1 min old or simply by parent state
                    // The backend doesn't explicitly stream "finished". 
                    // We'll rely on the parent or just show status based on last log time? 
                    // For now, let's keep it simple: if runId is present, we poll.
                }
            }
        } catch (error) {
            console.error("Error fetching console logs:", error);
        }
    };

    // Polling effect
    useEffect(() => {
        if (!runId) {
            setLogs([]);
            return;
        }

        setIsRunning(true);
        fetchLogs(); // Initial fetch

        const interval = setInterval(fetchLogs, 2000);
        return () => clearInterval(interval);
    }, [runId]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'system': return <Terminal className="h-4 w-4 text-slate-400" />;
            case 'task_start': return <Play className="h-4 w-4 text-blue-400" />;
            case 'task_end': return <CheckCircle2 className="h-4 w-4 text-green-400" />;
            case 'tool_start': return <Wrench className="h-4 w-4 text-yellow-400" />;
            case 'tool_end': return <Package className="h-4 w-4 text-yellow-300" />;
            case 'ai_thought': return <Brain className="h-4 w-4 text-purple-400" />;
            case 'error': return <XCircle className="h-4 w-4 text-red-400" />;
            default: return <Terminal className="h-4 w-4 text-slate-400" />;
        }
    };

    const getRowColor = (type: string) => {
        if (type === 'error') return 'bg-red-950/30 border-red-900/50';
        if (type === 'task_start') return 'bg-blue-950/20 border-blue-900/30';
        if (type === 'task_end') return 'bg-green-950/20 border-green-900/30';
        return 'hover:bg-slate-800/50';
    };

    if (!runId) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 border border-slate-200 rounded-xl bg-slate-50 border-dashed">
                <Terminal className="h-10 w-10 mb-3 opacity-20" />
                <p>Nenhuma execução selecionada</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[600px] bg-slate-950 rounded-xl border border-slate-800 shadow-2xl overflow-hidden font-mono text-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700">
                        <Terminal className="h-4 w-4 text-green-400" />
                    </div>
                    <div>
                        <h3 className="text-slate-100 font-bold text-sm">Console Master</h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                            RUN ID: <span className="font-mono text-slate-400">{runId.substring(0, 8)}...</span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-slate-900 border-slate-700 text-slate-400">
                        <Clock className="h-3 w-3 mr-1" />
                        Live
                    </Badge>
                </div>
            </div>

            {/* Logs Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-1.5 scroll-smooth"
            >
                {logs.length === 0 ? (
                    <div className="text-slate-500 italic text-center py-10">
                        Aguardando início da execução...
                    </div>
                ) : (
                    logs.map((log) => (
                        <div
                            key={log.id}
                            className={cn(
                                "group flex flex-col border border-transparent rounded-md transition-all",
                                getRowColor(log.event_type)
                            )}
                        >
                            {/* Log Row */}
                            <div
                                className="flex items-start gap-3 p-2 cursor-pointer select-none"
                                onClick={() => toggleExpand(log.id)}
                            >
                                <div className="mt-0.5 shrink-0 opacity-80">
                                    {getIcon(log.event_type)}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        {log.agent_name && log.agent_name !== 'System' && (
                                            <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-slate-900 border-slate-700 text-slate-300">
                                                {log.agent_name}
                                            </Badge>
                                        )}
                                        {log.tool_name && (
                                            <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-yellow-950/30 border-yellow-900/50 text-yellow-500">
                                                {log.tool_name}
                                            </Badge>
                                        )}
                                        <span className="text-xs text-slate-500 ml-auto">
                                            {new Date(log.created_at).toLocaleTimeString('pt-BR')}
                                        </span>
                                    </div>

                                    <p className={cn(
                                        "text-slate-300 leading-relaxed whitespace-pre-wrap",
                                        log.event_type === 'ai_thought' ? "text-purple-300 italic" : "",
                                        log.event_type === 'error' ? "text-red-300 font-bold" : ""
                                    )}>
                                        {log.message}
                                    </p>
                                </div>

                                {(log.payload && Object.keys(log.payload).length > 0) && (
                                    <div className="shrink-0 mt-0.5 text-slate-600 group-hover:text-slate-400">
                                        {expandedLogs.has(log.id) ? (
                                            <ChevronDown className="h-4 w-4" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4" />
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Expanded Details */}
                            {expandedLogs.has(log.id) && log.payload && Object.keys(log.payload).length > 0 && (
                                <div className="px-9 pb-2">
                                    <div className="bg-black/30 rounded border border-slate-800 p-2 text-xs font-mono text-slate-400 overflow-x-auto">
                                        <pre>{JSON.stringify(log.payload, null, 2)}</pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
