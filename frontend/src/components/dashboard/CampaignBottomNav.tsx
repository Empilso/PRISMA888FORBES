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
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[60] px-4 pb-6 pointer-events-none">
            {/* Pill */}
            <div className="mx-auto max-w-md w-full h-16 bg-white/92 dark:bg-slate-900/92 border border-slate-200/60 dark:border-slate-800/60 shadow-[0_-6px_24px_rgba(0,0,0,0.09)] rounded-2xl flex items-center pointer-events-auto ring-1 ring-black/[0.03]">

                {/* Left: Tarefas + Mapa */}
                <div className="flex flex-1 h-full">
                    {leftItems.map(item => <NavIcon key={item.name} {...item} />)}
                </div>

                {/* Centre slot — triangle floats above via -mt-8, text sits inside pill */}
                <Link
                    href={homeHref}
                    className="relative flex flex-col items-center justify-end pb-1.5 w-[76px] h-full shrink-0 -mt-8"
                >
                    {/* Triangle: 70 px, sits above pill */}
                    <div className={cn(
                        "relative transition-all duration-300",
                        homeActive
                            ? "scale-110 drop-shadow-[0_4px_14px_rgba(99,102,241,0.35)]"
                            : "opacity-80 hover:scale-105 hover:opacity-100"
                    )}>
                        <Image
                            src="/prisma-icon-transparent.png"
                            alt="Início"
                            width={70}
                            height={70}
                            className="object-contain"
                            style={{ width: "auto", height: "auto" }}
                            priority
                        />
                    </div>

                    {/* Label — aligns to pill bottom via justify-end + pb */}
                    <span className={cn(
                        "text-[9px] font-black tracking-[0.10em] uppercase leading-none mt-0.5",
                        homeActive ? "text-indigo-600" : "text-slate-400"
                    )}>
                        PRISMA 888
                    </span>

                    {homeActive && (
                        <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-indigo-600" />
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
