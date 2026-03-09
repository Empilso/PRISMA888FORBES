"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Brain, Sparkles, ArrowRight, CheckCircle2, Clock, Target } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Strategy {
    id: string;
    title: string;
    description: string;
    status: string;
    estimated_votes: number | null;
    run_id: string;
    created_at: string;
}

export function StrategiesWidget({ campaignId }: { campaignId: string }) {
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalApproved, setTotalApproved] = useState(0);
    const [totalEstimated, setTotalEstimated] = useState(0);
    const router = useRouter();

    useEffect(() => {
        async function fetchStrategies() {
            setLoading(true);
            const supabase = createClient();

            const { data, error } = await supabase
                .from("strategies")
                .select("id, title, description, status, estimated_votes, run_id, created_at")
                .eq("campaign_id", campaignId)
                .order("created_at", { ascending: false })
                .limit(8);

            if (error) {
                console.error("Erro ao buscar estratégias:", error);
            } else {
                setStrategies(data || []);
                const approved = (data || []).filter(s => s.status === "approved" || s.status === "published" || s.status === "executed");
                setTotalApproved(approved.length);
                setTotalEstimated(approved.reduce((sum, s) => sum + (s.estimated_votes || 0), 0));
            }
            setLoading(false);
        }

        fetchStrategies();
    }, [campaignId]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "approved":
                return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"><CheckCircle2 className="h-3 w-3 mr-0.5" /> Aprovada</Badge>;
            case "published":
                return <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]"><Sparkles className="h-3 w-3 mr-0.5" /> Publicada</Badge>;
            case "executed":
                return <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px]"><Target className="h-3 w-3 mr-0.5" /> Executada</Badge>;
            case "suggested":
                return <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]"><Clock className="h-3 w-3 mr-0.5" /> Sugestão</Badge>;
            default:
                return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
        }
    };

    return (
        <Card className="rounded-2xl border border-slate-200/60 shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Brain className="h-5 w-5 text-purple-600" />
                            Estratégias da IA
                            <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                                {totalApproved} aprovadas
                            </Badge>
                        </CardTitle>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                            Geradas pelo Genesis Crew
                            {totalEstimated > 0 && (
                                <span className="ml-2 text-emerald-600 font-bold">
                                    ~{totalEstimated.toLocaleString("pt-BR")} votos estimados
                                </span>
                            )}
                        </p>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        className="text-purple-700 border-purple-200 hover:bg-purple-50 text-xs"
                        onClick={() => router.push(`/admin/campaign/${campaignId}/setup`)}
                    >
                        <Sparkles className="h-3 w-3 mr-1" /> Setup IA
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {loading ? (
                    <div className="p-8 flex justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    </div>
                ) : strategies.length === 0 ? (
                    <div className="p-8 text-center">
                        <Brain className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                        <p className="text-slate-500 text-sm font-medium">Nenhuma estratégia gerada ainda.</p>
                        <Button
                            variant="link"
                            className="text-purple-600 mt-2"
                            onClick={() => router.push(`/admin/campaign/${campaignId}/setup`)}
                        >
                            Gerar primeira análise IA →
                        </Button>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {strategies.map((strat) => (
                            <div
                                key={strat.id}
                                className="px-5 py-4 hover:bg-slate-50/60 transition-colors group"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-sm font-semibold text-slate-800 group-hover:text-purple-700 transition-colors line-clamp-1">
                                            {strat.title}
                                        </h4>
                                        {strat.description && (
                                            <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                                                {strat.description}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-2 mt-2">
                                            {getStatusBadge(strat.status)}
                                            {strat.estimated_votes && strat.estimated_votes > 0 && (
                                                <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                                                    ~{strat.estimated_votes.toLocaleString("pt-BR")} votos
                                                </span>
                                            )}
                                            <span className="text-[10px] text-slate-400">
                                                {formatDistanceToNow(new Date(strat.created_at), { locale: ptBR, addSuffix: true })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
