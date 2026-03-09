"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Swords, Trophy, TrendingUp, TrendingDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface CandidateAgg {
    name: string;
    votes: number;
    percentage: number;
    isTarget: boolean;
}

export function ElectoralBattleWidget({ campaignId }: { campaignId: string }) {
    const [candidates, setCandidates] = useState<CandidateAgg[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalVotes, setTotalVotes] = useState(0);

    useEffect(() => {
        async function fetchBattle() {
            setLoading(true);
            const supabase = createClient();

            // Buscar todos os location_ids desta campanha
            const { data: locations } = await supabase
                .from("locations")
                .select("id")
                .eq("campaign_id", campaignId);

            if (!locations || locations.length === 0) {
                setLoading(false);
                return;
            }

            const locationIds = locations.map(l => l.id);

            // Buscar resultados dessas seções em lotes
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
            let total = 0;
            for (const r of allResults) {
                const name = r.candidate_name || "Desconhecido";
                if (!agg[name]) agg[name] = { votes: 0, isTarget: false };
                agg[name].votes += r.votes || 0;
                if (r.is_target) agg[name].isTarget = true;
                total += r.votes || 0;
            }

            setTotalVotes(total);

            // Ordenar e calcular %
            const sorted = Object.entries(agg)
                .map(([name, data]) => ({
                    name,
                    votes: data.votes,
                    percentage: total > 0 ? (data.votes / total) * 100 : 0,
                    isTarget: data.isTarget,
                }))
                .sort((a, b) => b.votes - a.votes)
                .slice(0, 6); // Top 6

            setCandidates(sorted);
            setLoading(false);
        }

        fetchBattle();
    }, [campaignId]);

    const targetCandidate = candidates.find(c => c.isTarget);
    const targetRank = candidates.findIndex(c => c.isTarget) + 1;
    const secondPlace = candidates.find((c, i) => i === (targetRank === 1 ? 1 : 0));
    const advantage = targetCandidate && secondPlace
        ? targetCandidate.votes - (targetRank === 1 ? secondPlace.votes : 0)
        : 0;

    // Cores para as barras
    const getBarColor = (index: number, isTarget: boolean) => {
        if (isTarget) return "bg-gradient-to-r from-indigo-500 to-purple-600";
        if (index === 0) return "bg-gradient-to-r from-rose-400 to-rose-500";
        if (index === 1) return "bg-gradient-to-r from-amber-400 to-amber-500";
        return "bg-gradient-to-r from-slate-300 to-slate-400";
    };

    const maxVotes = candidates[0]?.votes || 1;

    return (
        <Card className="rounded-2xl border border-slate-200/60 shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Swords className="h-5 w-5 text-indigo-600" />
                            Batalha Eleitoral
                        </CardTitle>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                            Ranking por votos — Última Eleição
                        </p>
                    </div>
                    {targetCandidate && (
                        <Badge className={cn(
                            "text-xs font-bold px-3 py-1",
                            targetRank === 1
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                        )}>
                            {targetRank === 1 ? (
                                <><Trophy className="h-3 w-3 mr-1" /> 1º Lugar</>
                            ) : (
                                <>{targetRank}º Lugar</>
                            )}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-5">
                {loading ? (
                    <div className="p-8 flex justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    </div>
                ) : candidates.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-sm">
                        Nenhum resultado eleitoral encontrado.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {candidates.map((cand, i) => (
                            <div key={cand.name} className={cn(
                                "group relative rounded-xl p-3 transition-all",
                                cand.isTarget
                                    ? "bg-indigo-50/80 border border-indigo-200/60 ring-1 ring-indigo-100"
                                    : "hover:bg-slate-50"
                            )}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className={cn(
                                            "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black",
                                            i === 0 ? "bg-amber-100 text-amber-700" :
                                                i === 1 ? "bg-slate-200 text-slate-600" :
                                                    i === 2 ? "bg-orange-100 text-orange-700" :
                                                        "bg-slate-100 text-slate-500"
                                        )}>
                                            {i + 1}
                                        </span>
                                        <span className={cn(
                                            "text-sm font-semibold truncate",
                                            cand.isTarget ? "text-indigo-900" : "text-slate-700"
                                        )}>
                                            {cand.name}
                                            {cand.isTarget && (
                                                <span className="ml-2 text-[10px] font-bold text-indigo-500 uppercase">
                                                    (Nosso Candidato)
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className={cn(
                                            "text-sm font-black tabular-nums",
                                            cand.isTarget ? "text-indigo-700" : "text-slate-900"
                                        )}>
                                            {cand.votes.toLocaleString("pt-BR")}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-semibold">
                                            ({cand.percentage.toFixed(1)}%)
                                        </span>
                                    </div>
                                </div>
                                {/* Barra de progresso */}
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={cn(
                                            "h-full rounded-full transition-all duration-700",
                                            getBarColor(i, cand.isTarget)
                                        )}
                                        style={{ width: `${(cand.votes / maxVotes) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}

                        {/* Footer: Vantagem */}
                        {targetCandidate && targetRank === 1 && advantage > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-xs text-slate-500 font-medium">Vantagem para 2º colocado</span>
                                <div className="flex items-center gap-1 text-emerald-600 font-bold text-sm">
                                    <TrendingUp className="h-4 w-4" />
                                    +{advantage.toLocaleString("pt-BR")} votos
                                </div>
                            </div>
                        )}
                        {targetCandidate && targetRank > 1 && (
                            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-xs text-slate-500 font-medium">Diferença para 1º colocado</span>
                                <div className="flex items-center gap-1 text-rose-600 font-bold text-sm">
                                    <TrendingDown className="h-4 w-4" />
                                    -{Math.abs(candidates[0].votes - targetCandidate.votes).toLocaleString("pt-BR")} votos
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
