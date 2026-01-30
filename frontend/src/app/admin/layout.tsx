"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation"; // Import usePathname para active state
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PrismaLogo } from "@/components/ui/prisma-logo";
import {
    UserPlus,
    ListDashes,
    UsersThree,
    TreeStructure,
    Gear,
    CaretLeft,
    CaretRight,
    List,
    X,
    SignOut,
    Robot,
    Crosshair,
    Buildings,
    User
} from "@phosphor-icons/react";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const menuGroups = [
        {
            title: "Gestão Geral",
            items: [
                {
                    name: "Novo Candidato",
                    href: "/admin/candidatos/novo",
                    icon: UserPlus
                },
                {
                    name: "Lista de Candidatos",
                    href: "/admin/candidatos",
                    icon: ListDashes
                }
            ]
        },
        {
            title: "Radar de Promessas",
            items: [
                {
                    name: "Painel de Monitoramento",
                    href: "/admin/radar",
                    icon: Crosshair
                },
                {
                    name: "Políticos (Base)",
                    href: "/admin/politicos",
                    icon: User
                },
                {
                    name: "Cidades",
                    href: "/admin/cidades",
                    icon: Buildings
                }
            ]
        },
        {
            title: "IA & Automação",
            items: [
                {
                    name: "Agentes & Crews",
                    href: "/admin/agentes",
                    icon: UsersThree
                },
                {
                    name: "Biblioteca de Agentes",
                    href: "/admin/agentes/library",
                    icon: Robot
                },
                {
                    name: "Editor de Fluxos",
                    href: "/admin/flows",
                    icon: TreeStructure
                }
            ]
        }
    ];

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 z-50 shadow-sm">
                <PrismaLogo href="/admin" size="sm" showSubtitle subtitle="Admin Panel" />
                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                    {isMobileMenuOpen ? <X className="h-6 w-6 text-slate-600" weight="duotone" /> : <List className="h-6 w-6 text-slate-600" weight="duotone" />}
                </Button>
            </div>

            {/* Sidebar Overlay (Mobile) */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed md:static inset-y-0 left-0 z-50 bg-white border-r border-slate-100 flex flex-col transition-all duration-300 ease-in-out shadow-[1px_0_20px_rgba(0,0,0,0.02)]",
                    isCollapsed ? "w-20" : "w-72",
                    isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                )}
            >
                {/* Header / Logo */}
                <div className={cn("flex items-center h-24 mb-2 transition-all", isCollapsed ? "justify-center" : "px-8")}>
                    {!isCollapsed ? (
                        <PrismaLogo href="/admin" size="md" showSubtitle subtitle="Admin Panel" />
                    ) : (
                        <PrismaLogo href="/admin" size="sm" showSubtitle={false} />
                    )}
                </div>

                {/* Menu Groups */}
                <div className="flex-1 px-4 overflow-y-auto custom-scrollbar space-y-6">
                    {menuGroups.map((group, groupIndex) => (
                        <div key={group.title}>
                            {!isCollapsed && (
                                <div className="px-4 mb-2">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{group.title}</p>
                                </div>
                            )}
                            {isCollapsed && groupIndex > 0 && <div className="border-t border-slate-100 my-4 mx-2" />}

                            <nav className="space-y-1.5">
                                {group.items.map((item) => {
                                    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                                    const Icon = item.icon;

                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            className={cn(
                                                "group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 border border-transparent",
                                                isActive
                                                    ? "bg-slate-100 text-slate-900 font-medium shadow-sm border-slate-200/50"
                                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-100",
                                                isCollapsed && "justify-center px-0 py-3"
                                            )}
                                            title={isCollapsed ? item.name : undefined}
                                        >
                                            <Icon
                                                weight="duotone"
                                                className={cn(
                                                    "transition-colors duration-200",
                                                    isActive ? "text-slate-800" : "text-slate-400 group-hover:text-slate-600",
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
                        </div>
                    ))}
                </div>

                {/* Footer Section */}
                <div className="p-4 border-t border-slate-50 bg-slate-50/50 mt-auto">
                    <div className="flex flex-col gap-1">
                        <Link
                            href="/admin/settings"
                            className={cn(
                                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm transition-all border border-transparent hover:border-slate-100",
                                isCollapsed ? "justify-center px-0" : ""
                            )}
                            title="Configurações"
                        >
                            <Gear className={cn("text-slate-400 group-hover:text-slate-600", isCollapsed ? "h-6 w-6" : "h-5 w-5")} weight="duotone" />
                            {!isCollapsed && <span>Configurações</span>}
                        </Link>

                        <div className="flex items-center gap-2 mt-1">
                            {/* Collapse Button */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn("hidden md:flex h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-white hover:shadow-sm", !isCollapsed && "ml-auto")}
                                onClick={() => setIsCollapsed(!isCollapsed)}
                            >
                                {isCollapsed ? <CaretRight weight="bold" /> : <CaretLeft weight="bold" />}
                            </Button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-slate-50 pt-16 md:pt-0 w-full transition-colors">
                {children}
            </main>
        </div>
    );
}
