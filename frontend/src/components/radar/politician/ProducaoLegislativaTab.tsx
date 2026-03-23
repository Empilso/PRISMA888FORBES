"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createDadosClient } from "@/lib/supabase/dados";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    FileText,
    Calendar,
    Search,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    Filter
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ProducaoLegislativaTabProps {
    parlamentar_id: number;
}

export default function ProducaoLegislativaTab({ parlamentar_id }: ProducaoLegislativaTabProps) {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const pageSize = 15;

    const { data: proposicoes, isLoading } = useQuery({
        queryKey: ["producaoLegislativa", parlamentar_id],
        queryFn: async () => {
            const supabase = createDadosClient();
            const { data, error } = await supabase
                .from("proposicoes_alba")
                .select("*")
                .eq("parlamentar_id", parlamentar_id)
                .order("data_apresentacao", { ascending: false });

            if (error) throw error;
            return data || [];
        },
        staleTime: 1000 * 60 * 30,
    });

    const filtered = (proposicoes || []).filter(p =>
        p.ementa?.toLowerCase().includes(search.toLowerCase()) ||
        p.tipo_proposicao?.toLowerCase().includes(search.toLowerCase()) ||
        p.numero?.toString().includes(search)
    );

    const totalPages = Math.ceil(filtered.length / pageSize);
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    if (isLoading) {
        return <div className="p-20 text-center text-slate-400 animate-pulse">Carregando Produção Legislativa (DADOS-PRISMA)...</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Filtros */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Buscar proposição, número ou ementa..."
                        className="pl-10 bg-white border-slate-200 rounded-xl"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100 px-3 py-1.5 rounded-lg font-bold">
                        {filtered.length} Proposições Encontradas
                    </Badge>
                </div>
            </div>

            {/* Grid de Cards */}
            <div className="grid grid-cols-1 gap-4">
                {paginated.map((prop) => (
                    <Card key={prop.id} className="border-slate-200 hover:shadow-md transition-all group overflow-hidden bg-white rounded-2xl">
                        <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row gap-6">
                                {/* Side Info */}
                                <div className="md:w-48 shrink-0 space-y-3">
                                    <Badge className="bg-slate-900 text-white border-0 text-[10px] font-black w-full justify-center py-1">
                                        {prop.tipo_proposicao}
                                    </Badge>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                                        <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Número</p>
                                        <p className="text-lg font-black text-slate-800 tracking-tighter">
                                            {prop.numero}/{prop.ano}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase justify-center">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {new Date(prop.data_apresentacao).toLocaleDateString('pt-BR')}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 space-y-4">
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 line-clamp-3 leading-relaxed">
                                            {prop.ementa}
                                        </h4>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                        <div className="flex items-center gap-4">
                                            <div className="text-center">
                                                <p className="text-[8px] text-slate-400 uppercase font-bold">Situação</p>
                                                <p className="text-[10px] font-bold text-indigo-600">{prop.situacao || "Em Tramitação"}</p>
                                            </div>
                                        </div>

                                        {prop.link_integra && (
                                            <Button variant="outline" size="sm" asChild className="rounded-full border-slate-200 hover:bg-slate-50 text-slate-600 font-bold gap-2">
                                                <a href={prop.link_integra} target="_blank" rel="noopener noreferrer">
                                                    Ver Íntegra
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {filtered.length === 0 && (
                    <div className="py-20 text-center bg-white border border-dashed rounded-3xl">
                        <FileText className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                        <p className="text-slate-400 font-medium">Nenhuma proposição encontrada.</p>
                    </div>
                )}
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 pt-6">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="rounded-full"
                    >
                        <ChevronLeft className="w-4 h-4 mr-2" /> Anterior
                    </Button>
                    <span className="text-xs font-bold text-slate-500">
                        Página {page} de {totalPages}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="rounded-full"
                    >
                        Próxima <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            )}
        </div>
    );
}
