"use client";

import React, { useState, useEffect } from "react";
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
                    .eq("completed", false);

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
