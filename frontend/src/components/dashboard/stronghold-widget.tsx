"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, ShieldAlert, MapPin, TrendingUp, TrendingDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface ZoneData {
    locationId: number;
    name: string;
    address: string;
    targetVotes: number;
    totalVotes: number;
    percentage: number;
    rank: number;
    topCandidate: string;
    topCandidateVotes: number;
}

export function StrongholdWidget({ campaignId }: { campaignId: string }) {
    const [strongholds, setStrongholds] = useState<ZoneData[]>([]);
    const [weaknesses, setWeaknesses] = useState<ZoneData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchZones() {
            setLoading(true);
            const supabase = createClient();

            // 1. Buscar todas as seções desta campanha
            const { data: locations } = await supabase
                .from("locations")
                .select("id, name, address")
                .eq("campaign_id", campaignId);

            if (!locations || locations.length === 0) {
                setLoading(false);
                return;
            }

            const locationIds = locations.map(l => l.id);
            const locationMap: Record<number, { name: string; address: string }> = {};
            locations.forEach(l => { locationMap[l.id] = { name: l.name, address: l.address }; });

            // 2. Buscar resultados em lotes
            const batchSize = 50;
            let allResults: any[] = [];
            for (let i = 0; i < locationIds.length; i += batchSize) {
                const batch = locationIds.slice(i, i + batchSize);
                const { data } = await supabase
                    .from("location_results")
                    .select("location_id, candidate_name, votes, is_target")
                    .in("location_id", batch);
                if (data) allResults = [...allResults, ...data];
            }

            // 3. Agregar por seção
            const sectionData: Record<number, { target: number; total: number; candidates: Record<string, number> }> = {};
            for (const r of allResults) {
                const lid = r.location_id;
                if (!sectionData[lid]) sectionData[lid] = { target: 0, total: 0, candidates: {} };
                sectionData[lid].total += r.votes || 0;
                const candName = r.candidate_name || "?";
                sectionData[lid].candidates[candName] = (sectionData[lid].candidates[candName] || 0) + (r.votes || 0);
                if (r.is_target) {
                    sectionData[lid].target += r.votes || 0;
                }
            }

            // 4. Calcular % e ranking em cada seção
            const zones: ZoneData[] = Object.entries(sectionData).map(([lid, data]) => {
                const locId = parseInt(lid);
                const loc = locationMap[locId] || { name: "Desconhecido", address: "" };

                // Ranking: quem ficou em 1º?
                const sorted = Object.entries(data.candidates).sort((a, b) => b[1] - a[1]);
                const targetRank = sorted.findIndex(([, votes]) => votes === data.target) + 1 || sorted.length;
                const topCandidate = sorted[0]?.[0] || "?";
                const topVotes = sorted[0]?.[1] || 0;

                return {
                    locationId: locId,
                    name: loc.name,
                    address: loc.address,
                    targetVotes: data.target,
                    totalVotes: data.total,
                    percentage: data.total > 0 ? (data.target / data.total) * 100 : 0,
                    rank: targetRank,
                    topCandidate,
                    topCandidateVotes: topVotes,
                };
            });

            // Ordenar por % do nosso candidato
            const sortedByPerf = [...zones].sort((a, b) => b.percentage - a.percentage);
            setStrongholds(sortedByPerf.slice(0, 5)); // Top 5 melhores
            setWeaknesses(sortedByPerf.slice(-5).reverse()); // Bottom 5 piores (invertido para que o pior fique primeiro)
            setLoading(false);
        }

        fetchZones();
    }, [campaignId]);

    if (loading) {
        return (
            <Card className="rounded-2xl border border-slate-200/60 shadow-sm bg-white">
                <CardContent className="p-12 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* FORTALEZAS */}
            <Card className="rounded-2xl border border-emerald-200/60 shadow-sm bg-white overflow-hidden">
                <CardHeader className="border-b border-emerald-100 pb-3 bg-emerald-50/30">
                    <CardTitle className="text-base font-bold text-emerald-900 flex items-center gap-2">
                        <Shield className="h-5 w-5 text-emerald-600" />
                        Fortalezas
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">
                            Top 5
                        </Badge>
                    </CardTitle>
                    <p className="text-[11px] text-emerald-600/80 font-medium">
                        Zonas onde nosso candidato domina
                    </p>
                </CardHeader>
                <CardContent className="p-0">
                    {strongholds.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 text-sm">
                            Sem dados disponíveis.
                        </div>
                    ) : (
                        <div className="divide-y divide-emerald-50">
                            {strongholds.map((zone, i) => (
                                <div key={zone.locationId} className="px-4 py-3 hover:bg-emerald-50/40 transition-colors">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-[9px] font-black text-emerald-700">
                                                    {i + 1}
                                                </span>
                                                <p className="text-xs font-semibold text-slate-800 truncate">
                                                    {zone.name}
                                                </p>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-0.5 truncate ml-7">
                                                {zone.address}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end flex-shrink-0">
                                            <span className="text-sm font-black text-emerald-700 tabular-nums">
                                                {zone.percentage.toFixed(1)}%
                                            </span>
                                            <span className="text-[10px] text-slate-400">
                                                {zone.targetVotes}/{zone.totalVotes} votos
                                            </span>
                                        </div>
                                    </div>
                                    {/* Mini barra */}
                                    <div className="h-1.5 bg-emerald-100 rounded-full mt-2 ml-7 overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
                                            style={{ width: `${zone.percentage}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* FRAQUEZAS */}
            <Card className="rounded-2xl border border-rose-200/60 shadow-sm bg-white overflow-hidden">
                <CardHeader className="border-b border-rose-100 pb-3 bg-rose-50/30">
                    <CardTitle className="text-base font-bold text-rose-900 flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-rose-600" />
                        Fraquezas
                        <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-[10px]">
                            Bottom 5
                        </Badge>
                    </CardTitle>
                    <p className="text-[11px] text-rose-600/80 font-medium">
                        Zonas que precisam de atenção urgente
                    </p>
                </CardHeader>
                <CardContent className="p-0">
                    {weaknesses.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 text-sm">
                            Sem dados disponíveis.
                        </div>
                    ) : (
                        <div className="divide-y divide-rose-50">
                            {weaknesses.map((zone, i) => (
                                <div key={zone.locationId} className="px-4 py-3 hover:bg-rose-50/40 transition-colors">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center text-[9px] font-black text-rose-700">
                                                    {i + 1}
                                                </span>
                                                <p className="text-xs font-semibold text-slate-800 truncate">
                                                    {zone.name}
                                                </p>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-0.5 truncate ml-7">
                                                Líder: {zone.topCandidate} ({zone.topCandidateVotes} votos)
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end flex-shrink-0">
                                            <span className="text-sm font-black text-rose-700 tabular-nums">
                                                {zone.percentage.toFixed(1)}%
                                            </span>
                                            <span className="text-[10px] text-slate-400">
                                                {zone.targetVotes}/{zone.totalVotes} votos
                                            </span>
                                        </div>
                                    </div>
                                    {/* Mini barra */}
                                    <div className="h-1.5 bg-rose-100 rounded-full mt-2 ml-7 overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full"
                                            style={{ width: `${zone.percentage}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
