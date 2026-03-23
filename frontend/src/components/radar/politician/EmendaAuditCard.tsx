"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    ShieldCheck,
    AlertCircle,
    Building2,
    ExternalLink,
    FileText,
    DollarSign,
    TrendingUp,
    LinkIcon,
    Fingerprint,
    Banknote,
    Eye,
    CheckCircle2,
    Search,
    XCircle,
    Ghost,
    AlertTriangle,
    Receipt,
    Calendar,
} from "lucide-react";
import { formatCurrency } from "@/lib/fiscal-analytics";

interface EmendaAuditCardProps {
    match: any;
    onOpenDossie: (amendmentId: string) => void;
    onSelectExpense: (expense: any) => void;
}

export default function EmendaAuditCard({ match, onOpenDossie, onSelectExpense }: EmendaAuditCardProps) {
    const [activeTab, setActiveTab] = React.useState<"pagamentos" | "provas" | "tcm">("pagamentos");

    const execPercent = match.emenda_valor > 0
        ? Math.min(100, (match.valor_pago_total / match.emenda_valor) * 100) : 0;
    const hasPayments = match.payments?.length > 0;
    const highMatches = match.matching_expenses?.filter((e: any) => e.confidence === "high") || [];
    const mediumMatches = match.matching_expenses?.filter((e: any) => e.confidence === "medium") || [];
    const lowMatches = match.matching_expenses?.filter((e: any) => e.confidence === "low") || [];
    const allSeiLinks: string[] = [];
    if (match.sei_numero) allSeiLinks.push(match.sei_numero);
    if (match.processo_sei && match.processo_sei !== match.sei_numero) allSeiLinks.push(match.processo_sei);
    match.payments?.forEach((p: any) => {
        if (p.sei_numero && !allSeiLinks.includes(p.sei_numero)) allSeiLinks.push(p.sei_numero);
    });

    // Situação
    const situacao = hasPayments ? "Execução confirmada" :
        (highMatches.length > 0 || mediumMatches.length > 0) ? "Em auditoria" : "Sem pagamentos";
    const situacaoColor = hasPayments ? "bg-emerald-100 text-emerald-700" :
        situacao === "Em auditoria" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500";
    const SituacaoIcon = hasPayments ? CheckCircle2 : situacao === "Em auditoria" ? Search : XCircle;

    const isFantasma = match.municipio_original === "Estado da Bahia" || !match.municipio_original;

    const tabs = [
        { key: "pagamentos" as const, label: "Pagamentos", count: match.payments?.length || 0 },
        { key: "provas" as const, label: "Provas & SEI", count: allSeiLinks.length },
        { key: "tcm" as const, label: "Município & TCM", count: highMatches.length + mediumMatches.length },
    ];

    return (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all overflow-hidden">

            {/* ═══ HEADER DO CARD ═══ */}
            <div className="px-4 py-3">
                {/* Linha 1: Título + Chips */}
                <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-slate-900 leading-snug line-clamp-2">
                            {match.emenda_objeto}
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className="text-[9px] font-bold text-slate-500 border-slate-200 py-0 h-5">
                            {match.ano_exercicio || "—"}
                        </Badge>
                        {match.area_tematica && (
                            <Badge variant="outline" className="text-[9px] font-bold text-indigo-600 border-indigo-200 bg-indigo-50 py-0 h-5">
                                {match.area_tematica}
                            </Badge>
                        )}
                        <Badge className={`text-[9px] font-bold border-0 py-0 h-5 gap-1 ${situacaoColor}`}>
                            <SituacaoIcon className="w-3 h-3" /> {situacao}
                        </Badge>
                    </div>
                </div>

                {/* Linha 2: Valores + Progress */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Orçado</p>
                            <p className="text-sm font-black text-slate-900">{formatCurrency(match.emenda_valor)}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pago</p>
                            <p className="text-sm font-black text-emerald-600">{formatCurrency(match.valor_pago_total)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-700 ${execPercent >= 80 ? "bg-emerald-500" : execPercent >= 40 ? "bg-amber-500" : "bg-red-400"}`}
                                    style={{ width: `${execPercent}%` }}
                                />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500">{execPercent.toFixed(0)}%</span>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[9px] font-bold uppercase tracking-wider border-indigo-200 text-indigo-600 hover:bg-indigo-50 px-2.5 gap-1 shrink-0"
                        onClick={() => onOpenDossie(match.emenda_id)}
                    >
                        <Eye className="w-3 h-3" /> Dossiê
                    </Button>
                </div>

                {/* Badges de risco */}
                {(isFantasma || (match.valor_pago_total === 0 && match.emenda_valor > 0)) && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                        {isFantasma && match.emenda_objeto?.toLowerCase().includes("bonfim") && (
                            <Badge className="text-[8px] font-bold bg-amber-50 text-amber-700 border border-amber-200 py-0 h-5 gap-1">
                                <Ghost className="w-3 h-3" /> Emenda Fantasma
                            </Badge>
                        )}
                        {match.valor_pago_total === 0 && match.emenda_valor > 0 && (
                            <Badge className="text-[8px] font-bold bg-red-50 text-red-700 border border-red-200 py-0 h-5 gap-1">
                                <AlertTriangle className="w-3 h-3" /> Sem pagamentos
                            </Badge>
                        )}
                    </div>
                )}
            </div>

            {/* ═══ TABS INTERNAS ═══ */}
            <div className="border-t border-slate-100">
                <div className="flex bg-slate-50/80">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-1.5 ${activeTab === tab.key
                                    ? "border-indigo-600 text-indigo-700 bg-white"
                                    : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100/50"
                                }`}
                        >
                            {tab.label}
                            {tab.count > 0 && (
                                <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[8px] font-black ${activeTab === tab.key ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500"
                                    }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ═══ TAB CONTENT ═══ */}
                <div className="px-4 py-3 max-h-[300px] overflow-y-auto">

                    {/* Tab: Pagamentos */}
                    {activeTab === "pagamentos" && (
                        <div className="space-y-1.5">
                            {!hasPayments ? (
                                <div className="py-4 text-center">
                                    <p className="text-[11px] text-slate-400 italic">Nenhum pagamento registrado no Portal da Transparência.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2 mb-2 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                                        <TrendingUp className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                        <p className="text-[9px] font-bold text-amber-700 uppercase tracking-wider">
                                            Fonte: Portal da Transparência — Governo da Bahia
                                        </p>
                                    </div>
                                    {match.payments.map((p: any) => (
                                        <div key={p.id} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 hover:border-emerald-200 transition-colors">
                                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                                <div className="w-1 h-8 rounded-full bg-emerald-400 shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-[11px] font-semibold text-slate-700 truncate">{p.credor || "Credor não identificado"}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                                                            <Calendar className="w-2.5 h-2.5" />
                                                            {p.data_pagamento ? new Date(p.data_pagamento + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
                                                        </span>
                                                        {p.num_empenho && (
                                                            <span className="text-[9px] text-indigo-500 font-mono">EMP {p.num_empenho}</span>
                                                        )}
                                                        {p.sei_numero && (
                                                            <a
                                                                href={`https://www.transparencia.ba.gov.br/sei/${p.sei_numero}`}
                                                                target="_blank" rel="noopener noreferrer"
                                                                className="text-[9px] text-emerald-600 font-bold hover:underline flex items-center gap-0.5"
                                                            >
                                                                <ShieldCheck className="w-2.5 h-2.5" /> SEI
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-[12px] font-bold text-emerald-700 shrink-0 ml-2">
                                                {formatCurrency(p.valor_pago)}
                                            </span>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    )}

                    {/* Tab: Provas & SEI */}
                    {activeTab === "provas" && (
                        <div className="space-y-2">
                            {allSeiLinks.length === 0 ? (
                                <div className="py-4 text-center">
                                    <Fingerprint className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                                    <p className="text-[11px] text-slate-400 italic">Nenhum identificador SEI/Processo extraído para esta emenda.</p>
                                </div>
                            ) : (
                                <>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Identificadores Rastreáveis</p>
                                    {allSeiLinks.map((sei, i) => (
                                        <a
                                            key={`sei-${i}`}
                                            href={`https://www.transparencia.ba.gov.br/sei/${sei}`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 hover:border-emerald-400 rounded-lg px-3 py-2.5 transition-all group"
                                        >
                                            <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
                                                <LinkIcon className="w-3.5 h-3.5 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest leading-none mb-0.5">
                                                    {i === 0 && match.sei_numero === sei ? "Providência Digital (SEI)" : "Processo / Referência"}
                                                </p>
                                                <p className="text-[11px] font-bold text-emerald-800 font-mono truncate">{sei}</p>
                                            </div>
                                            <ExternalLink className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
                                        </a>
                                    ))}
                                    <p className="text-[9px] text-slate-400 mt-2 italic text-center">
                                        Fonte: Portal da Transparência da Bahia / VW_PROCESSO_SEI
                                    </p>
                                </>
                            )}
                        </div>
                    )}

                    {/* Tab: Município & TCM */}
                    {activeTab === "tcm" && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-2 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1.5">
                                <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <p className="text-[9px] font-bold text-blue-700 uppercase tracking-wider">
                                    Fonte: Prefeitura Municipal — Declaração ao TCM-BA
                                </p>
                            </div>

                            {[...highMatches, ...mediumMatches].length === 0 && lowMatches.length === 0 ? (
                                <div className="py-4 text-center">
                                    <Building2 className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                                    <p className="text-[11px] text-slate-400 italic">Nenhum gasto municipal cruzado para esta emenda.</p>
                                    <p className="text-[9px] text-slate-400 mt-0.5">Os dados do TCM-BA podem estar sendo processados.</p>
                                </div>
                            ) : (
                                <>
                                    {[...highMatches, ...mediumMatches].map((exp: any, eIdx: number) => (
                                        <div
                                            key={`hm-${eIdx}`}
                                            className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${exp.confidence === "high"
                                                    ? "border-emerald-200 bg-emerald-50/50"
                                                    : "border-amber-200 bg-amber-50/30"
                                                }`}
                                            onClick={() => onSelectExpense(exp)}
                                        >
                                            <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${exp.confidence === "high" ? "bg-emerald-500" : "bg-amber-500"
                                                }`}>
                                                {exp.confidence === "high"
                                                    ? <ShieldCheck className="w-3 h-3 text-white" />
                                                    : <AlertCircle className="w-3 h-3 text-white" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-semibold text-slate-700 line-clamp-1">{exp.historico}</p>
                                                <span className="text-[9px] text-slate-400">{exp.data} · {exp.fornecedor}</span>
                                            </div>
                                            <span className={`text-[12px] font-bold shrink-0 ${exp.confidence === "high" ? "text-emerald-700" : "text-amber-700"}`}>
                                                {formatCurrency(exp.valor)}
                                            </span>
                                        </div>
                                    ))}

                                    {lowMatches.length > 0 && (
                                        <details className="group mt-1">
                                            <summary className="list-none cursor-pointer flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-[9px] font-bold uppercase tracking-widest">
                                                <span>{lowMatches.length} sugestões indiretas</span>
                                                <span className="group-open:rotate-180 transition-transform text-xs">▼</span>
                                            </summary>
                                            <div className="mt-1 space-y-1 pl-1">
                                                {lowMatches.map((exp: any, eIdx: number) => (
                                                    <div
                                                        key={`low-${eIdx}`}
                                                        className="flex items-center justify-between p-2 bg-white rounded border border-slate-100 hover:border-slate-300 cursor-pointer transition-colors"
                                                        onClick={() => onSelectExpense(exp)}
                                                    >
                                                        <p className="text-[10px] text-slate-500 truncate flex-1 mr-2">{exp.historico}</p>
                                                        <span className="text-[10px] font-semibold text-slate-400">{formatCurrency(exp.valor)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </details>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
