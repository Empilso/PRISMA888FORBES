"use client";

import React, { useState, useMemo } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend
} from "recharts";
import { ChevronLeft, ChevronRight, ArrowUpRight, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from "@/components/ui/sheet";

// ─── Dados Mock ────────────────────────────────────────────────────────────────
const KPIS_PAINEL = { autorizado: 8_400_000, empenhado: 7_200_000, pago: 6_048_000, execucao: 72, municipios: 18 };

const TOP_MUNICIPIOS = [
    { nome: "Senhor do Bonfim", valor: 1_200_000 }, { nome: "Caldeirão Grande", valor: 780_000 },
    { nome: "Capim Grosso", valor: 620_000 }, { nome: "Jaguarari", valor: 510_000 },
    { nome: "Filadélfia", valor: 445_000 }, { nome: "Antônio Gonçalves", valor: 380_000 },
    { nome: "Saúde", valor: 310_000 }, { nome: "Ponto Novo", valor: 260_000 },
    { nome: "Quixabeira", valor: 230_000 }, { nome: "Várzea do Poço", valor: 190_000 },
];

const DISTRIBUICAO_AREAS = [
    { name: "Saúde", value: 2_800_000, color: "#EF4444" },
    { name: "Educação", value: 2_100_000, color: "#3B82F6" },
    { name: "Infraestrutura", value: 1_500_000, color: "#F59E0B" },
    { name: "Esporte", value: 800_000, color: "#22C55E" },
    { name: "Outros", value: 800_000, color: "#94A3B8" },
];

const POR_ANO_EMENDAS = [
    { ano: "2020", autorizado: 1_200_000, pago: 900_000 },
    { ano: "2021", autorizado: 1_500_000, pago: 1_350_000 },
    { ano: "2022", autorizado: 2_100_000, pago: 1_600_000 },
    { ano: "2023", autorizado: 1_800_000, pago: 1_200_000 },
    { ano: "2024", autorizado: 2_400_000, pago: 1_800_000 },
    { ano: "2025", autorizado: 1_900_000, pago: 900_000 },
];

const MOCK_EMENDAS_TABLE: any[] = Array.from({ length: 34 }, (_, i) => ({
    id: `EM-${(i + 1).toString().padStart(4, "0")}`,
    ano: 2020 + (i % 6),
    municipio: TOP_MUNICIPIOS[i % 10].nome,
    area: ["Saúde", "Educação", "Infraestrutura", "Esporte", "Outros"][i % 5],
    acao: `Ação ${i + 1}`,
    autorizado: Math.floor(Math.random() * 500_000 + 100_000),
    empenhado: Math.floor(Math.random() * 400_000 + 80_000),
    pago: Math.floor(Math.random() * 300_000),
    cnpj: `${Math.floor(Math.random() * 90 + 10)}.${Math.floor(Math.random() * 900 + 100)}.000/0001-01`,
    beneficiario: `Prefeitura de ${TOP_MUNICIPIOS[i % 10].nome}`,
}));

function getExecPct(row: any) {
    return row.autorizado > 0 ? Math.round((row.pago / row.autorizado) * 100) : 0;
}
function execColor(pct: number) {
    if (pct > 75) return "#22C55E";
    if (pct >= 40) return "#F59E0B";
    return "#EF4444";
}
function fmt(v: number) {
    if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
    return `R$ ${v.toLocaleString("pt-BR")}`;
}

const CTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return <div className="bg-slate-900 text-white rounded-xl p-3 text-[12px] shadow-xl">
        <p className="font-bold">{payload[0]?.name}</p>
        <p className="text-green-400 font-black">{fmt(payload[0]?.value)}</p>
    </div>;
};
const BTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return <div className="bg-slate-900 text-white rounded-xl p-3 text-[12px] shadow-xl space-y-1">
        <p className="font-bold text-slate-300 mb-1">{label}</p>
        {payload.map((p: any) => (
            <div key={p.name} className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: p.fill || p.color }} />
                    <span className="text-slate-300">{p.name}</span>
                </div>
                <span className="font-bold text-white">{fmt(p.value)}</span>
            </div>
        ))}
    </div>;
};

