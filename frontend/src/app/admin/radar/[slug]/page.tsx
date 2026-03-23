"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, LayoutDashboard, Receipt, MapPin, Search as SearchIcon, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { createDadosClient } from "@/lib/supabase/dados";
import VisaoGeralTab from "@/components/radar/politician/VisaoGeralTab";
import PorAnoTab from "@/components/radar/politician/PorAnoTab";
import PorCidadeTab from "@/components/radar/politician/PorCidadeTab";
import TabelaCompletaTab from "@/components/radar/politician/TabelaCompletaTab";
import RastreabilidadeTab from "@/components/radar/politician/RastreabilidadeTab";
import VerbasIndenizatoriasTab from "@/components/radar/politician/VerbasIndenizatoriasTab";
import ProducaoLegislativaTab from "@/components/radar/politician/ProducaoLegislativaTab";
import FrequenciaComissoesTab from "@/components/radar/politician/FrequenciaComissoesTab";
import { EmendasEstaduaisTab } from "@/components/radar/tabs/EmendasEstaduaisTab";

export default function RadarPoliticoPage() {
    const params = useParams();
    const politicoSlug = params.slug as string;

    const [activeTab, setActiveTab] = useState("visao-geral");

    // Fetch Base Data (Politician info)
    const { data: politician, isLoading } = useQuery({
        queryKey: ["politicianData", politicoSlug],
        queryFn: async () => {
            const supabase = createClient();
            const dadosPrisma = createDadosClient();

            // 1. Tentar buscar no SAAS (politicians) por slug
            let { data, error } = await supabase
                .from("politicians")
                .select("*, cities:city_id(name, state)")
                .eq("slug", politicoSlug)
                .single();

            // 2. Fallback SAAS por ID
            if (error || !data) {
                const res = await supabase
                    .from("politicians")
                    .select("*, cities:city_id(name, state)")
                    .eq("id", politicoSlug)
                    .single();
                data = res.data;
            }

            // 3. Enriquecimento DADOS-PRISMA (ALBA) por Nome (Casos como Bobô que já estão no SAAS)
            if (data && !data.parlamentar_id) {
                const { data: albaListData } = await dadosPrisma
                    .from("politicos_alba")
                    .select("parlamentar_id, nome, partido, foto_url, municipio_base");

                if (albaListData) {
                    const clean = (n: string) => (n || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                    const nameToMatch = clean(data.name);
                    const foundAlba = albaListData.find(d => clean(d.nome) === nameToMatch || nameToMatch.includes(clean(d.nome)) || clean(d.nome).includes(nameToMatch));

                    if (foundAlba) {
                        data.parlamentar_id = foundAlba.parlamentar_id;
                        data.is_alba = true;
                        if (!data.foto_url) data.foto_url = foundAlba.foto_url;
                    }
                }
            }

            // 4. Fallback DADOS-PRISMA (ALBA) - Navegação direta por slug novo
            if (!data) {
                const { data: albaData } = await dadosPrisma
                    .from("politicos_alba")
                    .select("*");

                if (albaData) {
                    const generateSlug = (n: string) => n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").trim();
                    const found = albaData.find(d => `${generateSlug(d.nome)}-deputado-ba` === politicoSlug);

                    if (found) {
                        return {
                            id: found.parlamentar_id,
                            name: found.nome,
                            partido: found.partido,
                            foto_url: found.foto_url,
                            tipo: "Deputado Estadual",
                            parlamentar_id: found.parlamentar_id,
                            municipio_base: found.municipio_base,
                            is_alba: true
                        };
                    }
                }
            }

            if (!data) throw new Error("Político não encontrado");
            return data;
        },
        staleTime: 1000 * 60 * 30, // 30 minutes
    });

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center text-slate-400 bg-[var(--background)]">Carregando Radar do Político...</div>;
    }

    if (!politician) {
        return <div className="p-10 text-center text-red-500 bg-[var(--background)]">Político não encontrado no Radar.</div>;
    }

    const getInitials = (name: string) => name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

    return (
        <div className="min-h-screen bg-[var(--background)] animate-in fade-in duration-700 pb-20">
            {/* Header (Radar Político) - High Contrast & Clean Style - PADRÃO CIDADE */}
            <div className="w-full border-b border-slate-200 bg-white sticky top-0 z-20 shadow-sm">
                <div className="content-max-width py-5 md:py-7 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-3xl font-bold shadow-lg shrink-0 overflow-hidden">
                            {politician.foto_url ? (
                                <img src={politician.foto_url} alt={politician.name} className="w-full h-full object-cover" />
                            ) : (
                                getInitials(politician.name)
                            )}
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                                    {politician.name}
                                </h1>
                                <Badge variant="outline" className="text-xs font-bold px-2 py-0.5 border-slate-300 text-slate-500 uppercase tracking-widest bg-slate-50">
                                    {politician.tipo || 'Político'}
                                </Badge>
                                {politician.partido && (
                                    <Badge variant="outline" className="text-xs font-bold px-2 py-0.5 border-indigo-200 text-indigo-700 uppercase tracking-widest bg-indigo-50">
                                        {politician.partido}
                                    </Badge>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2 items-center">
                                {politician.cities && !['DEPUTADO ESTADUAL', 'DEPUTADO FEDERAL', 'SENADOR'].includes(politician.tipo?.toUpperCase()) && (
                                    <span className="flex items-center gap-1 text-sm font-semibold text-slate-500 mr-2">
                                        <MapPin className="w-4 h-4 text-slate-400" />
                                        {politician.cities.name} - {politician.cities.state}
                                    </span>
                                )}
                                <Badge className="px-4 py-1 text-xs font-bold border-0 rounded-full shadow-sm bg-emerald-600 text-white">
                                    RADAR ATIVO
                                </Badge>
                                <Badge variant="secondary" className="px-4 py-1 text-xs font-bold bg-slate-200 text-slate-700 border-0 rounded-full shadow-sm">
                                    {politician.campaign_id ? 'PROMESSSAS MAPEADAS' : 'SEM PLANO DE GOVERNO'}
                                </Badge>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <Link href="/admin/territorios">
                            <Button variant="outline" className="bg-white text-slate-600 hover:text-slate-900 rounded-full px-6 py-6 border-slate-200 text-base shadow-sm font-semibold">
                                <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            <div className="content-max-width section-padding py-10 space-y-12">
                {/* STRIPE-STYLE LAYOUT: Tabs Inline + Full-Screen Content */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    {/* Compact Header: Tabs */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 border-b border-slate-100 pb-6">
                        <TabsList className="bg-slate-100/80 p-1.5 rounded-full ring-1 ring-slate-200/50">
                            {politician.campaign_id && (
                                <TabsTrigger
                                    value="promessas"
                                    className="px-6 py-3 rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 font-bold tracking-tight text-slate-500 transition-all hover:text-slate-900 border border-transparent data-[state=active]:border-slate-200"
                                >
                                    <LayoutDashboard className="w-4 h-4 inline-block mr-2" /> Radar de Promessas
                                </TabsTrigger>
                            )}
                            {politician.parlamentar_id && (
                                <>
                                    <TabsTrigger
                                        value="producao"
                                        className="px-6 py-3 rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-bold tracking-tight text-slate-500 transition-all hover:text-slate-900 border border-transparent data-[state=active]:border-slate-200"
                                    >
                                        📑 Produção Legislativa
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="atividade"
                                        className="px-6 py-3 rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-purple-600 font-bold tracking-tight text-slate-500 transition-all hover:text-slate-900 border border-transparent data-[state=active]:border-slate-200"
                                    >
                                        🏛️ Atividade Parlamentar
                                    </TabsTrigger>
                                </>
                            )}
                            <TabsTrigger
                                value="visao-geral"
                                className="px-6 py-3 rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-amber-600 font-bold tracking-tight text-slate-500 transition-all hover:text-slate-900 border border-transparent data-[state=active]:border-slate-200"
                            >
                                <Receipt className="w-4 h-4 inline-block mr-2" /> Visão Geral
                            </TabsTrigger>
                            <TabsTrigger
                                value="por-ano"
                                className="px-6 py-3 rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-amber-600 font-bold tracking-tight text-slate-500 transition-all hover:text-slate-900 border border-transparent data-[state=active]:border-slate-200"
                            >
                                Por Ano
                            </TabsTrigger>
                            <TabsTrigger
                                value="por-cidade"
                                className="px-6 py-3 rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-amber-600 font-bold tracking-tight text-slate-500 transition-all hover:text-slate-900 border border-transparent data-[state=active]:border-slate-200"
                            >
                                Por Cidade
                            </TabsTrigger>
                            <TabsTrigger
                                value="tabela-completa"
                                className="px-6 py-3 rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-amber-600 font-bold tracking-tight text-slate-500 transition-all hover:text-slate-900 border border-transparent data-[state=active]:border-slate-200"
                            >
                                Tabela Completa
                            </TabsTrigger>
                            <TabsTrigger
                                value="rastreabilidade"
                                className="px-6 py-3 rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 font-bold tracking-tight text-slate-500 transition-all hover:text-slate-900 border border-transparent data-[state=active]:border-slate-200"
                            >
                                <ShieldCheck className="w-4 h-4 inline-block mr-2" /> Rastreabilidade
                            </TabsTrigger>
                            <TabsTrigger
                                value="emendas"
                                className="px-6 py-3 rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 font-bold tracking-tight text-slate-500 transition-all hover:text-slate-900 border border-transparent data-[state=active]:border-slate-200"
                            >
                                🏛️ Emendas Estaduais
                            </TabsTrigger>
                            <TabsTrigger
                                value="verbas"
                                className="px-6 py-3 rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-600 font-bold tracking-tight text-slate-500 transition-all hover:text-slate-900 border border-transparent data-[state=active]:border-slate-200"
                            >
                                💰 Verbas de Gabinete
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* ABAS COM ANIMATION */}
                    {politician.parlamentar_id && (
                        <>
                            <TabsContent value="producao" className="mt-8 m-0 p-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <ProducaoLegislativaTab parlamentar_id={politician.parlamentar_id} />
                            </TabsContent>
                            <TabsContent value="atividade" className="mt-8 m-0 p-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <FrequenciaComissoesTab parlamentar_id={politician.parlamentar_id} />
                            </TabsContent>
                        </>
                    )}

                    <TabsContent value="visao-geral" className="mt-8 m-0 p-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <VisaoGeralTab
                            politicianId={politician.id}
                            biografia={politician.biografia}
                            email={politician.email}
                            nome={politician.name}
                        />
                    </TabsContent>

                    <TabsContent value="por-ano" className="mt-8 m-0 p-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <PorAnoTab politicianId={politician.id} />
                    </TabsContent>

                    <TabsContent value="por-cidade" className="mt-8 m-0 p-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <PorCidadeTab politicianId={politician.id} />
                    </TabsContent>

                    <TabsContent value="tabela-completa" className="mt-8 m-0 p-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <TabelaCompletaTab politicianId={politician.id} />
                    </TabsContent>

                    <TabsContent value="rastreabilidade" className="mt-8 m-0 p-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <RastreabilidadeTab politicianId={politician.id} />
                    </TabsContent>

                    <TabsContent value="verbas" className="mt-8 m-0 p-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <VerbasIndenizatoriasTab
                            politicianName={politician.name.toUpperCase()}
                            parlamentar_id={politician.parlamentar_id}
                        />
                    </TabsContent>

                    <TabsContent value="emendas" className="mt-8 m-0 p-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <EmendasEstaduaisTab politicianName={politician.name} />
                    </TabsContent>

                    {/* Placeholder Temporário para Promessas que será refatorado futuramente */}
                    <TabsContent value="promessas" className="mt-8 m-0 p-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500 text-center py-20 bg-white border rounded-3xl">
                        <LayoutDashboard className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-700">Radar de Promessas</h3>
                        <p className="text-slate-500 max-w-lg mx-auto mt-2">O módulo de promessas de campanhas atreladas a este político foi movido temporariamente para refatoração. Acesse pelos atalhos diretos na tela principal.</p>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

