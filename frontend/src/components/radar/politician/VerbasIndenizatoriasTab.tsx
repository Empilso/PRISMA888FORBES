"use client";

import React, { useState, useCallback, useRef } from "react";
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
    CartesianGrid, Area, AreaChart, XAxis, YAxis,
} from "recharts";
import {
    ExternalLink, FileText, X, ChevronLeft, ChevronRight,
    AlertTriangle, Building2, Search, Loader2, RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Tipos ─────────────────────────────────────────────────────────────────────
interface VerbasTabProps {
    politicianName: string;
    slug: string;
}

interface VerbaRow {
    id: string;
    num_processo: string;
    competencia: string;
    ano: number;
    categoria: string;
    valor: number;
    valor_glosado: number;
    fornecedor: string;
    cnpj: string;
    tipo_documento: string;
    nf: string;
    hasPdf: boolean;
    link_pdf: string;
    link_detalhe: string;
    score: number;
    risco: string;
    motivos_risco: string[];
    comentario_aguia: string;
}

interface ApiResponse {
    deputado: string;
    totalGasto: number;
    totalGlosado: number;
    totalNotas: number;
    totalFornecedores: number;
    categoriaMaior: string;
    categorias: { name: string; value: number }[];
    topFornecedores: { nome: string; cnpj: string; valor: number }[];
    gastosMensais: { mes: string; valor: number }[];
    alertasForenses?: { tipo: string; count: number; total: number }[];
    altoRiscoPct?: number;
    porRisco?: Record<string, number>;
    anos: number[];
    categoriasDisponiveis: string[];
    pagina: number;
    pageSize: number;
    totalRegistros: number;
    totalPaginas: number;
    registros: VerbaRow[];
    error?: string;
}

// ─── Paleta de categorias ──────────────────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
    "Divulgação da  atividade parlamentar": "#F97316",
    "Divulgação da atividade parlamentar": "#F97316",
    "Consultorias, assessorias, pesquisas  e trabalhos técnicos": "#FDBA74",
    "Consultorias, assessorias, pesquisas e trabalhos técnicos": "#FDBA74",
    "Aluguel  de imóveis para escritório; despesas concernentes a eles": "#FED7AA",
    "Aluguel de imóveis para escritório; despesas concernentes a eles": "#FED7AA",
    "Aquisição de material de expediente": "#FFEDD5",
    "Locomoção, hospedagem": "#FEF3C7",
};
function getCatColor(name: string) { return CAT_COLORS[name] ?? "#e5e7eb"; }
function catShort(name: string) {
    if (name.toLowerCase().startsWith("divulgaç")) return "Divulgação";
    if (name.toLowerCase().startsWith("consultor")) return "Consultorias";
    if (name.toLowerCase().startsWith("aluguel")) return "Aluguel";
    if (name.toLowerCase().startsWith("aquisiç")) return "Material";
    if (name.toLowerCase().startsWith("locomoc")) return "Locomoção";
    if (name.toLowerCase().startsWith("locação de software")) return "TI/Software";
    return name.slice(0, 22);
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmt(v: number) {
    if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
    return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

function riscoBadgeClass(r: string) {
    if (r === "MÁXIMO") return "bg-red-100 text-red-700 border-red-200";
    if (r === "ALTO") return "bg-orange-100 text-orange-700 border-orange-200";
    if (r === "MÉDIO") return "bg-yellow-100 text-yellow-700 border-yellow-200";
    return "bg-slate-100 text-slate-600 border-slate-200";
}

function riscoRowClass(r: string) {
    if (r === "MÁXIMO") return "bg-red-50/40";
    if (r === "ALTO") return "bg-orange-50/30";
    return "";
}

function riscoColor(r: string) {
    if (r === "MÁXIMO") return "#EF4444";
    if (r === "ALTO") return "#F97316";
    if (r === "MÉDIO") return "#EAB308";
    return "#6B7280";
}

function isNFGenerica(nf: string) {
    const clean = nf.replace(/[^0-9]/g, "");
    return clean.length <= 2 || /^0+$/.test(clean) || clean === "1";
}

// ─── SELETOR DE ANO — sempre visível, todos os anos fixos ─────────────────────
// REGRA: a lista de anos passada aqui NUNCA muda após o carregamento inicial.
// O componente não some nem filtra chips — todos os anos ficam sempre visíveis.
function AnoSeletor({
    anos,
    anoAtivo,
    onChange,
}: {
    anos: number[];
    anoAtivo: string;
    onChange: (ano: string) => void;
}) {
    const anosOpcoes = ['all', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016'];

    return (
        <div className="flex items-center gap-2 flex-wrap mb-6">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1 select-none">
                Período:
            </span>
            {anosOpcoes.map((ano) => (
                <button
                    key={ano}
                    onClick={() => onChange(ano)}
                    className={cn(
                        "px-4 py-2 rounded-xl text-sm font-semibold border transition-all duration-200 cursor-pointer",
                        "shadow-sm hover:shadow-md hover:-translate-y-0.5 select-none whitespace-nowrap min-w-[60px]",
                        "bg-white border-slate-200 text-slate-600 hover:border-amber-400 hover:text-amber-700",
                        anoAtivo === ano ? [
                            "bg-gradient-to-br from-amber-500 to-amber-600",
                            "border-transparent text-white",
                            "shadow-md shadow-amber-200/60 -translate-y-0.5",
                            "hover:from-amber-600 hover:to-amber-700"
                        ] : "",
                        ano === '2025' && anoAtivo !== '2025' ? "bg-amber-50 border-amber-300 text-amber-700 font-bold" : "",
                    )}
                >
                    {ano === 'all' ? 'Todos' : ano === '2025' ? 'atual 2025' : ano}
                </button>
            ))}
        </div>
    );
}

// ─── Drawer de detalhe ────────────────────────────────────────────────────────
function DetalheDrawer({ row, open, onClose }: { row: VerbaRow | null; open: boolean; onClose: () => void }) {
    if (!row) return null;
    return (
        <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
            <SheetContent className="sm:max-w-[500px] bg-white p-0 overflow-y-auto border-l border-slate-100 shadow-2xl" side="right">
                <div className="h-1.5 w-full" style={{ background: riscoColor(row.risco) }} />
                <div className="p-6 space-y-6">
                    <SheetHeader className="space-y-2">
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                            🏛️ <span>Verbas de Gabinete — ALBA</span>
                        </div>
                        <SheetTitle className="text-xl font-black text-slate-900 leading-tight">
                            NF {row.nf} — {(row.fornecedor || "Fornecedor").split(" ").slice(0, 3).join(" ")}
                        </SheetTitle>
                    </SheetHeader>

                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">① Dados do Registro</p>
                        <div className="grid grid-cols-2 gap-2.5">
                            {[
                                ["Competência", row.competencia],
                                ["Categoria", catShort(row.categoria)],
                                ["Valor", fmt(row.valor)],
                                ...(row.valor_glosado > 0 ? [["Valor Glosado", fmt(row.valor_glosado)]] : []),
                                ["Nº NF/Recibo", row.nf],
                                ["Nº Processo", row.num_processo],
                                ["Tipo Doc.", row.tipo_documento],
                            ].map(([k, v]) => (
                                <div key={k} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{k}</p>
                                    <p className="text-[13px] font-semibold text-slate-900 break-words">{v}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
                        <div className="flex items-center gap-2 mb-3">
                            <Building2 className="w-4 h-4 text-orange-500" />
                            <p className="text-[10px] font-bold text-orange-700 uppercase tracking-widest">② Fornecedor</p>
                        </div>
                        <p className="font-bold text-slate-900 text-[14px] mb-1">{row.fornecedor || "Nome não informado"}</p>
                        <p className="text-[12px] text-slate-500 font-mono mb-3">{row.cnpj}</p>
                        <a
                            href={`https://brasil.io/dataset/socios-brasil/socios/?cnpj=${row.cnpj.replace(/\D/g, "")}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-[12px] font-bold text-orange-600 hover:text-orange-800 flex items-center gap-1"
                        >
                            Buscar no Brasil.IO <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                        {row.hasPdf && (
                            <a href={row.link_pdf} target="_blank" rel="noopener noreferrer"
                                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-900 text-white text-[12px] font-bold hover:bg-slate-800 transition-colors">
                                <FileText className="w-3.5 h-3.5" /> Ver PDF NF
                            </a>
                        )}
                        <a href={row.link_detalhe} target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-[12px] font-bold hover:bg-slate-50 transition-colors">
                            <ExternalLink className="w-3.5 h-3.5" /> Portal ALBA
                        </a>
                        <button className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-[12px] font-bold hover:bg-slate-50 transition-colors">
                            <Search className="w-3.5 h-3.5" /> Ver Fornecedor
                        </button>
                        <button className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-[12px] font-bold hover:bg-slate-50 transition-colors">
                            📁 Dossiê
                        </button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

// ─── Resumo ────────────────────────────────────────────────────────────────────
function ResumoContent({ data }: { data: ApiResponse }) {
    const CTooltip = ({ active, payload }: any) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="bg-slate-900 text-white rounded-xl p-3 text-[12px] shadow-xl">
                <p className="font-bold">{catShort(payload[0]?.name || "")}</p>
                <p className="text-orange-400 font-black">{fmt(payload[0]?.value)}</p>
            </div>
        );
    };
    const BTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="bg-slate-900 text-white rounded-xl p-3 text-[12px] shadow-xl">
                <p className="font-semibold text-slate-300 mb-1">{label}</p>
                <p className="font-black text-orange-400">{fmt(payload[0]?.value)}</p>
            </div>
        );
    };

    const categoriasComCor = (data.categorias ?? []).map(c => ({
        ...c,
        color: getCatColor(c.name),
        nameShort: catShort(c.name),
    }));

    const alertasForenses = data.alertasForenses ?? [];
    const motivoEmoji: Record<string, string> = {
        "Link ausente/Lista errada": "🔗",
        "Concentração de Fornecedor": "🔴",
        "CNPJ Matriz/Nova + Alto valor": "🏢",
        "Valor alto divulgação (> R$2500)": "💰",
        "NF genérica (ausente ou len < 3)": "⚠️",
    };

    return (
        <div className="space-y-8">
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100">
                    {[
                        { label: "Total Gasto", value: fmt(data.totalGasto ?? 0), icon: "💰", color: "text-orange-600" },
                        { label: "Notas Fiscais", value: (data.totalNotas ?? 0).toLocaleString("pt-BR"), icon: "📄", color: "text-slate-900" },
                        { label: "Fornecedores", value: (data.totalFornecedores ?? 0).toString(), icon: "🏢", color: "text-slate-900" },
                        { label: "Categoria Maior", value: catShort(data.categoriaMaior ?? "—"), icon: "📊", color: "text-slate-900" },
                    ].map(({ label, value, icon, color }) => (
                        <div key={label} className="p-5 flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">{icon}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
                            </div>
                            <p className={`text-[22px] font-black tracking-tight leading-none ${color}`}>{value}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
                    <p className="text-[13px] font-bold text-slate-900 mb-4">Categorias de Gasto</p>
                    <div className="flex items-center gap-4">
                        <ResponsiveContainer width={160} height={160}>
                            <PieChart>
                                <Pie data={categoriasComCor} dataKey="value" cx="50%" cy="50%" innerRadius={48} outerRadius={72} strokeWidth={2} stroke="#fff">
                                    {categoriasComCor.map((c, i) => <Cell key={i} fill={c.color} />)}
                                </Pie>
                                <Tooltip content={<CTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex-1 space-y-2">
                            {categoriasComCor.slice(0, 5).map((c) => (
                                <div key={c.name} className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                                        <span className="text-[11px] text-slate-600 font-medium truncate">{c.nameShort}</span>
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-900 whitespace-nowrap">{fmt(c.value)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
                    <p className="text-[13px] font-bold text-slate-900 mb-4">Top 10 Fornecedores</p>
                    <div className="space-y-2">
                        {(data.topFornecedores ?? []).map((f, i) => {
                            const pct = data.topFornecedores?.[0] ? (f.valor / data.topFornecedores[0].valor) * 100 : 0;
                            return (
                                <div key={i} className="flex items-center gap-3">
                                    <span className="text-[11px] text-slate-400 font-bold w-4">{i + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-semibold text-slate-700 truncate">{f.nome || f.cnpj}</p>
                                        <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                            <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-600" style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-900 whitespace-nowrap">{fmt(f.valor)}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
                <p className="text-[13px] font-bold text-slate-900 mb-4">Gastos por Competência</p>
                <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={data.gastosMensais ?? []} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="verbasGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#F97316" stopOpacity={0.15} />
                                <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#94A3B8", fontWeight: 600 }} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={fmt} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={58} />
                        <Tooltip content={<BTooltip />} />
                        <Area type="monotone" dataKey="valor" stroke="#F97316" strokeWidth={2.5} fill="url(#verbasGrad)" dot={{ r: 3.5, fill: "#F97316", strokeWidth: 0 }} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {alertasForenses.length > 0 && (
                <div>
                    <p className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <span className="text-lg">🦅</span> Padrões detectados pela Análise Águia
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {alertasForenses.map((a) => (
                            <div key={a.tipo} className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 hover:shadow-md transition-all cursor-pointer">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-base">{motivoEmoji[a.tipo] ?? "⚠️"}</span>
                                    <p className="text-[12px] font-black text-slate-900 leading-tight">{a.tipo}</p>
                                </div>
                                <p className="text-4xl font-black text-slate-900 mb-0.5">{a.count}</p>
                                <p className="text-[12px] text-slate-400 font-medium">ocorrências · {fmt(a.total)} total</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Dados Completos ───────────────────────────────────────────────────────────
function DadosCompletosContent({
    slug, anos, categoriasDisponiveis, anoGlobal,
}: {
    slug: string;
    anos: number[];
    categoriasDisponiveis: string[];
    anoGlobal: string;
}) {
    const PAGE_SIZE = 25;
    const [page, setPage] = useState(0);
    const [filterAno, setFilterAno] = useState(anoGlobal);
    const [filterMes, setFilterMes] = useState("all");
    const [filterCat, setFilterCat] = useState("all");
    const [filterRisco, setFilterRisco] = useState("all");
    const [filterFornecedor, setFilterFornecedor] = useState("");
    const [selectedRow, setSelectedRow] = useState<VerbaRow | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [data, setData] = useState<ApiResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => { setFilterAno(anoGlobal); setPage(0); }, [anoGlobal]);

    const hasFilters = filterAno !== "all" || filterMes !== "all" || filterCat !== "all" || filterRisco !== "all" || filterFornecedor.trim() !== "";

    const fetchPage = useCallback(async (pg: number) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ page: String(pg), pageSize: String(PAGE_SIZE) });
            if (filterAno !== "all") params.set("ano", filterAno);
            if (filterMes !== "all") params.set("mes", filterMes);
            if (filterCat !== "all") params.set("categoria", filterCat);
            if (filterRisco !== "all") params.set("risco", filterRisco);
            if (filterFornecedor.trim()) params.set("fornecedor", filterFornecedor);
            const res = await fetch(`/api/radar/verbas/${slug}?${params.toString()}`);
            const json = await res.json() as ApiResponse;
            if (json.error) throw new Error(json.error);
            setData(json);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [slug, filterAno, filterMes, filterCat, filterRisco, filterFornecedor]);

    React.useEffect(() => { fetchPage(0); setPage(0); }, [slug, filterAno, filterMes, filterCat, filterRisco, filterFornecedor]);

    function openDrawer(row: VerbaRow) { setSelectedRow(row); setDrawerOpen(true); }
    function clearFilters() {
        setFilterAno(anoGlobal); setFilterMes("all"); setFilterCat("all");
        setFilterRisco("all"); setFilterFornecedor(""); setPage(0);
    }
    function goPage(pg: number) { setPage(pg); fetchPage(pg); }
    const totalPaginas = data?.totalPaginas ?? 0;

    return (
        <div>
            <div className="sticky top-16 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-100 py-3 mb-4 flex flex-wrap items-center gap-2">
                <Select value={filterAno} onValueChange={(v) => setFilterAno(v)}>
                    <SelectTrigger className="h-9 w-28 text-[12px] bg-slate-50 border-slate-200"><SelectValue placeholder="Ano ▼" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os anos</SelectItem>
                        {anos.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={filterMes} onValueChange={(v) => setFilterMes(v)}>
                    <SelectTrigger className="h-9 w-24 text-[12px] bg-slate-50 border-slate-200"><SelectValue placeholder="Mês ▼" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {["01","02","03","04","05","06","07","08","09","10","11","12"].map(m => (
                            <SelectItem key={m} value={m}>{["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][parseInt(m)-1]}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={filterCat} onValueChange={(v) => setFilterCat(v)}>
                    <SelectTrigger className="h-9 w-40 text-[12px] bg-slate-50 border-slate-200"><SelectValue placeholder="Categoria ▼" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas as categorias</SelectItem>
                        {categoriasDisponiveis.map(c => (
                            <SelectItem key={c} value={c}>{catShort(c)}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={filterRisco} onValueChange={(v) => setFilterRisco(v)}>
                    <SelectTrigger className="h-9 w-28 text-[12px] bg-slate-50 border-slate-200"><SelectValue placeholder="🔴 Risco ▼" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {["MÁXIMO","ALTO","MÉDIO"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                </Select>
                <div className="flex-1 min-w-36">
                    <Input
                        placeholder="🔍 Fornecedor / CNPJ..."
                        value={filterFornecedor}
                        onChange={(e) => setFilterFornecedor(e.target.value)}
                        className="h-9 text-[12px] bg-slate-50 border-slate-200"
                    />
                </div>
                {hasFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-slate-400 hover:text-red-500 text-[12px]">
                        <X className="w-3.5 h-3.5 mr-1" /> Limpar
                    </Button>
                )}
                {loading && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
            </div>

            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl mb-4 text-red-600 text-[13px] font-medium">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {error}
                    <button onClick={() => fetchPage(page)} className="ml-auto flex items-center gap-1 text-[12px] hover:underline">
                        <RefreshCw className="w-3 h-3" /> Tentar novamente
                    </button>
                </div>
            )}

            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                        <thead>
                            <tr className="border-b border-slate-100">
                                {["Competência", "Categoria", "Valor", "Fornecedor", "CNPJ", "Nº NF", "PDF", "···"].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading && !data?.registros?.length ? (
                                <tr>
                                    <td colSpan={8} className="py-16 text-center text-slate-400 text-[13px]">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                        Carregando registros...
                                    </td>
                                </tr>
                            ) : (data?.registros ?? []).map((row) => (
                                <tr
                                    key={row.id}
                                    className={`border-b border-slate-50/70 cursor-pointer hover:bg-slate-50 transition-colors ${riscoRowClass(row.risco)}`}
                                    onClick={() => openDrawer(row)}
                                >
                                    <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{row.competencia}</td>
                                    <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{catShort(row.categoria)}</td>
                                    <td className="px-4 py-2.5 font-semibold text-slate-900 whitespace-nowrap">R$ {row.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                                    <td className="px-4 py-2.5 text-slate-600 max-w-[180px] truncate">{row.fornecedor || <span className="text-slate-300 italic">Não informado</span>}</td>
                                    <td className="px-4 py-2.5 text-slate-400 font-mono text-[11px] whitespace-nowrap">{row.cnpj}</td>
                                    <td className="px-4 py-2.5 font-mono text-slate-600">
                                        {isNFGenerica(row.nf)
                                            ? <span className="text-red-500 font-bold">{row.nf} ⚠️</span>
                                            : row.nf
                                        }
                                    </td>
                                    <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                                        {row.hasPdf
                                            ? <a href={row.link_pdf} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-900 transition-colors">📄</a>
                                            : <span className="text-slate-200">📄</span>
                                        }
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <button className="text-slate-300 hover:text-slate-700 transition-colors">···</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100">
                    <span className="text-[12px] text-slate-400 font-medium">
                        {data ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, data.totalRegistros)} de ${data.totalRegistros} registros` : "—"}
                    </span>
                    <div className="flex items-center gap-1">
                        <button onClick={() => goPage(Math.max(0, page - 1))} disabled={page === 0}
                            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => i + Math.max(0, Math.min(page - 2, totalPaginas - 5))).map(p => (
                            <button key={p} onClick={() => goPage(p)}
                                className={`w-8 h-8 rounded-lg text-[13px] font-bold transition-colors ${page === p ? "bg-slate-900 text-white" : "hover:bg-slate-100 text-slate-500"}`}>
                                {p + 1}
                            </button>
                        ))}
                        <button onClick={() => goPage(Math.min(totalPaginas - 1, page + 1))} disabled={page >= totalPaginas - 1}
                            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            <DetalheDrawer row={selectedRow} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        </div>
    );
}

// ─── Componente Principal ──────────────────────────────────────────────────────
export default function VerbasIndenizatoriasTab({ politicianName, slug }: VerbasTabProps) {
    const [subTab, setSubTab] = useState<"resumo" | "dados">("resumo");
    const [anoGlobal, setAnoGlobal] = useState("all");
    const [kpiData, setKpiData] = useState<ApiResponse | null>(null);
    const [loadingKpis, setLoadingKpis] = useState(true);
    const [errorKpis, setErrorKpis] = useState<string | null>(null);

    // ── FIX: lista de anos é preservada após o 1º carregamento.
    // Nunca é substituída quando o usuário filtra por um ano específico,
    // garantindo que todos os chips de ano permaneçam visíveis sempre.
    const anosRef = useRef<number[]>([]);
    const [anosFixos, setAnosFixos] = useState<number[]>([]);

    React.useEffect(() => {
        if (!slug) return;
        setLoadingKpis(true);
        setErrorKpis(null);
        // Sempre busca KPIs sem filtro de ano para manter a lista completa de anos
        const params = new URLSearchParams({ modo: "kpis" });
        if (anoGlobal !== "all") params.set("ano", anoGlobal);
        fetch(`/api/radar/verbas/${slug}?${params.toString()}`)
            .then(r => r.json())
            .then((data: ApiResponse) => {
                if (data.error) throw new Error(data.error);
                setKpiData(data);
                // Só atualiza a lista de anos se ainda estiver vazia (1ª carga)
                // ou se vieram mais anos do que os que já temos guardados
                if (anosRef.current.length === 0 && data.anos?.length) {
                    anosRef.current = data.anos;
                    setAnosFixos(data.anos);
                } else if (data.anos?.length > anosRef.current.length) {
                    anosRef.current = data.anos;
                    setAnosFixos(data.anos);
                }
            })
            .catch(e => setErrorKpis(e.message))
            .finally(() => setLoadingKpis(false));
    }, [slug, anoGlobal]);

    // Usa anosFixos (nunca encolhe) como fonte de verdade para o seletor
    const anosDisponiveis = anosFixos.length > 0 ? anosFixos : (kpiData?.anos ?? []);

    return (
        <div className="animate-in fade-in duration-500">

            {/* ── SELETOR DE ANO — todos os anos sempre visíveis acima das abas ── */}
            <AnoSeletor
                anos={anosDisponiveis}
                anoAtivo={anoGlobal}
                onChange={setAnoGlobal}
            />

            {/* ── SUB-ABAS ── */}
            <div className="flex items-center gap-2 mb-6 bg-slate-100/50 p-1 rounded-full w-max border border-slate-200">
                <button onClick={() => setSubTab("resumo")}
                    className={`px-5 py-1.5 rounded-full text-[13px] font-bold transition-all ${subTab === "resumo" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                    📊 Resumo
                </button>
                <button onClick={() => setSubTab("dados")}
                    className={`px-5 py-1.5 rounded-full text-[13px] font-bold transition-all ${subTab === "dados" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                    📋 Dados Completos
                </button>
            </div>

            {/* ── CONTEÚDO ── */}
            {loadingKpis ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                    <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
                    <p className="text-[14px] text-slate-400 font-medium">Carregando verbas de gabinete...</p>
                </div>
            ) : errorKpis ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                    <AlertTriangle className="w-10 h-10 text-red-300" />
                    <p className="text-[15px] font-bold text-slate-700">Dados não encontrados</p>
                    <p className="text-[13px] text-slate-400">{errorKpis}</p>
                </div>
            ) : subTab === "resumo" && kpiData ? (
                <ResumoContent data={kpiData} />
            ) : subTab === "dados" ? (
                <DadosCompletosContent
                    slug={slug}
                    anos={anosDisponiveis}
                    categoriasDisponiveis={kpiData?.categoriasDisponiveis ?? []}
                    anoGlobal={anoGlobal}
                />
            ) : null}
        </div>
    );
}
