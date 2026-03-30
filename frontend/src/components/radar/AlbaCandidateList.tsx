"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronRight, FileText, Users, Filter, CheckCircle2, AlertCircle, MapPin, Briefcase } from "lucide-react";
import Link from "next/link";

interface DeputadoAlba {
    prisma_id: string;
    id_alba:        number | null;
    nome_urna:      string;
    sigla_partido:  string;
    foto_url:       string;
    uf:             string;
    esfera:         string;
    casa:           string;
    slug:           string;
    status:         string;
    mandatos_count: number;
    qualidade_score: number;
    legislaturas:   string[];
}

const ESFERA_LABEL: Record<string, string> = {
    estadual:  "Dep. Estadual",
    federal:   "Dep. Federal",
    municipal: "Vereador",
    senado:    "Senador",
};

const ESFERA_COLOR: Record<string, string> = {
    estadual:  "bg-purple-50 text-purple-700 border-purple-100",
    federal:   "bg-blue-50 text-blue-700 border-blue-100",
    municipal: "bg-green-50 text-green-700 border-green-100",
    senado:    "bg-amber-50 text-amber-700 border-amber-100",
};

function getInitials(name: string) {
    return name.split(" ").filter(Boolean).slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

export function AlbaCandidateList() {
    const [deputados, setDeputados]     = useState<DeputadoAlba[]>([]);
    const [loading, setLoading]         = useState(true);
    const [search, setSearch]           = useState("");
    const [filtroLeg, setFiltroLeg]     = useState<string>("todas");
    const [filtroPartido, setFiltroPartido] = useState<string>("");

    useEffect(() => {
        fetch("/api/prisma/deputados-alba")
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then((data) => {
                setDeputados(data.parlamentares || []);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Erro ao carregar Deputados ALBA:", err);
                setDeputados([]);
                setLoading(false);
            });
    }, []);

    const safeDeputados = Array.isArray(deputados) ? deputados : [];

    const legislaturasDisponiveis = Array.from(
        new Set(safeDeputados.flatMap((d) => d.legislaturas || []))
    ).sort();

    const partidosDisponiveis = Array.from(
        new Set(safeDeputados.map(d => d.sigla_partido).filter(Boolean))
    ).sort();

    const filtered = safeDeputados.filter((d) => {
        const matchSearch =
            (d.nome_urna     || "").toLowerCase().includes(search.toLowerCase()) ||
            (d.sigla_partido || "").toLowerCase().includes(search.toLowerCase()) ||
            (d.uf            || "").toLowerCase().includes(search.toLowerCase()) ||
            (d.casa          || "").toLowerCase().includes(search.toLowerCase());
        const matchLeg     = filtroLeg === "todas" || (d.legislaturas || []).includes(filtroLeg);
        const matchPartido = filtroPartido ? d.sigla_partido === filtroPartido : true;
        return matchSearch && matchLeg && matchPartido;
    });

    if (loading) {
        return (
            <div className="space-y-3">
                {[1,2,3,4,5].map((i) => (
                    <div key={i} className="h-20 bg-white animate-pulse rounded-2xl border border-slate-100" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filtros */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Buscar parlamentar..."
                        className="pl-10 h-11 bg-white border-slate-200 rounded-xl shadow-sm focus-visible:ring-indigo-500 text-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {legislaturasDisponiveis.length > 0 && (
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <select
                            className="h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={filtroLeg}
                            onChange={(e) => setFiltroLeg(e.target.value)}
                        >
                            <option value="todas">Todas as Legislaturas</option>
                            {legislaturasDisponiveis.map((leg) => (
                                <option key={leg} value={leg}>{leg}</option>
                            ))}
                        </select>
                    </div>
                )}

                {partidosDisponiveis.length > 0 && (
                    <select
                        className="h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={filtroPartido}
                        onChange={(e) => setFiltroPartido(e.target.value)}
                    >
                        <option value="">Todos os Partidos</option>
                        {partidosDisponiveis.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                )}

                <div className="flex items-center gap-2 h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 shadow-sm ml-auto">
                    <Users className="w-4 h-4 text-indigo-500" />
                    <span>{filtered.length} visíveis</span>
                </div>
            </div>

            {/* Lista */}
            <div className="space-y-3">
                {filtered.map((dep) => {
                    const esfera      = dep.esfera || "estadual";
                    const casaLabel   = dep.casa   || "ALBA";
                    const ufLabel     = dep.uf     || "BA";
                    const esferaLabel = ESFERA_LABEL[esfera] || "Parlamentar";
                    const esferaColor = ESFERA_COLOR[esfera] || ESFERA_COLOR.estadual;

                    // FIX CRÍTICO: link relativo, slug primeiro, fallback prisma_id
                    const profileSlug = dep.slug || dep.prisma_id;
                    const linkHref    = `/admin/radar/${profileSlug}`;

                    return (
                        <div
                            key={dep.prisma_id}
                            className="group relative bg-white border border-slate-100 hover:border-indigo-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-all duration-200 hover:shadow-md hover:shadow-indigo-50"
                        >
                            {/* Linha de destaque hover */}
                            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                            {/* Avatar + Info */}
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white shadow ring-2 ring-slate-100 group-hover:ring-indigo-200 transition-all shrink-0 bg-slate-50">
                                    <img
                                        src={dep.foto_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(dep.nome_urna)}&background=6366f1&color=fff&bold=true`}
                                        alt={dep.nome_urna}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src =
                                                `https://ui-avatars.com/api/?name=${encodeURIComponent(dep.nome_urna)}&background=6366f1&color=fff&bold=true`;
                                        }}
                                    />
                                </div>

                                <div className="min-w-0">
                                    <h3 className="font-bold text-slate-900 text-[15px] leading-tight truncate uppercase group-hover:text-indigo-700 transition-colors">
                                        {dep.nome_urna}
                                    </h3>
                                    <div className="flex items-center flex-wrap gap-2 mt-1.5">
                                        <Badge className={`border text-[11px] font-bold px-2 py-0 h-5 hover:opacity-90 ${esferaColor}`}>
                                            {esferaLabel}
                                        </Badge>
                                        <Badge className="bg-slate-100 text-slate-600 border-0 text-[11px] font-bold px-2 py-0 h-5 hover:bg-slate-100">
                                            {dep.sigla_partido}
                                        </Badge>
                                        <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                                            <MapPin className="w-3 h-3 text-red-400" />
                                            {casaLabel} · {ufLabel}
                                        </span>
                                        {(dep.legislaturas || []).map(leg => (
                                            <span key={leg} className="text-[9px] text-slate-400 uppercase font-medium">📅 {leg}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Score */}
                            <div className="hidden lg:flex items-center gap-6 mr-4 text-center shrink-0">
                                <div>
                                    <p className="text-[8px] text-slate-400 uppercase font-bold">Qualidade</p>
                                    <p className="text-xs font-black text-slate-700">{dep.qualidade_score || 0}%</p>
                                </div>
                                <div>
                                    <p className="text-[8px] text-slate-400 uppercase font-bold">Mandatos</p>
                                    <p className="text-xs font-black text-slate-700">{dep.mandatos_count || 0}</p>
                                </div>
                            </div>

                            {/* Status + Botão */}
                            <div className="flex items-center gap-3 shrink-0">
                                {dep.status === "aprovado" ? (
                                    <div className="flex items-center gap-1.5 text-emerald-700 text-[11px] font-bold bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> VERIFICADO
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                                        <AlertCircle className="w-3.5 h-3.5" /> Pendente
                                    </div>
                                )}

                                <Link href={linkHref}>
                                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-sm rounded-xl">
                                        <FileText className="w-3.5 h-3.5" />
                                        Transparência
                                        <ChevronRight className="w-4 h-4 opacity-50" />
                                    </Button>
                                </Link>
                            </div>

                            {/* Barra gradiente base */}
                            <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-b-2xl overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </div>
                        </div>
                    );
                })}

                {filtered.length === 0 && (
                    <div className="py-20 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                        <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p className="font-medium">Nenhum parlamentar encontrado.</p>
                        <Button variant="outline" className="mt-5" onClick={() => { setSearch(""); setFiltroPartido(""); setFiltroLeg("todas"); }}>Limpar Filtros</Button>
                    </div>
                )}
            </div>
        </div>
    );
}
