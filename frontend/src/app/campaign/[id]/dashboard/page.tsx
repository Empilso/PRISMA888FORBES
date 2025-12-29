"use client";

import React from "react";
import { useParams } from "next/navigation";
import { MapPin, Wallet, Lightbulb, CheckSquare } from "lucide-react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ElectionResultsWidget } from "@/components/dashboard/election-results-widget"; // Real Data Widget
import { ElectoralMapFull } from "@/components/campaign/ElectoralMapFull"; // Real Interactive Map
import { StrategicPrioritiesWidget } from "@/components/dashboard/strategic-priorities-widget"; // Real Data Widget
import { RecentDiagnosesWidget } from "@/components/dashboard/recent-diagnoses-widget"; // Real Data Widget
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function DashboardPage() {
    const params = useParams();
    const campaignId = params.id as string;

    // Mock data for Stats (Will replace with real data later if needed)
    const stats = {
        mappedSections: 37,
        totalVotes: 67247,
        recentInsights: 40,
        pendingTasks: 18,
    };

    return (
        <div className="space-y-8 animate-fade-in p-8 bg-slate-50/50 min-h-screen">
            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Seções Mapeadas"
                    value={stats.mappedSections}
                    subtitle="Total de seções mapeadas"
                    icon={MapPin}
                    variant="primary"
                />
                <StatsCard
                    title="Votos Totais"
                    value={stats.totalVotes}
                    subtitle="Votos da última eleição"
                    icon={Wallet}
                    variant="success"
                />
                <StatsCard
                    title="Insights Recentes"
                    value={stats.recentInsights}
                    subtitle="Gerados pela IA esta semana"
                    icon={Lightbulb}
                    variant="warning"
                />
                <StatsCard
                    title="Tarefas Pendentes"
                    value={stats.pendingTasks}
                    subtitle="Ações aguardando execução"
                    icon={CheckSquare}
                    variant="default"
                />
            </div>

            {/* Electoral Map - REAL INTERACTIVE MAP */}
            <div className="h-[500px] w-full bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden relative group transition-all hover:shadow-md">
                <ElectoralMapFull campaignId={campaignId} />
            </div>

            {/* Election Results - REAL DATA */}
            <ElectionResultsWidget campaignId={campaignId} />

            {/* Two Column Layout for Priorities and Diagnoses */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Strategic Priorities (2/3 width) */}
                <div className="lg:col-span-2">
                    <StrategicPrioritiesWidget campaignId={campaignId} />
                </div>

                {/* Recent Diagnoses (1/3 width) */}
                <div className="lg:col-span-1">
                    <RecentDiagnosesWidget campaignId={campaignId} />
                </div>
            </div>
        </div>
    );
}
