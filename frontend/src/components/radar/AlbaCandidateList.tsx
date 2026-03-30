"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronRight, FileText, Users, Filter } from "lucide-react";
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

// Labels dinâmicos baseados em esfera
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

export function AlbaCandidateList() {
    const [deputados, setDeputados]         = useState<DeputadoAlba[]>([]);
    const [loading, setLoading]             = useState(true);
    const [search, setSearch]               = useState("");
    const [filtroLeg, setFiltroLeg]         = useState<string>("todas");

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

    // Legislaturas disponíveis para filtro
    const legislaturasDisponiveis = Array.from(
        new Set(safeDeputados.flatMap((d) => d.legislaturas || []))
    ).sort();

    const filtered = safeDeputados.filter((d) => {
        const matchSearch =
            (d.nome_urna      || "").toLowerCase().includes(search.toLowerCase()) ||
            (d.sigla_partido  || "").toLowerCase().includes(search.toLowerCase()) ||
            (d.uf             || "").toLowerCase().includes(search.toLowerCase()) ||
            (d.casa           || "").toLowerCase().includes(search.toLowerCase());

        const matchLeg =
            filtroLeg === "todas" ||
            (d.legislaturas || []).includes(filtroLeg);

        return matchSearch && matchLeg;
    });

    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-xl" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Barra de Filtros */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Buscar parlamentar..."
                        className="pl-10 bg-white border-slate-200"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Filtro por Legislatura */}
                {legislaturasDisponiveis.length > 0 && (
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <select
                            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 px-3 py-1">
                    {filtered.length} Parlamentares Monitorados
                </Badge>
            </div>

            {/* Lista */}
            <div className="space-y-3">
                {filtered.map((dep) => {
                    const esfera     = dep.esfera || "estadual";
                    const casaLabel  = dep.casa   || "ALBA";
                    const ufLabel    = dep.uf     || "BA";
                    const esferaLabel = ESFERA_LABEL[esfera] || "Parlamentar";
                    const esferaColor = ESFERA_COLOR[esfera] || ESFERA_COLOR.estadual;
                    // Usa slug do banco; fallback seguro para prisma_id
                    const linkHref   = dep.slug
                        ? `/admin/radar/${dep.slug}`
                        : `/admin/radar/${dep.prisma_id}`;

                    return (
                        <Card
                            key={dep.prisma_id}
                            className="border-slate-200 hover:shadow-md hover:border-blue-200 transition-all group overflow-hidden"
                        >
                            <CardContent className="p-0">
                                <div className="flex items-center gap-4 p-4">
                                    {/* Avatar */}
                                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0 shadow-sm bg-slate-50">
                                        <img
                                            src={dep.foto_url || "/api/placeholder/48/48"}
                                            alt={dep.nome_urna}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src =
                                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(dep.nome_urna)}&background=random`;
                                            }}
                                        />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-slate-900 truncate uppercase">
                                                {dep.nome_urna}
                                            </span>
                                            {/* Badge dinâmico por esfera */}
                                            <Badge variant="outline" className={`text-xs ${esferaColor}`}>
                                                {esferaLabel}
                                            </Badge>
                                            <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600">
                                                {dep.sigla_partido}
                                            </Badge>
                                            {/* Badge Casa */}
                                            <Badge variant="outline" className="text-xs bg-zinc-50 text-zinc-500 border-zinc-200">
                                                {casaLabel} • {ufLabel}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                            {(dep.legislaturas || []).map((leg) => (
                                                <span key={leg} className="text-[9px] text-slate-400 uppercase font-medium">
                                                    📅 {leg}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Contadores Rápidos */}
                                    <div className="hidden lg:flex items-center gap-6 mr-4 text-center">
                                        <div>
                                            <p className="text-[8px] text-slate-400 uppercase font-bold">Produção</p>
                                            <p className="text-xs font-black text-slate-700">0</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] text-slate-400 uppercase font-bold">Qualidade</p>
                                            <p className="text-xs font-black text-slate-700">{dep.qualidade_score || 0}%</p>
                                        </div>
                                    </div>

                                    {/* Ações */}
                                    <div className="flex items-center gap-2">
                                        {dep.status === "aprovado" && (
                                            <Badge className="bg-emerald-500 text-white border-0 text-[8px] font-black h-5 mr-2">
                                                VERIFICADO
                                            </Badge>
                                        )}
                                        <Link href={linkHref}>
                                            <Button
                                                size="sm"
                                                className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm"
                                            >
                                                <FileText className="w-3.5 h-3.5" />
                                                Transparência
                                                <ChevronRight className="w-4 h-4 opacity-50" />
                                            </Button>

                                        </Link>
                                    </div>
                                </div>

                                {/* Barra de completude */}
                                {dep.status === "aprovado" && (
                                    <div className="h-0.5 w-full bg-emerald-500/20">
                                        <div className="h-full bg-emerald-500 w-full" />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}

                {filtered.length === 0 && (
                    <div className="py-20 text-center text-slate-400">
                        <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p className="font-medium">Nenhum parlamentar encontrado.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
