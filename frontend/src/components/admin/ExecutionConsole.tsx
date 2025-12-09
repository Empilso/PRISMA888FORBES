"use client";

import React, { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AgentLog {
    id: string;
    agent_name: string;
    message: string;
    status: "info" | "success" | "error" | "warning";
    created_at: string;
}

interface ExecutionConsoleProps {
    runId: string | null;
    campaignId?: string;
    onNewLog?: (log: AgentLog) => void;
}

export function ExecutionConsole({ runId, campaignId, isOpen, onToggle, onNewLog }: ExecutionConsoleProps & { isOpen?: boolean; onToggle?: () => void }) {
    const [logs, setLogs] = useState<AgentLog[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    useEffect(() => {
        if (!runId) return;

        let channel: ReturnType<typeof supabase.channel>;

        const initConsole = async () => {
            setIsRunning(true);

            // 1. BUSCA INICIAL (FETCH) - Garante histórico
            const { data: historyLogs } = await supabase
                .from("agent_logs")
                .select("*")
                .eq("run_id", runId)
                .order("created_at", { ascending: true });

            if (historyLogs) {
                // 2. POPULAR ESTADO
                setLogs(historyLogs);
            }

            // 3. INSCREVER (SUBSCRIBE) - Só depois de ter o histórico
            channel = supabase
                .channel(`agent_logs_${runId}`)
                .on(
                    "postgres_changes",
                    {
                        event: "INSERT",
                        schema: "public",
                        table: "agent_logs",
                    },
                    (payload) => {
                        const newLog = payload.new as AgentLog & { run_id: string };
                        // Filtro Client-side para garantir que o log pertence a esta run
                        if (newLog.run_id === runId) {
                            setLogs((prev) => {
                                // Evitar duplicatas (caso o fetch tenha pego algo que chegou no msmo tempo)
                                if (prev.some(l => l.id === newLog.id)) return prev;
                                return [...prev, newLog];
                            });
                            if (onNewLog) onNewLog(newLog);
                        }
                    }
                )
                .subscribe((status) => {
                    console.log(`🔌 Status da conexão Realtime (Logs): ${status}`);
                });
        };

        initConsole();

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, [runId, supabase]);

    // Auto-scroll para o final quando novo log chegar
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "success":
                return "text-green-400";
            case "error":
                return "text-red-400";
            case "warning":
                return "text-yellow-400";
            default:
                return "text-blue-400";
        }
    };

    const getAgentIcon = (agentName: string) => {
        switch (agentName) {
            case "Analista":
                return "📊";
            case "Estrategista":
                return "🎯";
            case "Planejador":
                return "📋";
            case "System":
                return "⚙️";
            default:
                return "🤖";
        }
    };

    const handleStop = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!runId || !campaignId) return;

        try {
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            await fetch(`${API_BASE}/api/campaign/${campaignId}/run/${runId}/cancel`, {
                method: "POST",
            });
        } catch (err) {
            console.error("Erro ao cancelar:", err);
        }
    };

    // Se não tiver runId e não for modo painel, mostra aviso
    if (!runId && isOpen === undefined) {
        return (
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <p className="text-slate-400 text-sm text-center">
                    Inicie uma geração para ver os logs em tempo real
                </p>
            </div>
        );
    }

    // Modo Painel Fixo (quando isOpen é passado)
    if (isOpen !== undefined && onToggle) {
        if (!isOpen) {
            return (
                <div
                    onClick={onToggle}
                    className="fixed bottom-0 left-0 right-0 h-10 bg-slate-900 border-t border-slate-700 flex items-center justify-between px-4 cursor-pointer hover:bg-slate-800 transition-colors z-50"
                >
                    <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-xs font-mono">
                            {'>_'} CONSOLE DE EXECUÇÃO
                        </span>
                        {isRunning && (
                            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        )}
                    </div>
                    <span className="text-slate-500 text-xs">Clique para expandir</span>
                </div>
            );
        }

        return (
            <div className="fixed bottom-0 left-0 right-0 h-[400px] bg-slate-950 border-t border-slate-700 flex flex-col z-50 shadow-2xl animate-in slide-in-from-bottom duration-300">
                {/* Header do Painel */}
                <div
                    onClick={onToggle}
                    className="bg-slate-900 px-4 py-2 border-b border-slate-700 flex items-center justify-between cursor-pointer hover:bg-slate-800"
                >
                    <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                        </div>
                        <span className="text-slate-400 text-sm font-mono">
                            Genesis Crew Console {runId ? `(Run: ${runId.slice(0, 8)})` : '(Aguardando...)'}
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        {isRunning && (
                            <div className="flex items-center gap-2 text-emerald-400 text-xs">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span>Executando</span>
                            </div>
                        )}
                        {isRunning && runId && campaignId && (
                            <Button
                                variant="destructive"
                                size="sm"
                                className="h-6 px-2 text-xs gap-1 border border-red-500/50 bg-red-900/20 hover:bg-red-900/40 text-red-400"
                                onClick={handleStop}
                            >
                                <StopCircle className="h-3 w-3" />
                                Parar
                            </Button>
                        )}
                        <span className="text-slate-500 text-xs">▼ Minimizar</span>
                    </div>
                </div>

                {/* Conteúdo do Painel */}
                <ScrollArea className="flex-1">
                    <div ref={scrollRef} className="p-4 font-mono text-sm space-y-1">
                        {!runId ? (
                            <div className="flex items-center justify-center h-full text-slate-500 mt-20">
                                <p>Aguardando início da simulação...</p>
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="flex items-center gap-2 text-slate-500">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Conectando ao canal de logs...</span>
                            </div>
                        ) : (
                            logs.map((log) => (
                                <div key={log.id} className="flex items-start gap-2 hover:bg-white/5 p-0.5 rounded">
                                    <span className="text-slate-600 select-none text-xs w-[70px]">
                                        {new Date(log.created_at).toLocaleTimeString("pt-BR", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            second: "2-digit",
                                        })}
                                    </span>
                                    <span className="select-none w-[20px] text-center">{getAgentIcon(log.agent_name)}</span>
                                    <span className="text-slate-400 w-[100px] text-xs font-bold">
                                        [{log.agent_name}]
                                    </span>
                                    <span className={`flex-1 ${getStatusColor(log.status)}`}>{log.message}</span>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </div>
        );
    }

    // Modo Normal (Estático - usado no Modal)
    return (
        <div className="bg-slate-950/90 rounded-lg border border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="bg-slate-900/50 px-4 py-2 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                    <span className="text-slate-400 text-sm font-mono">
                        Genesis Crew Console
                    </span>
                </div>
                {isRunning && logs.length > 0 && (
                    <div className="flex items-center gap-2 text-emerald-400 text-sm">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Executando...</span>
                    </div>
                )}
                {isRunning && runId && campaignId && (
                    <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 px-3 text-xs gap-1 border border-red-500/50 bg-red-900/20 hover:bg-red-900/40 text-red-400 ml-2"
                        onClick={handleStop}
                    >
                        <StopCircle className="h-3 w-3" />
                        Parar
                    </Button>
                )}
            </div>

            {/* Console Output */}
            <ScrollArea className="h-[300px]">
                <div ref={scrollRef} className="p-4 font-mono text-sm space-y-1">
                    {logs.length === 0 ? (
                        <div className="flex items-center gap-2 text-slate-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Aguardando logs...</span>
                        </div>
                    ) : (
                        logs.map((log) => (
                            <div key={log.id} className="flex items-start gap-2">
                                <span className="text-slate-600 select-none">
                                    {new Date(log.created_at).toLocaleTimeString("pt-BR", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        second: "2-digit",
                                    })}
                                </span>
                                <span className="select-none">{getAgentIcon(log.agent_name)}</span>
                                <span className="text-slate-400 min-w-[100px]">
                                    [{log.agent_name}]
                                </span>
                                <span className={getStatusColor(log.status)}>{log.message}</span>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>

            {/* Footer */}
            <div className="bg-slate-900/50 px-4 py-2 border-t border-slate-700">
                <span className="text-slate-600 text-xs font-mono">
                    {logs.length} log{logs.length !== 1 ? "s" : ""} · Run ID: {runId ? runId.slice(0, 8) : "N/A"}...
                </span>
            </div>
        </div>
    );
}
