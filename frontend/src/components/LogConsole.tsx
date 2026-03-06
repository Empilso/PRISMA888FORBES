"use client";

import React, { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Terminal, Activity, CheckCircle2, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LogEntry {
    id: string;
    created_at: string;
    agent_role: string;
    step_name: string;
    raw_output: string;
    model_used?: string;
    is_success: boolean;
    tool_calls?: string;
}

interface LogConsoleProps {
    campaignId: string;
    className?: string;
    height?: string;
    theme?: 'dark' | 'light';
}

export function LogConsole({ campaignId, className, height = "h-[400px]", theme = 'dark' }: LogConsoleProps) {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [rainbowEnabled, setRainbowEnabled] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const supabase = React.useMemo(() => createClient(), []);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
        }
    }, [logs]);

    useEffect(() => {
        if (!campaignId) return;

        // 1. Initial Fetch (Last 50 logs)
        const fetchInitialLogs = async () => {
            const { data, error } = await supabase
                .from("ai_execution_logs")
                .select("*")
                .eq("campaign_id", campaignId)
                .order("created_at", { ascending: false })
                .limit(50);

            if (data && !error) {
                setLogs(data.reverse());
            }
        };

        fetchInitialLogs();

        // 2. Realtime Subscription
        const channel = supabase
            .channel(`logs-${campaignId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "ai_execution_logs",
                    filter: `campaign_id=eq.${campaignId}`,
                },
                (payload) => {
                    const newLog = payload.new as LogEntry;
                    setLogs((prev) => [...prev, newLog]);
                }
            )
            .subscribe((status) => {
                setIsConnected(status === "SUBSCRIBED");
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [campaignId]);

    const handleClear = () => {
        setLogs([]);
    };

    // Cores baseadas no tema
    const themeStyles = {
        dark: {
            bg: 'bg-[#000000]',
            text: 'text-[#00ff00]', // Matrix green
            border: 'border-emerald-900/30',
            headerBg: 'bg-[#0a0a0a]',
            headerText: 'text-slate-500'
        },
        light: {
            bg: 'bg-[#ffffff]',
            text: 'text-slate-800',
            border: 'border-slate-200',
            headerBg: 'bg-slate-50',
            headerText: 'text-slate-400'
        }
    };

    const currentTheme = themeStyles[theme];

    return (
        <div className={cn("flex flex-col h-full font-mono text-sm", currentTheme.bg, className)}>
            {/* Header com Controles Visual */}
            <div className={cn("flex items-center justify-between px-4 py-2 border-b transition-colors", currentTheme.headerBg, currentTheme.border)}>
                <div className="flex items-center gap-3">
                    <Terminal className={cn("w-4 h-4", theme === 'dark' ? "text-emerald-500" : "text-slate-400")} />
                    <span className={cn("text-xs font-bold uppercase tracking-widest", currentTheme.headerText)}>System Terminal</span>
                </div>

                <div className="flex items-center gap-4">
                    {/* Toggle Rainbow/Matrix */}
                    <button
                        onClick={() => setRainbowEnabled(!rainbowEnabled)}
                        className={cn(
                            "text-[10px] px-2 py-0.5 rounded font-bold transition-all shadow-sm",
                            rainbowEnabled
                                ? "bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 to-purple-500 text-white hover:scale-105"
                                : theme === 'dark' ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20" : "bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200"
                        )}
                    >
                        {rainbowEnabled ? '🌈 RAINBOW ON' : '💚 MATRIX'}
                    </button>

                    <button
                        onClick={handleClear}
                        className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-red-500 transition-colors uppercase"
                    >
                        <XCircle className="w-3 h-3" />
                        Clear
                    </button>

                    <div className="flex items-center gap-2">
                        <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isConnected ? "bg-emerald-500" : "bg-red-500")} />
                        <span className={cn("text-[10px] font-bold", isConnected ? "text-emerald-500" : "text-red-500")}>
                            {isConnected ? "LIVE" : "OFFLINE"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Logs Area */}
            <ScrollArea className={cn("flex-1 p-4", currentTheme.bg)} ref={scrollRef}>
                <div className="flex flex-col gap-3">
                    {logs.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-slate-600 py-10 opacity-30">
                            <Activity className="w-8 h-8 mb-2 animate-pulse" />
                            <p className="text-[10px] uppercase tracking-widest">Waiting for incoming transmission...</p>
                        </div>
                    )}

                    {logs.map((log) => (
                        <div key={log.id} className="flex gap-4 group animate-in fade-in slide-in-from-bottom-1 duration-300">
                            {/* Timestamp Column */}
                            <div className="flex-none w-16 pt-1 text-[10px] opacity-40 font-mono">
                                {format(new Date(log.created_at), "HH:mm:ss", { locale: ptBR })}
                            </div>

                            {/* Content Column */}
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                    {/* Agent Name sempre Roxo PRISMA */}
                                    <span className="text-[11px] font-extrabold text-[#7c3aed] uppercase tracking-wider">
                                        {log.agent_role}
                                    </span>

                                    <span className={cn("text-[10px] opacity-50", currentTheme.text)}>
                                        :: {log.step_name}
                                    </span>

                                    {log.tool_calls && (
                                        <Badge variant="outline" className={cn(
                                            "h-4 px-1 text-[9px] font-bold border-none",
                                            theme === 'dark' ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-100 text-slate-600"
                                        )}>
                                            🛠️ {log.tool_calls}
                                        </Badge>
                                    )}
                                </div>

                                <div
                                    className={cn(
                                        "leading-relaxed break-words whitespace-pre-wrap text-[13px] font-medium transition-all duration-500",
                                        rainbowEnabled ? "rainbow-gradient-animated opacity-100" : cn("opacity-80 group-hover:opacity-100", currentTheme.text)
                                    )}
                                >
                                    {log.raw_output || "Processing..."}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Active Cursor Effect */}
                    {isConnected && (
                        <div className="flex items-center gap-2 pl-[84px] pt-1">
                            <span className={cn("animate-pulse", theme === 'dark' ? "text-emerald-500" : "text-slate-400")}>▸</span>
                            <span className={cn("text-[10px] italic opacity-40", currentTheme.text)}>Processing mission parameters...</span>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
