"use client";

import { PrismaLogo } from "@/components/ui/prisma-logo";
import { Bell, Settings, User, Radar, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SocialStats {
    positive: number;
    negative: number;
    neutral: number;
    total_mentions: number;
}

interface DashboardHeaderProps {
    candidateName: string;
    role?: string;
    lastUpdate: string;
    socialStats?: SocialStats | null;
    isThermometerExpanded?: boolean;
    onToggleThermometer?: () => void;
}

export function DashboardHeader({
    candidateName,
    role,
    lastUpdate,
    socialStats,
    isThermometerExpanded = false,
    onToggleThermometer,
}: DashboardHeaderProps) {
    return (
        <div className="sticky top-0 z-40 w-full border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl transition-all duration-300 shadow-sm">
            <div className="flex h-16 items-center justify-between px-4 sm:px-8">
                <div className="flex items-center gap-4 md:gap-6">
                    {/* Logo Prisma 888 - Visível apenas no Mobile */}
                    <div className="md:hidden flex-shrink-0 active:scale-95 transition-transform">
                        <PrismaLogo size="sm" showSubtitle={false} />
                    </div>

                    <div className="hidden xs:flex flex-col">
                        <h1 className="text-sm md:text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-none mb-1">
                            Dashboard
                        </h1>
                        <div className="text-[10px] md:text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                            <span className="hidden md:inline">Análise estratégica para a campanha de{" "}</span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">{candidateName}</span>
                            {role && <Badge variant="secondary" className="text-[8px] md:text-xs px-1.5 py-0 h-4 md:h-5 bg-slate-100/50 dark:bg-slate-800/50 border-0">{role}</Badge>}
                        </div>
                    </div>

                    {/* 🌡️ Termômetro Social Integrado no Header Global */}
                    {socialStats && (
                        <div
                            className={`hidden md:flex flex-col gap-1 transition-all duration-500 border-l pl-6 ml-2 ${isThermometerExpanded ? 'min-w-[400px]' : 'w-56'}`}
                        >
                            <div className="flex items-center justify-between gap-4 cursor-pointer group" onClick={onToggleThermometer}>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full animate-pulse ${(socialStats.positive > socialStats.negative) ? 'bg-green-500' :
                                        (socialStats.negative > socialStats.positive) ? 'bg-red-500' : 'bg-amber-500'
                                        }`} />
                                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">
                                        SENTIMENTO SOCIAL
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {!isThermometerExpanded && (
                                        <span className="text-[10px] font-bold text-slate-400">
                                            {socialStats.total_mentions} menções
                                        </span>
                                    )}
                                    <div className="p-1 rounded-full hover:bg-slate-100 transition-colors">
                                        {isThermometerExpanded ? <EyeOff className="h-3 w-3 text-slate-400" /> : <Eye className="h-3 w-3 text-slate-400" />}
                                    </div>
                                </div>
                            </div>

                            <div className="relative h-2 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                                <div
                                    className="h-full bg-green-500 transition-all duration-700 ease-out"
                                    style={{ width: `${(socialStats.positive / socialStats.total_mentions) * 100}%` }}
                                />
                                <div
                                    className="h-full bg-amber-400 transition-all duration-700 ease-out"
                                    style={{ width: `${(socialStats.neutral / socialStats.total_mentions) * 100}%` }}
                                />
                                <div
                                    className="h-full bg-rose-500 transition-all duration-700 ease-out"
                                    style={{ width: `${(socialStats.negative / socialStats.total_mentions) * 100}%` }}
                                />
                            </div>

                            {isThermometerExpanded && (
                                <div className="flex justify-between items-center mt-1 animate-in fade-in slide-in-from-left-2">
                                    <div className="flex gap-3">
                                        <span className="text-[9px] font-bold text-green-600">🟢 {socialStats.positive} Elogios</span>
                                        <span className="text-[9px] font-bold text-amber-600">🟡 {socialStats.neutral} Neutros</span>
                                        <span className="text-[9px] font-bold text-rose-600">🔴 {socialStats.negative} Críticas</span>
                                    </div>
                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{socialStats.total_mentions} TOTAL</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 md:gap-3">
                    <div className="hidden sm:block text-right">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold leading-tight">Atualizado</p>
                        <p className="text-sm font-medium">{lastUpdate}</p>
                    </div>

                    <div className="hidden sm:block h-8 w-px bg-slate-200 dark:bg-slate-800" />

                    <Button variant="ghost" size="icon" className={cn("relative h-9 w-9 rounded-xl transition-all", socialStats ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : '')}>
                        <Radar className={cn("h-5 w-5", socialStats ? 'animate-pulse' : '')} />
                    </Button>

                    <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
                        <Bell className="h-5 w-5" />
                        <span className="absolute top-1 right-1 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                        </span>
                    </Button>

                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hidden md:flex hover:bg-slate-100 dark:hover:bg-slate-800">
                        <Settings className="h-5 w-5" />
                    </Button>

                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 border-0">
                        <User className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
