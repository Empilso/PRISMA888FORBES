"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Search, ChevronRight, FileText, Users, CheckCircle2,
    AlertCircle, MapPin, Calendar, Shield, Star, Eye
} from "lucide-react";
import { useRouter } from "next/navigation";

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
    legislaturas:    string[];
}

const PARTIDO_COLOR: Record<string, string> = {
    PT:      "#e11d48", PL:     "#3b82f6", PP:    "#f59e0b",
    MDB:     "#0ea5e9", PSD:    "#8b5cf6", PSDB:  "#22c55e",
    PDT:     "#f97316", PSOL:   "#dc2626", REPUBLICANOS: "#14b8a6",
    SOLIDARIEDADE: "#f472b6", AVANTE: "#84cc16", PRD: "#6366f1",
    UNIÃO:   "#0d9488", DC:     "#94a3b8", NOVO:  "#fb923c",
};

const ESFERA_LABEL: Record<string, string> = {
    estadual: "Dep. Estadual", federal: "Dep. Federal",
    municipal: "Vereador",    senado: "Senador",
};

function getInitials(name: string) {
    return name.split(" ").filter(Boolean).slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

function getPartidoColor(partido: string) {
    return PARTIDO_COLOR[partido] || "#6366f1";
}

function ScoreRing({ score }: { score: number }) {
    const val   = score > 0 && score <= 1 ? score * 100 : score;
    const color = val < 40 ? "#ef4444" : val < 70 ? "#f59e0b" : "#22c55e";
    const label = val < 40 ? "CR" : val < 70 ? "MD" : "TOP";
    return (
        <div className="flex flex-col items-center">
            <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                style={{ background: `conic-gradient(${color} ${val * 3.6}deg, #e2e8f0 0deg)` }}
            >
                <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
                    <span style={{ color }} className="text-[9px] font-black">{label}</span>
                </div>
            </div>
            <span className="text-[9px] text-slate-400 font-bold mt-0.5 uppercase tracking-wide">{Math.round(val)}%</span>
        </div>
    );
}

export function AlbaCandidateList() {
    const router = useRouter();
    const [deputados, setDeputados]           = useState<DeputadoAlba[]>([]);
    const [loading, setLoading]               = useState(true);
    const [search, setSearch]                 = useState("");
    const [filtroPartido, setFiltroPartido]   = useState("");
    // Legislaturas ativas (multi-select chips)
    const [legsAtivas, setLegsAtivas]         = useState<Set<string>>(new Set());
    const [legsInicialized, setLegsInicialized] = useState(false);

    useEffect(() => {
        fetch("/api/prisma/deputados-alba")
            .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
            .then(data => {
                const lista: DeputadoAlba[] = data.parlamentares || [];
                setDeputados(lista);
                setLoading(false);
            })
            .catch(err => { console.error(err); setLoading(false); });
    }, []);

    // Legislaturas disponíveis ordenadas desc (mais recente primeiro)
    const legislaturasDisponiveis = useMemo(() => {
        const all = Array.from(new Set(deputados.flatMap(d => d.legislaturas || [])));
        return all.sort((a, b) => b.localeCompare(a));
    }, [deputados]);

    // Inicializa com a legislatura mais recente ativa
    useEffect(() => {
        if (!legsInicialized && legislaturasDisponiveis.length > 0) {
            setLegsAtivas(new Set([legislaturasDisponiveis[0]]));
            setLegsInicialized(true);
        }
    }, [legislaturasDisponiveis, legsInicialized]);

    const toggleLeg = (leg: string) => {
        setLegsAtivas(prev => {
            const next = new Set(prev);
            if (next.has(leg)) {
                // Não permite desativar tudo
                if (next.size === 1) return prev;
                next.delete(leg);
            } else {
                next.add(leg);
            }
            return next;
        });
    };

    const ativarTodas = () => setLegsAtivas(new Set(legislaturasDisponiveis));
    const ativarSoMaisRecente = () => {
        if (legislaturasDisponiveis.length > 0)
            setLegsAtivas(new Set([legislaturasDisponiveis[0]]));
    };

    const partidosDisponiveis = useMemo(() =>
        Array.from(new Set(deputados.map(d => d.sigla_partido).filter(Boolean))).sort(),
        [deputados]
    );

    const filtered = useMemo(() => deputados.filter(d => {
        const matchSearch =
            (d.nome_urna     || "").toLowerCase().includes(search.toLowerCase()) ||
            (d.sigla_partido || "").toLowerCase().includes(search.toLowerCase());
        const matchLeg = legsAtivas.size === 0 ||
            (d.legislaturas || []).some(l => legsAtivas.has(l));
        const matchPartido = filtroPartido ? d.sigla_partido === filtroPartido : true;
        return matchSearch && matchLeg && matchPartido;
    }), [deputados, search, legsAtivas, filtroPartido]);

    // Navega com router para evitar URL absoluta com localhost
    const handleTransparencia = (slug: string, prisma_id: string) => {
        const id = slug || prisma_id;
        router.push(`/admin/radar/${id}`);
    };

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

            {/* ═══ MENU LEGISLATURAS ═══ */}
            {legislaturasDisponiveis.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-indigo-500" />
                            <span className="text-sm font-black text-slate-800 uppercase tracking-wide">Legislaturas Ativas</span>
                            <span className="text-[11px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                                {legsAtivas.size} de {legislaturasDisponiveis.length}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={ativarSoMaisRecente}
                                className="text-[11px] font-semibold text-slate-400 hover:text-indigo-600 transition-colors px-2 py-1 rounded-lg hover:bg-indigo-50"
                            >
                                Só Atual
                            </button>
                            <button
                                onClick={ativarTodas}
                                className="text-[11px] font-semibold text-slate-400 hover:text-indigo-600 transition-colors px-2 py-1 rounded-lg hover:bg-indigo-50"
                            >
                                Todas
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {legislaturasDisponiveis.map((leg, idx) => {
                            const isAtiva  = legsAtivas.has(leg);
                            const isMaisRecente = idx === 0;
                            return (
                                <button
                                    key={leg}
                                    onClick={() => toggleLeg(leg)}
                                    className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 border-2 ${
                                        isAtiva
                                            ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200"
                                            : "bg-slate-50 border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600"
                                    }`}
                                >
                                    {isMaisRecente && (
                                        <span className="absolute -top-1.5 -right-1.5 text-[8px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded-full leading-none">
                                            ATUAL
                                        </span>
                                    )}
                                    <Calendar className="w-3.5 h-3.5" />
                                    {leg}
                                    {isAtiva && <CheckCircle2 className="w-3.5 h-3.5 opacity-80" />}
                                </button>
                            );
                        })}
                    </div>

                    <p className="text-[11px] text-slate-400 mt-3 font-medium">
                        💡 Clique nos chips para ativar ou desativar legislaturas. A lista abaixo mostra apenas os deputados com mandato nas selecionadas.
                    </p>
                </div>
            )}

            {/* ═══ BARRA DE FILTROS ═══ */}
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

                <div className="flex items-center gap-2 h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 shadow-sm ml-auto">
                    <Users className="w-4 h-4 text-indigo-500" />
                    <span><strong className="text-slate-800">{filtered.length}</strong> parlamentares</span>
                </div>
            </div>

            {/* ═══ LISTA PREMIUM ═══ */}
            <div className="space-y-3">
                {filtered.map((dep) => {
                    const profileSlug    = dep.slug || dep.prisma_id;
                    const esferaLabel    = ESFERA_LABEL[dep.esfera] || "Parlamentar";
                    const partidoColor   = getPartidoColor(dep.sigla_partido);
                    const scoreVal       = dep.qualidade_score > 0 && dep.qualidade_score <= 1
                        ? dep.qualidade_score * 100 : dep.qualidade_score;
                    const isVerificado   = dep.status === "aprovado";
                    const legsDeputado   = (dep.legislaturas || []).filter(l => legsAtivas.has(l));

                    return (
                        <div
                            key={dep.prisma_id}
                            className="group relative bg-white border-2 border-slate-100 hover:border-indigo-200 rounded-3xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-indigo-50 cursor-pointer"
                            onClick={() => handleTransparencia(dep.slug, dep.prisma_id)}
                        >
                            {/* Faixa colorida do partido na esquerda */}
                            <div
                                className="absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-200 group-hover:w-2"
                                style={{ background: partidoColor }}
                            />

                            <div className="flex items-center gap-5 p-4 pl-6">

                                {/* FOTO GRANDE */}
                                <div className="relative shrink-0">
                                    <div
                                        className="w-20 h-20 rounded-2xl overflow-hidden shadow-md ring-[3px] transition-all duration-200 group-hover:ring-[4px] group-hover:scale-105"
                                        style={{ ringColor: partidoColor }}
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
                                    {/* Badge partido sobre a foto */}
                                    <div
                                        className="absolute -bottom-1.5 -right-1.5 text-[9px] font-black text-white px-1.5 py-0.5 rounded-lg shadow-sm"
                                        style={{ background: partidoColor }}
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
                                    <div className="flex items-start gap-2 flex-wrap">
                                        <h3 className="font-black text-slate-900 text-[17px] leading-tight uppercase tracking-tight group-hover:text-indigo-700 transition-colors">
                                            {dep.nome_urna}
                                        </h3>
                                        {isVerificado && (
                                            <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider mt-0.5">
                                                ✓ Verificado
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center flex-wrap gap-2 mt-2">
                                        <span
                                            className="text-[11px] font-bold px-2.5 py-1 rounded-full text-white shadow-sm"
                                            style={{ background: partidoColor }}
                                        >
                                            {dep.sigla_partido}
                                        </span>
                                        <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                                            {esferaLabel}
                                        </span>
                                        <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                                            <MapPin className="w-3 h-3 text-red-400" />
                                            {dep.casa || "ALBA"} · {dep.uf || "BA"}
                                        </span>
                                        {dep.mandatos_count > 0 && (
                                            <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                                                <Shield className="w-3 h-3 text-indigo-300" />
                                                {dep.mandatos_count} mandato{dep.mandatos_count !== 1 ? "s" : ""}
                                            </span>
                                        )}
                                    </div>

                                    {/* Chips de legislaturas ativas deste deputado */}
                                    {legsDeputado.length > 0 && (
                                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                            {legsDeputado.map(leg => (
                                                <span
                                                    key={leg}
                                                    className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                                                    style={{ background: `${partidoColor}20`, color: partidoColor }}
                                                >
                                                    📅 {leg}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* SCORE RING */}
                                <div className="hidden md:flex shrink-0">
                                    <ScoreRing score={scoreVal} />
                                </div>

                                {/* BOTÃO */}
                                <div className="shrink-0">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleTransparencia(dep.slug, dep.prisma_id); }}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-bold rounded-xl transition-all shadow-sm hover:shadow-md hover:shadow-indigo-300 active:scale-95"
                                    >
                                        <Eye className="w-4 h-4" />
                                        Transparência
                                        <ChevronRight className="w-4 h-4 opacity-70" />
                                    </button>
                                </div>
                            </div>

                            {/* Barra gradiente no hover */}
                            <div className="absolute bottom-0 left-0 right-0 h-[3px]">
                                <div
                                    className="h-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                    style={{ background: `linear-gradient(to right, ${partidoColor}, #8b5cf6, #22c55e)` }}
                                />
                            </div>
                        </div>
                    );
                })}

                {filtered.length === 0 && (
                    <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                        <Users className="w-16 h-16 mx-auto mb-4 opacity-20 text-slate-400" />
                        <p className="font-bold text-slate-600 text-lg">Nenhum parlamentar encontrado</p>
                        <p className="text-slate-400 text-sm mt-1">Tente ativar mais legislaturas ou limpar os filtros.</p>
                        <Button variant="outline" className="mt-5 rounded-xl" onClick={() => {
                            setSearch(""); setFiltroPartido(""); ativarSoMaisRecente();
                        }}>Resetar Filtros</Button>
                    </div>
                )}
            </div>
        </div>
    );
}
