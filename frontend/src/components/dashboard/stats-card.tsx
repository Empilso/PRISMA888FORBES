"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";

interface StatsCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: LucideIcon;
    trend?: {
        value: number;
        label: string;
    };
    variant?: "default" | "primary" | "success" | "warning";
}

const variantStyles = {
    default: "bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)]",
    primary: "bg-[var(--brand-muted)] text-[var(--brand-primary)]",
    success: "bg-[var(--success-muted)] text-[var(--success)]",
    warning: "bg-[var(--warning-muted)] text-[var(--warning)]",
};

export function StatsCard({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    variant = "default",
}: StatsCardProps) {
    const displayValue =
        typeof value === "number" ? formatNumber(value) : value;

    return (
        <Card className="group hover:shadow-xl transition-all duration-300 border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-[2rem] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-[10px] md:text-sm font-bold text-slate-500 uppercase tracking-wider">
                    {title}
                </CardTitle>
                <div className={cn("p-2.5 rounded-2xl transition-transform group-hover:scale-110 duration-300 shadow-sm",
                    variant === 'primary' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' :
                        variant === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600' :
                            variant === 'warning' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600' :
                                'bg-slate-50 dark:bg-slate-800/50 text-slate-500'
                )}>
                    <Icon className="h-5 w-5" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">{displayValue}</div>
                {subtitle && (
                    <p className="text-[10px] md:text-xs text-slate-400 font-medium mt-1 leading-tight">{subtitle}</p>
                )}
            </CardContent>
        </Card>
    );
}
