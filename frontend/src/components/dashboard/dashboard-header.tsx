"use client";

import { Bell, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DashboardHeaderProps {
    candidateName: string;
    role?: string;
    lastUpdate: string;
}

export function DashboardHeader({
    candidateName,
    role,
    lastUpdate,
}: DashboardHeaderProps) {
    return (
        <div className="border-b bg-card">
            <div className="flex h-16 items-center justify-between px-6">
                <div>
                    <h1 className="text-xl font-bold">Dashboard</h1>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                        Análise estratégica para a campanha de{" "}
                        <span className="font-semibold text-primary">{candidateName}</span>
                        {role && <Badge variant="secondary" className="text-xs px-2 py-0 h-5">{role}</Badge>}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground">Última atualização</p>
                        <p className="text-sm font-medium">{lastUpdate}</p>
                    </div>

                    <div className="h-8 w-px bg-border" />

                    <Button variant="ghost" size="icon" className="relative">
                        <Bell className="h-5 w-5" />
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
                        >
                            3
                        </Badge>
                    </Button>

                    <Button variant="ghost" size="icon">
                        <Settings className="h-5 w-5" />
                    </Button>

                    <Button variant="ghost" size="icon">
                        <User className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
