"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, Sector,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
    ChevronDown, ChevronRight, Receipt, TrendingUp, Coins, Search,
    AlertCircle, Loader2, MapPin
} from "lucide-react";
import dynamic from "next/dynamic";

const EmendasMap = dynamic(() => import("@/components/radar/EmendasMap"), {
    ssr: false,
    loading: () => <div className="h-full w-full flex flex-col gap-3 items-center justify-center bg-slate-50 text-slate-400 border border-slate-200 rounded-2xl animate-pulse"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /> Carregando mapa interativo...</div>
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface Amendment {
    id: string;
    ano_exercicio: number;
    orgao: string | null;
    municipio_original: string | null;
    acao_programa: string | null;
    objeto_detalhado: string | null;
    area_tematica: string | null;
    valor_orcado_atual: number;
    valor_empenhado: number;
    valor_pago: number;
}

interface YearSummary { ano: number; qtd: number; orcado: number; pago: number; }
interface AreaSummary { area: string; qtd: number; orcado: number; pago: number; }

interface CityAmendmentSummary {
    city_id: string | null;
    city_name: string;
    city_slug: string | null;
    lat?: number;
    lng?: number;
    qtd_emendas: number;
    total_orcado: number;
    total_pago: number;
}

interface AmendmentsData {
    politician_id: string;
    total_registros: number;
    total_cidades: number;
    total_orcado: number;
    total_empenhado: number;
    total_pago: number;
    por_ano: YearSummary[];
    por_area: AreaSummary[];
    por_cidade: CityAmendmentSummary[];
    emendas: Amendment[];
}

interface Props {
    politicianId: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const BRL = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

const AREA_COLORS: Record<string, string> = {
    "Saúde": "#3b82f6",
    "Educação": "#8b5cf6",
    "Esporte": "#10b981",
    "Infraestrutura": "#f59e0b",
    "Agricultura": "#84cc16",
    "Turismo": "#06b6d4",
    "Segurança": "#ef4444",
    "Social": "#ec4899",
    "Outros": "#94a3b8",
};

const AREA_BADGE: Record<string, string> = {
    "Saúde": "bg-blue-100 text-blue-700 border-blue-200",
    "Educação": "bg-purple-100 text-purple-700 border-purple-200",
    "Esporte": "bg-emerald-100 text-emerald-700 border-emerald-200",
    "Infraestrutura": "bg-amber-100 text-amber-700 border-amber-200",
    "Agricultura": "bg-lime-100 text-lime-700 border-lime-200",
    "Turismo": "bg-cyan-100 text-cyan-700 border-cyan-200",
    "Segurança": "bg-red-100 text-red-700 border-red-200",
    "Social": "bg-pink-100 text-pink-700 border-pink-200",
    "Outros": "bg-slate-100 text-slate-700 border-slate-200",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon: Icon, color }: {
    label: string; value: string; icon: React.ElementType; color: string;
}) {
    return (
        <div className={`rounded-2xl border p-5 flex items-start gap-4 bg-white shadow-sm`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
                <p className="text-2xl font-black text-slate-900 leading-none">{value}</p>
            </div>
        </div>
    );
}

function AmendmentRow({ item }: { item: Amendment }) {
    const [expanded, setExpanded] = useState(false);
    const areaColor = AREA_BADGE[item.area_tematica || "Outros"] || AREA_BADGE["Outros"];

    return (
        <>
            <tr
                className="border-b border-slate-100 hover:bg-slate-50/60 cursor-pointer transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <td className="px-4 py-3 text-sm text-slate-600 font-mono">{item.ano_exercicio}</td>
                <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-xs ${areaColor}`}>
                        {item.area_tematica || "Outros"}
                    </Badge>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                    {item.municipio_original === "Estado da Bahia" || !item.municipio_original
                        ? <span className="text-slate-400 italic">Estadual</span>
                        : item.municipio_original}
                </td>
                <td className="px-4 py-3 text-sm text-slate-700 max-w-xs truncate">
                    {item.acao_programa}
                </td>
                <td className="px-4 py-3 text-sm text-right font-medium text-slate-800">
                    {BRL(item.valor_orcado_atual)}
                </td>
                <td className="px-4 py-3 text-sm text-right font-bold text-emerald-700">
                    {BRL(item.valor_pago)}
                </td>
                <td className="px-4 py-3 text-center">
                    {expanded
                        ? <ChevronDown className="w-4 h-4 text-slate-400 mx-auto" />
                        : <ChevronRight className="w-4 h-4 text-slate-400 mx-auto" />}
                </td>
            </tr>
            {expanded && (
                <tr className="bg-indigo-50/40 border-b border-indigo-100">
                    <td colSpan={7} className="px-6 py-4">
                        <div className="flex items-start gap-3">
                            <Receipt className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-xs font-semibold text-indigo-600 mb-1 uppercase tracking-wide">
                                    Objeto Detalhado
                                </p>
                                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                    {item.objeto_detalhado || "—"}
                                </p>
                                <div className="flex gap-4 mt-3 text-xs text-slate-500">
                                    <span>Órgão: <strong>{item.orgao || "—"}</strong></span>
                                    <span>Empenhado: <strong className="text-amber-700">{BRL(item.valor_empenhado)}</strong></span>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function EmendasTab({ politicianId }: Props) {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    const [data, setData] = useState<AmendmentsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filtros locais
    const [filterYear, setFilterYear] = useState<string>("all");
    const [filterArea, setFilterArea] = useState<string>("all");
    const [filterMunicipio, setFilterMunicipio] = useState("");

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(
                    `${API_URL}/api/politicians/${politicianId}/amendments?limit=200`
                );
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                setData(json);
            } catch (e: any) {
                setError(e.message || "Erro ao carregar emendas");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [politicianId]);

    // Filtros aplicados localmente (os dados já vêm todos da API)
    const filtered = useMemo(() => {
        if (!data) return [];
        return data.emendas.filter((e) => {
            const matchYear = filterYear === "all" || e.ano_exercicio === parseInt(filterYear);
            const matchArea = filterArea === "all" || e.area_tematica === filterArea;
            const matchMun = !filterMunicipio ||
                (e.municipio_original || "").toLowerCase().includes(filterMunicipio.toLowerCase());
            return matchYear && matchArea && matchMun;
        });
    }, [data, filterYear, filterArea, filterMunicipio]);

    // Anos únicos para o filtro
    const years = useMemo(() =>
        data ? [...new Set(data.emendas.map(e => e.ano_exercicio))].sort() : [],
        [data]);

    // Áreas únicas para o filtro
    const areas = useMemo(() =>
        data ? [...new Set(data.emendas.map(e => e.area_tematica || "Outros"))].sort() : [],
        [data]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Carregando emendas...</span>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex items-center justify-center py-20 gap-3 text-red-500">
                <AlertCircle className="w-6 h-6" />
                <span>{error || "Dados não encontrados."}</span>
            </div>
        );
    }

    // Dados do gráfico de barras — usa todos (não filtrado) para contexto
    const barData = data.por_ano.map(y => ({
        ano: String(y.ano),
        "Orçado": Math.round(y.orcado),
        "Pago": Math.round(y.pago),
    }));

    // Dados da pizza — usa filtrado se há filtro, senão todos
    const pieSource = (filterArea !== "all" || filterYear !== "all" || filterMunicipio)
        ? (() => {
            const agg: Record<string, number> = {};
            filtered.forEach(e => {
                const k = e.area_tematica || "Outros";
                agg[k] = (agg[k] || 0) + e.valor_orcado_atual;
            });
            return Object.entries(agg).map(([area, orcado]) => ({ area, orcado }));
        })()
        : data.por_area.map(a => ({ area: a.area, orcado: a.orcado }));

    // KPIs filtrados
    const kpiOrcado = filtered.reduce((s, e) => s + e.valor_orcado_atual, 0);
    const kpiPago = filtered.reduce((s, e) => s + e.valor_pago, 0);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* ── KPIs ─────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Total Orçado" value={BRL(kpiOrcado)}
                    icon={TrendingUp} color="bg-indigo-500" />
                <KpiCard label="Total Pago" value={BRL(kpiPago)}
                    icon={Coins} color="bg-emerald-500" />
                <KpiCard label="Nº de Emendas" value={String(filtered.length)}
                    icon={Receipt} color="bg-amber-500" />
                {/* O Total de Cidades pegamos do data base para representar a cobertura da carteira do parlamentar */}
                <KpiCard label="Cidades" value={String(data.total_cidades)}
                    icon={MapPin} color="bg-blue-500" />
            </div>

            {/* ── Mapa de Calor (Destinação Geográfica) ── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 tracking-wide uppercase">
                        <MapPin className="w-4 h-4 text-indigo-500" /> Mapa de Destinação (Bahia)
                    </h3>
                    <Badge variant="outline" className="text-[10px] font-mono bg-white text-slate-600 border-slate-200">
                        {data.por_cidade.length} municípios mapeados
                    </Badge>
                </div>
                <div className="h-[400px] w-full relative z-0">
                    <EmendasMap data={data.por_cidade} />
                </div>
            </div>

            {/* ── Gráficos ──────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Barras: Orçado vs Pago por ano */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-5">
                        Orçado vs Pago por Ano
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={barData} barGap={4}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="ano" tick={{ fontSize: 12, fill: "#64748b" }} />
                            <YAxis
                                tick={{ fontSize: 11, fill: "#94a3b8" }}
                                tickFormatter={(v) => `R$${(v / 1e6).toFixed(1)}M`}
                            />
                            <Tooltip
                                formatter={(v: any) => BRL(v as number)}
                                contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
                            />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Bar dataKey="Orçado" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Pago" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Pizza: Por área */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-5">
                        Por Área Temática
                    </h3>
                    <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                            <Pie
                                data={pieSource}
                                dataKey="orcado"
                                nameKey="area"
                                cx="50%" cy="50%"
                                innerRadius={45} outerRadius={75}
                                paddingAngle={3}
                            >
                                {pieSource.map((entry, i) => (
                                    <Cell
                                        key={entry.area}
                                        fill={AREA_COLORS[entry.area] || "#94a3b8"}
                                    />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(v: any) => BRL(v as number)}
                                contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Legenda manual */}
                    <div className="mt-3 grid grid-cols-2 gap-y-1.5">
                        {pieSource.slice(0, 8).map(e => (
                            <div key={e.area} className="flex items-center gap-1.5">
                                <div
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: AREA_COLORS[e.area] || "#94a3b8" }}
                                />
                                <span className="text-xs text-slate-600 truncate">{e.area}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Filtros ───────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 items-center">
                    <h3 className="text-sm font-bold text-slate-700 flex-1">
                        Tabela de Emendas
                        <span className="ml-2 text-xs font-normal text-slate-400">
                            {filtered.length} de {data.total_registros}
                        </span>
                    </h3>

                    {/* Filtro Ano */}
                    <Select value={filterYear} onValueChange={setFilterYear}>
                        <SelectTrigger className="w-[120px] h-9 text-xs bg-slate-50 border-slate-200">
                            <SelectValue placeholder="Ano" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os anos</SelectItem>
                            {years.map(y => (
                                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Filtro Área */}
                    <Select value={filterArea} onValueChange={setFilterArea}>
                        <SelectTrigger className="w-[150px] h-9 text-xs bg-slate-50 border-slate-200">
                            <SelectValue placeholder="Área" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as áreas</SelectItem>
                            {areas.map(a => (
                                <SelectItem key={a} value={a}>{a}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Filtro Município */}
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <Input
                            placeholder="Município..."
                            className="pl-8 h-9 w-[180px] text-xs bg-slate-50 border-slate-200"
                            value={filterMunicipio}
                            onChange={e => setFilterMunicipio(e.target.value)}
                        />
                    </div>

                    {(filterYear !== "all" || filterArea !== "all" || filterMunicipio) && (
                        <Button
                            variant="ghost" size="sm"
                            className="text-xs text-slate-400 hover:text-slate-700 h-9"
                            onClick={() => { setFilterYear("all"); setFilterArea("all"); setFilterMunicipio(""); }}
                        >
                            Limpar filtros
                        </Button>
                    )}
                </div>

                {/* ── Tabela ─────────────────────────── */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                {["Ano", "Área", "Município", "Ação / Programa", "Orçado", "Pago", ""].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-16 text-center text-slate-400">
                                        Nenhuma emenda encontrada para os filtros selecionados.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(item => (
                                    <AmendmentRow key={item.id} item={item} />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Totais do filtro atual */}
                {filtered.length > 0 && (
                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-6 text-sm">
                        <span className="text-slate-500">
                            Total orçado: <strong className="text-slate-800">{BRL(kpiOrcado)}</strong>
                        </span>
                        <span className="text-slate-500">
                            Total pago: <strong className="text-emerald-700">{BRL(kpiPago)}</strong>
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
