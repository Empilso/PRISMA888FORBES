"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Search,
    ChevronRight,
    FileText,
    Users
} from "lucide-react";
import Link from "next/link";

interface DeputadoAlba {
    prisma_id: string;
    id_alba: number | null;
    nome_urna: string;
    sigla_partido: string;
    foto_url: string;
    uf: string;
    slug: string;
    status: string;
    mandatos_count: number;
    qualidade_score: number;
}

export function AlbaCandidateList() {
    const [deputados, setDeputados] = useState<DeputadoAlba[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        // Fetch relativo para funcionar no App Router chamando Pages API
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

    // Filtro seguro contra null/undefined e garantindo que deputados seja array
    const safeDeputados = Array.isArray(deputados) ? deputados : [];
    const filtered = safeDeputados.filter(d =>
        (d.nome_urna || "").toLowerCase().includes(search.toLowerCase()) ||
        (d.sigla_partido || "").toLowerCase().includes(search.toLowerCase()) ||
        (d.uf || "").toLowerCase().includes(search.toLowerCase())
    );

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
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Buscar deputado ALBA..."
                        className="pl-10 bg-white border-slate-200"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 px-3 py-1">
                    {safeDeputados.length} Deputados Monitorados
                </Badge>
            </div>

            <div className="space-y-3">
                {filtered.map((dep) => (
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
                                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(dep.nome_urna)}&background=random`;
                                        }}
                                    />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-slate-900 truncate uppercase">
                                            {dep.nome_urna}
                                        </span>
                                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-100">
                                            Dep. Estadual
                                        </Badge>
                                        <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600">
                                            {dep.sigla_partido}
                                        </Badge>
                                    </div>
                                    <p className="text-[10px] text-slate-400 uppercase mt-0.5">
                                        Base: {dep.uf || "BA"}
                                    </p>
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
                                    {dep.status === 'aprovado' && (
                                        <Badge className="bg-emerald-500 text-white border-0 text-[8px] font-black h-5 mr-2">
                                            VERIFICADO
                                        </Badge>
                                    )}
                                    <Link href={`/admin/radar/${dep.prisma_id}`}>
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

                            {/* Detalhe visual de completude */}
                            {dep.status === 'aprovado' && (
                                <div className="h-0.5 w-full bg-emerald-500/20">
                                    <div className="h-full bg-emerald-500 w-full" />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}

                {filtered.length === 0 && (
                    <div className="py-20 text-center text-slate-400">
                        <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p className="font-medium">Nenhum deputado encontrado.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
