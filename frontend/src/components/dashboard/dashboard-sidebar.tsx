"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    SquaresFour,
    Brain,
    MapTrifold,
    FolderOpen,
    Gear,
    CaretLeft,
    CaretRight,
    List,
    X,
    Scroll,
    UsersThree,
    ShootingStar,
    Crosshair
} from "@phosphor-icons/react";

export function DashboardSidebar({ campaignId }: { campaignId?: string }) {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // Base URL depende se estamos no contexto de uma campanha ou no dashboard geral
    const baseUrl = campaignId ? `/campaign/${campaignId}` : '/dashboard';

    const navigation = [
        {
            name: "Dashboard do Candidato",
            href: campaignId ? `${baseUrl}/dashboard` : baseUrl,
            icon: SquaresFour,
        },
        {
            name: "IA & Tarefas",
            href: campaignId ? `${baseUrl}/tasks` : `${baseUrl}/ia-tarefas`,
            icon: Brain,
        },
        {
            name: "Mapa Interativo",
            href: campaignId ? `${baseUrl}/map` : `${baseUrl}/mapa-interativo`,
            icon: MapTrifold,
        },
        {
            name: "Radar de Promessas",
            href: campaignId ? `${baseUrl}/promises` : `${baseUrl}/promessas`,
            icon: Crosshair,
        },
    ];

    return (
        <>
            {/* Mobile Toggle Button */}
            <div className="md:hidden fixed top-4 left-4 z-50">
                <Button variant="outline" size="icon" onClick={() => setIsMobileOpen(!isMobileOpen)} className="bg-white/90 backdrop-blur shadow-md border-slate-200">
                    {isMobileOpen ? <X className="h-5 w-5 text-slate-600" weight="duotone" /> : <List className="h-5 w-5 text-slate-600" weight="duotone" />}
                </Button>
            </div>

            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            <div
                className={cn(
                    "fixed md:static inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-slate-100 transition-all duration-300 ease-in-out h-full shadow-[1px_0_20px_rgba(0,0,0,0.02)]",
                    isCollapsed ? "w-20" : "w-72",
                    isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                )}
            >
                {/* Header / Logo */}
                <div className={cn("flex items-center h-24 mb-2 transition-all", isCollapsed ? "justify-center" : "px-8")}>
                    {!isCollapsed ? (
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-900 shadow-lg shadow-slate-200 flex items-center justify-center transform hover:scale-105 transition-transform">
                                <span className="text-white font-black text-lg">P8</span>
                            </div>
                            <div className="flex flex-col">
                                <h2 className="font-bold text-xl text-slate-900 leading-tight">Prisma 888</h2>
                                <p className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">Candidate Suite</p>
                            </div>
                        </div>
                    ) : (
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-900 shadow-md flex items-center justify-center">
                            <span className="text-white font-black text-lg">P8</span>
                        </div>
                    )}
                </div>

                {/* Campaign Status Check */}
                {!isCollapsed && campaignId && (
                    <div className="px-6 mb-6">
                        <div className="px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Campanha Ativa</span>
                            <span className="text-xs font-semibold text-slate-700 truncate">Campanha 2024</span>
                        </div>
                    </div>
                )}

                {/* Navigation Items */}
                <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 border border-transparent",
                                    isActive
                                        ? "bg-blue-50 text-blue-700 font-medium shadow-sm border-blue-100/50"
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-100",
                                    isCollapsed && "justify-center px-0 py-3"
                                )}
                                title={isCollapsed ? item.name : undefined}
                            >
                                <Icon
                                    weight="duotone"
                                    className={cn(
                                        "transition-colors duration-200",
                                        isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600",
                                        isCollapsed ? "h-6 w-6" : "h-5 w-5"
                                    )}
                                />
                                {!isCollapsed && (
                                    <span className="text-sm tracking-tight">{item.name}</span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* BOTTOM SECTION - REPOSITÓRIO + PLANO MESTRE */}
                {campaignId && (
                    <div className="p-4 mt-auto space-y-3">
                        {/* Repositório */}
                        <Link
                            href={`/campaign/${campaignId}/files`}
                            className={cn(
                                "group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 border border-transparent",
                                pathname?.includes('/files')
                                    ? "bg-blue-50 text-blue-700 font-medium shadow-sm border-blue-100/50"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-100",
                                isCollapsed && "justify-center px-0 py-3"
                            )}
                            title={isCollapsed ? "Repositório" : undefined}
                        >
                            <FolderOpen
                                weight="duotone"
                                className={cn(
                                    "transition-colors duration-200",
                                    pathname?.includes('/files') ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600",
                                    isCollapsed ? "h-6 w-6" : "h-5 w-5"
                                )}
                            />
                            {!isCollapsed && (
                                <span className="text-sm tracking-tight">Repositório</span>
                            )}
                        </Link>

                        {/* Plano Mestre */}
                        {!isCollapsed ? (
                            <Link
                                href={`/campaign/${campaignId}/plan`}
                                className="group relative overflow-hidden flex items-center gap-3 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-4 text-white shadow-xl shadow-indigo-200/50 transition-all hover:shadow-indigo-300/60 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {/* Decorative elements */}
                                <div className="absolute top-0 right-0 -mr-4 -mt-4 h-24 w-24 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-all"></div>

                                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm border border-white/10 group-hover:bg-white/25 transition-colors">
                                    <ShootingStar className="h-5 w-5 text-white" weight="duotone" />
                                </div>
                                <div className="relative flex flex-col min-w-0">
                                    <span className="text-sm font-bold leading-none mb-1">Plano Mestre</span>
                                    <span className="text-[10px] text-indigo-100 opacity-80 font-medium truncate">Ver Dossiê Estratégico</span>
                                </div>
                            </Link>
                        ) : (
                            <Link
                                href={`/campaign/${campaignId}/plan`}
                                className="group flex items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-3 text-white shadow-lg transition-all hover:scale-105"
                                title="Plano Mestre"
                            >
                                <ShootingStar className="h-6 w-6" weight="duotone" />
                            </Link>
                        )}
                    </div>
                )}

                {/* Footer / User / Config */}
                <div className="p-4 border-t border-slate-50 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <Link
                            href="/dashboard/configuracoes"
                            className={cn(
                                "flex-1 flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm transition-all border border-transparent hover:border-slate-100",
                                isCollapsed && "justify-center px-0"
                            )}
                            title="Configurações"
                        >
                            <Gear className={cn("text-slate-400 group-hover:text-slate-600", isCollapsed ? "h-6 w-6" : "h-5 w-5")} weight="duotone" />
                            {!isCollapsed && <span>Configurações</span>}
                        </Link>

                        {/* Collapse Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="hidden md:flex h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-white hover:shadow-sm"
                            onClick={() => setIsCollapsed(!isCollapsed)}
                        >
                            {isCollapsed ? <CaretRight weight="bold" /> : <CaretLeft weight="bold" />}
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}