// ─── Drawer de Detalhe de Emenda ───────────────────────────────────────────────
function EmendaDrawer({ row, open, onClose }: { row: any; open: boolean; onClose: () => void }) {
    if (!row) return null;
    const pct = getExecPct(row);
    return (
        <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
            <SheetContent className="sm:max-w-[488px] bg-white p-0 overflow-y-auto border-l border-slate-100 shadow-2xl" side="right">
                <div className="h-1.5 w-full bg-green-500" />
                <div className="p-6 space-y-5">
                    <SheetHeader>
                        <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">📊 Emendas BA Painel</div>
                        <SheetTitle className="text-xl font-black text-slate-900">Emenda {row.id}</SheetTitle>
                        <SheetDescription className="text-slate-500">{row.acao} · {row.municipio}</SheetDescription>
                    </SheetHeader>

                    {/* ① Dados */}
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">① Dados</p>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                ["Ano", row.ano], ["Município", row.municipio], ["Área", row.area], ["ID", row.id]
                            ].map(([k, v]) => (
                                <div key={k} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{k}</p>
                                    <p className="text-[13px] font-semibold text-slate-900">{v}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ② Valores */}
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">② Valores Orçamentários</p>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { k: "Autorizado", v: fmt(row.autorizado), col: "text-slate-900" },
                                { k: "Empenhado", v: fmt(row.empenhado), col: "text-slate-900" },
                                { k: "Pago", v: fmt(row.pago), col: "text-green-600" },
                                { k: "Execução", v: `${pct}%`, col: pct > 75 ? "text-green-600" : pct >= 40 ? "text-yellow-600" : "text-red-600" },
                            ].map(({ k, v, col }) => (
                                <div key={k} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{k}</p>
                                    <p className={`text-[20px] font-black ${col}`}>{v}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ③ Beneficiário */}
                    <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
                        <p className="text-[10px] font-bold text-green-700 uppercase tracking-widest mb-2">③ Beneficiário</p>
                        <p className="font-bold text-slate-900">{row.beneficiario}</p>
                        <p className="text-[12px] font-mono text-slate-500 mt-1">{row.cnpj}</p>
                        <a href="#" className="text-[12px] font-bold text-green-600 flex items-center gap-1 mt-2">Buscar Brasil.IO <ArrowUpRight className="w-3 h-3" /></a>
                    </div>

                    {/* ④ Alerta de cruzamento */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
                        <p className="text-[11px] font-bold text-yellow-800 flex items-center gap-1.5">⚠️ Cruzamento detectado</p>
                        <p className="text-[12px] text-slate-600 mt-1">Este CNPJ também aparece em Verbas Gabinete — analisar duplo benefício.</p>
                    </div>

                    {/* ⑤ Ações */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                        <button className="py-2.5 rounded-xl border border-slate-200 text-slate-700 text-[11px] font-bold hover:bg-slate-50 transition-colors">↗ Painel</button>
                        <button className="py-2.5 rounded-xl border border-slate-200 text-slate-700 text-[11px] font-bold hover:bg-slate-50 transition-colors">📁 Dossiê</button>
                        <button className="py-2.5 rounded-xl border border-slate-200 text-slate-700 text-[11px] font-bold hover:bg-slate-50 transition-colors">🔍 TCM</button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

// ─── Sub-Tab Resumo Painel ─────────────────────────────────────────────────────
function EmendasPainelResumo() {
    const execPct = KPIS_PAINEL.execucao;
    const execC = execPct > 75 ? "#22C55E" : execPct >= 40 ? "#F59E0B" : "#EF4444";

    return (
        <div className="space-y-8">
            {/* KPIs */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-slate-100">
                    {[
                        { label: "Autorizado", value: fmt(KPIS_PAINEL.autorizado), special: false },
                        { label: "Empenhado", value: fmt(KPIS_PAINEL.empenhado), special: false },
                        { label: "Pago", value: fmt(KPIS_PAINEL.pago), special: false },
                        { label: "Taxa Execução", value: `${KPIS_PAINEL.execucao}%`, special: true },
                        { label: "Municípios Benef.", value: KPIS_PAINEL.municipios.toString(), special: false },
                    ].map(({ label, value, special }) => (
                        <div key={label} className="p-5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{label}</p>
                            <p className={`text-[22px] font-black tracking-tight ${special ? "" : "text-slate-900"}`}
                                style={special ? { color: execC } : {}}>
                                {value}
                            </p>
                            {special && (
                                <div className="h-1 bg-slate-100 rounded-full mt-2 overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${execPct}%`, background: execC }} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Top Municípios */}
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
                    <p className="text-[13px] font-bold text-slate-900 mb-4">Top 10 Municípios</p>
                    <div className="space-y-2">
                        {TOP_MUNICIPIOS.map((m, i) => {
                            const pct = (m.valor / TOP_MUNICIPIOS[0].valor) * 100;
                            return (
                                <div key={i} className="flex items-center gap-3">
                                    <span className="text-[11px] text-slate-400 font-bold w-4">{i + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-semibold text-slate-700 truncate">{m.nome}</p>
                                        <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-900 whitespace-nowrap">{fmt(m.valor)}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Donut Áreas */}
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
                    <p className="text-[13px] font-bold text-slate-900 mb-4">Distribuição por Área</p>
                    <div className="flex items-center gap-4">
                        <ResponsiveContainer width={150} height={150}>
                            <PieChart>
                                <Pie data={DISTRIBUICAO_AREAS} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={68} strokeWidth={2} stroke="#fff">
                                    {DISTRIBUICAO_AREAS.map((c, i) => <Cell key={i} fill={c.color} />)}
                                </Pie>
                                <Tooltip content={<CTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex-1 space-y-2">
                            {DISTRIBUICAO_AREAS.map((c) => (
                                <div key={c.name} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                                        <span className="text-[12px] text-slate-600 font-medium">{c.name}</span>
                                    </div>
                                    <span className="text-[12px] font-bold text-slate-900">{fmt(c.value)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Barras Por Ano */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
                <p className="text-[13px] font-bold text-slate-900 mb-4">Execução por Ano</p>
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={POR_ANO_EMENDAS} barGap={4} barCategoryGap={20} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                        <XAxis dataKey="ano" tick={{ fontSize: 12, fill: "#94A3B8", fontWeight: 600 }} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={fmt} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={60} />
                        <Tooltip content={<BTooltip />} />
                        <Bar dataKey="autorizado" name="Autorizado" fill="#BBF7D0" radius={[4, 4, 0, 0]} maxBarSize={28} />
                        <Bar dataKey="pago" name="Pago" fill="#16A34A" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-6 justify-center mt-2">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#BBF7D0]" /><span className="text-[12px] text-slate-500 font-medium">Autorizado</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#16A34A]" /><span className="text-[12px] text-slate-500 font-medium">Pago</span></div>
                </div>
            </div>

            {/* Card Alerta Execução */}
            <div className="bg-white border border-amber-200 rounded-2xl shadow-sm p-5 flex items-start gap-4">
                <span className="text-2xl mt-0.5">📊</span>
                <div className="flex-1">
                    <p className="font-bold text-slate-900 text-[14px] mb-1">Análise de Execução</p>
                    <p className="text-[13px] text-slate-600">3 emendas com menos de 20% de execução</p>
                    <p className="text-[12px] text-slate-400 mt-0.5">Valor total não executado: <strong className="text-slate-700">R$ 1.340.000</strong></p>
                </div>
                <button className="text-[12px] font-bold text-amber-600 whitespace-nowrap flex items-center gap-1 mt-0.5">
                    Ver emendas →
                </button>
            </div>
        </div>
    );
}

// ─── Sub-Tab Dados Completos Emendas ──────────────────────────────────────────
function EmendasDadosCompletos({ variant }: { variant: "painel" | "dados" }) {
    const PAGE_SIZE = 20;
    const [page, setPage] = useState(0);
    const [filterAno, setFilterAno] = useState("all");
    const [filterMunicipio, setFilterMunicipio] = useState("all");
    const [filterArea, setFilterArea] = useState("all");
    const [selectedRow, setSelectedRow] = useState<any>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const hasFilters = filterAno !== "all" || filterMunicipio !== "all" || filterArea !== "all";

    const filtered = useMemo(() => MOCK_EMENDAS_TABLE.filter(r => {
        if (filterAno !== "all" && String(r.ano) !== filterAno) return false;
        if (filterMunicipio !== "all" && r.municipio !== filterMunicipio) return false;
        if (filterArea !== "all" && r.area !== filterArea) return false;
        return true;
    }), [filterAno, filterMunicipio, filterArea]);

    const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

    return (
        <div>
            {variant === "dados" && (
                <div className="flex items-center justify-end mb-4">
                    <button className="text-[12px] font-bold text-emerald-600 border border-emerald-200 px-4 py-2 rounded-full hover:bg-emerald-50 transition-colors">
                        📤 Exportar CSV
                    </button>
                </div>
            )}

            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
                <Select value={filterAno} onValueChange={(v) => { setFilterAno(v); setPage(0); }}>
                    <SelectTrigger className="h-9 w-24 text-[12px] bg-slate-50 border-slate-200"><SelectValue placeholder="Ano ▼" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os anos</SelectItem>
                        {["2025", "2024", "2023", "2022", "2021", "2020"].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={filterMunicipio} onValueChange={(v) => { setFilterMunicipio(v); setPage(0); }}>
                    <SelectTrigger className="h-9 w-44 text-[12px] bg-slate-50 border-slate-200"><SelectValue placeholder="Município ▼" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os municípios</SelectItem>
                        {TOP_MUNICIPIOS.map(m => <SelectItem key={m.nome} value={m.nome}>{m.nome}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={filterArea} onValueChange={(v) => { setFilterArea(v); setPage(0); }}>
                    <SelectTrigger className="h-9 w-36 text-[12px] bg-slate-50 border-slate-200"><SelectValue placeholder="Área ▼" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas as áreas</SelectItem>
                        {["Saúde", "Educação", "Infraestrutura", "Esporte", "Outros"].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                </Select>
                {hasFilters && (
                    <Button variant="ghost" size="sm" onClick={() => { setFilterAno("all"); setFilterMunicipio("all"); setFilterArea("all"); setPage(0); }}
                        className="h-9 text-slate-400 hover:text-red-500 text-[12px]">
                        <X className="w-3.5 h-3.5 mr-1" /> Limpar
                    </Button>
                )}
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                        <thead>
                            <tr className="border-b border-slate-100">
                                {["Ano", "Município", "Área", "Ação", "Autorizado", "Empenhado", "Pago", "Exec%", "CNPJ Benef.", "···"].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.map((row) => {
                                const pct = getExecPct(row);
                                const c = execColor(pct);
                                return (
                                    <tr key={row.id} className="border-b border-slate-50/70 cursor-pointer hover:bg-slate-50 transition-colors"
                                        onClick={() => { setSelectedRow(row); setDrawerOpen(true); }}>
                                        <td className="px-4 py-3 text-slate-600 font-semibold">{row.ano}</td>
                                        <td className="px-4 py-3 text-slate-800 font-medium whitespace-nowrap">{row.municipio}</td>
                                        <td className="px-4 py-3"><Badge variant="outline" className="text-[10px]">{row.area}</Badge></td>
                                        <td className="px-4 py-3 text-slate-500 max-w-[120px] truncate">{row.acao}</td>
                                        <td className="px-4 py-3 text-slate-900 font-semibold whitespace-nowrap">{fmt(row.autorizado)}</td>
                                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{fmt(row.empenhado)}</td>
                                        <td className="px-4 py-3 font-semibold whitespace-nowrap" style={{ color: c }}>{fmt(row.pago)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c }} />
                                                </div>
                                                <span className="text-[11px] font-bold" style={{ color: c }}>{pct}%</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-[11px] text-slate-400">{row.cnpj}</td>
                                        <td className="px-4 py-3"><button className="text-slate-300 hover:text-slate-700">···</button></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100">
                    <span className="text-[12px] text-slate-400 font-medium">
                        Exibindo {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {filtered.length} registros
                    </span>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        {Array.from({ length: Math.min(4, totalPages) }, (_, i) => i).map(p => (
                            <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-[13px] font-bold transition-colors ${page === p ? "bg-slate-900 text-white" : "hover:bg-slate-100 text-slate-500"}`}>{p + 1}</button>
                        ))}
                        <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
            <EmendaDrawer row={selectedRow} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        </div>
    );
}

// ─── Tab: Emendas BA Painel ────────────────────────────────────────────────────
export function EmendasBaPainelTab() {
    const [sub, setSub] = useState<"resumo" | "dados">("resumo");
    return (
        <div className="animate-in fade-in duration-500">
            <div className="flex items-center gap-2 mb-6 bg-slate-100/50 p-1 rounded-full w-max border border-slate-200">
                <button onClick={() => setSub("resumo")} className={`px-5 py-1.5 rounded-full text-[13px] font-bold transition-all ${sub === "resumo" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>📊 Resumo</button>
                <button onClick={() => setSub("dados")} className={`px-5 py-1.5 rounded-full text-[13px] font-bold transition-all ${sub === "dados" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>📋 Dados Completos</button>
            </div>
            {sub === "resumo" ? <EmendasPainelResumo /> : <EmendasDadosCompletos variant="painel" />}
        </div>
    );
}

// ─── Dados Históricos para Tab Dados Abertos ────────────────────────────────
const HISTORICO_SERIE = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025].map(ano => ({
    ano: String(ano),
    valor: Math.floor(Math.random() * 2_500_000 + 500_000),
    media_alba: Math.floor(Math.random() * 1_800_000 + 600_000),
}));

function EmendasDadosResumo() {
    const pico = HISTORICO_SERIE.reduce((a, b) => a.valor > b.valor ? a : b);
    const menor = HISTORICO_SERIE.reduce((a, b) => a.valor < b.valor ? a : b);
    const total = HISTORICO_SERIE.reduce((s, r) => s + r.valor, 0);

    const AreaTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        return <div className="bg-slate-900 text-white rounded-xl p-3 text-[12px] shadow-xl">
            <p className="font-bold text-slate-300 mb-1">{label}</p>
            <p className="font-black text-emerald-400">{fmt(payload[0]?.value)}</p>
        </div>;
    };
    const CompTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        const dep = payload.find((p: any) => p.dataKey === "valor");
        const avg = payload.find((p: any) => p.dataKey === "media_alba");
        return <div className="bg-slate-900 text-white rounded-xl p-3 text-[12px] shadow-xl space-y-1">
            <p className="font-bold text-slate-300 mb-1">{label}</p>
            <div className="flex items-center gap-2 justify-between"><span className="text-slate-300 flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-400" /> Este deputado</span><span className="font-bold">{fmt(dep?.value || 0)}</span></div>
            <div className="flex items-center gap-2 justify-between"><span className="text-slate-300 flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-400" /> Média ALBA</span><span className="font-bold">{fmt(avg?.value || 0)}</span></div>
        </div>;
    };

    return (
        <div className="space-y-8">
            {/* KPIs Históricos */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="grid grid-cols-2 lg:grid-cols-5 divide-x divide-y lg:divide-y-0 divide-slate-100">
                    {[
                        { label: "Anos cobertos", value: "8 anos" },
                        { label: "Total registros", value: MOCK_EMENDAS_TABLE.length.toString() },
                        { label: "Total histórico", value: fmt(total) },
                        { label: "Pico de gastos", value: pico.ano },
                        { label: "Menor execução", value: menor.ano },
                    ].map(({ label, value }) => (
                        <div key={label} className="p-5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{label}</p>
                            <p className="text-[22px] font-black text-slate-900 tracking-tight">{value}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Série histórica */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
                <p className="text-[13px] font-bold text-slate-900 mb-4">Série histórica completa (2018–2025)</p>
                <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={HISTORICO_SERIE} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                        <defs>
                            <linearGradient id="emendasGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22C55E" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                        <XAxis dataKey="ano" tick={{ fontSize: 12, fill: "#94A3B8", fontWeight: 600 }} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={fmt} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={60} />
                        <Tooltip content={<AreaTooltip />} />
                        <Area type="monotone" dataKey="valor" stroke="#22C55E" strokeWidth={2.5} fill="url(#emendasGrad)" dot={{ r: 4, fill: "#22C55E", strokeWidth: 0 }} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Comparativo ALBA */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
                <p className="text-[13px] font-bold text-slate-900 mb-4">Este deputado vs Média da ALBA</p>
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={HISTORICO_SERIE} barGap={3} barCategoryGap={16} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                        <XAxis dataKey="ano" tick={{ fontSize: 11, fill: "#94A3B8", fontWeight: 600 }} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={fmt} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={60} />
                        <Tooltip content={<CompTooltip />} />
                        <Bar dataKey="media_alba" name="Média ALBA" fill="#93C5FD" radius={[3, 3, 0, 0]} maxBarSize={22} />
                        <Bar dataKey="valor" name="Este deputado" fill="#22C55E" radius={[3, 3, 0, 0]} maxBarSize={22} />
                    </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-6 justify-center mt-2">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#93C5FD]" /><span className="text-[12px] text-slate-500 font-medium">Média ALBA</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#22C55E]" /><span className="text-[12px] text-slate-500 font-medium">Este deputado</span></div>
                </div>
            </div>
        </div>
    );
}

// ─── Tab: Emendas BA Dados Abertos ────────────────────────────────────────────
export function EmendasBaDadosTab() {
    const [sub, setSub] = useState<"resumo" | "dados">("resumo");
    return (
        <div className="animate-in fade-in duration-500">
            <div className="flex items-center gap-2 mb-6 bg-slate-100/50 p-1 rounded-full w-max border border-slate-200">
                <button onClick={() => setSub("resumo")} className={`px-5 py-1.5 rounded-full text-[13px] font-bold transition-all ${sub === "resumo" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>📊 Resumo</button>
                <button onClick={() => setSub("dados")} className={`px-5 py-1.5 rounded-full text-[13px] font-bold transition-all ${sub === "dados" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>📋 Dados Completos</button>
            </div>
            {sub === "resumo" ? <EmendasDadosResumo /> : <EmendasDadosCompletos variant="dados" />}
        </div>
    );
}
