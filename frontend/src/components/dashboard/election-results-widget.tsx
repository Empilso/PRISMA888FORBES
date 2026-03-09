"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface CandidateResult {
    name: string;
    total_votes: number;
    percentage: number;
    vote_share: number;
}

export function ElectionResultsWidget({ campaignId }: { campaignId: string }) {
    const [results, setResults] = useState<CandidateResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [campaignName, setCampaignName] = useState("");

    useEffect(() => {
        async function fetchData() {
            const supabase = createClient();

            // 1. Buscar nome do nosso candidato para destacar
            const { data: campaignData } = await supabase
                .from('campaigns')
                .select('candidate_name')
                .eq('id', campaignId)
                .single();

            if (campaignData) setCampaignName(campaignData.candidate_name);

            // 2. Buscar IDs das localizações desta campanha (Isolamento de Tenant)
            const { data: campaignLocations } = await supabase
                .from('locations')
                .select('id')
                .eq('campaign_id', campaignId);

            const locationIds = campaignLocations?.map(l => l.id) || [];

            if (locationIds.length === 0) {
                setResults([]);
                setLoading(false);
                return;
            }

            // 3. Buscar resultados APENAS dessas localizações
            const { data: rawData, error } = await supabase
                .from('location_results')
                .select('candidate_name, votes')
                .in('location_id', locationIds);

            if (error) {
                console.error("Erro ao buscar resultados:", error);
                setLoading(false);
                return;
            }

            if (rawData) {
                // Agregar votos por candidato
                const totals: Record<string, number> = {};
                let grandTotal = 0;

                rawData.forEach(r => {
                    const votes = r.votes || 0;
                    totals[r.candidate_name] = (totals[r.candidate_name] || 0) + votes;
                    grandTotal += votes;
                });

                // Converter para array e ordenar
                const sortedResults: CandidateResult[] = Object.entries(totals)
                    .map(([name, votes]) => ({
                        name,
                        total_votes: votes,
                        percentage: grandTotal > 0 ? (votes / grandTotal) * 100 : 0,
                        vote_share: grandTotal > 0 ? (votes / grandTotal) : 0
                    }))
                    .sort((a, b) => b.total_votes - a.total_votes)
                    .slice(0, 10); // Top 10

                setResults(sortedResults);
            }
            setLoading(false);
        }

        fetchData();
    }, [campaignId]);

    const getStatusBadge = (index: number, name: string) => {
        const isMyCandidate = campaignName && name.toLowerCase().includes(campaignName.toLowerCase());

        if (isMyCandidate) {
            if (index === 0) return <Badge className="bg-emerald-500 hover:bg-emerald-600">Liderando</Badge>;
            if (index <= 2) return <Badge className="bg-amber-500 hover:bg-amber-600">Competitivo</Badge>;
            return <Badge variant="destructive">Atrás</Badge>;
        }

        if (index === 0) return <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">1º Lugar</Badge>;
        return null;
    };

    return (
        <Card className="rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] border-slate-200/50 dark:border-slate-800/50 overflow-hidden bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/50 pb-4 px-6 md:px-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-2xl text-amber-600 shadow-sm">
                            <Trophy className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight">Resultados da Última Eleição</CardTitle>
                            <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Base de Dados Histórica (TSE)</p>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {loading ? (
                    <div className="p-12 flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-800/50">
                                    <TableHead className="w-[70px] text-center text-[10px] font-black uppercase tracking-widest text-slate-400 px-4">Pos</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Candidato</TableHead>
                                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Votos</TableHead>
                                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 md:px-8">%</TableHead>
                                    <TableHead className="text-center w-[120px] text-[10px] font-black uppercase tracking-widest text-slate-400">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {results.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12 text-slate-400 font-medium">
                                            Nenhum dado eleitoral encontrado. Importe o arquivo CSV.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    results.map((r, i) => {
                                        const isMyCandidate = campaignName && r.name.toLowerCase().includes(campaignName.toLowerCase());
                                        return (
                                            <TableRow key={r.name} className={cn(
                                                "transition-colors border-slate-100 dark:border-slate-800/50",
                                                isMyCandidate
                                                    ? "bg-indigo-50/50 dark:bg-indigo-900/10 hover:bg-indigo-50/70"
                                                    : "hover:bg-slate-50/50 dark:hover:bg-slate-800/20"
                                            )}>
                                                <TableCell className="text-center py-4 px-4 font-bold text-slate-500">
                                                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : <span className="text-[11px] opacity-40">#{i + 1}</span>}
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <div className="flex flex-col">
                                                        <span className={cn("font-bold text-sm", isMyCandidate ? "text-indigo-600 dark:text-indigo-400" : "text-slate-900 dark:text-slate-200")}>
                                                            {r.name}
                                                        </span>
                                                        {isMyCandidate && (
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
                                                                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">MINHA CAMPANHA</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-mono font-bold text-xs text-slate-600 dark:text-slate-400 py-4">
                                                    {r.total_votes.toLocaleString('pt-BR')}
                                                </TableCell>
                                                <TableCell className="text-right py-4 px-4 md:px-8">
                                                    <div className="flex flex-col items-end">
                                                        <span className="font-mono font-black text-xs text-slate-900 dark:text-white leading-none">
                                                            {r.percentage.toFixed(2)}%
                                                        </span>
                                                        <div className="w-12 h-1 bg-slate-100 dark:bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                                                            <div
                                                                className={cn("h-full transition-all duration-1000", isMyCandidate ? "bg-indigo-500" : "bg-slate-300 dark:bg-slate-600")}
                                                                style={{ width: `${r.percentage}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center py-4 px-4">
                                                    {getStatusBadge(i, r.name)}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
