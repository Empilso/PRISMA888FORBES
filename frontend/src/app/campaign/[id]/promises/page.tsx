"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
    CheckCircle,
    Clock,
    Warning,
    MagnifyingGlass,
    Scroll,
    Gavel,
    Globe,
    CurrencyDollar,
    TrendUp,
    ArrowCounterClockwise,
    ShieldCheck,
    ListChecks,
    SealCheck,
    Archive,
    Brain
} from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

// --- TYPES ---
interface PhaseStatus {
    id: string;
    phase: string;
    status: string;
    started_at: string;
    finished_at?: string;
    summary?: any;
    error_message?: string;
}

interface AllPhasesStatus {
    phase1: PhaseStatus | null;
    phase2: PhaseStatus | null;
    phase3: PhaseStatus | null;
    verify: PhaseStatus | null;
}

interface PromiseAudit {
    id: string;
    resumo_promessa: string;
    categoria: string;
    origem: string;
    status: string;
    justificativa_ia: string;
    score_similaridade: number;
    fontes: any[];
}

export default function RadarPremiumPage() {
    const params = useParams();
    const campaignId = params.id as string;
    const supabase = createClient();

    const [mandate, setMandate] = useState<any>(null);
    const [phases, setPhases] = useState<AllPhasesStatus>({
        phase1: null,
        phase2: null,
        phase3: null,
        verify: null
    });
    const [promises, setPromises] = useState<PromiseAudit[]>([]);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    // --- FETCHERS ---

    const fetchData = useCallback(async () => {
        try {
            // 1. Get Mandate
            const { data: mandateData } = await supabase
                .from("mandates")
                .select("*, politicians(name, role), cities(name, slug)")
                .eq("campaign_id", campaignId)
                .eq("is_active", true)
                .single();

            if (mandateData) {
                setMandate(mandateData);

                // 2. Get Phase Status
                const statusRes = await fetch(`${API_URL}/api/mandates/${mandateData.id}/phase-status`, {
                    headers: { 'ngrok-skip-browser-warning': 'true' }
                });
                if (statusRes.ok) {
                    const statusData = await statusRes.json();
                    setPhases(statusData);
                }

                // 3. Get Promises & Verifications
                const { data: promisesData } = await supabase
                    .from("promises")
                    .select("*, promise_verifications(*)")
                    .eq("mandate_id", mandateData.id)
                    .order("created_at", { ascending: false });

                if (promisesData) {
                    const mapped: PromiseAudit[] = promisesData.map(p => {
                        const ver = p.promise_verifications?.[0] || {};
                        return {
                            id: p.id,
                            resumo_promessa: p.resumo_promessa,
                            categoria: p.categoria,
                            origem: p.origem,
                            status: ver.status || "PENDENTE",
                            justificativa_ia: ver.justificativa_ia || "Aguardando análise do Juiz IA...",
                            score_similaridade: ver.score_similaridade || 0,
                            fontes: ver.fontes || []
                        };
                    });
                    setPromises(mapped);
                }
            }
        } catch (error) {
            console.error("Error fetching radar data:", error);
        } finally {
            setLoading(false);
        }
    }, [campaignId, API_URL]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Polling status
    useEffect(() => {
        const isAnyRunning = [phases.phase1, phases.phase2, phases.phase3].some(p => p?.status === 'running');
        if (isAnyRunning) {
            const interval = setInterval(fetchData, 5000);
            return () => clearInterval(interval);
        }
    }, [phases, fetchData]);

    // --- ACTIONS ---

    const triggerPhase = async (phaseNum: number) => {
        if (!mandate) return;
        setIsProcessing(`phase${phaseNum}`);
        try {
            const res = await fetch(`${API_URL}/api/campaigns/${campaignId}/radar/${mandate.id}/phase${phaseNum}`, {
                method: 'POST',
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            const data = await res.json();
            console.log(`Phase ${phaseNum} started:`, data);
            fetchData();
        } catch (error) {
            console.error(`Error triggering phase ${phaseNum}:`, error);
        } finally {
            setIsProcessing(null);
        }
    };

    // --- RENDER HELPERS ---

    const getStatusBadge = (status: string) => {
        switch (status.toUpperCase()) {
            case 'CUMPRIDA': return <Badge className="bg-emerald-500 hover:bg-emerald-600">Cumprida</Badge>;
            case 'EM_ANDAMENTO': return <Badge className="bg-amber-500 hover:bg-amber-600">Em Andamento</Badge>;
            case 'PARCIALMENTE_CUMPRIDA': case 'PARCIAL': return <Badge className="bg-blue-500 hover:bg-blue-600">Parcial</Badge>;
            case 'NAO_INICIADA': return <Badge variant="secondary">Não Iniciada</Badge>;
            case 'QUEBRADA': case 'FALÁCIA': return <Badge variant="destructive">Falácia / Quebrada</Badge>;
            default: return <Badge variant="outline">Pendente</Badge>;
        }
    };

    if (loading) {
        return (
            <div className="p-8 space-y-6">
                <Skeleton className="h-12 w-64" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Skeleton className="h-48 rounded-3xl" />
                    <Skeleton className="h-48 rounded-3xl" />
                    <Skeleton className="h-48 rounded-3xl" />
                </div>
                <Skeleton className="h-96 rounded-3xl" />
            </div>
        );
    }

    if (!mandate) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <Warning size={64} className="text-amber-500" weight="duotone" />
                <h1 className="text-2xl font-bold">Nenhum Mandato Encontrado</h1>
                <p className="text-slate-500">Certifique-se de que o candidato possui um mandato ativo configurado.</p>
                <Button onClick={() => fetchData()}>Tentar Novamente</Button>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in pb-20 px-4 sm:px-8 py-4 sm:py-8 overflow-y-auto">
            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-violet-600 border-violet-200 bg-violet-50">Enterprise 2.0</Badge>
                        <span className="text-sm font-medium text-slate-400">/ Radar de Promessas</span>
                    </div>
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                        O Juiz Eleitoral IA
                        <Gavel size={32} weight="duotone" className="text-violet-600" />
                    </h1>
                    <p className="text-slate-500 mt-2 max-w-2xl">
                        Auditoria 3D implacável: Cruzamento semântico entre Plano de Governo,
                        Gastos Reais (TCE) e Realidade (Mídia).
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="lg"
                        className="rounded-2xl gap-2 border-slate-200 hover:bg-slate-50"
                        onClick={fetchData}
                    >
                        <ArrowCounterClockwise size={20} />
                        Sincronizar
                    </Button>
                </div>
            </div>

            {/* --- WORKFLOW GRID --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* PHASE 1: EXTRACTION */}
                <Card className="rounded-[2rem] border-slate-100 shadow-sm overflow-hidden group hover:shadow-md transition-all">
                    <CardHeader className="pb-4">
                        <div className="flex justify-between items-start">
                            <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
                                <Scroll size={24} weight="duotone" />
                            </div>
                            {phases.phase1?.status === 'ok' ? (
                                <SealCheck size={24} weight="fill" className="text-emerald-500" />
                            ) : phases.phase1?.status === 'running' ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-violet-600 border-t-transparent" />
                            ) : null}
                        </div>
                        <CardTitle className="mt-4 text-xl">Fase 1: Extração</CardTitle>
                        <CardDescription>Mineração semântica do Plano de Governo Oficial (PDF).</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">Status:</span>
                            <span className={cn(
                                "font-bold",
                                phases.phase1?.status === 'ok' ? "text-emerald-600" :
                                    phases.phase1?.status === 'running' ? "text-amber-600" : "text-slate-400"
                            )}>
                                {phases.phase1?.status === 'ok' ? 'Concluída' :
                                    phases.phase1?.status === 'running' ? 'Processando...' : 'Pendente'}
                            </span>
                        </div>
                        <Button
                            className="w-full rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-none shadow-none"
                            disabled={phases.phase1?.status === 'running' || !!isProcessing}
                            onClick={() => triggerPhase(1)}
                        >
                            {phases.phase1?.status === 'ok' ? 'Refazer Extração' : 'Começar Extração'}
                        </Button>
                    </CardContent>
                </Card>

                {/* PHASE 2: FISCAL AUDIT */}
                <Card className="rounded-[2rem] border-slate-100 shadow-sm overflow-hidden group hover:shadow-md transition-all">
                    <CardHeader className="pb-4">
                        <div className="flex justify-between items-start">
                            <div className="p-3 rounded-2xl bg-violet-50 text-violet-600">
                                <CurrencyDollar size={24} weight="duotone" />
                            </div>
                            {phases.phase2?.status === 'ok' ? (
                                <SealCheck size={24} weight="fill" className="text-emerald-500" />
                            ) : phases.phase2?.status === 'running' ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-violet-600 border-t-transparent" />
                            ) : null}
                        </div>
                        <CardTitle className="mt-4 text-xl">Fase 2: Auditoria Fiscal</CardTitle>
                        <CardDescription>Cruzamento em tempo real com despesas do TCE-SP.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">Status:</span>
                            <span className={cn(
                                "font-bold",
                                phases.phase2?.status === 'ok' ? "text-emerald-600" :
                                    phases.phase2?.status === 'running' ? "text-amber-600" : "text-slate-400"
                            )}>
                                {phases.phase2?.status === 'ok' ? 'Concluída' :
                                    phases.phase2?.status === 'running' ? 'Analisando Gastos...' : 'Pendente'}
                            </span>
                        </div>
                        <Button
                            className="w-full rounded-xl bg-violet-50 text-violet-700 hover:bg-violet-100 border-none shadow-none"
                            disabled={phases.phase2?.status === 'running' || phases.phase1?.status !== 'ok' || !!isProcessing}
                            onClick={() => triggerPhase(2)}
                        >
                            {phases.phase2?.status === 'ok' ? 'Atualizar Auditoria' : 'Executar Auditoria'}
                        </Button>
                    </CardContent>
                </Card>

                {/* PHASE 3: MEDIA SCAN */}
                <Card className="rounded-[2rem] border-slate-100 shadow-sm overflow-hidden group hover:shadow-md transition-all">
                    <CardHeader className="pb-4">
                        <div className="flex justify-between items-start">
                            <div className="p-3 rounded-2xl bg-fuchsia-50 text-fuchsia-600">
                                <Globe size={24} weight="duotone" />
                            </div>
                            {phases.phase3?.status === 'ok' ? (
                                <SealCheck size={24} weight="fill" className="text-emerald-500" />
                            ) : phases.phase3?.status === 'running' ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-violet-600 border-t-transparent" />
                            ) : null}
                        </div>
                        <CardTitle className="mt-4 text-xl">Fase 3: Varredura Web</CardTitle>
                        <CardDescription>Busca de evidências reais em notícias e mídias.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">Status:</span>
                            <span className={cn(
                                "font-bold",
                                phases.phase3?.status === 'ok' ? "text-emerald-600" :
                                    phases.phase3?.status === 'running' ? "text-amber-600" : "text-slate-400"
                            )}>
                                {phases.phase3?.status === 'ok' ? 'Concluída' :
                                    phases.phase3?.status === 'running' ? 'Varrendo a Web...' : 'Pendente'}
                            </span>
                        </div>
                        <Button
                            className="w-full rounded-xl bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100 border-none shadow-none"
                            disabled={phases.phase3?.status === 'running' || !!isProcessing}
                            onClick={() => triggerPhase(3)}
                        >
                            {phases.phase3?.status === 'ok' ? 'Refazer Varredura' : 'Iniciar Varredura'}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* --- RESULTS SECTION --- */}
            <Card className="rounded-[2rem] border-slate-100 shadow-xl overflow-hidden shadow-violet-100/20">
                <CardHeader className="bg-slate-50 border-b border-slate-100 px-8 py-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                <ListChecks size={28} className="text-violet-600" weight="duotone" />
                                Lista de Auditoria
                            </CardTitle>
                            <CardDescription>Vereditos do Juiz IA baseados na triangulação de dados.</CardDescription>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-center px-4">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Promessas</div>
                                <div className="text-2xl font-black text-slate-800">{promises.length}</div>
                            </div>
                            <div className="h-8 w-px bg-slate-200" />
                            <div className="text-center px-4">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Cumpridas</div>
                                <div className="text-2xl font-black text-emerald-600">{promises.filter(p => p.status === 'cumprida').length}</div>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {promises.length === 0 ? (
                        <div className="p-20 flex flex-col items-center justify-center opacity-40">
                            <Archive size={64} weight="thin" />
                            <p className="mt-4 font-medium">Nenhuma promessa extraída ainda.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="hover:bg-transparent border-slate-100">
                                        <TableHead className="w-[450px] py-4 px-8 text-xs font-bold uppercase text-slate-500">Promessa & Categoria</TableHead>
                                        <TableHead className="text-xs font-bold uppercase text-slate-500">Veredito IA</TableHead>
                                        <TableHead className="text-xs font-bold uppercase text-slate-500">Confiança</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {promises.map((promise) => (
                                        <React.Fragment key={promise.id}>
                                            <TableRow className="transition-colors hover:bg-slate-50/50 border-slate-100">
                                                <TableCell className="py-5 px-8">
                                                    <div className="space-y-1">
                                                        <div className="font-semibold text-slate-800 leading-tight">
                                                            {promise.resumo_promessa}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className="text-[10px] font-bold uppercase border-slate-200 text-slate-500">
                                                                {promise.categoria}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {getStatusBadge(promise.status)}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Progress value={promise.score_similaridade * 100} className="h-2 w-16" />
                                                        <span className="text-xs font-mono text-slate-500">{(promise.score_similaridade * 100).toFixed(0)}%</span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                            <TableRow className="bg-slate-50/20 hover:bg-slate-50/20 border-slate-100">
                                                <TableCell colSpan={3} className="px-8 py-6">
                                                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                                                        <div className="flex items-start gap-4">
                                                            <div className="mt-1 p-2 rounded-xl bg-violet-50">
                                                                <Brain size={20} className="text-violet-600" weight="fill" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <h4 className="text-sm font-bold text-slate-900 mb-1">Justificativa do Juiz IA</h4>
                                                                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap italic">
                                                                    {promise.justificativa_ia}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {promise.fontes && promise.fontes.length > 0 && (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ml-12">
                                                                {promise.fontes.map((f, i) => (
                                                                    <div key={i} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-1">
                                                                        <div className="flex items-center justify-between">
                                                                            <Badge className="bg-white text-slate-600 border-slate-200 hover:bg-white text-[10px] py-0">EVIDÊNCIA</Badge>
                                                                            <span className="text-[10px] font-mono font-bold text-violet-600">{f.viability_score || "Auditado"}</span>
                                                                        </div>
                                                                        <p className="text-xs font-bold text-slate-900 mt-1">{f.estimated_cost || "Gasto Detectado"}</p>
                                                                        <p className="text-[10px] text-slate-500 line-clamp-2">
                                                                            {f.risk_factors?.join(", ") || "Sem riscos operacionais detectados."}
                                                                        </p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        </React.Fragment>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
