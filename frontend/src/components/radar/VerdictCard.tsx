"use client";

import React, { useState } from "react";
import { PromiseData } from "@/lib/api/radarPromises";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
    CheckCircle2,
    Clock,
    XCircle,
    AlertOctagon, // Replacement for WarningOctagon
    ChevronDown,  // Replacement for CaretDown
    ChevronUp,    // Replacement for CaretUp
    ScrollText,   // Replacement for Scroll
    Landmark,     // Replacement for Bank
    MinusCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface VerdictCardProps {
    promise: PromiseData;
}

export function VerdictCard({ promise }: VerdictCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Helper functions for status styling
    const getStatusConfig = (status: string | null) => {
        const normalized = status?.toLowerCase() || "nao_iniciada";
        switch (normalized) {
            case "cumprida":
                return {
                    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
                    icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
                    label: "CUMPRIDA"
                };
            case "em_andamento":
                return {
                    color: "bg-amber-100 text-amber-800 border-amber-200",
                    icon: <Clock className="w-5 h-5 text-amber-600" />,
                    label: "EM ANDAMENTO"
                };
            case "parcial":
                return {
                    color: "bg-blue-100 text-blue-800 border-blue-200",
                    icon: <MinusCircle className="w-5 h-5 text-blue-600" />,
                    label: "PARCIALMENTE CUMPRIDA"
                };
            case "quebrada":
                return {
                    color: "bg-red-100 text-red-800 border-red-200",
                    icon: <AlertOctagon className="w-5 h-5 text-red-600" />,
                    label: "QUEBRADA / FALÁCIA"
                };
            default:
                return {
                    color: "bg-slate-100 text-slate-600 border-slate-200",
                    icon: <XCircle className="w-5 h-5 text-slate-400" />,
                    label: "NÃO INICIADA"
                };
        }
    };

    const statusConfig = getStatusConfig(promise.status_atual);
    const hasFiscalEvidence = promise.fontes && promise.fontes.some(f => f.vl_despesa !== undefined || f.nr_empenho !== undefined);

    // Highlight money values in justification
    const renderJustification = (text: string | null) => {
        if (!text) return <span className="text-slate-400 italic">Aguardando análise do Juiz IA...</span>;

        // Simple regex to bold currency values (R$ ...)
        const parts = text.split(/(R\$\s?[\d\.,]+(?:(?:\sde\s|\s)milh(?:ão|ões)|(?:\sde\s|\s)bilh(?:ão|ões))?)/gi);

        return (
            <p className="text-slate-700 leading-relaxed font-serif text-lg">
                {parts.map((part, i) => {
                    if (part.match(/R\$/i)) {
                        return <span key={i} className="font-bold text-emerald-700 bg-emerald-50 px-1 rounded">{part}</span>;
                    }
                    return part;
                })}
            </p>
        );
    };

    return (
        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden bg-white">
            <CardHeader className="pb-3 pt-5 px-6 flex flex-row items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-slate-500 border-slate-300">
                            {promise.categoria}
                        </Badge>
                        <span className="text-xs text-slate-400 font-medium ml-1">
                            ID: {promise.id.substring(0, 8)}
                        </span>
                    </div>

                    <h3 className="font-bold text-xl text-slate-900 leading-tight">
                        {promise.resumo_promessa || "Promessa sem título"}
                    </h3>
                </div>

                <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm shrink-0",
                    statusConfig.color
                )}>
                    {statusConfig.icon}
                    <span className="text-xs font-bold tracking-wide">{statusConfig.label}</span>
                </div>
            </CardHeader>

            <CardContent className="px-6 pb-6 space-y-4">
                {/* VEREDITO BODY */}
                <div className="pl-4 border-l-4 border-slate-200 my-4 py-1">
                    {renderJustification(promise.justificativa_ia)}
                </div>

                {/* EXPANDABLE EVIDENCE SECTION */}
                <div className="pt-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-slate-500 hover:text-slate-800 p-0 h-auto font-medium flex items-center gap-2 group"
                    >
                        {isExpanded ? (
                            <>
                                <ChevronUp className="w-4 h-4" /> Ocultar Autos do Processo
                            </>
                        ) : (
                            <>
                                <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                                Ver Autos do Processo ({promise.fontes?.length || 0} evidências)
                            </>
                        )}
                    </Button>

                    {isExpanded && (
                        <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300 space-y-6 bg-slate-50 p-5 rounded-xl border border-slate-100">

                            {/* 1. DIMENSÃO FISCAL */}
                            {hasFiscalEvidence ? (
                                <div>
                                    <div className="flex items-center gap-2 mb-3 text-emerald-700 font-bold text-sm uppercase tracking-wide">
                                        <Landmark className="w-4 h-4" /> Dimensão Fiscal (Dados do TCESP)
                                    </div>
                                    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden text-sm">
                                        <div className="divide-y divide-slate-100">
                                            {promise.fontes?.filter(f => f.vl_despesa).map((expense, idx) => (
                                                <div key={idx} className="p-4 hover:bg-slate-50/50 transition-colors">
                                                    {/* Header Row: Supplier, Value, Date */}
                                                    <div className="flex flex-wrap md:flex-nowrap justify-between gap-4 mb-2">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-bold text-slate-700 truncate" title={expense.nm_fornecedor}>
                                                                {expense.nm_fornecedor || "Fornecedor não informado"}
                                                            </p>
                                                            <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                                                {expense.orgao}
                                                                {expense.nr_empenho && (
                                                                    <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-400 font-mono text-[10px]">
                                                                        Empenho: {expense.nr_empenho}
                                                                    </span>
                                                                )}
                                                            </p>
                                                        </div>
                                                        <div className="text-right whitespace-nowrap">
                                                            <p className="font-mono text-emerald-600 font-bold">
                                                                {expense.vl_despesa ?
                                                                    Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(expense.vl_despesa)
                                                                    : '-'}
                                                            </p>
                                                            <p className="text-xs text-slate-400">
                                                                {expense.dt_emissao_despesa ? new Date(expense.dt_emissao_despesa).toLocaleDateString('pt-BR') : '-'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Rich Details: Historico & Tags */}
                                                    <div className="mt-2 bg-slate-50 p-3 rounded border border-slate-100">
                                                        {expense.historico ? (
                                                            <p className="text-xs text-slate-600 leading-relaxed uppercase">
                                                                <span className="font-semibold text-slate-400 block mb-1 text-[10px]">Histórico / Objeto da Despesa:</span>
                                                                {expense.historico}
                                                            </p>
                                                        ) : (
                                                            <p className="text-xs text-slate-400 italic">Sem histórico detalhado dísponivel.</p>
                                                        )}

                                                        {(expense.funcao || expense.subfuncao) && (
                                                            <div className="flex gap-2 mt-2">
                                                                {expense.funcao && (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                                        {expense.funcao}
                                                                    </span>
                                                                )}
                                                                {expense.subfuncao && (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                                        {expense.subfuncao}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-slate-400 italic flex items-center gap-2">
                                    <Landmark className="w-4 h-4" /> Sem evidências fiscais diretas encontradas.
                                </div>
                            )}

                            {hasFiscalEvidence && <Separator />}

                            {/* 2. DIMENSÃO DOCUMENTAL */}
                            {/* Assuming we might have some doc metadata here in future, for now placeholder if needed or check fontes.tipo */}
                            <div className="text-sm text-slate-500">
                                <div className="flex items-center gap-2 mb-2 text-blue-700 font-bold text-sm uppercase tracking-wide">
                                    <ScrollText className="w-4 h-4" /> Dimensão Documental
                                </div>
                                <p className="bg-white border border-blue-100 p-3 rounded text-slate-600 text-xs leading-relaxed">
                                    Promessa identificada no documento oficial <strong>Plano de Governo 2025-2028</strong>.
                                    {promise.trecho_original && (
                                        <span className="block mt-2 italic font-serif text-slate-500 ml-2 border-l-2 border-blue-200 pl-2">
                                            "{promise.trecho_original}"
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
