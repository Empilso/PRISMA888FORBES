'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Terminal, Activity, Palette } from 'lucide-react';
import { LogConsole } from '../LogConsole';
import { cn } from '@/lib/utils';

interface CollapsibleConsoleProps {
    campaignId: string;
    isRunning?: boolean;
    logsCount?: number;
}

export function CollapsibleConsole({ campaignId, isRunning, logsCount = 0 }: CollapsibleConsoleProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [consoleTheme, setConsoleTheme] = useState<'dark' | 'light'>('dark');

    const toggleConsoleTheme = (e: React.MouseEvent) => {
        e.stopPropagation();
        setConsoleTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    return (
        <div
            className={cn(
                "fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out border-t shadow-2xl",
                consoleTheme === 'dark' ? "bg-[#0c0c0c] border-slate-800" : "bg-[#f8fafc] border-slate-200"
            )}
            style={{
                height: isExpanded ? '40vh' : '48px',
            }}
        >
            {/* Header / Trigger */}
            <div className="flex items-center w-full h-12 bg-inherit">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex-1 h-full px-6 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer group text-left"
                >
                    <div className="flex items-center gap-3">
                        <Terminal size={18} className={cn(
                            "transition-colors",
                            isExpanded
                                ? "text-emerald-500"
                                : consoleTheme === 'dark' ? "text-slate-500 group-hover:text-emerald-400" : "text-slate-400 group-hover:text-emerald-500"
                        )} />
                        <span className={cn(
                            "font-medium text-sm tracking-tight",
                            consoleTheme === 'dark' ? "text-slate-300" : "text-slate-600"
                        )}>
                            Console de Execução em Tempo Real
                        </span>

                        {isRunning ? (
                            <div className="flex items-center gap-2 ml-2 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-emerald-500 text-[10px] font-bold tracking-widest">LIVE</span>
                            </div>
                        ) : logsCount > 0 ? (
                            <span className={cn(
                                "text-[10px] font-mono ml-2 border px-1.5 py-0.5 rounded",
                                consoleTheme === 'dark' ? "text-slate-600 border-slate-800" : "text-slate-400 border-slate-200"
                            )}>
                                {logsCount} LOGS
                            </span>
                        ) : (
                            <span className={cn(
                                "text-[10px] font-mono ml-2 uppercase",
                                consoleTheme === 'dark' ? "text-slate-700" : "text-slate-300"
                            )}>Standby</span>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        {isRunning && <Activity size={14} className="text-emerald-500/50 animate-spin" style={{ animationDuration: '3s' }} />}

                        <div className={cn("h-6 w-px", consoleTheme === 'dark' ? "bg-slate-800" : "bg-slate-200")} />

                        {isExpanded ? (
                            <ChevronDown size={20} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
                        ) : (
                            <ChevronUp size={20} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
                        )}
                    </div>
                </button>

                {/* Independent Theme Toggle Button */}
                <button
                    onClick={toggleConsoleTheme}
                    className={cn(
                        "h-full px-4 border-l transition-colors group",
                        consoleTheme === 'dark' ? "border-slate-800 hover:bg-white/5" : "border-slate-200 hover:bg-black/5"
                    )}
                    title={consoleTheme === 'dark' ? "Mudar para Tema Claro" : "Mudar para Tema Escuro"}
                >
                    <Palette size={18} className={cn(
                        "transition-colors",
                        consoleTheme === 'dark' ? "text-slate-500 group-hover:text-amber-400" : "text-slate-400 group-hover:text-purple-600"
                    )} />
                </button>
            </div>

            {/* Embedded Console Content */}
            <div className={cn(
                "w-full transition-opacity duration-300 relative",
                isExpanded ? "opacity-100 h-[calc(40vh-48px)]" : "opacity-0 h-0 overflow-hidden"
            )}>
                <LogConsole
                    campaignId={campaignId}
                    height="h-full"
                    className="border-none rounded-none bg-transparent shadow-none"
                    theme={consoleTheme}
                />
            </div>
        </div>
    );
}
