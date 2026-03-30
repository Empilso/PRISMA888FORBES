"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { dadosClient } from "@/lib/supabase/dados";
import { MoreHorizontal, MapPin, DatabaseBackup } from "lucide-react";

// ─── Tab Components ────────────────────────────────────────────────────────────
import VisaoGeralTab from "@/components/radar/politician/VisaoGeralTab";
import VerbasIndenizatoriasTab from "@/components/radar/politician/VerbasIndenizatoriasTab";
import { EmendasBaPainelTab, EmendasBaDadosTab } from "@/components/radar/tabs/EmendasBaTabs";
import {
    SeplanLoaTab, CeapCamaraTab, SenadoTab, PortalFederalTab,
    EmpresasRfTab, TcmBaTab, RastreabilidadeTabNew
} from "@/components/radar/tabs/AllPortalTabs";

// ─── Tabs Config ───────────────────────────────────────────────────────────────
const RADAR_TABS = [
    { id: "visao-geral", icon: "🏠", label: "Visão Geral", color: "text-blue-500", border: "border-blue-500", hasData: true, hasAlert: false },
    { id: "verbas-old", icon: "🏛️", label: "Verbas Gabinete backup(old)", color: "text-orange-500", border: "border-orange-500", hasData: true, hasAlert: false },
    { id: "emendas-painel", icon: "📊", label: "Emendas BA Painel", color: "text-green-500", border: "border-green-500", hasData: true, hasAlert: false },
    { id: "emendas-dados", icon: "📦", label: "Emendas BA Dados", color: "text-emerald-500", border: "border-emerald-500", hasData: true, hasAlert: false },
    { id: "seplan-loa", icon: "📄", label: "SEPLAN LOA", color: "text-teal-500", border: "border-teal-500", hasData: false, hasAlert: false },
    { id: "ceap-camara", icon: "🏛️", label: "CEAP Câmara", color: "text-violet-500", border: "border-violet-500", hasData: false, hasAlert: false },
    { id: "senado", icon: "🎤", label: "Senado", color: "text-purple-500", border: "border-purple-500", hasData: false, hasAlert: false },
    { id: "portal-federal", icon: "🇧🇷", label: "Portal Federal", color: "text-indigo-500", border: "border-indigo-500", hasData: false, hasAlert: false },
    { id: "empresas-rf", icon: "🏢", label: "Empresas RF", color: "text-yellow-500", border: "border-yellow-500", hasData: false, hasAlert: true },
    { id: "tcm-ba", icon: "⚖️", label: "TCM-BA", color: "text-red-500", border: "border-red-500", hasData: false, hasAlert: true },
    { id: "rastreabilidade", icon: "🔗", label: "Rastreabilidade", color: "text-gray-500", border: "border-gray-500", hasData: false, hasAlert: true },
];

