"use client";

import React, { useState, useEffect } from "react";
import {
    Activity,
    Search,
    ShieldAlert,
    LayoutGrid,
    Users,
    TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CandidateRow, CandidateProps } from "@/components/radar/CandidateRow";
import Link from "next/link";

export default function RadarIndexPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [politicians, setPoliticians] = useState<CandidateProps[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchParlamentares() {
            try {
                setIsLoading(true);
                const res = await fetch("/api/prisma/deputados-alba");
                if (!res.ok) throw new Error("Falha ao carregar parlamentares");
                const json = await res.json();

                const mapped: CandidateProps[] = (json.parlamentares || []).map((p: any) => ({
                    id: p.slug || p.prisma_id,
                    name: p.nome_urna || p.nome_civil || "—",
                    partido: p.sigla_partido || "S/P",
                    city: `${p.uf || "BA"} · Deputado Estadual`,
                    office: "Deputado Estadual",
                    avatarUrl: p.foto_url || "",
                    hasFiscalData: true, // Todos os ALBA têm dados
                }));

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

    const filtered = politicians.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.partido?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 md:p-12">
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200">
                    <div className="flex items-center gap-5">
                        <div className="h-16 w-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 transform rotate-3">
                            <LayoutGrid className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                                Central de Inteligência
                            </h1>
                            <p className="text-slate-500 font-medium text-lg">
                                Selecione um alvo para iniciar a <span className="text-indigo-600 font-bold">Auditoria 3D</span>.
                            </p>
                        </div>
                    </div>

                    <div className="w-full md:w-72 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar deputado ou partido..."
                            className="pl-10 bg-white border-slate-200 h-11 text-base shadow-sm focus-visible:ring-indigo-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Stats Bar */}
                {!isLoading && !error && (
                    <div className="flex items-center gap-6 px-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                            <Users className="w-4 h-4 text-indigo-500" />
                            <span>{totalCount} parlamentares</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
                            <TrendingUp className="w-4 h-4" />
                            <span>{filtered.length} visíveis</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            ALBA · Assembleia Legislativa da Bahia
                        </div>
                    </div>
                )}

                {/* List */}
                <div className="space-y-4">
                    {isLoading ? (
                        // Skeletons
                        [1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-24 w-full rounded-xl bg-slate-200 animate-pulse" />
                        ))
                    ) : error ? (
                        <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-red-300">
                            <ShieldAlert className="h-8 w-8 text-red-400 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-900">Erro ao Carregar</h3>
                            <p className="text-slate-500 mt-2">{error}</p>
                            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                                Tentar Novamente
                            </Button>
                        </div>
                    ) : filtered.length > 0 ? (
                        <>
                            <div className="flex items-center justify-between px-2 text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                                <span>Parlamentar / Mandato</span>
                                <span className="hidden md:block pr-64">Status de Inteligência</span>
                            </div>
                            <div className="space-y-4">
                                {filtered.map((pol) => (
                                    <CandidateRow key={pol.id} candidate={pol} />
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 mb-4">
                                <ShieldAlert className="h-8 w-8 text-slate-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">Nenhum Parlamentar Encontrado</h3>
                            <p className="text-slate-500 mt-2 max-w-sm mx-auto mb-6">
                                Não encontramos resultados para sua busca. Tente outro termo.
                            </p>
                            <Button variant="outline" onClick={() => setSearchTerm("")}>
                                Limpar Filtros
                            </Button>
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                <div className="text-center pt-8 border-t border-slate-200">
                    <p className="text-sm text-slate-400">
                        Dados sincronizados com a <strong>ALBA (Assembleia Legislativa da Bahia)</strong> via Pipeline Zidane v4.0.
                    </p>
                </div>
            </div>
        </div>
    );
}
