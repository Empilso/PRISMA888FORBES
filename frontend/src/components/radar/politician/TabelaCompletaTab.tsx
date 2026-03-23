"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    FileText,
    Search,
    ChevronDown,
    ChevronUp,
    Building2,
    DollarSign,
    History,
    AlertCircle,
    ArrowUpRight,
    MapPin
} from "lucide-react";
import { formatCurrency } from "@/lib/fiscal-analytics";

interface TabelaCompletaTabProps {
    politicianId: string;
}

export default function TabelaCompletaTab({ politicianId }: TabelaCompletaTabProps) {
    const [filterSearch, setFilterSearch] = useState("");
    const [filterYear, setFilterYear] = useState<string>("all");
    const [filterMandate, setFilterMandate] = useState<string>("all");
    const [filterSegment, setFilterSegment] = useState<string>("all");
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const { data: emendas = [], isLoading, error } = useQuery({
        queryKey: ["politicianAmendmentsTable", politicianId],
        queryFn: async () => {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const res = await fetch(`${API_URL}/api/politicians/${politicianId}/audit_trail`);
            if (!res.ok) throw new Error("Erro ao carregar tabela forense");
            const json = await res.json();
            return json.matches || [];
        },
        staleTime: 1000 * 60 * 10,
    });

    // Unique options for filters
    const uniqueYears = useMemo(() => {
        const years = new Set(emendas.map((m: any) => m.ano_exercicio).filter(Boolean));
        return Array.from(years).sort((a: any, b: any) => b - a) as number[];
    }, [emendas]);

    const uniqueSegments = useMemo(() => {
        const segs = new Set(emendas.map((m: any) => m.area_tematica).filter(Boolean));
        return Array.from(segs).sort() as string[];
    }, [emendas]);

    // Apply Filters Locally for Instant Response
    const filtered = useMemo(() => {
        return emendas.filter((m: any) => {
            // Filter by Search Term
            if (filterSearch.trim().length > 0) {
                const term = filterSearch.toLowerCase().trim();
                const objMatch = m.emenda_objeto?.toLowerCase().includes(term);
                const cityMatch = m.municipio_original?.toLowerCase().includes(term);
                const valMatch = String(m.emenda_valor || "").includes(term);
                const seiMatch = m.sei_numero?.toLowerCase().includes(term);
                if (!objMatch && !cityMatch && !valMatch && !seiMatch) return false;
            }

            // Filter by Year
            if (filterYear !== "all" && String(m.ano_exercicio) !== filterYear) return false;

            // Filter by Mandate
            if (filterMandate === "atual" && (m.ano_exercicio < 2023 || m.ano_exercicio > 2026)) return false;
            if (filterMandate === "anterior" && (m.ano_exercicio < 2019 || m.ano_exercicio > 2022)) return false;

            // Filter by Segment
            if (filterSegment !== "all" && m.area_tematica !== filterSegment) return false;

            return true;
        });
    }, [emendas, filterSearch, filterYear, filterMandate, filterSegment]);

    // Totais Dinâmicos
    const totalOrcado = filtered.reduce((acc: number, cur: any) => acc + (cur.emenda_valor || 0), 0);
    const totalPago = filtered.reduce((acc: number, cur: any) => acc + (cur.valor_pago_total || 0), 0);

    const toggleRow = (id: string) => {
        const next = new Set(expandedRows);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedRows(next);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
                <div className="w-12 h-12 border-4 border-indigo-100 rounded-full animate-spin border-t-indigo-600" />
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Sincronizando Atos Executivos...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-10 text-center bg-red-50 rounded-2xl border border-red-100 text-red-600 font-bold">
                <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
                Erro ao carregar os dados da tabela.
            </div>
        );
    }

    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header + Stats Inline */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-2">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
                            <FileText className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tighter">
                            Tabela Executiva <span className="text-indigo-600">Completa</span>
                        </h2>
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-12">
                        {filtered.length} Atos Encontrados em Diário Oficial
                    </p>
                </div>

                <div className="flex gap-4">
                    <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm flex flex-col items-end">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Orçado</span>
                        <span className="text-lg font-black text-slate-900">{formatCurrency(totalOrcado)}</span>
                    </div>
                    <div className="bg-indigo-600 rounded-2xl px-5 py-3 shadow-lg shadow-indigo-100 flex flex-col items-end">
                        <span className="text-[9px] font-black text-indigo-200 uppercase tracking-widest mb-1">Total Pago</span>
                        <span className="text-lg font-black text-white">{formatCurrency(totalPago)}</span>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                FILTROS ENTERPRISE (Padrão Unificado)
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Pesquisar por município, objeto, valor ou SEI..."
                        value={filterSearch}
                        onChange={(e) => setFilterSearch(e.target.value)}
                        className="pl-10 h-10 bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-indigo-500 transition-all font-medium text-sm"
                    />
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <Select value={filterYear} onValueChange={setFilterYear}>
                        <SelectTrigger className="w-[110px] h-10 bg-slate-50 border-slate-200 rounded-xl font-bold text-xs uppercase text-slate-600">
                            <SelectValue placeholder="Ano" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200">
                            <SelectItem value="all">Ano: Todos</SelectItem>
                            {uniqueYears.map((y) => (
                                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filterMandate} onValueChange={setFilterMandate}>
                        <SelectTrigger className="w-[140px] h-10 bg-slate-50 border-slate-200 rounded-xl font-bold text-xs uppercase text-slate-600">
                            <SelectValue placeholder="Mandato" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200">
                            <SelectItem value="all">Mandatos: Todos</SelectItem>
                            <SelectItem value="atual">2023–2026</SelectItem>
                            <SelectItem value="anterior">2019–2022</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={filterSegment} onValueChange={setFilterSegment}>
                        <SelectTrigger className="min-w-[140px] h-10 bg-slate-50 border-slate-200 rounded-xl font-bold text-xs uppercase text-slate-600">
                            <SelectValue placeholder="Área" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200">
                            <SelectItem value="all">Áreas: Todas</SelectItem>
                            {uniqueSegments.map((seg) => (
                                <SelectItem key={seg} value={seg}>{seg}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {(filterSearch || filterYear !== "all" || filterMandate !== "all" || filterSegment !== "all") && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setFilterSearch("");
                                setFilterYear("all");
                                setFilterMandate("all");
                                setFilterSegment("all");
                            }}
                            className="h-10 text-slate-400 hover:text-red-500 transition-colors font-bold text-xs uppercase px-2"
                        >
                            Limpar
                        </Button>
                    )}
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                TABELA PREMIUM
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-5 py-4 w-12" />
                                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Exercício / Local</th>
                                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Objeto Executivo</th>
                                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor Orçado</th>
                                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor Pago</th>
                                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status SEI</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-24 text-center">
                                        <div className="flex flex-col items-center gap-3 opacity-30">
                                            <Search className="w-12 h-12" />
                                            <p className="font-bold text-lg uppercase tracking-tight">Nenhum registro corresponde aos filtros</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((em: any, index: number) => {
                                    const emKey = em.emenda_id || `em-${index}`;
                                    const isExpanded = expandedRows.has(emKey);
                                    const execPct = em.emenda_valor > 0 ? (em.valor_pago_total / em.emenda_valor) * 100 : 0;

                                    return (
                                        <React.Fragment key={emKey}>
                                            <tr
                                                className={`group hover:bg-slate-50/80 transition-all cursor-pointer ${isExpanded ? "bg-slate-50/50" : ""}`}
                                                onClick={() => toggleRow(emKey)}
                                            >
                                                <td className="px-5 py-4 text-center">
                                                    <div className={`p-1.5 rounded-lg transition-all ${isExpanded ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600"}`}>
                                                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-slate-900 text-white text-[10px] font-black w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                                                            {(em.ano_exercicio || "??").toString().slice(-2)}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-slate-800 leading-tight">
                                                                {em.municipio_original || "Estado da Bahia"}
                                                            </p>
                                                            <div className="flex items-center gap-1.5 mt-1">
                                                                <Badge variant="outline" className="text-[9px] font-black border-slate-200 text-slate-500 bg-white py-0 h-4">
                                                                    {em.ano_exercicio}
                                                                </Badge>
                                                                <span className="text-slate-300">·</span>
                                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[80px]">
                                                                    {em.area_tematica || "Geral"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="max-w-[400px]">
                                                        <p className="text-sm font-bold text-slate-700 leading-snug line-clamp-2" title={em.emenda_objeto}>
                                                            {em.emenda_objeto}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1.5 opacity-60">
                                                            <Building2 className="w-3 h-3 text-indigo-500" />
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter truncate">
                                                                {em.orgao || "Órgão Não Especificado"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <p className="text-sm font-black text-slate-900 leading-tight">
                                                        {formatCurrency(em.emenda_valor)}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">LOA</p>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <p className="text-sm font-black text-indigo-600 leading-tight">
                                                            {formatCurrency(em.valor_pago_total)}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full transition-all ${execPct >= 100 ? "bg-emerald-500" : "bg-indigo-400"}`}
                                                                    style={{ width: `${Math.min(100, execPct)}%` }}
                                                                />
                                                            </div>
                                                            <span className={`text-[9px] font-black ${execPct >= 100 ? "text-emerald-600" : "text-indigo-400"}`}>
                                                                {execPct.toFixed(0)}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    {em.sei_numero ? (
                                                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0 text-[10px] font-black px-2 py-0.5 rounded-lg shadow-none">
                                                            ID-SEI: {em.sei_numero}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="border-slate-200 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                                                            PENDENTE
                                                        </Badge>
                                                    )}
                                                </td>
                                            </tr>

                                            {/* LINHA EXPANDIDA (Detail Card) */}
                                            {isExpanded && (
                                                <tr className="bg-slate-50/80">
                                                    <td colSpan={6} className="px-8 py-8">
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-4 duration-300">
                                                            {/* Coluna 1: Objeto Completo */}
                                                            <div className="md:col-span-2 space-y-4">
                                                                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                                                                    <div className="flex items-center gap-2 mb-4">
                                                                        <div className="bg-indigo-50 p-1.5 rounded-lg">
                                                                            <History className="w-4 h-4 text-indigo-600" />
                                                                        </div>
                                                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">
                                                                            Histórico & Objeto LOA
                                                                        </h4>
                                                                    </div>
                                                                    <p className="text-sm font-medium text-slate-700 leading-relaxed italic">
                                                                        "{em.emenda_objeto}"
                                                                    </p>
                                                                    <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 gap-4">
                                                                        <div>
                                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Dotação Orçamentária</p>
                                                                            <p className="text-xs font-bold text-slate-600">{em.acao_programa || "Programa não especificado"}</p>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Processo SEI</p>
                                                                            <p className="text-xs font-bold text-slate-600">{em.processo_sei || "S/N — Em análise"}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Coluna 2: Métricas Rápidas + CTAs */}
                                                            <div className="space-y-4">
                                                                <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl shadow-slate-200">
                                                                    <div className="flex justify-between items-start mb-6">
                                                                        <div>
                                                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Status de Repasse</p>
                                                                            <Badge className={`border-0 font-black text-[9px] px-2 py-0.5 ${execPct >= 100 ? "bg-emerald-500 text-white" : "bg-amber-500 text-slate-900"}`}>
                                                                                {execPct >= 100 ? "LIQUIDADO" : execPct > 0 ? "EM EXECUÇÃO" : "ZERADO"}
                                                                            </Badge>
                                                                        </div>
                                                                        <ArrowUpRight className="w-5 h-5 text-slate-700" />
                                                                    </div>

                                                                    <div className="space-y-4">
                                                                        <div className="flex justify-between items-center text-sm">
                                                                            <span className="text-slate-400 font-bold">Pagamentos</span>
                                                                            <span className="font-black">{(em.payments || []).length} Lotes</span>
                                                                        </div>
                                                                        <div className="flex justify-between items-center text-sm">
                                                                            <span className="text-slate-400 font-bold">Município Alvo</span>
                                                                            <span className="font-black text-indigo-400">{em.municipio_original || "Bahia"}</span>
                                                                        </div>
                                                                        <div className="flex justify-between items-center text-sm">
                                                                            <span className="text-slate-400 font-bold">Exercício</span>
                                                                            <span className="font-black">{em.ano_exercicio}</span>
                                                                        </div>
                                                                    </div>

                                                                    <Button className="w-full mt-8 bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-11 rounded-xl shadow-lg shadow-indigo-500/20 group">
                                                                        Ver Detalhes do Pagamento
                                                                        <ChevronDown className="w-4 h-4 ml-2 group-hover:translate-y-0.5 transition-transform" />
                                                                    </Button>
                                                                </div>

                                                                <div className="bg-white rounded-2xl p-5 border border-slate-200 flex items-center gap-4">
                                                                    <div className="bg-emerald-50 p-2 rounded-xl">
                                                                        <DollarSign className="w-5 h-5 text-emerald-600" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Valor Pago</p>
                                                                        <p className="text-lg font-black text-slate-900">{formatCurrency(em.valor_pago_total)}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

