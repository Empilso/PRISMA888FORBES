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
        <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <div className={cn("p-2 rounded-lg", variantStyles[variant])}>
                    <Icon className="h-4 w-4" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{displayValue}</div>
                {subtitle && (
                    <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
                )}
                {trend && (
                    <p className="text-xs text-muted-foreground mt-1">
                        <span
                            className={cn(
                                "font-medium",
                                trend.value > 0 ? "text-green-600" : "text-red-600"
                            )}
                        >
                            {trend.value > 0 ? "+" : ""}
                            {trend.value}%
                        </span>{" "}
                        {trend.label}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
