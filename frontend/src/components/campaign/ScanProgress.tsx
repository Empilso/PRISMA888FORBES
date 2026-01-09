import React, { useEffect, useState, useRef } from "react";
import { CircleNotch, CaretDown, CaretRight, CheckCircle, MagnifyingGlass, Newspaper } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface ScanProgressProps {
    logs: string[];
    status: "idle" | "running" | "completed" | "error";
    onComplete: () => void;
}

export function ScanProgress({ logs, status }: ScanProgressProps) {
    const [isThinkingExpanded, setIsThinkingExpanded] = useState(true);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const [sources, setSources] = useState<{ title: string, domain: string }[]>([]);
    const [currentAction, setCurrentAction] = useState<string>("Iniciando varredura...");

    // Auto-scroll logs
    useEffect(() => {
        if (isThinkingExpanded && logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs, isThinkingExpanded]);

    // Parse logs to extract "Sources" and "Current Action" simulation
    useEffect(() => {
        if (logs.length > 0) {
            // Safe handling: ensure log is a string
            const rawLastLog = logs[logs.length - 1];
            const lastLog = typeof rawLastLog === 'string' ? rawLastLog : JSON.stringify(rawLastLog);

            setCurrentAction(lastLog.replace(/\[.*?\]/, '').trim());

            // Simulate finding sources based on log keywords
            const newSources: { title: string, domain: string }[] = [];

            logs.forEach(log => {
                const safeLog = typeof log === 'string' ? log : JSON.stringify(log);
                const lower = safeLog.toLowerCase();

                if (lower.includes("g1") && !sources.find(s => s.domain === "g1.globo.com"))
                    newSources.push({ title: "Portal G1 - Notícias", domain: "g1.globo.com" });
                if (lower.includes("uol") && !sources.find(s => s.domain === "uol.com.br"))
                    newSources.push({ title: "UOL Notícias", domain: "uol.com.br" });
                if (lower.includes("folha") && !sources.find(s => s.domain === "folha.uol.com.br"))
                    newSources.push({ title: "Folha de S.Paulo", domain: "folha.uol.com.br" });
                if (lower.includes("facebook") && !sources.find(s => s.domain === "facebook.com"))
                    newSources.push({ title: "Postagem em Rede Social", domain: "facebook.com" });
                if (lower.includes("instagram") && !sources.find(s => s.domain === "instagram.com"))
                    newSources.push({ title: "Postagem Instagram", domain: "instagram.com" });
            });

            if (newSources.length > 0) {
                setSources(prev => {
                    const unique = [...prev];
                    newSources.forEach(ns => {
                        if (!unique.find(u => u.domain === ns.domain)) unique.push(ns);
                    });
                    return unique;
                });
            }
        }
    }, [logs]);

    const isRunning = status === "running";
    const isCompleted = status === "completed";

    return (
        <div className="w-full max-w-3xl mx-auto space-y-6 font-sans">

            {/* 1. QUERY / ACTION BADGES */}
            <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                {isRunning && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-50 text-violet-700 rounded-full text-xs font-medium border border-violet-100 shadow-sm animate-pulse">
                        <CircleNotch className="w-3.5 h-3.5 animate-spin" />
                        <span>{currentAction.slice(0, 40)}{currentAction.length > 40 ? "..." : ""}</span>
                    </div>
                )}

                {/* Simulated Search Queries */}
                {(isRunning || isCompleted) && (
                    <>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-full text-xs font-medium border border-slate-100">
                            <MagnifyingGlass className="w-3.5 h-3.5" />
                            <span>"Promessas de campanha 2024"</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-full text-xs font-medium border border-slate-100">
                            <MagnifyingGlass className="w-3.5 h-3.5" />
                            <span>"Planos de governo registrados"</span>
                        </div>
                    </>
                )}
            </div>

            {/* 2. SOURCES GRID */}
            {(sources.length > 0) && (
                <div className="space-y-2 animate-in fade-in duration-700">
                    <div className="flex items-center gap-2 text-slate-700 text-sm font-semibold">
                        {/* Swapped Globe for Newspaper to be safe */}
                        <Newspaper className="w-4 h-4" />
                        <span>Fontes Encontradas</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {sources.map((s, idx) => (
                            <div key={idx} className="flex flex-col p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-default">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[8px] text-slate-600 font-bold">
                                        {s.domain[0].toUpperCase()}
                                    </div>
                                    <span className="text-[10px] text-slate-500 truncate">{s.domain}</span>
                                </div>
                                <span className="text-xs font-medium text-slate-800 line-clamp-2 leading-tight">
                                    {s.title}
                                </span>
                            </div>
                        ))}
                        {/* Placeholder source loading */}
                        {isRunning && (
                            <div className="flex flex-col p-3 bg-slate-50 border border-slate-100 border-dashed rounded-lg justify-center items-center opacity-50">
                                <div className="w-4 h-4 rounded-full bg-slate-200 animate-pulse mb-1" />
                                <div className="h-2 w-12 bg-slate-200 rounded animate-pulse" />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 3. THINKING PROCESS (Logs) */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm transition-all duration-300">
                <div
                    onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
                    className="flex items-center justify-between p-3 bg-slate-50/50 hover:bg-slate-50 cursor-pointer border-b border-slate-100"
                >
                    <div className="flex items-center gap-2">
                        {/* Swapped Brain for CircleNotch (already imported) to be safe if Brain is missing */}
                        {isRunning ? <CircleNotch className="w-5 h-5 text-violet-500 animate-spin" /> : <CheckCircle className="w-5 h-5 text-emerald-500" />}
                        <span className="text-sm font-semibold text-slate-700">
                            {status === 'completed' ? "Análise Concluída" : "Thinking..."}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {isRunning && <span className="text-xs text-slate-400 animate-pulse">Processando...</span>}
                        {isThinkingExpanded ? <CaretDown className="w-4 h-4 text-slate-400" /> : <CaretRight className="w-4 h-4 text-slate-400" />}
                    </div>
                </div>

                {isThinkingExpanded && (
                    <div className="p-4 bg-slate-50/30 max-h-60 overflow-y-auto font-mono text-xs text-slate-600 space-y-2 relative">
                        {/* Vertical Connecting Line */}
                        <div className="absolute left-[19px] top-4 bottom-4 w-[1px] bg-slate-200" />

                        {logs.map((log, i) => (
                            <div key={i} className="flex gap-3 relative animate-in fade-in slide-in-from-left-2 duration-300">
                                <div className={cn(
                                    "w-2 h-2 rounded-full mt-1.5 flex-shrink-0 z-10",
                                    i === logs.length - 1 && isRunning ? "bg-violet-500 animate-pulse" : "bg-slate-300"
                                )} />
                                <span className={cn(
                                    "break-words w-full",
                                    i === logs.length - 1 ? "text-slate-800 font-medium" : "text-slate-500"
                                )}>
                                    {/* Safe Render: ensure it's a string */}
                                    {(typeof log === 'string' ? log : JSON.stringify(log)).replace(/\[.*?\]/, '').trim()}
                                </span>
                            </div>
                        ))}
                        <div ref={logsEndRef} />
                    </div>
                )}
            </div>

            {/* 4. FINAL ANSWER PLACEHOLDER (Only if simulating full page, but results appear below in layout) */}
            {isCompleted && (
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-3 rounded-lg border border-emerald-100">
                    <CheckCircle className="w-5 h-5" weight="fill" />
                    <span className="text-sm font-medium">Processamento finalizado. Veja os resultados abaixo.</span>
                </div>
            )}
        </div>
    );
}
