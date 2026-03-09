"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
    MapPin, Users, Trophy, Swords, Brain, Target,
    CheckSquare, TrendingUp, TrendingDown, Sparkles, Radio
} from "lucide-react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ElectionResultsWidget } from "@/components/dashboard/election-results-widget";
import { ElectoralMapFull } from "@/components/campaign/ElectoralMapFull";
import { ElectoralBattleWidget } from "@/components/dashboard/electoral-battle-widget";
import { StrongholdWidget } from "@/components/dashboard/stronghold-widget";
import { StrategiesWidget } from "@/components/dashboard/strategies-widget";
import { RecentDiagnosesWidget } from "@/components/dashboard/recent-diagnoses-widget";
import { AdversarialDialog } from "@/components/campaign/adversarial-dialog";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
    const params = useParams();
    const campaignId = params.id as string;
    const supabase = createClient();

    // Campaign info
    const [candidateName, setCandidateName] = useState("");
    const [candidateRole, setCandidateRole] = useState("");
    const [candidateCity, setCandidateCity] = useState("");
    const [candidateParty, setCandidateParty] = useState("");

    // Dynamic stats from real data
    const [stats, setStats] = useState({
        targetVotes: 0,
        mappedSections: 0,
        rankPosition: 0,
        advantage: 0,
        totalStrategies: 0,
        socialMentions: 0,
        totalVotes: 0,
    });

    useEffect(() => {
        async function fetchCampaignInfo() {
            const { data } = await supabase
                .from("campaigns")
                .select("candidate_name, role, city, party")
                .eq("id", campaignId)
                .single();

            if (data) {
                setCandidateName(data.candidate_name || "");
                setCandidateRole(data.role || "");
                setCandidateCity(data.city || "");
                setCandidateParty(data.party || "");
            }
        }

        async function fetchStats() {
            try {
                // 1. Seções mapeadas
                const { count: locationsCount } = await supabase
                    .from("locations")
                    .select("id", { count: "exact", head: true })
                    .eq("campaign_id", campaignId);

                // 2. Buscar location_ids desta campanha
                const { data: locations } = await supabase
                    .from("locations")
                    .select("id")
                    .eq("campaign_id", campaignId);

                let targetVotes = 0;
                let totalVotes = 0;
                let rankPosition = 0;
                let advantage = 0;

                if (locations && locations.length > 0) {
                    const locationIds = locations.map(l => l.id);

                    // 3. Buscar resultados em lotes para calcular ranking
                    const batchSize = 50;
                    let allResults: any[] = [];
                    for (let i = 0; i < locationIds.length; i += batchSize) {
                        const batch = locationIds.slice(i, i + batchSize);
                        const { data } = await supabase
                            .from("location_results")
                            .select("candidate_name, votes, is_target")
                            .in("location_id", batch);
                        if (data) allResults = [...allResults, ...data];
                    }

                    // Agregar por candidato
                    const agg: Record<string, { votes: number; isTarget: boolean }> = {};
                    for (const r of allResults) {
                        const name = r.candidate_name || "?";
                        if (!agg[name]) agg[name] = { votes: 0, isTarget: false };
                        agg[name].votes += r.votes || 0;
                        if (r.is_target) agg[name].isTarget = true;
                        totalVotes += r.votes || 0;
                    }

                    const sorted = Object.entries(agg)
                        .sort((a, b) => b[1].votes - a[1].votes);

                    const targetIdx = sorted.findIndex(([, d]) => d.isTarget);
                    const targetEntry = sorted[targetIdx];

                    if (targetEntry) {
                        targetVotes = targetEntry[1].votes;
                        rankPosition = targetIdx + 1;

                        if (rankPosition === 1 && sorted.length > 1) {
                            advantage = targetVotes - sorted[1][1].votes;
                        } else if (rankPosition > 1) {
                            advantage = -(sorted[0][1].votes - targetVotes);
                        }
                    }
                }

                // 4. Strategies
                const { count: strategiesCount } = await supabase
                    .from("strategies")
                    .select("id", { count: "exact", head: true })
                    .eq("campaign_id", campaignId)
                    .in("status", ["approved", "published", "executed"]);

                // 5. Social mentions
                let socialCount = 0;
                try {
                    const { count } = await supabase
                        .from("social_mentions")
                        .select("id", { count: "exact", head: true })
                        .eq("campaign_id", campaignId);
                    socialCount = count || 0;
                } catch { /* tabela pode não existir */ }

                setStats({
                    targetVotes,
                    mappedSections: locationsCount || 0,
                    rankPosition,
                    advantage,
                    totalStrategies: strategiesCount || 0,
                    socialMentions: socialCount,
                    totalVotes,
                });
            } catch (error) {
                console.error("Erro ao buscar stats:", error);
            }
        }

        fetchCampaignInfo();
        fetchStats();
    }, [campaignId]);

    const isWinning = stats.rankPosition === 1;
    const positionLabel = stats.rankPosition > 0 ? `${stats.rankPosition}º` : "—";

    return (
        <div className="space-y-4 sm:space-y-6 animate-fade-in px-4 sm:px-8 pt-4 pb-24 sm:py-8 bg-[var(--bg-primary)] min-h-screen">

            {/* ====== HEADER INTELIGENTE ====== */}
            <div className="hidden md:flex">
                <div className={cn(
                    "w-full rounded-2xl p-6 flex items-center justify-between",
                    isWinning
                        ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700"
                        : "bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900"
                )}>
                    <div className="flex items-center gap-5">
                        {/* Ícone de posição */}
                        <div className={cn(
                            "w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg",
                            isWinning
                                ? "bg-white/20 text-white backdrop-blur-sm border border-white/10"
                                : "bg-white/10 text-white backdrop-blur-sm border border-white/10"
                        )}>
                            {isWinning ? <Trophy className="h-8 w-8" /> : positionLabel}
                        </div>

                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tight">
                                {candidateName || "Carregando..."}
                            </h1>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm text-white/70 font-medium">
                                    {candidateRole} • {candidateCity}
                                </span>
                                {candidateParty && (
                                    <Badge className="bg-white/20 text-white border-white/20 text-xs font-bold">
                                        {candidateParty}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Ranking + Vantagem */}
                        {stats.rankPosition > 0 && (
                            <div className="text-right">
                                <div className="text-3xl font-black text-white tabular-nums">
                                    {stats.targetVotes.toLocaleString("pt-BR")}
                                </div>
                                <div className="flex items-center gap-1 justify-end mt-0.5">
                                    {stats.advantage > 0 ? (
                                        <>
                                            <TrendingUp className="h-3.5 w-3.5 text-emerald-300" />
                                            <span className="text-xs font-bold text-emerald-300">
                                                +{stats.advantage.toLocaleString("pt-BR")} votos
                                            </span>
                                        </>
                                    ) : stats.advantage < 0 ? (
                                        <>
                                            <TrendingDown className="h-3.5 w-3.5 text-rose-300" />
                                            <span className="text-xs font-bold text-rose-300">
                                                {stats.advantage.toLocaleString("pt-BR")} votos
                                            </span>
                                        </>
                                    ) : null}
                                </div>
                            </div>
                        )}

                        <AdversarialDialog campaignId={campaignId} />
                    </div>
                </div>
            </div>

            {/* Mobile Header */}
            <div className="md:hidden">
                <div className={cn(
                    "rounded-2xl p-4",
                    isWinning
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600"
                        : "bg-gradient-to-r from-slate-700 to-slate-900"
                )}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-lg font-black text-white leading-tight">
                                {candidateName || "Carregando..."}
                            </h1>
                            <p className="text-xs text-white/60 mt-0.5">
                                {candidateRole} • {candidateCity}
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-xl font-black text-white tabular-nums">
                                {stats.targetVotes.toLocaleString("pt-BR")}
                            </div>
                            <span className="text-[10px] text-white/60">votos</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ====== 6 KPIs GRID ====== */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                <StatsCard
                    title="Meus Votos"
                    value={stats.targetVotes}
                    subtitle="Soma de todas as seções"
                    icon={Target}
                    variant="primary"
                />
                <StatsCard
                    title="Seções Mapeadas"
                    value={stats.mappedSections}
                    subtitle="Locais de votação"
                    icon={MapPin}
                    variant="success"
                />
                <StatsCard
                    title="Posição Geral"
                    value={positionLabel}
                    subtitle={isWinning ? "Liderando!" : "Buscar a liderança"}
                    icon={Trophy}
                    variant={isWinning ? "success" : "warning"}
                />
                <StatsCard
                    title={stats.advantage >= 0 ? "Vantagem" : "Diferença"}
                    value={stats.advantage >= 0 ? `+${stats.advantage.toLocaleString("pt-BR")}` : stats.advantage.toLocaleString("pt-BR")}
                    subtitle={stats.advantage >= 0 ? "Votos à frente" : "Votos atrás"}
                    icon={stats.advantage >= 0 ? TrendingUp : TrendingDown}
                    variant={stats.advantage >= 0 ? "success" : "warning"}
                />
                <StatsCard
                    title="Estratégias IA"
                    value={stats.totalStrategies}
                    subtitle="Aprovadas pelo Mestre"
                    icon={Brain}
                    variant="default"
                />
                <StatsCard
                    title="Menções Sociais"
                    value={stats.socialMentions}
                    subtitle="Radar Social ativo"
                    icon={Radio}
                    variant="default"
                />
            </div>

            {/* ====== MAPA ELEITORAL ====== */}
            <div className="h-[280px] sm:h-[450px] w-full bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-default)] overflow-hidden relative group transition-all hover:shadow-md">
                <ElectoralMapFull campaignId={campaignId} />
            </div>

            {/* ====== BATALHA ELEITORAL + RESULTADOS ====== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <ElectoralBattleWidget campaignId={campaignId} />
                <ElectionResultsWidget campaignId={campaignId} />
            </div>

            {/* ====== FORTALEZAS & FRAQUEZAS ====== */}
            <StrongholdWidget campaignId={campaignId} />

            {/* ====== ESTRATÉGIAS DA IA + DIAGNÓSTICOS ====== */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="lg:col-span-2">
                    <StrategiesWidget campaignId={campaignId} />
                </div>
                <div className="lg:col-span-1">
                    <RecentDiagnosesWidget campaignId={campaignId} />
                </div>
            </div>
        </div>
    );
}
