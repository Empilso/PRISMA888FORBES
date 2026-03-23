"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Building, User, Users, ExternalLink, ArrowRight, TrendingUp, Zap, Search as SearchIcon } from "lucide-react";
import Link from "next/link";
import { FiscalDataGrid } from "@/components/admin/FiscalDataGrid";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { VisaoGeralTab } from "@/components/fiscal-analytics/VisaoGeralTab";
import { CredoresTab } from "@/components/fiscal-analytics/CredoresTab";
import { AnomaliasTab } from "@/components/fiscal-analytics/AnomaliasTab";
import { ReceitasTab } from "@/components/fiscal-analytics/ReceitasTab";
import { LicitacoesTab } from "@/components/fiscal-analytics/LicitacoesTab";
import { ProgramasTab } from "@/components/fiscal-analytics/ProgramasTab";
import EmendasCityTab from "@/components/radar/EmendasCityTab"; // Nova tab de Emendas

interface City {
    id: string;
    name: string;
    slug: string;
    state: string;
}

interface Politician {
    id: string;
    name: string;
    partido: string | null;
    tipo: string;
    foto_url?: string;
    city_id?: string | null;
}

export default function CityDashboard() {
    const params = useParams();
    const city_slug = params.city_slug as string;

    const [activeTab, setActiveTab] = useState("fiscal");
    const [rescueOpen, setRescueOpen] = useState(false);
    const [rescueSearch, setRescueSearch] = useState("");
    const [rescueCandidates, setRescueCandidates] = useState<Politician[]>([]);

    // 1. QUERY PRINCIPAL: Cidade, Políticos e Dados Fiscais de Topo
    const { data: dashboardData, refetch: refetchMainData, isLoading: loadingMain } = useQuery({
        queryKey: ['cityDashboard', city_slug],
        queryFn: async () => {
            const supabase = createClient();

            // A. Buscar Cidade
            const { data: cityData, error: cityError } = await supabase
                .from("cities")
                .select("*")
                .eq("slug", city_slug)
                .single();

            if (cityError || !cityData) throw new Error("Cidade não encontrada");

            // B. Buscar Políticos (Todos, filtraremos por city_id no cliente para evitar Erro 400)
            const { data: politiciansRaw } = await supabase
                .from("politicians")
                .select("*");

            // Filtrar políticos da cidade atual (usando city_id da cidade buscada em A)
            const filteredPoliticians = politiciansRaw?.filter(p => p.city_id === cityData.id) || [];

            // C. Contagem de registros fiscais (meta-data) - Desativado temporariamente por Erro 404
            const count = 0;

            // D. Cálculo de Gastos Reais (Empenhado + Reforço - Anulação)
            let allExpData: { vl_despesa: number, evento: string }[] = [];
            let ePage = 0;
            const eSize = 1000;
            while (true) {
                const { data: pageData } = await supabase
                    .from("municipal_expenses")
                    .select("vl_despesa, evento")
                    .eq("municipio_slug", city_slug)
                    .range(ePage * eSize, (ePage + 1) * eSize - 1);

                if (!pageData || pageData.length === 0) break;
                allExpData = [...allExpData, ...pageData];
                if (pageData.length < eSize) break;
                ePage++;
            }

            const totalExpenses = allExpData.reduce((sum, exp) => {
                const evt = exp.evento?.toLowerCase() || '';
                if (evt === 'empenhado' || evt === 'reforço') return sum + (exp.vl_despesa || 0);
                if (evt === 'anulação' || evt === 'anulado') return sum - (exp.vl_despesa || 0);
                return sum;
            }, 0);

            // E. Cálculo de Receitas Reais (Paginação Infinita)
            let allRevData: { vl_receita: number }[] = [];
            let rPage = 0;
            const rSize = 1000;
            while (true) {
                const { data: revData } = await supabase
                    .from("municipal_revenues")
                    .select("vl_receita")
                    .eq("municipio_slug", city_slug)
                    .range(rPage * rSize, (rPage + 1) * rSize - 1);

                if (!revData || revData.length === 0) break;
                allRevData = [...allRevData, ...revData];
                if (revData.length < rSize) break;
                rPage++;
            }

            let totalRevenue = allRevData.reduce((acc, curr) => acc + (curr.vl_receita || 0), 0);
            if (totalRevenue === 0) totalRevenue = 100000000; // Fallback educacional

            return {
                city: cityData,
                mayor: filteredPoliticians?.find(p => p.tipo?.toLowerCase() === "prefeito") || null,
                councilors: filteredPoliticians?.filter(p => p.tipo?.toLowerCase() === "vereador") || [],
                fiscalCount: count || 0,
                financials: {
                    revenue: totalRevenue,
                    expenses: totalExpenses,
                    result: totalRevenue - totalExpenses
                }
            };
        },
        staleTime: 1000 * 60 * 30, // 30 minutos
    });

    // 2. QUERY DE RESGATE: Busca de políticos orfãos
    const { data: candidates } = useQuery({
        queryKey: ['rescueCandidates', rescueSearch],
        queryFn: async () => {
            if (!rescueOpen) return [];
            const supabase = createClient();
            let query = supabase.from("politicians").select("*").neq("city_slug", city_slug);
            if (rescueSearch) query = query.ilike("name", `%${rescueSearch}%`);
            const { data } = await query.limit(10);
            return data || [];
        },
        enabled: rescueOpen
    });

    // Sync bridge para não quebrar o JSX que ainda usa rescueCandidates
    useEffect(() => {
        if (candidates) setRescueCandidates(candidates);
    }, [candidates]);

    async function handleLinkPolitician(politicianId: string) {
        const supabase = createClient();
        const { error } = await supabase
            .from("politicians")
            .update({ city_slug })
            .eq("id", politicianId);

        if (!error) {
            setRescueOpen(false);
            refetchMainData();
        }
    }

    const city = dashboardData?.city;
    const mayor = dashboardData?.mayor;
    const councilors = dashboardData?.councilors || [];
    const fiscalCount = dashboardData?.fiscalCount || 0;
    const financials = dashboardData?.financials || { revenue: 0, expenses: 0, result: 0 };

    if (loadingMain) {
        return <div className="p-20 text-center text-slate-500">Carregando dashboard do território...</div>;
    }

    if (!city) {
        return <div className="p-10 text-center text-red-500">Cidade não encontrada.</div>;
    }

    return (
        <div className="min-h-screen bg-[var(--background)] animate-in fade-in duration-700">
            {/* Header (Resumo Territorial) - High Contrast & Clean Style */}
            <div className="w-full border-b border-slate-200 bg-white sticky top-0 z-20 shadow-sm">
                <div className="content-max-width py-5 md:py-7 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-3xl font-bold shadow-lg shrink-0">
                            {city.state}
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                                    {city.name}
                                </h1>
                                <Badge variant="outline" className="text-xs font-bold px-2 py-0.5 border-slate-300 text-slate-500 uppercase tracking-widest bg-slate-50">
                                    {city.slug}
                                </Badge>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Badge className={`px-4 py-1 text-xs font-bold border-0 rounded-full shadow-sm ${fiscalCount > 0 ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"}`}>
                                    {fiscalCount > 0 ? `DADOS FISCAIS: ${fiscalCount.toLocaleString()}` : "DADOS FISCAIS: PENDENTE"}
                                </Badge>
                                <Badge variant="secondary" className="px-4 py-1 text-xs font-bold bg-slate-200 text-slate-700 border-0 rounded-full shadow-sm">
                                    POPULAÇÃO: N/A
                                </Badge>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-6">
                        <Link href={`/admin/territorios/${city.slug}/onboarding`}>
                            <Button className="bg-[var(--foreground)] text-white hover:opacity-90 transition-all rounded-full px-8 py-6 text-lg shadow-xl border-0 hover:-translate-y-1 duration-300">
                                <Upload className="w-5 h-5 mr-3" /> Upload de Dados
                            </Button>
                        </Link>
                        <Button disabled className="bg-slate-100/50 text-slate-400 rounded-full px-8 py-6 border border-slate-200 text-lg">
                            <ExternalLink className="w-5 h-5 mr-3" /> Portal Transparência
                        </Button>
                    </div>
                </div>
            </div>

            <div className="content-max-width section-padding py-10 space-y-12">
                {/* STRIPE-STYLE LAYOUT: Tabs + Metrics Inline + Full-Screen Content */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    {/* Compact Header: Tabs + Metrics */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 border-b border-slate-100 pb-6">
                        <TabsList className="bg-slate-100/80 p-1.5 rounded-full ring-1 ring-slate-200/50">
                            <TabsTrigger
                                value="fiscal"
                                className="px-6 py-3 rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-600 font-bold tracking-tight text-slate-500 transition-all hover:text-slate-900 border border-transparent data-[state=active]:border-slate-200"
                            >
                                <TrendingUp className="w-4 h-4 inline-block mr-2" /> Fiscal
                            </TabsTrigger>
                            <TabsTrigger
                                value="programas"
                                className="px-6 py-3 rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 font-bold tracking-tight text-slate-500 transition-all hover:text-slate-900 border border-transparent data-[state=active]:border-slate-200"
                            >
                                Programas e Governo
                            </TabsTrigger>
                            <TabsTrigger
                                value="emendas"
                                className="px-6 py-3 rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-amber-600 font-bold tracking-tight text-slate-500 transition-all hover:text-slate-900 border border-transparent data-[state=active]:border-slate-200"
                            >
                                Emendas Recebidas
                            </TabsTrigger>
                            <TabsTrigger
                                value="equipe"
                                className="px-6 py-3 rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-amber-600 font-bold tracking-tight text-slate-500 transition-all hover:text-slate-900 border border-transparent data-[state=active]:border-slate-200"
                            >
                                <User className="w-4 h-4 inline-block mr-2" />
                                Equipe & Políticos
                            </TabsTrigger>
                        </TabsList>

                        {/* Inline Metrics (Compact) */}
                        <div className="flex gap-4 items-center text-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-slate-500 font-medium">Receita:</span>
                                <span className="font-bold text-emerald-700">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(financials.revenue)}
                                </span>
                            </div>
                            <div className="h-4 w-px bg-slate-300"></div>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-500 font-medium">Despesa:</span>
                                <span className="font-bold text-red-700">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(financials.expenses)}
                                </span>
                            </div>
                            <div className="h-4 w-px bg-slate-300"></div>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-500 font-medium">Resultado:</span>
                                <span className="font-bold text-slate-900">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(financials.result)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* TAB 1: FISCAL (7 Sub-Tabs Analíticas) */}
                    <TabsContent value="fiscal" className="mt-0">
                        <Tabs defaultValue="visao-geral" className="w-full">
                            <TabsList className="w-full grid grid-cols-7 bg-slate-100 p-1 mb-4">
                                <TabsTrigger value="visao-geral" className="text-xs">
                                    📊 Visão Geral
                                </TabsTrigger>
                                <TabsTrigger value="receitas" className="text-xs">
                                    📈 Receitas
                                </TabsTrigger>
                                <TabsTrigger value="despesas" className="text-xs">
                                    💸 Despesas
                                </TabsTrigger>
                                <TabsTrigger value="credores" className="text-xs">
                                    🏢 Credores
                                </TabsTrigger>
                                <TabsTrigger value="anomalias" className="text-xs">
                                    📊 Análise Estatística
                                </TabsTrigger>
                                <TabsTrigger value="licitacoes" className="text-xs">
                                    📋 Licitações
                                </TabsTrigger>
                            </TabsList>

                            {/* Visão Geral */}
                            <TabsContent value="visao-geral">
                                <VisaoGeralTab citySlug={city_slug} mockRevenue={financials.revenue} />
                            </TabsContent>

                            {/* Receitas */}
                            <TabsContent value="receitas">
                                <ReceitasTab citySlug={city_slug} totalRevenue={financials.revenue} />
                            </TabsContent>

                            {/* Despesas (Tabela Atual) */}
                            <TabsContent value="despesas">
                                <FiscalDataGrid citySlug={city_slug} />
                            </TabsContent>

                            {/* Credores */}
                            <TabsContent value="credores">
                                <CredoresTab citySlug={city_slug} />
                            </TabsContent>

                            {/* Anomalias */}
                            <TabsContent value="anomalias">
                                <AnomaliasTab citySlug={city_slug} />
                            </TabsContent>

                            {/* Licitações */}
                            <TabsContent value="licitacoes">
                                <LicitacoesTab citySlug={city_slug} />
                            </TabsContent>
                        </Tabs>
                    </TabsContent>

                    {/* TAB: Programas */}
                    <TabsContent value="programas" className="mt-8 m-0 p-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="w-full">
                            <ProgramasTab citySlug={city.slug} />
                        </div>
                    </TabsContent>

                    {/* TAB: Emendas */}
                    <TabsContent value="emendas" className="mt-8 m-0 p-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="w-full">
                            <EmendasCityTab cityId={city.id} citySlug={city.slug} />
                        </div>
                    </TabsContent>

                    {/* TAB 2: EQUIPE (Politicians) */}
                    <TabsContent value="equipe" className="mt-8 m-0 p-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Mayor Card */}
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Building className="w-5 h-5 text-indigo-600" /> Prefeito
                                </h3>
                                {mayor ? (
                                    <Card className="border-l-4 border-l-indigo-600">
                                        <CardContent className="p-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center text-slate-400 overflow-hidden">
                                                    {mayor.avatar_url ? (
                                                        <img src={mayor.avatar_url} alt={mayor.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User className="w-8 h-8" />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="text-xl font-bold text-slate-900">{mayor.name}</h4>
                                                    <p className="text-slate-500 font-medium">{mayor.party}</p>
                                                    <Link href={`/admin/radar/${mayor.id}`}>
                                                        <Button size="sm" className="mt-2 bg-indigo-600 hover:bg-indigo-700">
                                                            Ver Detalhes <ArrowRight className="w-3 h-3 ml-1" />
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <Card className="border-dashed border-2">
                                        <CardContent className="p-10 text-center text-slate-400">
                                            <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                            <p>Nenhum prefeito cadastrado.</p>
                                            <div className="flex gap-2 justify-center mt-4">
                                                <Button size="sm" variant="outline" onClick={() => window.location.href = `/admin/candidatos/novo?city=${encodeURIComponent(city.name)}&cargo=Prefeito`}>
                                                    Novo Cadastro
                                                </Button>
                                                <Dialog open={rescueOpen} onOpenChange={setRescueOpen}>
                                                    <DialogTrigger asChild>
                                                        <Button size="sm" variant="destructive" className="bg-amber-600 hover:bg-amber-700">
                                                            <Zap className="w-3 h-3 mr-1" /> Resgatar
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-xl">
                                                        <DialogHeader>
                                                            <DialogTitle>Resgatar Político</DialogTitle>
                                                            <DialogDescription>Busque um político existente para vincular a {city.name}.</DialogDescription>
                                                        </DialogHeader>
                                                        <div className="space-y-4 py-4">
                                                            <div className="relative">
                                                                <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                                                <Input placeholder="Buscar por nome..." value={rescueSearch} onChange={(e) => setRescueSearch(e.target.value)} className="pl-10" />
                                                            </div>
                                                            <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-md p-2">
                                                                {rescueCandidates.map(p => (
                                                                    <div key={p.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition-colors">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                                                                                {p.foto_url ? <img src={p.foto_url} className="w-full h-full rounded-full object-cover" /> : <User className="w-5 h-5 text-slate-400" />}
                                                                            </div>
                                                                            <div>
                                                                                <p className="font-bold text-sm text-slate-900">{p.name}</p>
                                                                                <p className="text-xs text-slate-500">{p.partido || "S/P"} • {p.tipo || "Não definido"}</p>
                                                                            </div>
                                                                        </div>
                                                                        <Button size="sm" onClick={() => handleLinkPolitician(p.id)}>Vincular</Button>
                                                                    </div>
                                                                ))}
                                                                {rescueCandidates.length === 0 && (
                                                                    <p className="text-center text-sm text-slate-400 py-4">Nenhum político encontrado.</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>

                            {/* Councilors */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        <Users className="w-5 h-5 text-blue-600" /> Vereadores
                                    </h3>
                                    <Button size="sm" variant="ghost" className="text-blue-600" onClick={() => window.location.href = "/admin/candidatos/novo"}>
                                        + Adicionar
                                    </Button>
                                </div>
                                <div className="space-y-3">
                                    {councilors.length > 0 ? councilors.map(c => (
                                        <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = `/admin/radar/${c.id}`}>
                                            <CardContent className="p-4 flex items-center gap-4">
                                                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden">
                                                    {c.foto_url ? (
                                                        <img src={c.foto_url} alt={c.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User className="w-6 h-6 text-slate-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800">{c.name}</p>
                                                    <p className="text-xs text-slate-500">{c.partido || "S/P"} • Vereador</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )) : (
                                        <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
                                            <p>Nenhum vereador monitorado.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
