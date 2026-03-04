"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    Brain,
    MapTrifold,
    Crosshair,
    ShootingStar,
} from "@phosphor-icons/react";

interface NavItem {
    name: string;
    href: string;
    icon?: React.ElementType;
    isPrismaHome?: boolean;
}

export function CampaignBottomNav({ campaignId }: { campaignId: string }) {
    const pathname = usePathname();
    const baseUrl = `/campaign/${campaignId}`;

    const items: NavItem[] = [
        {
            name: "Tarefas",
            href: `${baseUrl}/tasks`,
            icon: Brain
        },
        {
            name: "Mapa",
            href: `${baseUrl}/map`,
            icon: MapTrifold
        },
        // ← Botão central: triângulo PRISMA (home/dashboard)
        {
            name: "Início",
            href: `${baseUrl}/dashboard`,
            isPrismaHome: true,
        },
        {
            name: "Dossiê",
            href: `${baseUrl}/plan`,
            icon: ShootingStar,
        },
        {
            name: "Radar",
            href: `${baseUrl}/promises`,
            icon: Crosshair
        }
    ];

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[60] px-4 pb-6 pt-2 pointer-events-none">
            <div className="mx-auto max-w-md w-full h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.2)] rounded-[2rem] flex items-center justify-around px-2 pointer-events-auto ring-1 ring-black/[0.03] dark:ring-white/[0.03]">
                {items.map((item) => {
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                    const Icon = item.icon;

                    // ──────────── Botão Central: Triângulo PRISMA ────────────
                    if (item.isPrismaHome) {
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className="relative flex flex-col items-center justify-center -mt-8 gap-0.5"
                            >
                                <div className={cn(
                                    "flex items-center justify-center transition-all duration-300",
                                    isActive
                                        ? "scale-110 drop-shadow-[0_6px_20px_rgba(99,102,241,0.45)]"
                                        : "opacity-85 hover:opacity-100 hover:scale-105"
                                )}>
                                    <Image
                                        src="/prisma-icon-transparent.png"
                                        alt="Home"
                                        width={80}
                                        height={80}
                                        className="object-contain"
                                        style={{ width: "auto", height: "auto" }}
                                    />
                                </div>
                                <span className={cn(
                                    "text-[8px] font-black tracking-[0.15em] uppercase leading-none transition-all",
                                    isActive ? "text-indigo-600" : "text-slate-400"
                                )}>
                                    PRISMA 888
                                </span>
                                {isActive && (
                                    <div className="absolute -bottom-2 w-1 h-1 rounded-full bg-indigo-600 animate-in zoom-in duration-300" />
                                )}
                            </Link>
                        );
                    }

                    // ──────────── Demais Itens ────────────
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "relative flex flex-col items-center justify-center gap-1 min-w-[60px] h-12 transition-all duration-300 rounded-2xl",
                                isActive ? "scale-105" : "opacity-40 hover:opacity-100"
                            )}
                        >
                            <div className={cn(
                                "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300",
                                isActive
                                    ? "bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-lg shadow-indigo-200/50"
                                    : "text-slate-600 dark:text-slate-400"
                            )}>
                                {Icon && <Icon weight={isActive ? "fill" : "duotone"} className="h-6 w-6" />}
                            </div>

                            {isActive && (
                                <div className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-indigo-600 dark:bg-white animate-in zoom-in duration-300" />
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
