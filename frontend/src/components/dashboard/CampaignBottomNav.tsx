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

export function CampaignBottomNav({ campaignId }: { campaignId: string }) {
    const pathname = usePathname();
    const baseUrl = `/campaign/${campaignId}`;

    const leftItems = [
        { name: "Tarefas", href: `${baseUrl}/tasks`, icon: Brain },
        { name: "Mapa", href: `${baseUrl}/map`, icon: MapTrifold },
    ];

    const rightItems = [
        { name: "Dossiê", href: `${baseUrl}/plan`, icon: ShootingStar },
        { name: "Radar", href: `${baseUrl}/promises`, icon: Crosshair },
    ];

    const homeHref = `${baseUrl}/dashboard`;
    const homeActive = pathname === homeHref || pathname?.startsWith(homeHref + '/');

    const NavIcon = ({
        href, name, icon: Icon,
    }: { href: string; name: string; icon: React.ElementType }) => {
        const isActive = pathname === href || pathname?.startsWith(href + '/');
        return (
            <Link
                href={href}
                className={cn(
                    "relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all duration-300",
                    isActive ? "scale-105" : "opacity-40 hover:opacity-100"
                )}
            >
                <div className={cn(
                    "flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300",
                    isActive
                        ? "bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-md shadow-indigo-200/60"
                        : "text-slate-500"
                )}>
                    <Icon weight={isActive ? "fill" : "duotone"} className="h-5 w-5" />
                </div>
                <span className={cn(
                    "text-[9px] font-semibold tracking-tight leading-none",
                    isActive ? "text-indigo-600" : "text-slate-400"
                )}>{name}</span>
                {isActive && (
                    <div className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-indigo-600" />
                )}
            </Link>
        );
    };

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] px-4 pb-6 pointer-events-none">
            {/* Pill */}
            <div className="mx-auto max-w-md w-full h-16 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 shadow-[0_-6px_24px_rgba(0,0,0,0.09)] rounded-2xl flex items-center pointer-events-auto ring-1 ring-black/[0.03] relative">

                {/* Left: Tarefas + Mapa */}
                <div className="flex flex-1 h-full">
                    {leftItems.map(item => <NavIcon key={item.name} {...item} />)}
                </div>

                {/* Centre slot — triangle floats above, text perfectly aligned with other icons */}
                <Link
                    href={homeHref}
                    className="relative flex flex-col items-center justify-center gap-0.5 w-[76px] h-full shrink-0"
                >
                    {/* Invisible spacer mimicking the NavIcon's h-9 wrapper for perfect text alignment */}
                    <div className="w-9 h-9 invisible" aria-hidden="true" />

                    {/* Triangle: absolute, floats above the pill */}
                    <div className={cn(
                        "absolute -top-6 transition-all duration-300 pointer-events-none",
                        homeActive
                            ? "scale-110 drop-shadow-[0_4px_14px_rgba(99,102,241,0.35)]"
                            : "scale-100 opacity-80"
                    )}>
                        <Image
                            src="/prisma-icon-transparent.png"
                            alt="Início"
                            width={66}
                            height={66}
                            className="object-contain"
                            style={{ width: "66px", height: "66px" }}
                            priority
                        />
                    </div>

                    {/* Perfectly aligned label */}
                    <span className={cn(
                        "text-[9px] font-black tracking-[0.05em] uppercase leading-none",
                        homeActive ? "text-indigo-600" : "text-slate-400"
                    )}>
                        PRISMA 888
                    </span>

                    {homeActive && (
                        <div className="absolute bottom-2 w-1 h-1 rounded-full bg-indigo-600" />
                    )}
                </Link>

                {/* Right: Dossiê + Radar */}
                <div className="flex flex-1 h-full">
                    {rightItems.map(item => <NavIcon key={item.name} {...item} />)}
                </div>
            </div>
        </nav>
    );
}
