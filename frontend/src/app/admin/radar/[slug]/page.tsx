"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { dadosClient } from "@/lib/supabase/dados";
import {
    DatabaseBackup, ArrowLeft, MapPin, Star, MoreHorizontal
} from "lucide-react";

import VisaoGeralTab from "@/components/radar/politician/VisaoGeralTab";
import VerbasIndenizatoriasTab from "@/components/radar/politician/VerbasIndenizatoriasTab";
import { EmendasBaPainelTab, EmendasBaDadosTab } from "@/components/radar/tabs/EmendasBaTabs";
import {
    SeplanLoaTab, CeapCamaraTab, SenadoTab, PortalFederalTab,
    EmpresasRfTab, TcmBaTab, RastreabilidadeTabNew
} from "@/components/radar/tabs/AllPortalTabs";

const RADAR_TABS = [
    { id: "visao-geral",     icon: "🏠", label: "Visão Geral",        color: "text-blue-500",    border: "border-blue-500",    hasData: true,  hasAlert: false },
    { id: "verbas-old",      icon: "🏗️", label: "Verbas Gabinete",   color: "text-orange-500",  border: "border-orange-500",  hasData: true,  hasAlert: false },
    { id: "emendas-painel",  icon: "📊", label: "Emendas BA Painel", color: "text-green-500",   border: "border-green-500",   hasData: true,  hasAlert: false },
    { id: "emendas-dados",   icon: "📦", label: "Emendas BA Dados",  color: "text-emerald-500", border: "border-emerald-500", hasData: true,  hasAlert: false },
    { id: "seplan-loa",      icon: "📄", label: "SEPLAN LOA",        color: "text-teal-500",    border: "border-teal-500",    hasData: false, hasAlert: false },
    { id: "ceap-camara",     icon: "🏗️", label: "CEAP Câmara",      color: "text-violet-500",  border: "border-violet-500",  hasData: false, hasAlert: false },
    { id: "senado",          icon: "🎤", label: "Senado",            color: "text-purple-500",  border: "border-purple-500",  hasData: false, hasAlert: false },
    { id: "portal-federal",  icon: "🇬🇧", label: "Portal Federal",  color: "text-indigo-500",  border: "border-indigo-500",  hasData: false, hasAlert: false },
    { id: "empresas-rf",     icon: "🏢", label: "Empresas RF",       color: "text-yellow-500",  border: "border-yellow-500",  hasData: false, hasAlert: true  },
    { id: "tcm-ba",          icon: "⚖️", label: "TCM-BA",           color: "text-red-500",     border: "border-red-500",     hasData: false, hasAlert: true  },
    { id: "rastreabilidade", icon: "🔗", label: "Rastreabilidade",   color: "text-gray-500",    border: "border-gray-500",    hasData: false, hasAlert: true  },
];

function EmptyStateFallback({ tabName }: { tabName: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-slate-200 rounded-[28px] bg-white shadow-sm mt-4 w-full max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500">
            <DatabaseBackup className="w-16 h-16 text-slate-200 mb-6" strokeWidth={1} />
            <h3 className="text-[22px] font-bold text-slate-900 tracking-tight">Dados ainda não coletados</h3>
            <p className="text-slate-400 mt-2 text-[15px] font-medium">Fonte: {tabName}</p>
            <button className="mt-8 px-6 py-2.5 rounded-full font-bold text-[14px] bg-white ring-1 ring-slate-200 transition-all shadow-sm hover:shadow-md hover:bg-slate-50 text-slate-600">
                Coletar Agora →
            </button>
        </div>
    );
}

function TabContent({ activeTab, politician, onNavigateToTab, slug, verbasSummary, albaData }: {
    activeTab: string; politician: any; onNavigateToTab: (id: string) => void;
    slug: string; verbasSummary?: any; albaData?: any;
}) {
    switch (activeTab) {
        case "visao-geral":    return <VisaoGeralTab politicianId={politician.id} nome={politician.name} biografia={politician.biografia} email={politician.email} onNavigateToTab={onNavigateToTab} verbasSummary={verbasSummary} albaData={albaData} />;
        case "verbas-old":     return <VerbasIndenizatoriasTab politicianName={politician.name.toUpperCase()} slug={slug} />;
        case "emendas-painel": return <EmendasBaPainelTab />;
        case "emendas-dados":  return <EmendasBaDadosTab />;
        case "seplan-loa":     return <SeplanLoaTab />;
        case "ceap-camara":    return <CeapCamaraTab hasMandate={false} />;
        case "senado":         return <SenadoTab hasMandate={false} />;
        case "portal-federal": return <PortalFederalTab />;
        case "empresas-rf":    return <EmpresasRfTab />;
        case "tcm-ba":         return <TcmBaTab />;
        case "rastreabilidade":return <RastreabilidadeTabNew />;
        default:               return <EmptyStateFallback tabName={activeTab} />;
    }
}

