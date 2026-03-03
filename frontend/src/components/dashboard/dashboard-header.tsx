"use client";

import { Bell, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { Radar, Eye, EyeOff } from "lucide-react";

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
        <div className="border-b bg-card transition-all duration-300">
            <div className="flex h-16 items-center justify-between px-4 sm:px-8">
                <div className="flex items-center gap-6">
                    <div>
                        <h1 className="text-xl font-bold">Dashboard</h1>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                            Análise estratégica para a campanha de{" "}
                            <span className="font-semibold text-primary">{candidateName}</span>
                            {role && <Badge variant="secondary" className="text-xs px-2 py-0 h-5">{role}</Badge>}
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

                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground">Última atualização</p>
                        <p className="text-sm font-medium">{lastUpdate}</p>
                    </div>

                    <div className="h-8 w-px bg-border" />

                    <Button variant="ghost" size="icon" className={`relative transition-all ${socialStats ? 'text-purple-600' : ''}`}>
                        <Radar className={`h-5 w-5 ${socialStats ? 'animate-pulse' : ''}`} />
                    </Button>

                    <Button variant="ghost" size="icon" className="relative">
                        <Bell className="h-5 w-5" />
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
                        >
                            3
                        </Badge>
                    </Button>

                    <Button variant="ghost" size="icon">
                        <Settings className="h-5 w-5" />
                    </Button>

                    <Button variant="ghost" size="icon">
                        <User className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
