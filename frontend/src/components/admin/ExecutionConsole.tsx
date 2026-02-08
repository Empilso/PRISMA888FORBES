"use client";

import React from "react";
import { TraceLogViewer } from "@/components/console/TraceLogViewer";
import { Button } from "@/components/ui/button";
import { StopCircle, Loader2 } from "lucide-react";

interface ExecutionConsoleProps {
    runId: string | null;
    campaignId?: string;
    isOpen?: boolean;
    onToggle?: () => void;
}

export function ExecutionConsole({ runId, campaignId, isOpen, onToggle }: ExecutionConsoleProps) {
    const isRunning = !!runId; // Simplification: if runId exists, we consider it "active" context

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

    if (isOpen !== undefined && onToggle) {
        if (!isOpen) {
            return (
                <div
                    onClick={onToggle}
                    className="fixed bottom-0 left-0 right-0 h-10 bg-slate-900 border-t border-slate-700 flex items-center justify-between px-4 cursor-pointer hover:bg-slate-800 transition-colors z-50"
                >
                    <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-xs font-mono">
                            {'>_'} CONSOLE DE EXECUÇÃO (LIVE)
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
            <div className="fixed bottom-0 left-0 right-0 h-[500px] bg-slate-950 border-t border-slate-700 flex flex-col z-50 shadow-2xl animate-in slide-in-from-bottom duration-300">
                {/* Header do Painel */}
                <div
                    className="bg-slate-900 px-4 py-2 border-b border-slate-700 flex items-center justify-between"
                >
                    <div className="flex items-center gap-2 cursor-pointer" onClick={onToggle}>
                        <div className="flex gap-1">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                        </div>
                        <span className="text-slate-400 text-sm font-mono ml-2">
                            Genesis Crew Console {runId ? `(Run: ${runId.slice(0, 8)})` : ''}
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        {isRunning && (
                            <div className="flex items-center gap-2 text-emerald-400 text-xs">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span>Conexão Realtime Ativa</span>
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
                        <Button variant="ghost" size="sm" onClick={onToggle} className="text-slate-500 text-xs h-6">▼ Minimizar</Button>
                    </div>
                </div>

                {/* Conteúdo do Painel - USANDO NOVO COMPONENTE DE STREAMING */}
                <div className="flex-1 overflow-hidden relative bg-black/50">
                    <TraceLogViewer
                        campaignId={campaignId}
                        className="h-full border-none shadow-none bg-transparent"
                    />
                </div>
            </div>
        );
    }

    // Fallback static view
    return (
        <div className="h-[400px] w-full border border-slate-800 rounded-lg overflow-hidden">
            <TraceLogViewer
                campaignId={campaignId}
                className="h-full border-none shadow-none"
            />
        </div>
    );
}
