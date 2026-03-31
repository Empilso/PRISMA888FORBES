"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Search, ChevronRight, Users, CheckCircle2,
    MapPin, Calendar, Shield, Eye, LayoutGrid, UserMinus, UserCheck
} from "lucide-react";

// Legislatura pode ser número simples OU objeto rico
interface LegislaturaObj {
    tipo?: string;          // "titular" | "suplente"
    legislatura?: string;
    periodo?: string;
    periodo_exercicio?: string;
    saida?: string;
    obs?: string;
}

type LegislaturaItem = number | string | LegislaturaObj;

interface DeputadoAlba {
    prisma_id:       string;
    id_alba:         number | null;
    nome_urna:       string;
    sigla_partido:   string;
    foto_url:        string;
    uf:              string;
    esfera:          string;
    casa:            string;
    slug:            string;
    status:          string;
    mandatos_count:  number;
    qualidade_score: number;
    legislaturas:    LegislaturaItem[];
}

// Suporta tanto número (19) quanto string ("19" ou "19ª Legislatura") quanto objeto rico
function normalizeLeg(leg: LegislaturaItem): string {
    if (typeof leg === "object" && leg !== null) {
        const obj = leg as LegislaturaObj;
        if (obj.legislatura) return obj.legislatura;
    }
    const s = String(leg).trim();
    const match = s.match(/\d+/);
    return match ? match[0] : s;
}

// Detecta se o deputado é suplente na legislatura 20 (atual)
function isSuplente20(legislaturas: LegislaturaItem[]): boolean {
    return (legislaturas || []).some(leg => {
        if (typeof leg === "object" && leg !== null) {
            const obj = leg as LegislaturaObj;
            return obj.tipo === "suplente" && obj.legislatura === "20";
        }
        return false;
    });
}

// Detecta se renunciou
function isRenunciou(legislaturas: LegislaturaItem[]): boolean {
    return (legislaturas || []).some(leg => {
        if (typeof leg === "object" && leg !== null) {
            const obj = leg as LegislaturaObj;
            return obj.saida && obj.saida.toLowerCase().includes("renunci");
        }
        return false;
    });
}

// Mapa: número ordinal -> período
const ALBA_LEG_PERIODO: Record<string, { periodo: string }> = {
    "20": { periodo: "2023-2027" },
    "19": { periodo: "2019-2023" },
    "18": { periodo: "2015-2019" },
    "17": { periodo: "2011-2015" },
    "16": { periodo: "2007-2011" },
    "15": { periodo: "2003-2007" },
    "14": { periodo: "1999-2003" },
    "13": { periodo: "1995-1999" },
    "12": { periodo: "1991-1995" },
};

const PARTIDO_COLOR: Record<string, string> = {
    PT: "#e11d48", PL: "#3b82f6", PP: "#f59e0b",
    MDB: "#0ea5e9", PSD: "#8b5cf6", PSDB: "#22c55e",
    PDT: "#f97316", PSOL: "#dc2626", REPUBLICANOS: "#14b8a6",
    SOLIDARIEDADE: "#f472b6", AVANTE: "#84cc16", PRD: "#6366f1",
    "UNIÃO": "#0d9488", DC: "#94a3b8", NOVO: "#fb923c",
    PV: "#16a34a", PATRIOTA: "#dc2626", PROS: "#0284c7",
};

const ESFERA_LABEL: Record<string, string> = {
    estadual: "Dep. Estadual", federal: "Dep. Federal",
    municipal: "Vereador",    senado: "Senador",
};

function getPartidoColor(partido: string) {
    return PARTIDO_COLOR[partido] || "#6366f1";
}

function ScoreRing({ score }: { score: number }) {
    const val   = score > 0 && score <= 1 ? score * 100 : (score || 0);
    const color = val < 40 ? "#ef4444" : val < 70 ? "#f59e0b" : "#22c55e";
    const label = val < 40 ? "CR" : val < 70 ? "MD" : "TOP";
    return (
        <div className="flex flex-col items-center gap-0.5">
            <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: `conic-gradient(${color} ${val * 3.6}deg, #e2e8f0 0deg)` }}
            >
                <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
                    <span style={{ color }} className="text-[9px] font-black">{label}</span>
                </div>
            </div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">{Math.round(val)}%</span>
        </div>
    );
}

