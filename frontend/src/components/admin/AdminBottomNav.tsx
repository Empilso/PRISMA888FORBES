"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    ListDashes,
    UsersThree,
    Buildings,
    Gear,
    House,
    Database
} from "@phosphor-icons/react";

interface NavItem {
    name: string;
    href: string;
    icon: React.ElementType;
}

export function AdminBottomNav() {
    const pathname = usePathname();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const items: NavItem[] = [
        {
            name: "Home",
            href: "/admin",
            icon: House
        },
        {
            name: "Candidatos",
            href: "/admin/candidatos",
            icon: ListDashes
        },
        {
            name: "Agentes",
            href: "/admin/agentes",
            icon: UsersThree
        },
        {
            name: "Partidos",
            href: "/admin/organizations",
            icon: Buildings
        },
        {
            name: "Config",
            href: "/admin/settings",
            icon: Gear
        }
    ];

    return (
        <nav
            className="md:hidden fixed bottom-0 left-0 right-0 z-[60] px-4 pb-6 pt-2 pointer-events-none"
            suppressHydrationWarning
        >
            <div className="mx-auto max-w-md w-full h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.2)] rounded-[2rem] flex items-center justify-around px-2 pointer-events-auto ring-1 ring-black/[0.03] dark:ring-white/[0.03]">
                {items.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "relative flex flex-col items-center justify-center gap-1 min-w-[64px] h-12 transition-all duration-300 rounded-2xl",
                                isActive ? "scale-110" : "opacity-40 hover:opacity-100"
                            )}
                        >
                            <div className={cn(
                                "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300",
                                isActive ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg" : "text-slate-600 dark:text-slate-400"
                            )}>
                                <Icon
                                    weight={isActive ? "fill" : "duotone"}
                                    className="h-6 w-6"
                                />
                            </div>

                            {/* Pontinho indicador estilo Google/Apple */}
                            {isActive && (
                                <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-slate-900 dark:bg-white animate-in zoom-in duration-300" />
                            )}

                            <span className={cn(
                                "text-[10px] font-bold uppercase tracking-tighter hidden transition-all duration-300",
                                isActive ? "block opacity-100" : "opacity-0"
                            )}>
                                {item.name}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
