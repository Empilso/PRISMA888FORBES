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

    const NavIcon = ({ href, name, icon: Icon }: { href: string; name: string; icon: React.ElementType }) => {
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
                    "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300",
                    isActive
                        ? "bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-lg shadow-indigo-200/50"
                        : "text-slate-600 dark:text-slate-400"
                )}>
                    <Icon weight={isActive ? "fill" : "duotone"} className="h-5 w-5" />
                </div>
                <span className={cn(
                    "text-[9px] font-semibold tracking-tight leading-none transition-all",
                    isActive ? "text-indigo-600" : "text-slate-400"
                )}>{name}</span>
                {isActive && (
                    <div className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-indigo-600 animate-in zoom-in duration-300" />
                )}
            </Link>
        );
    };

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[60] px-4 pb-6 pointer-events-none">
            {/* Pill container */}
            <div className="mx-auto max-w-md w-full h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/60 shadow-[0_-8px_30px_rgba(0,0,0,0.10)] rounded-[2rem] flex items-center pointer-events-auto ring-1 ring-black/[0.04] dark:ring-white/[0.04] relative">

                {/* Left items */}
                <div className="flex flex-1 items-center justify-around h-full pl-2">
                    {leftItems.map(item => (
                        <NavIcon key={item.name} href={item.href} name={item.name} icon={item.icon} />
                    ))}
                </div>

                {/* Center: PRISMA home — triangle floats above, label inside pill */}
                <Link
                    href={homeHref}
                    className="relative flex flex-col items-center justify-end pb-1.5 w-[72px] h-full shrink-0"
                >
                    {/* Triangle — absolute, floats ABOVE the pill */}
                    <div className={cn(
                        "absolute -top-8 left-1/2 -translate-x-1/2 transition-all duration-300 drop-shadow-[0_4px_12px_rgba(99,102,241,0.25)]",
                        homeActive ? "scale-110" : "scale-95 opacity-80 hover:scale-100 hover:opacity-100"
                    )}>
                        <Image
                            src="/prisma-icon-transparent.png"
                            alt="Home"
                            width={56}
                            height={56}
                            className="object-contain"
                            style={{ width: "auto", height: "auto" }}
                            priority
                        />
                    </div>

                    {/* Label — inside the pill */}
                    <span className={cn(
                        "text-[9px] font-black tracking-[0.12em] uppercase leading-none transition-all",
                        homeActive ? "text-indigo-600" : "text-slate-400"
                    )}>
                        PRISMA 888
                    </span>

                    {homeActive && (
                        <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-indigo-600 animate-in zoom-in duration-300" />
                    )}
                </Link>

                {/* Right items */}
                <div className="flex flex-1 items-center justify-around h-full pr-2">
                    {rightItems.map(item => (
                        <NavIcon key={item.name} href={item.href} name={item.name} icon={item.icon} />
                    ))}
                </div>
            </div>
        </nav>
    );
}