// ─── Empty State ───────────────────────────────────────────────────────────────
function EmptyStateFallback({ tabName, portalColor }: { tabName: string; portalColor?: string }) {
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

// ─── Renderizador de conteúdo por tab ─────────────────────────────────────────
function TabContent({ activeTab, politician, onNavigateToTab, slug, verbasSummary, albaData }: { activeTab: string; politician: any; onNavigateToTab: (id: string) => void; slug: string; verbasSummary?: any; albaData?: any }) {
    switch (activeTab) {
        case "visao-geral":
            return (
                <VisaoGeralTab
                    politicianId={politician.id}
                    nome={politician.name}
                    biografia={politician.biografia}
                    email={politician.email}
                    onNavigateToTab={onNavigateToTab}
                    verbasSummary={verbasSummary}
                    albaData={albaData}
                />
            );
        case "verbas-old":
            return (
                <VerbasIndenizatoriasTab
                    politicianName={politician.name.toUpperCase()}
                    slug={slug}
                />
            );
        case "emendas-painel":
            return <EmendasBaPainelTab />;
        case "emendas-dados":
            return <EmendasBaDadosTab />;
        case "seplan-loa":
            return <SeplanLoaTab />;
        case "ceap-camara":
            return <CeapCamaraTab hasMandate={false} />;
        case "senado":
            return <SenadoTab hasMandate={false} />;
        case "portal-federal":
            return <PortalFederalTab />;
        case "empresas-rf":
            return <EmpresasRfTab />;
        case "tcm-ba":
            return <TcmBaTab />;
        case "rastreabilidade":
            return <RastreabilidadeTabNew />;
        default:
            return <EmptyStateFallback tabName={activeTab} />;
    }
}

// ─── Page Principal ────────────────────────────────────────────────────────────
export default function RadarPoliticoPage() {
    const params = useParams() as { slug: string };
    const politicoSlug = params.slug;
    const [activeTab, setActiveTab] = useState("visao-geral");

    const { data: politician, isLoading } = useQuery({
        queryKey: ["politicianData", politicoSlug],
        queryFn: async () => {
            const { data, error } = await dadosClient
                .from('parlamentares')
                .select('*')
                .eq('prisma_id', politicoSlug)
                .single();

            if (error || !data) {
                console.error("Erro ao buscar prisma_id:", politicoSlug, error);
                throw new Error(`ID buscado: ${politicoSlug}`);
            }

            return {
                id: data.prisma_id,
                prisma_id: data.prisma_id,
                parlamentar_id: data.id_alba || data.prisma_id,
                name: data.nome_urna,
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
                // ── Novos campos estruturados (Padrão Bobô) ──
                formacao_academica:     Array.isArray(data.formacao_academica)     ? data.formacao_academica     : [],
                carreira_politica:      Array.isArray(data.carreira_politica)      ? data.carreira_politica      : [],
                lideranca_e_comissoes:  Array.isArray(data.lideranca_e_comissoes)  ? data.lideranca_e_comissoes  : [],
                condecoracoes:          Array.isArray(data.condecoracoes)           ? data.condecoracoes           : [],
                tags_estrategicas:      Array.isArray(data.tags_estrategicas)      ? data.tags_estrategicas      : [],
            };
        },
        staleTime: 1000 * 60 * 30,
    });

    // ─── Busca dados completos do ALBA (para VisaoGeralTab) ────────────────────
    const { data: albaFullData } = useQuery({
        queryKey: ["alba-full-data", politician?.prisma_id || politician?.parlamentar_id],
        queryFn: async () => {
            if (!politician?.prisma_id && !politician?.parlamentar_id) return null;
            // Buscar por prisma_id primeiro, fallback para id_alba
            const identifier = politician.prisma_id || politician.parlamentar_id;
            let { data } = await dadosClient
                .from("parlamentares")
                .select("*")
                .eq("prisma_id", String(identifier))
                .single();
            if (!data && politician.parlamentar_id) {
                const res = await dadosClient
                    .from("parlamentares")
                    .select("*")
                    .eq("id_alba", String(politician.parlamentar_id))
                    .single();
                data = res.data;
            }
            return data || null;
        },
        enabled: !!(politician?.prisma_id || politician?.parlamentar_id),
        staleTime: 1000 * 60 * 60,
    });

    // ─── Busca KPIs de Verba Real ────────────────────────────────────────────────
    const { data: verbasSummary } = useQuery({
        queryKey: ["verbas-summary", politicoSlug],
        queryFn: async () => {
            // DESATIVADO TEMPORARIAMENTE PARA EVITAR ERRO 404 
            // A API /api/radar/verbas/[slug] ainda não foi criada.
            // const res = await fetch(`/api/radar/verbas/${politicoSlug}?modo=kpis`);
            // if (!res.ok) return null;
            // return res.json();
            return null;
        },
        staleTime: 1000 * 60 * 5,
    });

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-[3px] border-slate-200 border-t-slate-800 rounded-full animate-spin" />
                    <p className="text-[13px] text-slate-400 font-semibold">Carregando perfil do candidato...</p>
                </div>
            </div>
        );
    }

    if (!politician) {
        return <div className="p-10 text-center text-red-500 bg-white">Candidato não encontrado no Radar.</div>;
    }

    const getInitials = (name: string) => name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
    const activeTabData = RADAR_TABS.find(t => t.id === activeTab);

    return (
        <div className="min-h-screen bg-slate-50/60 pb-20 animate-in fade-in duration-500">

            {/* ─── HEADER ─────────────────────────────────────────────────────── */}
            <div className="w-full bg-white border-b border-black/[0.04] sticky top-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 relative flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    {/* Avatar + Info */}
                    <div className="flex items-center gap-4 sm:gap-5">
                        <div className="w-[68px] h-[68px] rounded-full shrink-0 overflow-hidden ring-[3px] ring-red-500 ring-offset-2 bg-slate-100 text-slate-400 flex items-center justify-center text-xl font-bold">
                            {politician.foto_url
                                ? <img 
                                    src={politician.foto_url} 
                                    alt={politician.name} 
                                    className="w-full h-full object-cover" 
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(politician.name || '')}&background=random`;
                                    }}
                                  />
                                : getInitials(politician.name)
                            }
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-[24px] sm:text-[26px] font-extrabold text-slate-900 tracking-tight leading-none">{politician.name}</h1>
                                <button className="absolute right-4 top-4 sm:static sm:ml-1 text-slate-300 hover:bg-slate-100 p-1.5 rounded-full transition-colors">
                                    <MoreHorizontal className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex items-center gap-2 mt-1.5 text-[14px] font-medium text-slate-500">
                                <span>{politician.tipo || "Deputado Estadual"}</span>
                                <span className="opacity-40">·</span>
                                <span className="font-bold text-slate-800 text-[12px] uppercase tracking-wide">{politician.partido || "—"}</span>
                            </div>
                            <div className="flex items-center gap-4 mt-2.5 text-[12px] font-semibold text-slate-400 flex-wrap">
                                <span className="flex items-center gap-1.5 text-slate-500">
                                    <MapPin className="w-3.5 h-3.5 text-red-400" />
                                    {politician.cities
                                        ? `${politician.cities.name} - ${politician.cities.state}`
                                        : politician.municipio_base || "Local não informado"
                                    }
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                    <span className="text-slate-500">Radar Ativo</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Score + Progresso */}
                    <div className="sm:text-right flex flex-col items-start sm:items-end gap-2 shrink-0">
                        {(() => {
                            const rawScore = Number(politician.qualidade_score) || 0;
                            const scoreVal = (rawScore > 0 && rawScore <= 1) ? rawScore * 100 : rawScore;
                            const colorClassBg = scoreVal < 50 ? "bg-red-50 border-red-100" : scoreVal < 75 ? "bg-orange-50 border-orange-100" : "bg-emerald-50 border-emerald-100";
                            const colorClassTextSm = scoreVal < 50 ? "text-red-400" : scoreVal < 75 ? "text-orange-400" : "text-emerald-400";
                            const colorClassTextLg = scoreVal < 50 ? "text-red-600" : scoreVal < 75 ? "text-orange-600" : "text-emerald-600";
                            const textExtra = scoreVal < 50 ? " 🔴 CRÍTICO" : scoreVal < 75 ? " 🟠 MÉDIO" : " 🟢 ELITE";
                            
                            return (
                                <div className={`inline-flex items-center gap-2 border px-3 py-1.5 rounded-lg ${colorClassBg}`}>
                                    <span className={`text-[11px] font-semibold ${colorClassTextSm}`}>Score de Qualidade</span>
                                    <span className={`text-[15px] font-extrabold ${colorClassTextLg}`}>
                                        {scoreVal.toFixed(0)}%
                                        {textExtra}
                                    </span>
                                </div>
                            );
                        })()}
                        <div className="flex items-center gap-2.5 w-full sm:w-[240px]">
                            {(() => {
                                const rawScore = Number(politician.qualidade_score) || 0;
                                const scoreVal = (rawScore > 0 && rawScore <= 1) ? rawScore * 100 : rawScore;
                                return (
                                    <>
                                        <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ${scoreVal < 50 ? "bg-red-500" : scoreVal < 75 ? "bg-orange-500" : "bg-emerald-500"}`}
                                                style={{ width: `${scoreVal.toFixed(0)}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">
                                            {scoreVal.toFixed(0)}% PREENCHIDO
                                        </span>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>

                {/* ─── TABS DE NAVEGAÇÃO ─── */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="overflow-x-auto hide-scrollbar -mx-1 px-1">
                        <nav className="flex gap-0" role="tablist">
                            {RADAR_TABS.map((tab) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        role="tab"
                                        aria-selected={isActive}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`
                                            relative flex items-center gap-1.5 whitespace-nowrap px-4 py-3.5 text-[13px] font-semibold
                                            border-b-[2.5px] transition-all duration-150 outline-none select-none
                                            ${isActive
                                                ? `${tab.border} ${tab.color}`
                                                : "border-transparent text-slate-400 hover:text-slate-700 hover:border-slate-200"
                                            }
                                        `}
                                    >
                                        <span>{tab.icon}</span>
                                        <span>{tab.label}</span>

                                        {/* Indicadores de dados e alertas */}
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

            {/* ─── CONTENT AREA ─────────────────────────────────────────────── */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
                <TabContent
                    activeTab={activeTab}
                    politician={politician}
                    onNavigateToTab={(id) => setActiveTab(id)}
                    slug={politicoSlug}
                    verbasSummary={verbasSummary}
                    albaData={albaFullData}
                />
            </div>

            <style dangerouslySetInnerHTML={{ __html: `.hide-scrollbar::-webkit-scrollbar{display:none}.hide-scrollbar{-ms-overflow-style:none;scrollbar-width:none}` }} />
        </div>
    );
}