export default function RadarPoliticoPage() {
    const params = useParams() as { slug: string };
    const router = useRouter();
    const politicoSlug = params.slug;
    const [activeTab, setActiveTab] = useState("visao-geral");

    const { data: politician, isLoading, error: queryError } = useQuery({
        queryKey: ["politicianData", politicoSlug],
        queryFn: async () => {
            // Busca SEMPRE por prisma_id primeiro (hash estável — nunca muda)
            let { data, error } = await dadosClient
                .from('parlamentares')
                .select('*')
                .eq('prisma_id', politicoSlug)
                .single();

            // Fallback: se não encontrou por hash, tenta pelo slug legado
            if (error || !data) {
                const res = await dadosClient
                    .from('parlamentares')
                    .select('*')
                    .eq('slug', politicoSlug)
                    .single();
                data = res.data;
                error = res.error;
            }

            if (error || !data) throw new Error(`Parlamentar não encontrado: ${politicoSlug}`);

            return {
                id: data.prisma_id,
                prisma_id: data.prisma_id,
                parlamentar_id: data.id_alba || data.prisma_id,
                name: data.nome_urna || data.nome_civil || "—",
                nome_civil: data.nome_civil,
                partido: data.sigla_partido,
                partido_nome: data.partido_nome,
                foto_url: data.foto_url,
                tipo: "Deputado Estadual",
                uf: data.uf,
                biografia_resumo: data.biografia_resumo,
                biografia_completa: data.biografia_completa,
                mandatos: data.mandatos,
                email: data.email,
                telefones: data.telefones,
                gabinete_endereco: data.gabinete_endereco,
                qualidade_score: data.qualidade_score,
                is_alba: true,
                municipio_base: data.uf || 'BA',
                cities: { name: data.uf || "BA", state: "BA" },
                formacao_academica:    Array.isArray(data.formacao_academica)    ? data.formacao_academica    : [],
                carreira_politica:     Array.isArray(data.carreira_politica)     ? data.carreira_politica     : [],
                lideranca_e_comissoes: Array.isArray(data.lideranca_e_comissoes) ? data.lideranca_e_comissoes : [],
                condecoracoes:         Array.isArray(data.condecoracoes)          ? data.condecoracoes          : [],
                tags_estrategicas:     Array.isArray(data.tags_estrategicas)     ? data.tags_estrategicas     : [],
            };
        },
        staleTime: 1000 * 60 * 30,
        retry: 1,
    });

    const { data: albaFullData } = useQuery({
        queryKey: ["alba-full-data", politician?.prisma_id],
        queryFn: async () => {
            if (!politician?.prisma_id) return null;
            let { data } = await dadosClient.from("parlamentares").select("*").eq("prisma_id", String(politician.prisma_id)).single();
            if (!data && politician.parlamentar_id) {
                const res = await dadosClient.from("parlamentares").select("*").eq("id_alba", String(politician.parlamentar_id)).single();
                data = res.data;
            }
            return data || null;
        },
        enabled: !!politician?.prisma_id,
        staleTime: 1000 * 60 * 60,
    });

    const { data: verbasSummary } = useQuery({
        queryKey: ["verbas-summary", politicoSlug],
        queryFn: async () => null,
        staleTime: 1000 * 60 * 5,
    });

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8f9fc]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-[3px] border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="text-[13px] text-slate-400 font-semibold tracking-wide uppercase">Carregando perfil...</p>
                </div>
            </div>
        );
    }

    if (!politician || queryError) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8f9fc]">
                <div className="text-center">
                    <DatabaseBackup className="w-16 h-16 text-slate-200 mx-auto mb-4" strokeWidth={1} />
                    <h2 className="text-2xl font-black text-slate-900">Parlamentar não encontrado</h2>
                    <p className="text-slate-400 mt-2 mb-6">ID: <code className="bg-slate-100 px-2 py-0.5 rounded text-sm">{politicoSlug}</code></p>
                    <button onClick={() => router.back()} className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Voltar ao RADAR
                    </button>
                </div>
            </div>
        );
    }

    const rawScore = Number(politician.qualidade_score) || 0;
    const scoreVal = (rawScore > 0 && rawScore <= 1) ? rawScore * 100 : rawScore;
    const scoreColor = scoreVal < 50 ? "red" : scoreVal < 75 ? "orange" : "emerald";
    const scoreLabel = scoreVal < 50 ? "CRÍTICO" : scoreVal < 75 ? "MÉDIO" : "ELITE";

    const getInitials = (name: string) =>
        name.split(" ").filter(Boolean).slice(0, 2).map((n: string) => n[0]).join("").toUpperCase();

    return (
        <div className="min-h-screen bg-[#f8f9fc] pb-20 animate-in fade-in duration-500">

            {/* STICKY HEADER */}
            <div className="w-full bg-white border-b border-black/[0.05] sticky top-0 z-20 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                    {/* Breadcrumb */}
                    <div className="flex items-center gap-3 py-3 border-b border-slate-50">
                        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-400 hover:text-indigo-600 transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                            RADAR!
                        </button>
                        <span className="text-slate-200">/</span>
                        <span className="text-[13px] font-semibold text-slate-600 truncate">{politician.name}</span>
                        <div className="ml-auto flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            RADAR ATIVO
                        </div>
                    </div>

                    {/* Perfil */}
                    <div className="py-5 flex flex-col sm:flex-row justify-between sm:items-center gap-5">
                        <div className="flex items-center gap-5">
                            <div className="relative shrink-0">
                                <div className="w-[72px] h-[72px] rounded-2xl overflow-hidden ring-2 ring-indigo-100 shadow-md bg-slate-100">
                                    {politician.foto_url ? (
                                        <img src={politician.foto_url} alt={politician.name} className="w-full h-full object-cover"
                                            onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(politician.name)}&background=6366f1&color=fff&bold=true&size=128`; }} />
                                    ) : (
                                        <div className="w-full h-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xl font-black">{getInitials(politician.name)}</div>
                                    )}
                                </div>
                                <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-white shadow ${
                                    scoreColor === "emerald" ? "bg-emerald-500" : scoreColor === "orange" ? "bg-orange-500" : "bg-red-500"
                                }`}>{scoreVal.toFixed(0)}</div>
                            </div>
                            <div>
                                <h1 className="text-[26px] font-black text-slate-900 tracking-tight leading-none">{politician.name}</h1>
                                <div className="flex items-center flex-wrap gap-2 mt-2">
                                    <span className="text-[12px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">{politician.partido || "—"}</span>
                                    <span className="text-[12px] text-slate-400 font-medium">{politician.tipo}</span>
                                    <span className="flex items-center gap-1 text-[12px] text-slate-400 font-medium">
                                        <MapPin className="w-3 h-3 text-red-400" />{politician.uf || "BA"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Score */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[12px] font-bold ${
                                scoreColor === "emerald" ? "bg-emerald-50 border-emerald-100 text-emerald-700" :
                                scoreColor === "orange"  ? "bg-orange-50 border-orange-100 text-orange-700"   : "bg-red-50 border-red-100 text-red-700"
                            }`}>
                                <Star className="w-3.5 h-3.5" />
                                Score: {scoreVal.toFixed(0)}% · {scoreLabel}
                            </div>
                            <div className="flex items-center gap-2 w-[220px]">
                                <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-1000 ${
                                        scoreColor === "emerald" ? "bg-emerald-500" : scoreColor === "orange" ? "bg-orange-500" : "bg-red-500"
                                    }`} style={{ width: `${scoreVal.toFixed(0)}%` }} />
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">{scoreVal.toFixed(0)}% DADOS</span>
                            </div>
                        </div>
                    </div>

                    {/* TABS */}
                    <div className="overflow-x-auto hide-scrollbar -mx-1 px-1">
                        <nav className="flex gap-0" role="tablist">
                            {RADAR_TABS.map((tab) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button key={tab.id} role="tab" aria-selected={isActive} onClick={() => setActiveTab(tab.id)}
                                        className={`relative flex items-center gap-1.5 whitespace-nowrap px-4 py-3.5 text-[13px] font-semibold border-b-[2.5px] transition-all duration-150 outline-none select-none ${
                                            isActive ? `${tab.border} ${tab.color}` : "border-transparent text-slate-400 hover:text-slate-700 hover:border-slate-200"
                                        }`}
                                    >
                                        <span>{tab.icon}</span>
                                        <span>{tab.label}</span>
                                        {(tab.hasData || tab.hasAlert) && (
                                            <div className="absolute -top-0 right-1 flex gap-0.5">
                                                {tab.hasData && !tab.hasAlert && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1" />}
                                                {tab.hasAlert && <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1 animate-pulse" />}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
                <TabContent activeTab={activeTab} politician={politician} onNavigateToTab={(id) => setActiveTab(id)} slug={politicoSlug} verbasSummary={verbasSummary} albaData={albaFullData} />
            </div>

            <style dangerouslySetInnerHTML={{ __html: `.hide-scrollbar::-webkit-scrollbar{display:none}.hide-scrollbar{-ms-overflow-style:none;scrollbar-width:none}` }} />
        </div>
    );
}
