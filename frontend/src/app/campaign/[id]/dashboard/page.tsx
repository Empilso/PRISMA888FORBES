"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { MapPin, Wallet, Lightbulb, CheckSquare } from "lucide-react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ElectionResultsWidget } from "@/components/dashboard/election-results-widget"; // Real Data Widget
import { ElectoralMapFull } from "@/components/campaign/ElectoralMapFull"; // Real Interactive Map
import { StrategicPrioritiesWidget } from "@/components/dashboard/strategic-priorities-widget"; // Real Data Widget
import { RecentDiagnosesWidget } from "@/components/dashboard/recent-diagnoses-widget"; // Real Data Widget
import { AdversarialDialog } from "@/components/campaign/adversarial-dialog"; // NEW Component
import { createClient } from "@/lib/supabase/client";

export default function DashboardPage() {
    const params = useParams();
    const campaignId = params.id as string;
    const supabase = createClient();

    // Dynamic stats from database
    const [stats, setStats] = useState({
        mappedSections: 0,
        totalVotes: 0,
        recentInsights: 0,
        pendingTasks: 0,
    });

    useEffect(() => {
        async function fetchStats() {
            try {
                // 1. Count mapped locations
                const { count: locationsCount } = await supabase
                    .from("locations")
                    .select("id", { count: "exact", head: true })
                    .eq("campaign_id", campaignId);

                // 2. Sum total votes from the entire election (all candidates, all locations)
                const { data: allVotes } = await supabase
                    .from("location_results")
                    .select("votes");

                const totalVotes = allVotes?.reduce((sum, row) => sum + (row.votes || 0), 0) || 0;

                // 3. Count recent insights (strategies from last 7 days)
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

                const { count: insightsCount } = await supabase
                    .from("strategies")
                    .select("id", { count: "exact", head: true })
                    .eq("campaign_id", campaignId)
                    .gte("created_at", sevenDaysAgo.toISOString());

                // 4. Count pending tasks
                const { count: tasksCount } = await supabase
                    .from("tasks")
                    .select("id", { count: "exact", head: true })
                    .eq("campaign_id", campaignId)
                    .neq("status", "completed");

                setStats({
                    mappedSections: locationsCount || 0,
                    totalVotes: totalVotes,
                    recentInsights: insightsCount || 0,
                    pendingTasks: tasksCount || 0,
                });
            } catch (error) {
                console.error("Erro ao buscar stats:", error);
            }
        }

        fetchStats();
    }, [campaignId]);

    return (
        <div className="space-y-4 sm:space-y-8 animate-fade-in px-4 sm:px-8 pt-4 pb-24 sm:py-8 bg-[var(--bg-primary)] min-h-screen">

            {/* Desktop Header with War Room Button */}
            <div className="hidden md:flex flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">Visão Geral</h1>
                    <p className="text-[var(--text-secondary)]">Monitoramento em tempo real da campanha.</p>
                </div>
                <div className="flex gap-2">
                    <AdversarialDialog campaignId={campaignId} />
                </div>
            </div>

            {/* Mobile: Hero inline header */}
            <div className="md:hidden flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-none">Visão Geral</h1>
                    <p className="text-xs text-slate-400 mt-0.5">Monitoramento em tempo real</p>
                </div>
                <AdversarialDialog campaignId={campaignId} />
            </div>

            {/* Stats Grid - 2x2 on mobile, 4 cols on desktop */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
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

            {/* Electoral Map - Shorter on mobile */}
            <div className="h-[280px] sm:h-[500px] w-full bg-[var(--bg-secondary)] rounded-2xl sm:rounded-[2rem] shadow-sm border border-[var(--border-default)] overflow-hidden relative group transition-all hover:shadow-md">
                <ElectoralMapFull campaignId={campaignId} />
            </div>

            {/* Election Results - REAL DATA */}
            <ElectionResultsWidget campaignId={campaignId} />

            {/* Two Column Layout for Priorities and Diagnoses */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
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
