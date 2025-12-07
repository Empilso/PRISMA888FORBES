"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    LayoutDashboard,
    Sparkles,
    Map,
    FolderOpen,
    Settings,
    ChevronLeft,
    ChevronRight,
    Menu,
    X,
} from "lucide-react";

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
            icon: LayoutDashboard,
        },
        // "Plano Estratégico" removed from main list
        {
            name: "IA & Tarefas",
            href: campaignId ? `${baseUrl}/tasks` : `${baseUrl}/ia-tarefas`,
            icon: Sparkles,
        },
        {
            name: "Mapa Interativo",
            href: campaignId ? `${baseUrl}/map` : `${baseUrl}/mapa-interativo`,
            icon: Map,
        },
        {
            name: "Repositório",
            href: campaignId ? `${baseUrl}/files` : `${baseUrl}/repositorio`,
            icon: FolderOpen,
        },
    ];

    return (
        <>
            {/* Mobile Toggle Button (Fixed) */}
            <div className="md:hidden fixed top-4 left-4 z-50">
                <Button variant="outline" size="icon" onClick={() => setIsMobileOpen(!isMobileOpen)} className="bg-white shadow-md">
                    {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
            </div>

            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            <div
                className={cn(
                    "fixed md:static inset-y-0 left-0 z-50 flex flex-col border-r bg-card transition-all duration-300 ease-in-out h-full",
                    isCollapsed ? "w-20" : "w-64",
                    isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                )}
            >
                {/* Logo & Toggle */}
                <div className={cn("flex h-16 items-center border-b", isCollapsed ? "justify-center" : "justify-between px-6")}>
                    {!isCollapsed && (
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                                <span className="text-white font-bold text-sm">P8</span>
                            </div>
                            <div>
                                <h2 className="font-bold text-lg">Prisma 888</h2>
                                <p className="text-xs text-muted-foreground">Campanha 2024</p>
                            </div>
                        </div>
                    )}
                    {isCollapsed && (
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                            <span className="text-white font-bold text-sm">P8</span>
                        </div>
                    )}

                    <Button
                        variant="ghost"
                        size="icon"
                        className="hidden md:flex h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                    >
                        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                    </Button>
                </div>

                {/* Campaign Status */}
                {!isCollapsed && (
                    <div className="px-6 py-4">
                        <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                            Campanha Ativa
                        </p>
                    </div>
                )}
                {isCollapsed && <div className="h-4" />}

                {/* Navigation */}
                <nav className="flex-1 space-y-1 px-4 overflow-y-auto">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                    isCollapsed && "justify-center px-2"
                                )}
                                title={isCollapsed ? item.name : undefined}
                            >
                                <Icon className="h-5 w-5 flex-shrink-0" />
                                {!isCollapsed && <span className="truncate">{item.name}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* PREMIUM BUTTON - PLANO MESTRE */}
                {campaignId && (
                    <div className="px-3 pb-2 pt-4">
                        {!isCollapsed ? (
                            <>
                                <div className="mb-2 px-4 text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                                    Estratégia
                                </div>
                                <Link
                                    href={`/campaign/${campaignId}/plan`}
                                    className="group flex items-center gap-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-white shadow-lg shadow-indigo-200 transition-all hover:shadow-indigo-300 hover:scale-[1.02]"
                                >
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                                        <Sparkles className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="flex flex-col text-left">
                                        <span className="text-sm font-bold">Plano Mestre</span>
                                        <span className="text-[10px] text-indigo-100 opacity-90">Ver Dossiê & IA</span>
                                    </div>
                                </Link>
                            </>
                        ) : (
                            <Link
                                href={`/campaign/${campaignId}/plan`}
                                className="group flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 p-3 text-white shadow-lg transition-all hover:scale-105"
                                title="Plano Mestre"
                            >
                                <Sparkles className="h-5 w-5" />
                            </Link>
                        )}
                    </div>
                )}

                {/* Footer */}
                <div className="border-t p-4">
                    <Link
                        href="/dashboard/configuracoes"
                        className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
                            isCollapsed && "justify-center px-2"
                        )}
                        title={isCollapsed ? "Configurações" : undefined}
                    >
                        <Settings className="h-5 w-5 flex-shrink-0" />
                        {!isCollapsed && <span>Configurações</span>}
                    </Link>
                </div>
            </div>
        </>
    );
}