// ─── BADGE DE STATUS ────────────────────────────────────────────────────────
function StatusBadge({ status, legislaturas }: { status: string; legislaturas: LegislaturaItem[] }) {
    const inativo   = status === "inativo";
    const suplente  = isSuplente20(legislaturas);
    const renunciou = isRenunciou(legislaturas);

    if (inativo && renunciou) {
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 border border-slate-300 uppercase tracking-wide">
                <UserMinus className="w-2.5 h-2.5" />
                RENUNCIOU
            </span>
        );
    }

    if (inativo && suplente) {
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 border border-slate-300 uppercase tracking-wide">
                <UserMinus className="w-2.5 h-2.5" />
                INATIVO
            </span>
        );
    }

    if (inativo) {
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-500 border border-red-200 uppercase tracking-wide">
                <UserMinus className="w-2.5 h-2.5" />
                INATIVO
            </span>
        );
    }

    if (suplente) {
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300 uppercase tracking-wide">
                <UserCheck className="w-2.5 h-2.5" />
                SUPLENTE
            </span>
        );
    }

    return null;
}

function navegarParaPerfil(slug: string) {
    window.location.assign(`/admin/radar/${slug}`);
}

export function AlbaCandidateList() {
    const [deputados, setDeputados]         = useState<DeputadoAlba[]>([]);
    const [loading, setLoading]             = useState(true);
    const [search, setSearch]               = useState("");
    const [filtroPartido, setFiltroPartido] = useState("");
    const [legAtiva, setLegAtiva]           = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/prisma/deputados-alba")
            .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
            .then(data => {
                setDeputados(data.parlamentares || []);
                setLoading(false);
            })
            .catch(err => { console.error(err); setLoading(false); });
    }, []);

    // Legislaturas normalizadas para número ordinal, ordenadas do maior para menor
    const legislaturasInfo = useMemo(() => {
        const map: Record<string, number> = {};
        deputados.forEach(d => {
            (d.legislaturas || []).forEach(l => {
                const key = normalizeLeg(l);
                map[key] = (map[key] || 0) + 1;
            });
        });
        return Object.entries(map)
            .sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
            .map(([leg, count]) => ({
                leg,
                count,
                info: ALBA_LEG_PERIODO[leg] || null,
            }));
    }, [deputados]);

    // Ativa a mais recente automaticamente
    useEffect(() => {
        if (legislaturasInfo.length > 0 && legAtiva === null) {
            setLegAtiva(legislaturasInfo[0].leg);
        }
    }, [legislaturasInfo, legAtiva]);

    const partidosDisponiveis = useMemo(() =>
        Array.from(new Set(deputados.map(d => d.sigla_partido).filter(Boolean))).sort(),
        [deputados]
    );

    const filtered = useMemo(() => deputados.filter(d => {
        const matchSearch =
            (d.nome_urna     || "").toLowerCase().includes(search.toLowerCase()) ||
            (d.sigla_partido || "").toLowerCase().includes(search.toLowerCase());
        const matchLeg =
            legAtiva === "todas" || legAtiva === null ||
            (d.legislaturas || []).map(normalizeLeg).includes(legAtiva);
        const matchPartido = filtroPartido ? d.sigla_partido === filtroPartido : true;
        return matchSearch && matchLeg && matchPartido;
    }), [deputados, search, legAtiva, filtroPartido]);

    if (loading) {
        return (
            <div className="space-y-4">
                {[1,2,3,4,5].map(i => (
                    <div key={i} className="h-28 bg-white animate-pulse rounded-3xl border border-slate-100" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* MENU DE LEGISLATURAS EM QUADROS */}
            {legislaturasInfo.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <LayoutGrid className="w-4 h-4 text-indigo-500" />
                            <span className="text-sm font-black text-slate-800 uppercase tracking-widest">Legislaturas</span>
                            <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">
                                {legislaturasInfo.length} período{legislaturasInfo.length !== 1 ? "s" : ""}
                            </span>
                        </div>
                        <button
                            onClick={() => setLegAtiva("todas")}
                            className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all ${
                                legAtiva === "todas"
                                    ? "bg-slate-800 text-white"
                                    : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                            }`}
                        >
                            Ver Todas
                        </button>
                    </div>

                    {/* Cards das legislaturas */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                        {legislaturasInfo.map(({ leg, count, info }, idx) => {
                            const isAtiva       = legAtiva === leg;
                            const isMaisRecente = idx === 0;

                            return (
                                <button
                                    key={leg}
                                    onClick={() => setLegAtiva(leg)}
                                    className={`relative flex flex-col items-center justify-center gap-1 p-4 pt-6 rounded-2xl border-2 transition-all duration-200 ${
                                        isAtiva
                                            ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105"
                                            : "bg-slate-50 border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                                    }`}
                                >
                                    {/* Badge ATUAL */}
                                    {isMaisRecente && (
                                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm">
                                            ● ATUAL
                                        </span>
                                    )}

                                    <Calendar className={`w-4 h-4 ${ isAtiva ? "text-white/70" : "text-indigo-400" }`} />

                                    {/* Número grande */}
                                    <span className={`text-2xl font-black leading-none mt-1 ${ isAtiva ? "text-white" : "text-slate-800" }`}>
                                        {leg}ª
                                    </span>

                                    {/* Label */}
                                    <span className={`text-[9px] font-bold uppercase tracking-wide ${ isAtiva ? "text-white/70" : "text-slate-400" }`}>
                                        Legislatura
                                    </span>

                                    {/* Período de anos */}
                                    {info && (
                                        <span className={`text-[10px] font-black mt-0.5 ${ isAtiva ? "text-white" : "text-indigo-600" }`}>
                                            {info.periodo}
                                        </span>
                                    )}

                                    {/* Contador */}
                                    <div className={`mt-1.5 flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                        isAtiva ? "bg-white/20 text-white" : "bg-slate-200 text-slate-500"
                                    }`}>
                                        <Users className="w-2.5 h-2.5" />
                                        {count} dep.
                                    </div>

                                    {isAtiva && <CheckCircle2 className="w-4 h-4 text-white/80 mt-0.5" />}
                                </button>
                            );
                        })}
                    </div>

                    <p className="text-[11px] text-slate-400 mt-4 font-medium">
                        💡 Selecione uma legislatura para filtrar os deputados com mandato naquele período.
                        A <strong className="text-emerald-600">legislatura atual</strong> é selecionada por padrão.
                    </p>
                </div>
            )}

            {/* Barra de filtros */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Buscar parlamentar ou partido..."
                        className="pl-10 h-11 bg-white border-slate-200 rounded-xl shadow-sm text-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {partidosDisponiveis.length > 0 && (
                    <select
                        className="h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={filtroPartido}
                        onChange={e => setFiltroPartido(e.target.value)}
                    >
                        <option value="">Todos os Partidos</option>
                        {partidosDisponiveis.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                )}

                {legAtiva && legAtiva !== "todas" && (
                    <div className="flex items-center gap-2 h-11 px-4 bg-indigo-50 border border-indigo-200 rounded-xl text-sm font-bold text-indigo-700">
                        <Calendar className="w-4 h-4" />
                        {legAtiva}ª Legislatura
                        <button onClick={() => setLegAtiva("todas")} className="ml-1 text-indigo-400 hover:text-indigo-700 font-black text-lg leading-none">
                            ×
                        </button>
                    </div>
                )}

                <div className="flex items-center gap-2 h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 shadow-sm ml-auto">
                    <Users className="w-4 h-4 text-indigo-500" />
                    <span><strong className="text-slate-800">{filtered.length}</strong> parlamentares</span>
                </div>
            </div>

            {/* Lista */}
            <div className="space-y-3">
                {filtered.map((dep) => {
                    const profileSlug  = dep.slug || dep.prisma_id;
                    const esferaLabel  = ESFERA_LABEL[dep.esfera] || "Parlamentar";
                    const partidoColor = getPartidoColor(dep.sigla_partido);
                    const scoreVal     = dep.qualidade_score > 0 && dep.qualidade_score <= 1
                        ? dep.qualidade_score * 100 : (dep.qualidade_score || 0);
                    const isVerificado = dep.status === "aprovado";
                    const legsNorm     = (dep.legislaturas || []).map(normalizeLeg);
                    const isInativo    = dep.status === "inativo";
                    const isSup        = isSuplente20(dep.legislaturas || []);

                    return (
                        <div
                            key={dep.prisma_id}
                            className={`group relative border-2 rounded-3xl overflow-hidden transition-all duration-200 cursor-pointer ${
                                isInativo
                                    ? "bg-slate-50 border-slate-200 hover:border-slate-300 opacity-70 hover:opacity-90 hover:shadow-md"
                                    : isSup
                                        ? "bg-white border-amber-100 hover:border-amber-300 hover:shadow-lg hover:shadow-amber-50"
                                        : "bg-white border-slate-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50"
                            }`}
                            onClick={() => navegarParaPerfil(profileSlug)}
                        >
                            {/* Faixa lateral cor partido — acinzentada se inativo */}
                            <div
                                className="absolute left-0 top-0 bottom-0 w-1.5 group-hover:w-2 transition-all duration-200"
                                style={{ background: isInativo ? "#cbd5e1" : partidoColor }}
                            />

                            <div className="flex items-center gap-5 p-4 pl-6">

                                {/* FOTO */}
                                <div className="relative shrink-0">
                                    <div
                                        className={`w-20 h-20 rounded-2xl overflow-hidden shadow-md transition-all duration-200 group-hover:scale-105 ${isInativo ? "grayscale" : ""}`}
                                        style={{ outline: `3px solid ${isInativo ? "#cbd5e140" : partidoColor + "40"}`, outlineOffset: "2px" }}
                                    >
                                        <img
                                            src={dep.foto_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(dep.nome_urna)}&background=6366f1&color=fff&bold=true&size=128`}
                                            alt={dep.nome_urna}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src =
                                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(dep.nome_urna)}&background=6366f1&color=fff&bold=true&size=128`;
                                            }}
                                        />
                                    </div>
                                    <div
                                        className="absolute -bottom-1.5 -right-1.5 text-[9px] font-black text-white px-1.5 py-0.5 rounded-lg shadow"
                                        style={{ background: isInativo ? "#94a3b8" : partidoColor }}
                                    >
                                        {dep.sigla_partido}
                                    </div>
                                    {isVerificado && (
                                        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow">
                                            <CheckCircle2 className="w-3 h-3 text-white" />
                                        </div>
                                    )}
                                </div>

                                {/* IDENTIDADE */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className={`font-black text-[17px] leading-tight uppercase tracking-tight transition-colors truncate ${
                                            isInativo
                                                ? "text-slate-400 group-hover:text-slate-500"
                                                : "text-slate-900 group-hover:text-indigo-700"
                                        }`}>
                                            {dep.nome_urna}
                                        </h3>
                                        {/* BADGE STATUS */}
                                        <StatusBadge status={dep.status} legislaturas={dep.legislaturas || []} />
                                    </div>
                                    <div className="flex items-center flex-wrap gap-2 mt-2">
                                        <span
                                            className="text-[11px] font-bold px-2.5 py-1 rounded-full text-white"
                                            style={{ background: isInativo ? "#94a3b8" : partidoColor }}
                                        >
                                            {dep.sigla_partido}
                                        </span>
                                        <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                                            {esferaLabel}
                                        </span>
                                        <span className="flex items-center gap-1 text-[11px] text-slate-500">
                                            <MapPin className="w-3 h-3 text-red-400" />
                                            {dep.casa || "ALBA"} · {dep.uf || "BA"}
                                        </span>
                                        {dep.mandatos_count > 0 && (
                                            <span className="flex items-center gap-1 text-[11px] text-slate-400">
                                                <Shield className="w-3 h-3 text-indigo-300" />
                                                {dep.mandatos_count} mandato{dep.mandatos_count !== 1 ? "s" : ""}
                                            </span>
                                        )}
                                    </div>
                                    {/* Chips de legislatura normalizados */}
                                    {legsNorm.length > 0 && (
                                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                            {legsNorm.map(leg => {
                                                const info = ALBA_LEG_PERIODO[leg];
                                                const isAtivaAtual = leg === legAtiva;
                                                return (
                                                    <span key={leg} className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                                        isAtivaAtual
                                                            ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                                                            : "bg-slate-50 border-slate-200 text-slate-400"
                                                    }`}>
                                                        📅 {info ? info.periodo : `${leg}ª Leg.`}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* SCORE */}
                                <div className="hidden md:flex shrink-0">
                                    <ScoreRing score={scoreVal} />
                                </div>

                                {/* BOTÃO TRANSPARÊNCIA */}
                                <div className="shrink-0">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); navegarParaPerfil(profileSlug); }}
                                        className={`flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95 ${
                                            isInativo
                                                ? "bg-slate-300 hover:bg-slate-400 text-slate-600"
                                                : "bg-indigo-600 hover:bg-indigo-700 text-white"
                                        }`}
                                    >
                                        <Eye className="w-4 h-4" />
                                        Transparência
                                        <ChevronRight className="w-4 h-4 opacity-70" />
                                    </button>
                                </div>
                            </div>

                            {/* Barra bottom gradiente */}
                            <div className="absolute bottom-0 left-0 right-0 h-[3px]">
                                <div
                                    className="h-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                    style={{ background: isInativo
                                        ? "linear-gradient(to right, #cbd5e1, #94a3b8, #cbd5e1)"
                                        : isSup
                                            ? "linear-gradient(to right, #f59e0b, #fbbf24, #f59e0b)"
                                            : `linear-gradient(to right, ${partidoColor}, #8b5cf6, #22c55e)`
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}

                {filtered.length === 0 && (
                    <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                        <Users className="w-16 h-16 mx-auto mb-4 opacity-20 text-slate-400" />
                        <p className="font-bold text-slate-600 text-lg">Nenhum parlamentar encontrado</p>
                        <p className="text-slate-400 text-sm mt-1">Selecione outra legislatura ou limpe os filtros.</p>
                        <Button variant="outline" className="mt-5 rounded-xl" onClick={() => {
                            setSearch(""); setFiltroPartido("");
                            if (legislaturasInfo.length > 0) setLegAtiva(legislaturasInfo[0].leg);
                        }}>Resetar Filtros</Button>
                    </div>
                )}
            </div>
        </div>
    );
}
