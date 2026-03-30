"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import {
    ShieldCheck,
    AlertCircle,
    Building2,
    ExternalLink,
    FileText,
    DollarSign,
    Fingerprint,
    Banknote,
    CheckCircle2,
    Search,
    ChevronDown,
    Info,
    Calendar,
    Receipt,
    MapPin,
    AlertTriangle,
    Ghost,
} from "lucide-react";
import { formatCurrency } from "@/lib/fiscal-analytics";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DossieEmendaDrawer from "./DossieEmendaDrawer";
import EmendaAuditCard from "./EmendaAuditCard";

interface RastreabilidadeTabProps {
    politicianId: string;
}

// ── Helper: agrupar matches por município ──
function groupByCity(matches: any[]): { city: string; isCadastrada: boolean; emendas: any[] }[] {
    const groups: Record<string, any[]> = {};
    for (const m of matches) {
        const city = m.municipio_original?.trim() || "Estado da Bahia";
        if (!groups[city]) groups[city] = [];
        groups[city].push(m);
    }

    // Ordenar: cidades cadastradas primeiro, depois "Estado da Bahia" por último
    const entries = Object.entries(groups).map(([city, emendas]) => ({
        city,
        isCadastrada: city !== "Estado da Bahia" && city !== "",
        emendas,
    }));
    entries.sort((a, b) => {
        if (a.isCadastrada && !b.isCadastrada) return -1;
        if (!a.isCadastrada && b.isCadastrada) return 1;
        return b.emendas.length - a.emendas.length;
    });
    return entries;
}

