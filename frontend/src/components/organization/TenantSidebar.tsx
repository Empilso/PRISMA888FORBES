
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PrismaLogo } from "@/components/ui/prisma-logo";
import {
    UserPlus,
    ListDashes,
    Gear,
    CaretLeft,
    CaretRight,
    List,
    X,
    House,
    MapTrifold,
    ShieldCheck
} from "@phosphor-icons/react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface MenuItem {
    name: string;
    href: string;
    icon: React.ElementType;
}

interface MenuGroup {
    title: string;
    items: MenuItem[];
}

export function TenantSidebar() {
    const pathname = usePathname();
    const params = useParams();
    const slug = params.slug as string;
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Dynamic base URL based on current organization slug
    const baseUrl = `/organization/${slug}`;

    // Prevent hydration mismatch by returning null or a skeleton until mounted
    if (!isMounted) return null;

    const menuGroups: MenuGroup[] = [
        {
            title: "Visão Tática",
            items: [
                {
                    name: "War Room",
                    href: `${baseUrl}`,
                    icon: MapTrifold
                }
            ]
        },
        {
            title: "Gestão Computacional",
            items: [
                {
                    name: "Novo Candidato",
                    href: `${baseUrl}/candidato/novo`,
                    icon: UserPlus
                },
                {
                    name: "Frota de Candidatos",
                    href: `${baseUrl}/candidatos`,
                    icon: ListDashes
                }
            ]
        },
        {
            title: "Configurações",
            items: [
                {
                    name: "Branding & Ajustes",
                    href: `${baseUrl}/config`,
                    icon: Gear
                }
            ]
        }
    ];

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    return (
        <>
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-4 z-50 shadow-sm">
                <PrismaLogo href={baseUrl} size="sm" showSubtitle subtitle={`TENANT ${slug.toUpperCase()}`} />
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                        {isMobileMenuOpen ? <X className="h-6 w-6 text-slate-600 dark:text-slate-300" weight="duotone" /> : <List className="h-6 w-6 text-slate-600 dark:text-slate-300" weight="duotone" />}
                    </Button>
                </div>
            </div>

            {/* Sidebar Overlay (Mobile) */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <aside
                className={cn(
                    "fixed md:static inset-y-0 left-0 z-50 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex flex-col transition-all duration-300 ease-in-out shadow-[1px_0_20px_rgba(0,0,0,0.02)]",
                    isCollapsed ? "w-20" : "w-72",
                    isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                )}
            >
                {/* Header / Logo */}
                <div className={cn("flex items-center h-24 mb-2 transition-all", isCollapsed ? "justify-center" : "px-8")}>
                    {!isCollapsed ? (
                        <PrismaLogo href={baseUrl} size="md" showSubtitle subtitle={`ADMIN - ${slug.toUpperCase()}`} />
                    ) : (
                        <PrismaLogo href={baseUrl} size="sm" showSubtitle={false} />
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
                            {isCollapsed && groupIndex > 0 && <div className="border-t border-slate-100 dark:border-slate-800 my-4 mx-2" />}

                            <nav className="space-y-1.5">
                                {group.items.map((item) => {
                                    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                                    const Icon = item.icon;

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={cn(
                                                "group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 border border-transparent",
                                                isActive
                                                    ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium shadow-sm border-slate-200/50 dark:border-slate-700/50"
                                                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-100 dark:hover:border-slate-800",
                                                isCollapsed && "justify-center px-0 py-3"
                                            )}
                                            title={isCollapsed ? item.name : undefined}
                                        >
                                            <Icon
                                                weight="duotone"
                                                className={cn(
                                                    "transition-colors duration-200",
                                                    isActive ? "text-slate-800 dark:text-slate-100" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300",
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

                {/* Footer Controls */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 mt-auto">
                    <div className="flex flex-col gap-2">
                        {/* Settings Link */}
                        <Link
                            href={`${baseUrl}/config`}
                            className={cn(
                                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 hover:shadow-sm transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-700",
                                isCollapsed ? "justify-center px-0" : ""
                            )}
                            title="Configurações"
                        >
                            <Gear className={cn("text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300", isCollapsed ? "h-6 w-6" : "h-5 w-5")} weight="duotone" />
                            {!isCollapsed && <span>Branding & Ajustes</span>}
                        </Link>

                        {/* Theme & Collapse Controls */}
                        <div className={cn("flex items-center gap-2", isCollapsed ? "flex-col" : "justify-between px-1")}>
                            <ThemeToggle />

                            {!isCollapsed && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-auto ml-1">Tema</span>}

                            {/* Collapse Button */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-800"
                                onClick={() => setIsCollapsed(!isCollapsed)}
                                title={isCollapsed ? "Expandir" : "Recolher"}
                            >
                                {isCollapsed ? <CaretRight weight="bold" /> : <CaretLeft weight="bold" />}
                            </Button>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
