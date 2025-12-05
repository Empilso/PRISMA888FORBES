"use client";

import React, { useState } from "react";
import Link from "next/link";
import { LayoutDashboard, Users, ListChecks, Settings, ChevronRight, ChevronLeft, Box, Menu, X, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                        <Box className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-bold text-gray-900">Prisma 888</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                    {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </Button>
            </div>

            {/* Sidebar Overlay (Mobile) */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed md:static inset-y-0 left-0 z-50 bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out",
                    isCollapsed ? "w-20" : "w-64",
                    isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
                    "md:flex"
                )}
            >
                {/* Logo & Toggle */}
                <div className={cn("h-16 flex items-center border-b border-gray-200", isCollapsed ? "justify-center" : "justify-between px-4")}>
                    {!isCollapsed && (
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                                <Box className="h-5 w-5 text-white" />
                            </div>
                            <span className="font-bold text-sm text-gray-900">Prisma 888</span>
                        </div>
                    )}
                    {isCollapsed && (
                        <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                            <Box className="h-5 w-5 text-white" />
                        </div>
                    )}

                    <Button
                        variant="ghost"
                        size="icon"
                        className="hidden md:flex h-6 w-6 text-gray-500 hover:text-gray-900"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                    >
                        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                    </Button>
                </div>

                {/* Menu Section */}
                <div className="flex-1 py-4 overflow-y-auto">
                    {!isCollapsed && (
                        <div className="px-4 mb-2">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">GESTÃO GERAL</p>
                        </div>
                    )}

                    <nav className="space-y-1 px-2">
                        <Link href="/admin/candidatos/novo">
                            <div
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md cursor-pointer transition-colors",
                                    isCollapsed && "justify-center px-2"
                                )}
                                title={isCollapsed ? "Adicionar Candidatos" : undefined}
                            >
                                <Users className="h-5 w-5 text-gray-500" />
                                {!isCollapsed && <span className="font-medium">Adicionar Candidatos</span>}
                            </div>
                        </Link>

                        <Link href="/admin/candidatos">
                            <div
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md cursor-pointer transition-colors",
                                    isCollapsed && "justify-center px-2"
                                )}
                                title={isCollapsed ? "Lista de Candidatos" : undefined}
                            >
                                <ListChecks className="h-5 w-5 text-gray-500" />
                                {!isCollapsed && <span className="font-medium">Lista de Candidatos</span>}
                            </div>
                        </Link>

                        <Link href="/admin/agentes">
                            <div
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md cursor-pointer transition-colors",
                                    isCollapsed && "justify-center px-2"
                                )}
                                title={isCollapsed ? "Agentes & Crews" : undefined}
                            >
                                <Users className="h-5 w-5 text-gray-500" />
                                {!isCollapsed && <span className="font-medium">Agentes & Crews</span>}
                            </div>
                        </Link>
                    </nav>

                    {!isCollapsed && (
                        <div className="px-4 mb-2 mt-6">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">IA & AUTOMAÇÃO</p>
                        </div>
                    )}
                    {isCollapsed && <div className="my-4 border-t border-gray-200 mx-2" />}

                    <nav className="space-y-1 px-2">
                        <Link href="/admin/flows">
                            <div
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md cursor-pointer transition-colors",
                                    isCollapsed && "justify-center px-2"
                                )}
                                title={isCollapsed ? "Editor de Fluxos" : undefined}
                            >
                                <Workflow className="h-5 w-5 text-gray-500" />
                                {!isCollapsed && <span className="font-medium">Editor de Fluxos</span>}
                            </div>
                        </Link>
                    </nav>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200">
                    <Link href="/admin/settings">
                        <Button
                            variant="ghost"
                            className={cn(
                                "w-full text-sm text-gray-700 hover:bg-gray-100",
                                isCollapsed ? "justify-center px-0" : "justify-start"
                            )}
                            title={isCollapsed ? "Configurações" : undefined}
                        >
                            <Settings className={cn("h-5 w-5", !isCollapsed && "mr-2")} />
                            {!isCollapsed && "Configurações"}
                        </Button>
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-gray-50 pt-16 md:pt-0 w-full">
                {children}
            </main>
        </div>
    );
}
