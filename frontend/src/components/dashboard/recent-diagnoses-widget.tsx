"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Lightbulb, FileText, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Diagnosis {
    id: string;
    title: string;
    description: string;
    created_at: string;
    pillar: string;
}

export function RecentDiagnosesWidget({ campaignId }: { campaignId: string }) {
    const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        async function fetchDiagnoses() {
            setLoading(true);
            const supabase = createClient();

            // Diagnósticos são essencialmente estratégias da fase de "Diagnóstico" (pre_campaign) 
            // ou logs de execução recentes. Vamos focar em estratégias recém criadas para mostrar "inteligência viva".
            const { data, error } = await supabase
                .from('strategies')
                .select('*')
                .eq('campaign_id', campaignId)
                // .eq('phase', 'pre_campaign') // Opcional: restringir a fase de diagnóstico
                .order('created_at', { ascending: false })
                .limit(3);

            if (error) {
                console.error("Erro ao buscar diagnósticos:", error);
            } else {
                setDiagnoses(data || []);
            }
            setLoading(false);
        }

        fetchDiagnoses();
    }, [campaignId]);

    return (
        <Card className="rounded-[2rem] border border-[var(--border-default)] shadow-sm bg-[var(--bg-secondary)] overflow-hidden h-full">
            <CardHeader className="border-b border-[var(--border-muted)] pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl font-bold text-[var(--text-primary)]">Diagnósticos Recentes</CardTitle>
                        <p className="text-xs text-[var(--text-secondary)] font-medium mt-1">
                            Análises geradas pelo Genesis Crew
                        </p>
                    </div>
                    <Button size="sm" className="bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] border-0">
                        <Lightbulb className="mr-2 h-4 w-4" /> Novo Report
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {loading ? (
                    <div className="p-8 flex justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-tertiary)]" />
                    </div>
                ) : diagnoses.length === 0 ? (
                    <div className="p-6 text-center text-[var(--text-tertiary)] text-sm">
                        Nenhum diagnóstico recente. A IA está aguardando inputs.
                    </div>
                ) : (
                    <div className="divide-y divide-[var(--border-muted)]">
                        {diagnoses.map((diag) => (
                            <div key={diag.id} className="p-4 hover:bg-[var(--bg-tertiary)] transition-colors flex items-center justify-between group cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20 text-purple-500">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-[var(--text-primary)] line-clamp-1 group-hover:text-purple-400 transition-colors">
                                            {diag.title}
                                        </p>
                                        <p className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1">
                                            Gerado há {formatDistanceToNow(new Date(diag.created_at), { locale: ptBR, addSuffix: false })}
                                            {diag.pillar && <span className="px-1 py-0.5 bg-[var(--bg-tertiary)] rounded text-[var(--text-tertiary)] font-bold">{diag.pillar}</span>}
                                        </p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" className="text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)]">
                                    <ChevronRight className="h-5 w-5" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
