
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { StatsCard } from "@/components/dashboard/stats-card";
import { CandidatesGrid } from "@/components/organization/CandidatesGrid";
import dynamic from "next/dynamic";
import {
    Users,
    Target,
    Trophy,
    ChartLineUp,
    Plus,
    GearSix,
    MapTrifold,
    ShieldCheck,
    ListChecks
} from "@phosphor-icons/react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// Importação dinâmica do Mapa
const ElectoralMapFull = dynamic(() => import("@/components/dashboard/map-component"), {
    ssr: false,
    loading: () => <div className="h-[400px] w-full bg-slate-100 animate-pulse rounded-3xl flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-xs">Sincronizando Satélites...</div>
});

interface Analytics {
    total_campaigns: number;
    total_tasks: number;
    completed_tasks: number;
    total_strategies: number;
    total_estimated_votes: number;
}

import { createClient } from "@/lib/supabase/client";

// ... (imports permanecem)

export default function CommanderCockpit() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchWarRoomData() {
            try {
                const supabase = createClient();
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;

                // Headers comuns para auth
                const headers = token ? { "Authorization": `Bearer ${token}` } : {};

                const [analyticsRes, campaignsRes] = await Promise.all([
                    fetch(`/api/organizations/${slug}/analytics`, { headers }),
                    fetch(`/api/organizations/${slug}/campaigns`, { headers })
                ]);

                if (analyticsRes.ok && campaignsRes.ok) {
                    const aData = await analyticsRes.json();
                    const cData = await campaignsRes.json();
                    setAnalytics(aData);
                    setCampaigns(cData.map((c: any, i: number) => ({
                        ...c,
                        city: "Interior de SP",
                        ia_status: i % 2 === 0 ? "analisando" : "concluido"
                    })));
                } else {
                    console.error("Falha ao buscar dados do War Room", analyticsRes.status, campaignsRes.status);
                }
            } catch (error) {
                console.error("Erro ao carregar War Room:", error);
            } finally {
                setLoading(false);
            }
        }

        if (slug) fetchWarRoomData();
    }, [slug]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#f8fafc]">
                <div className="text-center space-y-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" strokeWidth={3} />
                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">Criptografando Canal de Comando...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* 1. TOP NAVIGATION / ORG STATUS (Mirror Admin Styling) */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 transform -rotate-3">
                            <ShieldCheck size={28} weight="fill" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Ambiente de Organização</span>
                                <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[9px] font-bold h-4">MULTI-TENANT V2</Badge>
                            </div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none mt-1">
                                {slug.replace('-', ' ').toUpperCase()} <span className="text-primary">WAR ROOM</span>
                            </h1>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => router.push(`/organization/${slug}/config`)}
                        className="rounded-2xl h-12 px-6 border-slate-200 bg-white shadow-sm hover:bg-slate-50 font-bold text-slate-600 gap-2 transition-all hover:scale-105"
                    >
                        <GearSix size={20} weight="bold" />
                        Configurar Branding
                    </Button>
                </div>
            </div>

            {/* 2. STATS CARDS (Mirror Admin Hierarchy) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                    title="Candidatos Ativos"
                    value={analytics?.total_campaigns || 0}
                    icon={Users}
                    trend="Gestão Global"
                    description="Total de campanhas na base"
                />
                <StatsCard
                    title="Meta de Votos"
                    value={(analytics?.total_estimated_votes || 0).toLocaleString()}
                    icon={Trophy}
                    trend="Estimativa IA"
                    variant="primary"
                />
                <StatsCard
                    title="Insights Gerados"
                    value={analytics?.total_strategies || 0}
                    icon={Target}
                    description="Estratégias otimizadas"
                />
                <StatsCard
                    title="Performance"
                    value={`${analytics?.total_tasks ? Math.round((analytics.completed_tasks / analytics.total_tasks) * 100) : 0}%`}
                    icon={ChartLineUp}
                    trend="Eficiência operacional"
                />
            </div>

            {/* 3. TACTICAL CENTER (Map & Metrics) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Tactical Map (Take 2/3 of space) */}
                <Card className="lg:col-span-2 border-none shadow-2xl shadow-slate-200/50 rounded-[2.5rem] bg-white overflow-hidden p-2">
                    <CardHeader className="p-6 pb-2 absolute top-2 left-2 z-10">
                        <div className="bg-white/80 backdrop-blur-xl border border-slate-100 p-4 rounded-3xl shadow-xl">
                            <CardTitle className="text-sm font-black flex items-center gap-2 text-slate-900">
                                <MapTrifold size={20} weight="fill" className="text-primary" />
                                SATURAÇÃO TERRITORIAL DA FROTA
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <div className="h-[500px] w-full rounded-[2rem] overflow-hidden">
                        <ElectoralMapFull campaigns={campaigns} />
                    </div>
                </Card>

                {/* Performance Radar */}
                <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-[2.5rem] bg-white p-8 space-y-8 flex flex-col justify-center">
                    <div>
                        <Badge variant="outline" className="mb-2 text-[9px] font-black border-primary/20 text-primary">SISTEMA INTEGRADO</Badge>
                        <h3 className="text-2xl font-black text-slate-900 leading-tight">Métricas de Saúde do Partido</h3>
                        <p className="text-sm text-slate-500 font-medium mt-2">Visão agregada de engajamento e conclusão de tarefas em toda a organização.</p>
                    </div>

                    <div className="space-y-6">
                        {[
                            { label: "Mobilização de Rua", value: 78, color: "bg-blue-500" },
                            { label: "Presença Digital", value: 92, color: "bg-primary" },
                            { label: "Execução de Metas", value: 64, color: "bg-emerald-500" }
                        ].map((item, idx) => (
                            <div key={idx} className="space-y-2">
                                <div className="flex justify-between text-xs font-black text-slate-700 uppercase">
                                    <span>{item.label}</span>
                                    <span>{item.value}%</span>
                                </div>
                                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${item.color} rounded-full transition-all duration-1000 delay-300`}
                                        style={{ width: `${item.value}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <Button className="w-full h-14 rounded-2xl bg-slate-50 border-none text-slate-900 font-black hover:bg-slate-100 transition-all gap-2">
                        <ListChecks size={20} weight="bold" />
                        Ver Relatório Completo
                    </Button>
                </Card>
            </div>

            {/* 4. FLEET GRID (War Room Cards) */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                        <div className="w-1.5 h-8 bg-primary rounded-full" />
                        Ativos em Operação
                    </h2>
                    <Badge variant="outline" className="rounded-full font-bold px-4">{campaigns.length} CANDIDATOS</Badge>
                </div>
                <CandidatesGrid campaigns={campaigns} />
            </div>
        </div>
    );
}
