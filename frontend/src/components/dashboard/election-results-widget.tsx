"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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

            // 2. Buscar resultados brutos por local
            // Nota: Idealmente teríamos uma view 'election_results_summary', mas vamos agregar no client por enquanto se não houver
            const { data: rawData, error } = await supabase
                .from('location_results')
                .select('candidate_name, votes');

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
        <Card className="rounded-[2rem] shadow-sm border border-[var(--border-default)] overflow-hidden bg-[var(--bg-secondary)]">
            <CardHeader className="border-b border-[var(--border-muted)] pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-amber-100/10 rounded-lg text-amber-500">
                            <Trophy className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-bold text-[var(--text-primary)]">Resultados da Última Eleição</CardTitle>
                            <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">Baseado no arquivo eleitoral importado</p>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {loading ? (
                    <div className="p-8 flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-[var(--text-tertiary)]" />
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-[var(--border-muted)]">
                                <TableHead className="w-[80px] text-center text-[var(--text-secondary)]">Pos</TableHead>
                                <TableHead className="text-[var(--text-secondary)]">Candidato</TableHead>
                                <TableHead className="text-right text-[var(--text-secondary)]">Votos</TableHead>
                                <TableHead className="text-right text-[var(--text-secondary)]">% Válidos</TableHead>
                                <TableHead className="text-center w-[120px] text-[var(--text-secondary)]">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {results.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-[var(--text-tertiary)]">
                                        Nenhum dado eleitoral encontrado. Importe o arquivo CSV.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                results.map((r, i) => {
                                    const isMyCandidate = campaignName && r.name.toLowerCase().includes(campaignName.toLowerCase());
                                    return (
                                        <TableRow key={r.name} className={isMyCandidate ? "bg-indigo-500/10 hover:bg-indigo-500/20 border-[var(--border-muted)]" : "hover:bg-[var(--bg-tertiary)] border-[var(--border-muted)]"}>
                                            <TableCell className="text-center font-medium text-[var(--text-secondary)]">
                                                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`}
                                            </TableCell>
                                            <TableCell className="font-medium text-[var(--text-primary)]">
                                                {r.name}
                                                {isMyCandidate && <span className="ml-2 text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-bold">VOCÊ</span>}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-[var(--text-secondary)]">
                                                {r.total_votes.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-[var(--text-secondary)]">
                                                {r.percentage.toFixed(2)}%
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {getStatusBadge(i, r.name)}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