export default function RastreabilidadeTab({ politicianId }: RastreabilidadeTabProps) {
    const [showLowConfidence, setShowLowConfidence] = React.useState(false);
    const [selectedExpense, setSelectedExpense] = React.useState<any>(null);
    const [dossieAmendmentId, setDossieAmendmentId] = React.useState<string | null>(null);
    const [dossieOpen, setDossieOpen] = React.useState(false);
    const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({});

    // States for Filters
    const [filterSearch, setFilterSearch] = React.useState<string>("");
    const [filterYear, setFilterYear] = React.useState<string>("all");
    const [filterMandate, setFilterMandate] = React.useState<string>("all");
    const [filterSegment, setFilterSegment] = React.useState<string>("all");

    const { data, isLoading, error } = useQuery({
        queryKey: ["politicianAudit", politicianId, showLowConfidence],
        queryFn: async () => {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const res = await fetch(`${API_URL}/api/politicians/${politicianId}/audit_trail?show_low_confidence=${showLowConfidence}`);
            if (!res.ok) throw new Error("Erro ao carregar auditoria");
            return res.json();
        },
        staleTime: 1000 * 60 * 10,
    });

    const matches = data?.matches || [];

    // Unique options for filters
    const uniqueYears = React.useMemo(() => {
        const years = new Set(matches.map((m: any) => m.ano_exercicio).filter(Boolean));
        return Array.from(years).sort((a: any, b: any) => b - a) as number[];
    }, [matches]);

    const uniqueSegments = React.useMemo(() => {
        const segs = new Set(matches.map((m: any) => m.area_tematica).filter(Boolean));
        return Array.from(segs).sort() as string[];
    }, [matches]);

    // Apply Filters
    const filteredMatches = React.useMemo(() => {
        return matches.filter((m: any) => {
            // Filter by Year
            if (filterYear !== "all" && String(m.ano_exercicio) !== filterYear) return false;

            // Filter by Mandate
            if (filterMandate === "atual" && (m.ano_exercicio < 2023 || m.ano_exercicio > 2026)) return false;
            if (filterMandate === "anterior" && (m.ano_exercicio < 2019 || m.ano_exercicio > 2022)) return false;

            // Filter by Segment
            if (filterSegment !== "all" && m.area_tematica !== filterSegment) return false;

            // Filter Search (Text/Valores Livres)
            if (filterSearch.trim().length > 0) {
                const term = filterSearch.toLowerCase().trim();
                const objMatch = m.emenda_objeto?.toLowerCase().includes(term);
                const seiMatch = m.sei_numero?.toLowerCase().includes(term);
                const valMatchStr = String(m.emenda_valor || "");
                const isValMatch = valMatchStr.includes(term) || m.emenda_valor?.toString() === term;
                const procMatch = m.processo_sei?.toLowerCase().includes(term);

                // Also check if any payment credor matches
                const credorMatch = m.payments?.some((p: any) => p.credor?.toLowerCase().includes(term));

                if (!objMatch && !seiMatch && !isValMatch && !procMatch && !credorMatch) return false;
            }

            return true;
        });
    }, [matches, filterYear, filterMandate, filterSegment, filterSearch]);

    // ── Métricas globais recalcoladas via filtro ──
    const grouped = groupByCity(filteredMatches);
    const cidadesCadastradas = grouped.filter(g => g.isCadastrada);
    const totalEmendas = filteredMatches.length;
    const totalOrcado = filteredMatches.reduce((s: number, m: any) => s + (m.emenda_valor || 0), 0);
    const totalPago = filteredMatches.reduce((s: number, m: any) => s + (m.valor_pago_total || 0), 0);
    const totalPagamentos = filteredMatches.reduce((s: number, m: any) => s + (m.payments?.length || 0), 0);
    const emendasComSEI = filteredMatches.filter((m: any) => m.sei_numero).length;
    const emendasComMatch = filteredMatches.filter((m: any) => m.matching_expenses?.some((e: any) => e.confidence === "high")).length;

    // KPIs de alerta limitados às emendas filtradas
    const emendasFantasma = filteredMatches.filter((m: any) =>
        (!m.municipio_original || m.municipio_original === "Estado da Bahia") &&
        m.emenda_objeto?.toLowerCase().includes("bonfim")
    ).length;
    const divergencias = filteredMatches.filter((m: any) => m.emenda_valor > 0 && m.valor_pago_total === 0).length;

    const toggleSection = (key: string) => {
        setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Primeiro render: expandir primeira seção por padrão
    React.useEffect(() => {
        if (grouped.length > 0 && Object.keys(expandedSections).length === 0) {
            setExpandedSections({ [grouped[0].city]: true });
        }
    }, [grouped.length]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-indigo-100 rounded-full animate-spin border-t-indigo-600" />
                    <Fingerprint className="w-6 h-6 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="text-sm font-semibold text-slate-500">Cruzando identificadores forenses...</p>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">SEI · Contratos · Notas Fiscais · Empenhos</p>
            </div>
        );
    }

    if (error || !data) {
        return <div className="p-10 text-center text-red-500 font-medium">Erro ao carregar dados de rastreabilidade.</div>;
    }

    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* ═══════════════════════════════════════════════════════════════════
                RESUMO FORENSE
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 rounded-2xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl pointer-events-none" />

                <div className="relative z-10 p-5">
                    {/* Título + Toggle */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/10 backdrop-blur-sm p-2 rounded-xl border border-white/10">
                                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white tracking-tight">Estação de Rastreabilidade Forense</h3>
                                <p className="text-[10px] text-slate-400 font-medium">Emendas LOA → Pagamentos Estaduais → Gastos Municipais TCM-BA</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                            <span className="text-[9px] font-semibold text-slate-400">Baixa confiança</span>
                            <button
                                onClick={() => setShowLowConfidence(!showLowConfidence)}
                                className={`w-8 h-4 rounded-full transition-all relative ${showLowConfidence ? "bg-indigo-500" : "bg-slate-600"}`}
                            >
                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm ${showLowConfidence ? "left-[14px]" : "left-0.5"}`} />
                            </button>
                        </div>
                    </div>

                    {/* KPIs */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                        <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 backdrop-blur-sm">
                            <div className="flex items-center gap-1.5 mb-1">
                                <MapPin className="w-3 h-3 text-blue-400" />
                                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Cidades com Emenda</span>
                            </div>
                            <p className="text-lg font-black text-white">{cidadesCadastradas.length}</p>
                            <p className="text-[9px] text-slate-500 font-medium">{cidadesCadastradas.map(c => c.city).join(", ") || "—"}</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 backdrop-blur-sm">
                            <div className="flex items-center gap-1.5 mb-1">
                                <DollarSign className="w-3 h-3 text-amber-400" />
                                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Orçado → Pago</span>
                            </div>
                            <p className="text-sm font-black text-white">{formatCurrency(totalOrcado)}</p>
                            <p className="text-[10px] font-bold text-emerald-400">{formatCurrency(totalPago)} pago ({totalOrcado > 0 ? ((totalPago / totalOrcado) * 100).toFixed(0) : 0}%)</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 backdrop-blur-sm">
                            <div className="flex items-center gap-1.5 mb-1">
                                <Fingerprint className="w-3 h-3 text-cyan-400" />
                                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Rastreabilidade</span>
                            </div>
                            <p className="text-lg font-black text-white">{emendasComSEI}/{totalEmendas}</p>
                            <p className="text-[9px] text-slate-500 font-medium">emendas com SEI · {totalPagamentos} pagamentos · {emendasComMatch} match TCM</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 backdrop-blur-sm">
                            <div className="flex items-center gap-1.5 mb-1">
                                <AlertTriangle className="w-3 h-3 text-red-400" />
                                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Alertas Ativos</span>
                            </div>
                            <p className="text-lg font-black text-white">{emendasFantasma + divergencias}</p>
                            <div className="flex gap-1 mt-0.5 flex-wrap">
                                {emendasFantasma > 0 && (
                                    <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">{emendasFantasma} fantasma</span>
                                )}
                                {divergencias > 0 && (
                                    <span className="text-[8px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded font-bold">{divergencias} divergência</span>
                                )}
                                {emendasFantasma === 0 && divergencias === 0 && (
                                    <span className="text-[9px] text-emerald-400 font-medium">✓ Nenhum alerta</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                FILTROS ENTERPRISE
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-4 items-center">
                <div className="flex items-center gap-2 text-slate-500 w-full md:w-auto shrink-0 mr-2">
                    <Search className="w-4 h-4" />
                    <span className="text-sm font-bold tracking-tight">Refinar por:</span>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
                    <div className="md:col-span-1">
                        <Input
                            placeholder="Buscar valor, objeto ou SEI..."
                            value={filterSearch}
                            onChange={(e) => setFilterSearch(e.target.value)}
                            className="bg-slate-50 border-slate-200 text-sm h-10 w-full focus-visible:ring-indigo-500"
                        />
                    </div>

                    <Select value={filterYear} onValueChange={setFilterYear}>
                        <SelectTrigger className="bg-slate-50 border-slate-200 h-10">
                            <SelectValue placeholder="Ano de Exercício" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os Anos</SelectItem>
                            {uniqueYears.map((y) => (
                                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filterMandate} onValueChange={setFilterMandate}>
                        <SelectTrigger className="bg-slate-50 border-slate-200">
                            <SelectValue placeholder="Mandato" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Filtro de Mandato (Todos)</SelectItem>
                            <SelectItem value="atual">Mandato Atual (2023–2026)</SelectItem>
                            <SelectItem value="anterior">Mandato Anterior (2019–2022)</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={filterSegment} onValueChange={setFilterSegment}>
                        <SelectTrigger className="bg-slate-50 border-slate-200">
                            <SelectValue placeholder="Segmento" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as Áreas</SelectItem>
                            {uniqueSegments.map((seg) => (
                                <SelectItem key={seg} value={seg}>{seg}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {(filterYear !== "all" || filterMandate !== "all" || filterSegment !== "all" || filterSearch.trim() !== "") && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setFilterSearch("");
                            setFilterYear("all");
                            setFilterMandate("all");
                            setFilterSegment("all");
                        }}
                        className="text-slate-400 hover:text-red-500 px-2"
                    >
                        Limpar
                    </Button>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                AGRUPAMENTO POR MUNICÍPIO
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="space-y-4">
                {grouped.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                        <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-lg font-bold text-slate-600">Nenhuma emenda encontrada.</p>
                        <p className="text-sm text-slate-400">Tente remover ou ajustar os filtros aplicados.</p>
                    </div>
                ) : (
                    grouped.map((group, gIdx) => {
                        const isOpen = expandedSections[group.city] ?? false;
                        const grpOrcado = group.emendas.reduce((s: number, m: any) => s + (m.emenda_valor || 0), 0);
                        const grpPago = group.emendas.reduce((s: number, m: any) => s + (m.valor_pago_total || 0), 0);
                        const grpExec = grpOrcado > 0 ? (grpPago / grpOrcado) * 100 : 0;
                        const grpPagamentos = group.emendas.reduce((s: number, m: any) => s + (m.payments?.length || 0), 0);

                        return (
                            <div key={group.city} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

                                {/* ── Header da Seção (Accordion) ── */}
                                <button
                                    className="w-full text-left"
                                    onClick={() => toggleSection(group.city)}
                                >
                                    {group.isCadastrada ? (
                                        // Cidade cadastrada: banner azul
                                        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-5 py-4 flex items-center gap-4 relative overflow-hidden">
                                            <div className="absolute right-0 top-0 bottom-0 w-48 bg-gradient-to-l from-white/5 to-transparent pointer-events-none" />
                                            <div className="bg-white/15 backdrop-blur-sm p-2.5 rounded-xl border border-white/10 shrink-0">
                                                <Building2 className="w-6 h-6 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0 relative z-10">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <p className="text-base font-black text-white tracking-tight">{group.city}</p>
                                                    <Badge className="bg-white/15 text-white border-0 text-[8px] font-bold py-0 h-4 backdrop-blur-sm">
                                                        Município Cadastrado
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-3 text-[10px] text-blue-200 font-medium">
                                                    <span>{group.emendas.length} emenda{group.emendas.length > 1 ? "s" : ""}</span>
                                                    <span>·</span>
                                                    <span>Orçado: {formatCurrency(grpOrcado)}</span>
                                                    <span>·</span>
                                                    <span>Pago: {formatCurrency(grpPago)}</span>
                                                    <span>·</span>
                                                    <span>{grpExec.toFixed(0)}% execução</span>
                                                    <span>·</span>
                                                    <span>{grpPagamentos} pgto{grpPagamentos > 1 ? "s" : ""}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 relative z-10 shrink-0">
                                                <div
                                                    className="bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg px-3 py-1.5 text-[9px] font-bold text-white uppercase tracking-wider transition-all cursor-pointer"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Abrir dossiê municipal passando os filtros num futuro URL search params
                                                        window.open(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/municipios/dossie?nome=${encodeURIComponent(group.city)}`, "_blank");
                                                    }}
                                                >
                                                    <FileText className="w-3 h-3 inline mr-1" />
                                                    Dossiê Municipal
                                                </div>
                                                <ChevronDown className={`w-5 h-5 text-white/60 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                                            </div>
                                        </div>
                                    ) : (
                                        // Estado da Bahia / Não territorializadas
                                        <div className="bg-slate-50 px-5 py-3.5 flex items-center gap-3 border-b border-slate-100">
                                            <div className="bg-slate-200 p-2 rounded-lg shrink-0">
                                                <MapPin className="w-5 h-5 text-slate-500" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <p className="text-sm font-bold text-slate-700">{group.city || "Sem Município"}</p>
                                                    <Badge variant="outline" className="text-[8px] font-bold text-slate-400 border-slate-300 py-0 h-4">
                                                        Não Territorializadas
                                                    </Badge>
                                                </div>
                                                <p className="text-[10px] text-slate-400 font-medium">
                                                    {group.emendas.length} emenda{group.emendas.length > 1 ? "s" : ""} · {formatCurrency(grpOrcado)} orçado · {formatCurrency(grpPago)} pago
                                                </p>
                                            </div>
                                            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                                        </div>
                                    )}
                                </button>

                                {/* ── Cards de emenda dentro da seção ── */}
                                {isOpen && (
                                    <div className="p-4 space-y-3 bg-slate-50/30 animate-in slide-in-from-top-2 duration-300 fade-in">
                                        {group.emendas.map((match: any, mIdx: number) => (
                                            <EmendaAuditCard
                                                key={match.emenda_id || mIdx}
                                                match={match}
                                                onOpenDossie={(id) => {
                                                    setDossieAmendmentId(id);
                                                    setDossieOpen(true);
                                                }}
                                                onSelectExpense={setSelectedExpense}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    }))}
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                SHEET: Detalhe do Gasto Municipal
            ═══════════════════════════════════════════════════════════════════ */}
            <Sheet open={!!selectedExpense} onOpenChange={(open) => !open && setSelectedExpense(null)}>
                <SheetContent className="sm:max-w-[480px] bg-white p-0 border-l border-slate-200 shadow-2xl overflow-y-auto">
                    <div className={`h-1.5 w-full ${selectedExpense?.confidence === "high" ? "bg-emerald-500" :
                        selectedExpense?.confidence === "medium" ? "bg-amber-500" : "bg-slate-400"
                        }`} />
                    <div className="p-6 space-y-6">
                        <SheetHeader className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Badge className={`text-[9px] font-bold border-0 py-0.5 h-5 ${selectedExpense?.confidence === "high" ? "bg-emerald-100 text-emerald-700" :
                                    selectedExpense?.confidence === "medium" ? "bg-amber-100 text-amber-700" :
                                        "bg-slate-100 text-slate-600"
                                    }`}>
                                    {selectedExpense?.confidence === "high" ? "🛡️ PROVA DIRETA" :
                                        selectedExpense?.confidence === "medium" ? "🟡 VÍNCULO ÓRGÃO" : "⚪ SUGESTÃO"}
                                </Badge>
                                {selectedExpense?.empenho && (
                                    <Badge variant="outline" className="font-mono text-[9px] text-slate-400 border-slate-200 py-0 h-5">
                                        EMP #{selectedExpense.empenho}
                                    </Badge>
                                )}
                            </div>
                            <SheetTitle className="text-xl font-bold text-slate-900 leading-tight">
                                Detalhe do Gasto Municipal
                            </SheetTitle>
                            <SheetDescription className="text-xs text-slate-500">
                                Vínculo: <span className="text-indigo-600 font-bold">{selectedExpense?.match_reason}</span>
                            </SheetDescription>
                        </SheetHeader>

                        <div className="bg-slate-900 rounded-2xl p-5 flex justify-between items-center">
                            <div>
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Valor Auditado</p>
                                <p className="text-3xl font-black text-emerald-400 tracking-tight">
                                    {selectedExpense && formatCurrency(selectedExpense.valor)}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Data</p>
                                <p className="text-base font-bold text-white">{selectedExpense?.data}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                    <Building2 className="w-3 h-3 text-indigo-400" /> Credor / Fornecedor
                                </p>
                                <p className="text-base font-bold text-slate-900">{selectedExpense?.fornecedor}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Órgão</p>
                                    <p className="text-xs font-semibold text-slate-700 truncate">{selectedExpense?.orgao || "Prefeitura Municipal"}</p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fonte Recurso</p>
                                    <p className="text-xs font-semibold text-slate-700 truncate">{selectedExpense?.fonte || "Não especificada"}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                    <Info className="w-3 h-3 text-indigo-400" /> Descrição Completa
                                </p>
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                    <p className="text-sm text-slate-600 leading-relaxed italic">
                                        "{selectedExpense?.historico}"
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                            <Button
                                variant="outline"
                                className="w-full h-10 rounded-xl border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all font-semibold text-xs group"
                                asChild
                            >
                                <a href="https://www.tcm.ba.gov.br/" target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-3.5 h-3.5 mr-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                    Verificar no Portal TCM-BA
                                </a>
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            <DossieEmendaDrawer
                amendmentId={dossieAmendmentId}
                open={dossieOpen}
                onClose={() => { setDossieOpen(false); setDossieAmendmentId(null); }}
            />
        </div>
    );
}
