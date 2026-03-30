"use client";

import React, { useState, useEffect } from "react";
import {
    Search,
    ShieldAlert,
    Radar,
    Users,
    Globe,
    Landmark,
    Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CandidateRow, CandidateProps } from "@/components/radar/CandidateRow";

const LEGISLATURE_TABS = [
    { id: "radar-global", label: "Radar Global", icon: Globe, desc: "Candidatos monitorados" },
    { id: "alba", label: "Deputados ALBA", icon: Landmark, desc: "Assembleia Legislativa da Bahia" },
];

export default function RadarIndexPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [politicians, setPoliticians] = useState<CandidateProps[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("alba");
    const [partido, setPartido] = useState("");
    const [partidos, setPartidos] = useState<string[]>([]);

    useEffect(() => {
        async function fetchParlamentares() {
            try {
                setIsLoading(true);
                setError(null);
                const res = await fetch("/api/prisma/deputados-alba");
                if (!res.ok) throw new Error("Falha ao carregar parlamentares");
                const json = await res.json();

                const mapped: CandidateProps[] = (json.parlamentares || []).map((p: any) => ({
                    id: p.slug || p.prisma_id,
                    slug: p.slug,
                    prisma_id: p.prisma_id,
                    name: p.nome_urna || p.nome_civil || "—",
                    partido: p.sigla_partido || "S/P",
                    city: `${p.uf || "BA"} · Deputado Estadual`,
                    office: "Deputado Estadual",
                    avatarUrl: p.foto_url || "",
                    hasFiscalData: true,
                }));

                const uniquePartidos = [...new Set(mapped.map(p => p.partido).filter(Boolean))] as string[];
                setPartidos(uniquePartidos.sort());
                setPoliticians(mapped);
                setTotalCount(json.total || mapped.length);
            } catch (err: any) {
                console.error("Erro ao buscar parlamentares:", err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        }
        fetchParlamentares();
    }, []);

    const filtered = politicians.filter(p => {
        const matchSearch =
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.partido?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchPartido = partido ? p.partido === partido : true;
        return matchSearch && matchPartido;
    });

    return (
        <div className="min-h-screen bg-[#f8f9fc]">

            {/* HERO HEADER */}
            <div className="bg-white border-b border-slate-100 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="relative">
                                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                                    <Radar className="h-7 w-7 text-white" />
                                </div>
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                                </span>
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">RADAR!</h1>
                                    <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase tracking-wider">PRISMA 888</span>
                                </div>
                                <p className="text-slate-500 font-medium mt-0.5">
                                    Central de Inteligência Política · <span className="text-indigo-600 font-semibold">Auditoria 3D em tempo real</span>
                                </p>
                            </div>
                        </div>

                        {/* Stats rápidos */}
                        <div className="flex items-center gap-3">
                            <div className="text-center px-5 py-3 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-2xl font-black text-slate-900">{totalCount}</p>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Parlamentares</p>
                            </div>
                            <div className="text-center px-5 py-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                                <p className="text-2xl font-black text-emerald-700">{totalCount}</p>
                                <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wide">Com Dados</p>
                            </div>
                            <div className="text-center px-5 py-3 bg-indigo-50 rounded-2xl border border-indigo-100">
                                <p className="text-2xl font-black text-indigo-700">2</p>
                                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">Casas Ativas</p>
                            </div>
                        </div>
                    </div>

                    {/* TABS LEGISLATURAS */}
                    <div className="flex gap-2 mt-8 flex-wrap">
                        {LEGISLATURE_TABS.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                                        isActive
                                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                    }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                    {isActive && (
                                        <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                                            {totalCount}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                        <button className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 bg-slate-100 hover:bg-slate-200 transition-all">
                            <Sparkles className="w-4 h-4" />
                            + Nova Legislatura
                        </button>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8">

                {/* Filtros */}
                <div className="flex flex-col sm:flex-row items-center gap-3 mb-7">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar parlamentar, partido..."
                            className="pl-10 h-11 bg-white border-slate-200 rounded-xl shadow-sm focus-visible:ring-indigo-500 text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={partido}
                            onChange={e => setPartido(e.target.value)}
                            className="h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">Todos os Partidos</option>
                            {partidos.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <div className="flex items-center gap-2 h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 shadow-sm">
                            <Users className="w-4 h-4 text-indigo-500" />
                            <span>{filtered.length} visíveis</span>
                        </div>
                    </div>
                </div>

                {/* Cabeçalho da lista */}
                {!isLoading && !error && filtered.length > 0 && (
                    <div className="flex items-center justify-between px-3 mb-3 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <span>Parlamentar / Partido</span>
                        <span className="hidden md:flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            ALBA · Assembleia Legislativa da Bahia
                        </span>
                    </div>
                )}

                {/* Lista */}
                <div className="space-y-3">
                    {isLoading ? (
                        [1,2,3,4,5,6].map(i => (
                            <div key={i} className="h-20 w-full rounded-2xl bg-white border border-slate-100 animate-pulse" />
                        ))
                    ) : error ? (
                        <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-red-200 shadow-sm">
                            <ShieldAlert className="h-10 w-10 text-red-300 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-900">Erro ao Carregar</h3>
                            <p className="text-slate-400 mt-2 text-sm">{error}</p>
                            <Button variant="outline" className="mt-5" onClick={() => window.location.reload()}>Tentar Novamente</Button>
                        </div>
                    ) : filtered.length > 0 ? (
                        filtered.map((pol) => (
                            <CandidateRow key={pol.id} candidate={pol} />
                        ))
                    ) : (
                        <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm">
                            <ShieldAlert className="h-10 w-10 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-900">Nenhum resultado</h3>
                            <p className="text-slate-400 mt-2 text-sm">Tente outro termo ou limpe os filtros.</p>
                            <Button variant="outline" className="mt-5" onClick={() => { setSearchTerm(""); setPartido(""); }}>Limpar Filtros</Button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {!isLoading && !error && (
                    <div className="text-center pt-10 border-t border-slate-100 mt-10">
                        <p className="text-xs text-slate-400 font-medium">
                            Dados sincronizados via <strong className="text-slate-600">Pipeline Zidane v4.0</strong> · PRISMA 888 Intelligence Platform
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
