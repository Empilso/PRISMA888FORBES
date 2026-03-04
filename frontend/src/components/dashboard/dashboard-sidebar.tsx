"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PrismaLogo } from "@/components/ui/prisma-logo";
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
    Crosshair,
    Shield
} from "@phosphor-icons/react";
import { ThemeToggle } from "@/components/ThemeToggle";

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
        {
            name: "Radar de Ameaças",
            href: campaignId ? `${baseUrl}/competitors` : `${baseUrl}/radar-ameacas`,
            icon: Shield,
        },
    ];

    return (
        <>
            {/* Mobile Toggle Button - hidden on mobile, bottom nav is used instead */}
            <div className="hidden">
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
                    "hidden md:flex fixed md:static inset-y-0 left-0 z-50 flex-col transition-all duration-300 ease-in-out h-full shadow-[1px_0_20px_rgba(0,0,0,0.02)]",
                    "bg-[var(--bg-secondary)] border-r border-[var(--border-default)] text-[var(--text-primary)]",
                    isCollapsed ? "w-20" : "w-72",
                    isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                )}
            >
                {/* Header / Logo */}
                <div className={cn("flex items-center h-24 mb-2 transition-all", isCollapsed ? "justify-center" : "px-8")}>
                    {!isCollapsed ? (
                        <PrismaLogo href={`/campaign/${campaignId}/dashboard`} size="md" showSubtitle subtitle="Candidate Suite" />
                    ) : (
                        <PrismaLogo href={`/campaign/${campaignId}/dashboard`} size="sm" showSubtitle={false} />
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
                                        ? "bg-[var(--brand-muted)] text-[var(--brand-primary)] font-medium shadow-sm border border-[var(--brand-muted)]"
                                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--border-muted)]",
                                    isCollapsed && "justify-center px-0 py-3"
                                )}
                                title={isCollapsed ? item.name : undefined}
                            >
                                <Icon
                                    weight="duotone"
                                    className={cn(
                                        "transition-colors duration-200",
                                        isActive ? "text-[var(--brand-primary)]" : "text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)]",
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
                                    ? "bg-[var(--brand-muted)] text-[var(--brand-primary)] font-medium shadow-sm border border-[var(--brand-muted)]"
                                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--border-muted)]",
                                isCollapsed && "justify-center px-0 py-3"
                            )}
                            title={isCollapsed ? "Repositório" : undefined}
                        >
                            <FolderOpen
                                weight="duotone"
                                className={cn(
                                    "transition-colors duration-200",
                                    pathname?.includes('/files') ? "text-[var(--brand-primary)]" : "text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)]",
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
                <div className="p-4 border-t border-[var(--border-muted)] bg-[var(--bg-secondary)]/50">
                    <div className="flex items-center gap-2">
                        <Link
                            href="/dashboard/configuracoes"
                            className={cn(
                                "flex-1 flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] hover:shadow-sm transition-all border border-transparent hover:border-[var(--border-muted)]",
                                isCollapsed && "justify-center px-0"
                            )}
                            title="Configurações"
                        >
                            <Gear className={cn("text-slate-400 group-hover:text-slate-600", isCollapsed ? "h-6 w-6" : "h-5 w-5")} weight="duotone" />
                            {!isCollapsed && <span>Configurações</span>}
                        </Link>

                        {/* Theme Toggle */}
                        <div className={cn("flex items-center", isCollapsed && "hidden")}>
                            <ThemeToggle />
                        </div>

                        {/* Collapse Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="hidden md:flex h-8 w-8 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] hover:shadow-sm"
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
