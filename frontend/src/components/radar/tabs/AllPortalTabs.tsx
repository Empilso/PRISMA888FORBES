"use client";

import React, { useState, useMemo } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, ComposedChart
} from "recharts";
import { ExternalLink, ChevronLeft, ChevronRight, X, AlertTriangle, FileText, ArrowUpRight, Network } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmt(v: number) {
    if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
    return `R$ ${v.toLocaleString("pt-BR")}`;
}

function SimpleKpis({ items }: { items: Array<{ label: string; value: string; color?: string }> }) {
    return (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className={`grid divide-x divide-slate-100`} style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
                {items.map(({ label, value, color }) => (
                    <div key={label} className="p-5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{label}</p>
                        <p className={`text-[22px] font-black tracking-tight ${color || "text-slate-900"}`}>{value}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

function SubTabPill({ sub, setSub }: { sub: string; setSub: (v: any) => void }) {
    return (
        <div className="flex items-center gap-2 mb-6 bg-slate-100/50 p-1 rounded-full w-max border border-slate-200">
            <button onClick={() => setSub("resumo")} className={`px-5 py-1.5 rounded-full text-[13px] font-bold transition-all ${sub === "resumo" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>📊 Resumo</button>
            <button onClick={() => setSub("dados")} className={`px-5 py-1.5 rounded-full text-[13px] font-bold transition-all ${sub === "dados" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>📋 Dados Completos</button>
        </div>
    );
}

function EmptyPortal({ label, subtitle }: { label: string; subtitle?: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-white border border-dashed border-slate-200 rounded-[28px] mt-4">
            <span className="text-5xl mb-4">🚫</span>
            <h3 className="text-[18px] font-bold text-slate-700">{label}</h3>
            {subtitle && <p className="text-[13px] text-slate-400 mt-1">{subtitle}</p>}
        </div>
    );
}

function GenericTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-slate-900 text-white rounded-xl p-3 text-[12px] shadow-xl space-y-1">
            <p className="font-bold text-slate-300 mb-1">{label}</p>
            {payload.map((p: any) => (
                <div key={p.name} className="flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: p.fill || p.color || p.stroke }} /><span className="text-slate-300">{p.name || p.dataKey}</span></div>
                    <span className="font-bold text-white">{typeof p.value === "number" && p.value > 999 ? fmt(p.value) : p.value}</span>
                </div>
            ))}
        </div>
    );
}

// ─── SEPLAN LOA ────────────────────────────────────────────────────────────────
const LOA_ANOS = [
    { ano: "LOA 2024", emendas: 12, valor: 8_400_000, areas: "Saúde 45% | Educ. 30%", disponivel: true },
    { ano: "LOA 2023", emendas: 10, valor: 6_200_000, areas: "Infra 40% | Saúde 30%", disponivel: true },
    { ano: "LOA 2022", emendas: 9, valor: 5_800_000, areas: "Educ. 35% | Esporte 25%", disponivel: true },
    { ano: "LOA 2021", emendas: 8, valor: 4_900_000, areas: "Saúde 50% | Infra 30%", disponivel: false },
    { ano: "LOA 2020", emendas: 7, valor: 3_800_000, areas: "Educ. 40% | Outros 40%", disponivel: false },
];

const LOA_POR_FUNCAO = [
    { ano: "2020", saude: 1_900_000, educacao: 1_520_000, infra: 230_000, outros: 150_000 },
    { ano: "2021", saude: 2_450_000, educacao: 1_225_000, infra: 980_000, outros: 245_000 },
    { ano: "2022", saude: 2_030_000, educacao: 2_030_000, infra: 1_160_000, outros: 580_000 },
    { ano: "2023", saude: 1_860_000, educacao: 1_550_000, infra: 2_480_000, outros: 310_000 },
    { ano: "2024", saude: 3_780_000, educacao: 2_520_000, infra: 1_260_000, outros: 840_000 },
];

const MOCK_LOA_TABLE: any[] = Array.from({ length: 40 }, (_, i) => ({
    anoLoa: 2020 + (i % 5),
    emenda: `EM-LOA-${(i + 1).toString().padStart(4, "0")}`,
    funcao: ["Saúde", "Educação", "Infraestrutura", "Esporte", "Outros"][i % 5],
    subfuncao: ["Atenção Básica", "Ensino Fundamental", "Saneamento", "Futebol", "Cultura"][i % 5],
    valor: Math.floor(Math.random() * 1_200_000 + 200_000),
    municipio: ["Senhor do Bonfim", "Jaguarari", "Caldeirão Grande", "Capim Grosso", "Filadélfia"][i % 5],
    obs: i % 6 === 0 ? "P/ apreciação" : "Aprovada",
}));

function SeplanLoaTab() {
    const [sub, setSub] = useState("resumo");
    const [pageL, setPageL] = useState(0);
    const PAGE_SIZE = 20;
    const paginado = MOCK_LOA_TABLE.slice(pageL * PAGE_SIZE, (pageL + 1) * PAGE_SIZE);

    return (
        <div className="animate-in fade-in duration-500">
            <SubTabPill sub={sub} setSub={setSub} />
            {sub === "resumo" ? (
                <div className="space-y-7">
                    <SimpleKpis items={[
                        { label: "LOAs Disponíveis", value: "5 LOAs" },
                        { label: "Emendas Aprovadas", value: "46 emendas" },
                        { label: "Total Autorizado", value: fmt(29_100_000) },
                        { label: "Função Maior", value: "Saúde" },
                    ]} />

                    {/* Cards LOA */}
                    <div>
                        <p className="text-[13px] font-bold text-slate-900 mb-4">LOAs por Exercício</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {LOA_ANOS.map((loa) => (
                                <div key={loa.ano} className={`bg-white border border-slate-100 rounded-2xl shadow-sm p-5 hover:shadow-md transition-all ${!loa.disponivel ? "opacity-60" : ""}`}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-base">📄</span>
                                        <p className="font-bold text-slate-900 text-[14px]">{loa.ano}</p>
                                    </div>
                                    <p className="text-[13px] text-slate-600 mb-0.5">{loa.emendas} emendas aprovadas</p>
                                    <p className="text-[18px] font-black text-slate-900 mb-1">{fmt(loa.valor)}</p>
                                    <p className="text-[11px] text-slate-400 mb-4">{loa.areas}</p>
                                    <div className="flex items-center gap-2">
                                        <button className="text-[12px] font-bold text-teal-600 hover:text-teal-800">Ver Emendas →</button>
                                        {loa.disponivel && (
                                            <a href="#" className="text-[12px] font-bold text-slate-400 hover:text-slate-700 flex items-center gap-1">PDF LOA <ExternalLink className="w-3 h-3" /></a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Barras empilhadas Função */}
                    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
                        <p className="text-[13px] font-bold text-slate-900 mb-4">Função ao longo dos anos</p>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={LOA_POR_FUNCAO} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                                <XAxis dataKey="ano" tick={{ fontSize: 11, fill: "#94A3B8", fontWeight: 600 }} axisLine={false} tickLine={false} />
                                <YAxis tickFormatter={fmt} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={60} />
                                <Tooltip content={<GenericTooltip />} />
                                <Bar dataKey="saude" name="Saúde" stackId="a" fill="#EF4444" maxBarSize={36} />
                                <Bar dataKey="educacao" name="Educação" stackId="a" fill="#3B82F6" />
                                <Bar dataKey="infra" name="Infra" stackId="a" fill="#F59E0B" />
                                <Bar dataKey="outros" name="Outros" stackId="a" fill="#E2E8F0" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            ) : (
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-[13px]">
                            <thead><tr className="border-b border-slate-100">
                                {["Ano LOA", "Nº Emenda", "Função", "Subfunção", "Valor Autorizado", "Município", "Obs", "PDF"].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {paginado.map((row) => (
                                    <tr key={row.emenda} className="border-b border-slate-50/70 hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 font-semibold text-slate-700">{row.anoLoa}</td>
                                        <td className="px-4 py-3 font-mono text-slate-500">{row.emenda}</td>
                                        <td className="px-4 py-3"><Badge variant="outline" className="text-[10px]">{row.funcao}</Badge></td>
                                        <td className="px-4 py-3 text-slate-500">{row.subfuncao}</td>
                                        <td className="px-4 py-3 font-semibold text-slate-900">{fmt(row.valor)}</td>
                                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{row.municipio}</td>
                                        <td className="px-4 py-3 text-slate-500 text-[11px]">{row.obs}</td>
                                        <td className="px-4 py-3"><button className="text-slate-400 hover:text-teal-600 text-base">📄</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100">
                        <span className="text-[12px] text-slate-400">Exibindo {pageL * PAGE_SIZE + 1}–{Math.min((pageL + 1) * PAGE_SIZE, MOCK_LOA_TABLE.length)} de {MOCK_LOA_TABLE.length}</span>
                        <div className="flex gap-1">
                            <button onClick={() => setPageL(p => Math.max(0, p - 1))} disabled={pageL === 0} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                            <button onClick={() => setPageL(p => Math.min(Math.ceil(MOCK_LOA_TABLE.length / PAGE_SIZE) - 1, p + 1))} disabled={(pageL + 1) * PAGE_SIZE >= MOCK_LOA_TABLE.length} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── CEAP Federal ──────────────────────────────────────────────────────────────
const CEAP_CATS = [
    { name: "Passagens Aéreas", value: 48000, color: "#8B5CF6" },
    { name: "Hospedagem", value: 32000, color: "#A78BFA" },
    { name: "Combustíveis", value: 28000, color: "#C4B5FD" },
    { name: "Escritório Político", value: 22000, color: "#DDD6FE" },
    { name: "Divulgação", value: 19000, color: "#EDE9FE" },
];

function CeapCamaraTab({ hasMandate = false }: { hasMandate?: boolean }) {
    const [sub, setSub] = useState("resumo");
    if (!hasMandate) return <EmptyPortal label="Sem mandato federal registrado" subtitle="Este deputado não teve mandato na Câmara dos Deputados." />;
    return (
        <div className="animate-in fade-in duration-500">
            <SubTabPill sub={sub} setSub={setSub} />
            {sub === "resumo" ? (
                <div className="space-y-7">
                    <SimpleKpis items={[
                        { label: "Total CEAP", value: fmt(149000) }, { label: "Nº Reembolsos", value: "284" },
                        { label: "Fornecedores", value: "78" }, { label: "Meses cobertos", value: "24 meses" },
                    ]} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
                            <p className="text-[13px] font-bold text-slate-900 mb-4">Categorias CEAP</p>
                            <div className="flex items-center gap-4">
                                <ResponsiveContainer width={140} height={140}><PieChart><Pie data={CEAP_CATS} dataKey="value" cx="50%" cy="50%" innerRadius={42} outerRadius={64} strokeWidth={2} stroke="#fff">{CEAP_CATS.map((c, i) => <Cell key={i} fill={c.color} />)}</Pie><Tooltip content={<GenericTooltip />} /></PieChart></ResponsiveContainer>
                                <div className="flex-1 space-y-1.5">{CEAP_CATS.map(c => <div key={c.name} className="flex items-center justify-between"><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: c.color }} /><span className="text-[11px] text-slate-600">{c.name}</span></div><span className="text-[11px] font-bold">{fmt(c.value)}</span></div>)}</div>
                            </div>
                        </div>
                        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
                            <p className="text-[13px] font-bold text-slate-900 mb-4">Comparativo vs Média Nacional</p>
                            <div className="space-y-3">
                                {CEAP_CATS.map((c) => {
                                    const media = Math.floor(c.value * 0.7);
                                    const pct = Math.round((c.value / Math.max(c.value, media)) * 100);
                                    const above = c.value > media;
                                    return (
                                        <div key={c.name}>
                                            <div className="flex justify-between text-[11px] font-medium text-slate-500 mb-1"><span>{c.name}</span><span className={above ? "text-red-500 font-bold" : "text-slate-400"}>{above ? `+${Math.round((c.value / media - 1) * 100)}%` : "na média"}</span></div>
                                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: above ? "#EF4444" : "#8B5CF6" }} /></div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5">
                        <p className="font-bold text-yellow-800 text-[13px] flex items-center gap-2">⚠️ Cruzamento Detectado</p>
                        <p className="text-[13px] text-slate-600 mt-1">Fornecedor "Gráfica Nordeste" aparece na CEAP federal E nas Verbas Estaduais — R$ 22.000 total entre as duas fontes.</p>
                    </div>
                </div>
            ) : (
                <EmptyPortal label="Dados completos CEAP" subtitle="Tabela disponível após integração com dadosabertos.camara.leg.br" />
            )}
        </div>
    );
}

// ─── Senado ────────────────────────────────────────────────────────────────────
function SenadoTab({ hasMandate = false }: { hasMandate?: boolean }) {
    const [sub, setSub] = useState("resumo");
    if (!hasMandate) return <EmptyPortal label="Sem mandato no Senado registrado" subtitle="Este candidato não foi senador até o momento." />;
    return (
        <div className="animate-in fade-in duration-500">
            <SubTabPill sub={sub} setSub={setSub} />
            <EmptyPortal label="Perfil Legislativo no Senado" subtitle="Dados sendo coletados de dadosabertos.senado.leg.br" />
        </div>
    );
}

// ─── Portal Federal ────────────────────────────────────────────────────────────
const MINISTERIOS = [
    { name: "Saúde", value: 1_400_000, color: "#EF4444" },
    { name: "Educação", value: 900_000, color: "#3B82F6" },
    { name: "Cidadania", value: 600_000, color: "#22C55E" },
    { name: "Infraestrutura", value: 300_000, color: "#F59E0B" },
];
const CEIS_CHECK = [
    { cnpj: "07.318.773/0001-01", empresa: "CONSULTORES ASSOCIADOS", status: "ok" },
    { cnpj: "65.450.024/0001-55", empresa: "AGÊNCIA MÍDIA DIGITAL", status: "suspeito" },
    { cnpj: "10.699.669/0001-22", empresa: "EVENTS PRIME ME", status: "ok" },
];

function PortalFederalTab() {
    const [sub, setSub] = useState("resumo");
    const [tipo, setTipo] = useState<"emendas" | "convenios" | "ceis">("emendas");
    return (
        <div className="animate-in fade-in duration-500">
            <SubTabPill sub={sub} setSub={setSub} />
            {sub === "resumo" ? (
                <div className="space-y-7">
                    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-slate-100">
                            {[
                                { label: "Emendas Federais", value: fmt(3_200_000) },
                                { label: "Total Pago", value: fmt(2_400_000) },
                                { label: "Municípios Federais", value: "12" },
                                { label: "Empresas CEIS", value: "1 ⚠️", color: "text-red-600" },
                            ].map(({ label, value, color }) => (
                                <div key={label} className="p-5"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{label}</p>
                                    <p className={`text-[22px] font-black tracking-tight ${color || "text-slate-900"}`}>{value}</p></div>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
                            <p className="text-[13px] font-bold text-slate-900 mb-4">Ministérios de Destino</p>
                            <div className="flex items-center gap-4">
                                <ResponsiveContainer width={140} height={140}><PieChart><Pie data={MINISTERIOS} dataKey="value" cx="50%" cy="50%" innerRadius={42} outerRadius={64} strokeWidth={2} stroke="#fff">{MINISTERIOS.map((c, i) => <Cell key={i} fill={c.color} />)}</Pie><Tooltip content={<GenericTooltip />} /></PieChart></ResponsiveContainer>
                                <div className="flex-1 space-y-1.5">{MINISTERIOS.map(c => <div key={c.name} className="flex items-center justify-between"><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: c.color }} /><span className="text-[11px] text-slate-600">{c.name}</span></div><span className="text-[11px] font-bold">{fmt(c.value)}</span></div>)}</div>
                            </div>
                        </div>
                        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
                            <p className="text-[13px] font-bold text-slate-900 mb-4">Verificação CEIS/CNEP</p>
                            <div className="space-y-3">
                                {CEIS_CHECK.map(c => (
                                    <div key={c.cnpj} className={`flex items-center justify-between p-3 rounded-xl border ${c.status === "suspeito" ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-100"}`}>
                                        <div>
                                            <p className="text-[12px] font-semibold text-slate-900">{c.empresa}</p>
                                            <p className="text-[10px] font-mono text-slate-400">{c.cnpj}</p>
                                        </div>
                                        <Badge className={`text-[10px] font-bold border-0 ${c.status === "suspeito" ? "bg-red-500 text-white" : "bg-green-100 text-green-700"}`}>
                                            {c.status === "suspeito" ? "⚠️ CEIS" : "✅ OK"}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        {(["emendas", "convenios", "ceis"] as const).map(t => (
                            <button key={t} onClick={() => setTipo(t)} className={`px-4 py-1.5 rounded-full text-[12px] font-bold capitalize transition-all ${tipo === t ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                                {t === "emendas" ? "Emendas" : t === "convenios" ? "Convênios" : "CEIS"}
                            </button>
                        ))}
                    </div>
                    <EmptyPortal label={`Dados ${tipo} federal`} subtitle="Integração com portaldatransparencia.gov.br em implementação" />
                </div>
            )}
        </div>
    );
}

// ─── Empresas RF ───────────────────────────────────────────────────────────────
const EMPRESAS_NODES = [
    { id: "dep", label: "Deputado", type: "dep" },
    { id: "e1", label: "GRÁFICA NORDESTE", tipo: "Fornecedor", cnpj: "07.318.773", alerta: true },
    { id: "e2", label: "AGÊNCIA MÍDIA DIGITAL", tipo: "ME Nova", cnpj: "65.450.024", alerta: true },
    { id: "e3", label: "EVENTS PRIME ME", tipo: "Fornecedor", cnpj: "10.699.669", alerta: false },
    { id: "s1", label: "João Silva", tipo: "Sócio", alerta: false },
    { id: "s2", label: "Maria Santos", tipo: "Parente Assessor", alerta: true },
];
const ALERTAS_EMPRESAS = [
    { emoji: "🔴", texto: "CNPJ 07.318.773 — ME aberta 18 dias antes da NF de R$2.888" },
    { emoji: "🔴", texto: 'Sócio "João Silva" — mesmo sobrenome de assessor registrado' },
    { emoji: "🟡", texto: "CNPJ 10.699.669 — Capital R$1.000 recebeu R$500.000" },
];

function EmpresasRfTab() {
    const [sub, setSub] = useState("resumo");
    const [selectedNode, setSelectedNode] = useState<any>(null);
    return (
        <div className="animate-in fade-in duration-500">
            <SubTabPill sub={sub} setSub={setSub} />
            {sub === "resumo" ? (
                <div className="space-y-7">
                    <SimpleKpis items={[
                        { label: "CNPJs Fornecedores", value: "47" }, { label: "MEIs/MEs <6 meses", value: "12 ⚠️", color: "text-orange-600" },
                        { label: "Sócios Ligados", value: "8" }, { label: "CNPJs na CEIS", value: "1 🔴", color: "text-red-600" },
                    ]} />

                    {/* Grafo visual simplificado */}
                    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Network className="w-4 h-4 text-yellow-500" />
                            <p className="text-[13px] font-bold text-slate-900">Grafo de Relacionamentos</p>
                        </div>
                        <div className="relative min-h-[300px] bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 flex items-center justify-center">
                            {/* Nó central */}
                            <div className="absolute" style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
                                <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center text-white text-[12px] font-black text-center shadow-lg ring-4 ring-indigo-100">
                                    DEP.<br />POLÍTICO
                                </div>
                            </div>
                            {/* Nós ao redor */}
                            {[
                                { label: "GRÁFICA\nNORDESTE", color: "#F97316", alert: true, style: { left: "12%", top: "15%" } },
                                { label: "AGÊNCIA\nMÍDIA", color: "#F97316", alert: true, style: { right: "10%", top: "12%" } },
                                { label: "EVENTS\nPRIME", color: "#F97316", alert: false, style: { left: "8%", bottom: "20%" } },
                                { label: "João\nSilva", color: "#64748B", alert: false, style: { right: "12%", bottom: "25%" } },
                                { label: "Maria\nSantos", color: "#64748B", alert: true, style: { left: "38%", bottom: "10%" } },
                                { label: "CONSUL.\nASSOC.", color: "#F97316", alert: false, style: { right: "38%", top: "10%" } },
                            ].map((n, i) => (
                                <div key={i} className="absolute cursor-pointer group" style={n.style}>
                                    {/* Linha conectora */}
                                    <div className="absolute inset-0 pointer-events-none">
                                        <svg className="absolute w-full h-full" style={{ overflow: "visible" }}>
                                            <line x1="50%" y1="50%" x2="50%" y2="50%" stroke={n.alert ? "#EF4444" : "#CBD5E1"} strokeWidth="1.5" strokeDasharray="4 2" />
                                        </svg>
                                    </div>
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-[9px] font-black text-center shadow-md transition-transform group-hover:scale-105 ring-2 ${n.alert ? "ring-red-300" : "ring-transparent"}`} style={{ background: n.color }}>
                                        {n.label}
                                    </div>
                                    {n.alert && <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"><span className="text-white text-[8px] font-black">!</span></div>}
                                </div>
                            ))}
                            <div className="absolute bottom-3 left-3 flex items-center gap-3 text-[11px]">
                                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-indigo-600" /><span className="text-slate-500 font-medium">Político</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-orange-400" /><span className="text-slate-500 font-medium">Empresa</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-slate-500" /><span className="text-slate-500 font-medium">Sócio</span></div>
                            </div>
                        </div>
                    </div>

                    {/* Alertas */}
                    <div>
                        <p className="text-[13px] font-bold text-slate-900 mb-3">Alertas de Rede Empresarial</p>
                        <div className="space-y-2">
                            {ALERTAS_EMPRESAS.map((a, i) => (
                                <div key={i} className="flex items-start gap-3 bg-white border border-slate-100 rounded-xl px-4 py-3 shadow-sm">
                                    <span className="text-base mt-0.5">{a.emoji}</span>
                                    <p className="text-[13px] text-slate-700 font-medium">{a.texto}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <EmptyPortal label="Rede Empresarial Completa" subtitle="Tabela de CNPJs e relacionamentos sendo construída via Receita Federal + Brasil.IO" />
            )}
        </div>
    );
}

// ─── TCM-BA ────────────────────────────────────────────────────────────────────
const MODALIDADES_TCM = [
    { name: "Pregão", value: 38, color: "#EF4444" }, { name: "Tomada de Preços", value: 22, color: "#F97316" },
    { name: "Dispensa", value: 18, color: "#EAB308" }, { name: "Inexigibilidade", value: 8, color: "#94A3B8" },
];
const TCM_MUN = [
    { mun: "Senhor do Bonfim", contratos: 14 }, { mun: "Caldeirão Grande", contratos: 9 },
    { mun: "Jaguarari", contratos: 7 }, { mun: "Capim Grosso", contratos: 6 }, { mun: "Filadélfia", contratos: 4 },
];

function TcmBaTab() {
    const [sub, setSub] = useState("resumo");
    return (
        <div className="animate-in fade-in duration-500">
            <SubTabPill sub={sub} setSub={setSub} />
            {sub === "resumo" ? (
                <div className="space-y-7">
                    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-slate-100">
                            {[
                                { label: "Contratos Identificados", value: "86" },
                                { label: "Municípios", value: "12" },
                                { label: "Valor Total", value: fmt(4_700_000) },
                                { label: "Único Participante", value: "7 ⚠️", color: "text-orange-600" },
                            ].map(({ label, value, color }) => (
                                <div key={label} className="p-5"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{label}</p>
                                    <p className={`text-[22px] font-black tracking-tight ${color || "text-slate-900"}`}>{value}</p></div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
                            <p className="text-[13px] font-bold text-slate-900 mb-4">Contratos por Município (Top 5)</p>
                            <div className="space-y-2">
                                {TCM_MUN.map((m) => (
                                    <div key={m.mun} className="flex items-center gap-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[12px] font-semibold text-slate-700 truncate">{m.mun}</p>
                                            <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden"><div className="h-full bg-red-400 rounded-full" style={{ width: `${(m.contratos / TCM_MUN[0].contratos) * 100}%` }} /></div>
                                        </div>
                                        <span className="text-[12px] font-bold text-slate-900 whitespace-nowrap">{m.contratos} contratos</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
                            <p className="text-[13px] font-bold text-slate-900 mb-4">Modalidade de Licitação</p>
                            <div className="flex items-center gap-4">
                                <ResponsiveContainer width={130} height={130}><PieChart><Pie data={MODALIDADES_TCM} dataKey="value" cx="50%" cy="50%" innerRadius={38} outerRadius={60} strokeWidth={2} stroke="#fff">{MODALIDADES_TCM.map((c, i) => <Cell key={i} fill={c.color} />)}</Pie><Tooltip content={<GenericTooltip />} /></PieChart></ResponsiveContainer>
                                <div className="flex-1 space-y-1.5">{MODALIDADES_TCM.map(c => <div key={c.name} className="flex items-center justify-between"><div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: c.color }} /><span className="text-[11px] text-slate-600">{c.name}</span></div><span className="text-[11px] font-bold">{c.value}</span></div>)}</div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-[13px] font-bold text-slate-900 mb-3">Alertas TCM-BA</p>
                        {[
                            { e: "🔴", t: "Empresa Z ganhou contrato 12 dias após emenda ser aprovada" },
                            { e: "🔴", t: "Licitação com único participante — R$380.000" },
                            { e: "🟡", t: "Mesmo CNPJ ganhou contratos em 4 municípios diferentes" },
                        ].map((a, i) => (
                            <div key={i} className="flex items-start gap-3 bg-white border border-slate-100 rounded-xl px-4 py-3 shadow-sm">
                                <span className="text-base mt-0.5">{a.e}</span>
                                <p className="text-[13px] text-slate-700 font-medium">{a.t}</p>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <EmptyPortal label="Contratos TCM-BA Completos" subtitle="Filtros e tabela completa sendo integrados com tcm.ba.gov.br" />
            )}
        </div>
    );
}

// ─── Rastreabilidade ───────────────────────────────────────────────────────────
const CRUZAMENTOS = [
    {
        nivel: "🔴", tipo: "DUPLA COBRANÇA DETECTADA", cnpj: "07.318.773",
        fontes: ["Verbas Gabinete — R$ 2.888 (12/2015)", "Emendas Estaduais — R$ 48.000 (2022)", "Contratos TCM-BA — R$ 180.000 (2023)"],
        total: 230_888, descAdicional: "Empresa aberta há 22 dias antes do 1º pagamento",
    },
    {
        nivel: "🔴", tipo: "EMPRESA INIDÔNEA DETECTADA", cnpj: "65.450.024",
        fontes: ["Verbas Gabinete — R$ 12.000 (2026)", "CEIS vigente à época — restrição ativa"],
        total: 12_000, descAdicional: "Contratação durante período de impedimento",
    },
    {
        nivel: "🟡", tipo: "EMENDA FANTASMA", cnpj: "—",
        fontes: ["Em. EM-LOA-0012 — R$ 500k autorizado", "Execução 0% após 24 meses"],
        total: 500_000, descAdicional: "Município: Senhor do Bonfim — nenhum pagamento realizado",
    },
];

function RastreabilidadeTabNew() {
    const [sub, setSub] = useState("resumo");
    const [timelineFilter, setTimelineFilter] = useState("todos");

    const TIMELINE_EVENTS = [
        { ano: 2015, tipo: "verbas", desc: "Pagamento NF-001 suspeita", nivel: "🔴" },
        { ano: 2018, tipo: "emendas", desc: "Emenda Saúde — R$800k", nivel: "🟢" },
        { ano: 2020, tipo: "verbas", desc: "Contratação ME nova", nivel: "🔴" },
        { ano: 2022, tipo: "contratos", desc: "Contrato TCM licitação única", nivel: "🔴" },
        { ano: 2023, tipo: "alertas", desc: "CNPJ em 3 portais", nivel: "🔴" },
        { ano: 2024, tipo: "emendas", desc: "Emenda 0% execução", nivel: "🟡" },
        { ano: 2025, tipo: "verbas", desc: "Novo fornecedor ME", nivel: "🟡" },
    ];

    const filteredTimeline = TIMELINE_EVENTS.filter(e => timelineFilter === "todos" || e.tipo === timelineFilter);

    return (
        <div className="animate-in fade-in duration-500">
            <SubTabPill sub={sub} setSub={setSub} />
            {sub === "resumo" ? (
                <div className="space-y-7">
                    <SimpleKpis items={[
                        { label: "Cruzamentos", value: "23" }, { label: "Coincidências", value: "15" },
                        { label: "Alertas Críticos", value: "8 🔴", color: "text-red-600" }, { label: "Score Final", value: "7.2/10" },
                    ]} />

                    {/* Cards de Cruzamentos */}
                    <div>
                        <p className="text-[13px] font-bold text-slate-900 mb-4">Cruzamentos Detectados</p>
                        <div className="space-y-4">
                            {CRUZAMENTOS.map((c, i) => (
                                <div key={i} className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 hover:shadow-md transition-all">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-base">{c.nivel}</span>
                                            <p className="font-black text-slate-900 text-[13px] uppercase tracking-wide">{c.tipo}</p>
                                        </div>
                                        <button className="text-[12px] font-bold text-gray-500 hover:text-slate-900 flex items-center gap-1">Ver dossiê →</button>
                                    </div>
                                    {c.cnpj !== "—" && <p className="text-[12px] font-mono text-slate-500 mb-2">CNPJ {c.cnpj} aparece em:</p>}
                                    <ul className="space-y-1 mb-3">
                                        {c.fontes.map((f, j) => <li key={j} className="text-[13px] text-slate-600 flex items-start gap-2"><span className="text-slate-300 mt-0.5">•</span>{f}</li>)}
                                    </ul>
                                    <div className="flex items-center justify-between">
                                        <p className="text-[12px] text-slate-400">{c.descAdicional}</p>
                                        <p className="text-[13px] font-black text-slate-900">Total: {fmt(c.total)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-[13px] font-bold text-slate-900">Timeline de eventos (2015–2026)</p>
                            <div className="flex gap-1.5">
                                {["todos", "verbas", "emendas", "contratos", "alertas"].map(f => (
                                    <button key={f} onClick={() => setTimelineFilter(f)} className={`px-3 py-1 rounded-full text-[11px] font-bold capitalize transition-all ${timelineFilter === f ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>{f}</button>
                                ))}
                            </div>
                        </div>
                        <div className="relative flex items-center gap-0 overflow-x-auto pb-2">
                            <div className="absolute top-6 left-0 right-0 h-px bg-slate-100" />
                            {filteredTimeline.map((event, i) => (
                                <div key={i} className="relative flex flex-col items-center gap-2 min-w-[90px] px-2 group cursor-pointer">
                                    <span className="text-base z-10 bg-white px-1">{event.nivel}</span>
                                    <div className="w-2 h-2 rounded-full bg-slate-300 z-10" />
                                    <div className="text-center">
                                        <p className="text-[10px] font-black text-slate-900">{event.ano}</p>
                                        <p className="text-[10px] text-slate-400 leading-tight max-w-[80px] text-center">{event.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Rodapé */}
                    <div className="text-center text-[11px] text-slate-400 font-medium py-2 border-t border-slate-100">
                        Última análise forense: {new Date().toLocaleDateString("pt-BR")} — Dados cruzados de 8 portais — 1.847 registros verificados
                    </div>
                </div>
            ) : (
                <EmptyPortal label="Todos os Cruzamentos" subtitle="Filtros por tipo, risco e período sendo implementados" />
            )}
        </div>
    );
}

// ─── Exports ───────────────────────────────────────────────────────────────────
export { SeplanLoaTab, CeapCamaraTab, SenadoTab, PortalFederalTab, EmpresasRfTab, TcmBaTab, RastreabilidadeTabNew };
