"use client";

import React, { useState } from "react";
import {
    ChevronDown, Award, Phone, Mail, MapPin, Eye,
    TrendingUp, TrendingDown, GraduationCap, Briefcase, Star, Shield
} from "lucide-react";
import {
    AreaChart, Area, XAxis, CartesianGrid,
    Tooltip, ResponsiveContainer
} from "recharts";

interface VisaoGeralTabProps {
    politicianId: string;
    nome: string;
    biografia?: string;
    email?: string;
    onNavigateToTab?: (tabId: string) => void;
    verbasSummary?: any;
    albaData?: any;
}

// Sparkline helper
function Sparkline({ data, color }: { data: number[]; color: string }) {
    const max = Math.max(...data), min = Math.min(...data);
    const pts = data.map((v, i) => {
        const x = (i / (data.length - 1)) * 52;
        const y = 20 - ((v - min) / (max - min || 1)) * 18;
        return `${x},${y}`;
    }).join(" ");
    const last = data[data.length - 1], prev = data[data.length - 2];
    const trend = last > prev ? "up" : last < prev ? "down" : "flat";
    return (
        <div className="flex items-end gap-1.5">
            <svg width="52" height="20" viewBox="0 0 52 20" fill="none">
                <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {trend === "up" && <TrendingUp className="w-3 h-3 text-emerald-500" />}
            {trend === "down" && <TrendingDown className="w-3 h-3 text-red-400" />}
        </div>
    );
}

// Portal data - Configuração Enterprise (Zero Mocks)
// total: null = dados ainda não carregados (nunca exibir mock de valor)
const PORTAIS_BASE = [
    { id: "verbas-old",        icon: "🏛️", label: "Verbas Gabinete",   total: null, meta: null, bar: null, alert: 0, ativo: true,  trend: null, acento: "#D97706", bg: "#FFFBEB", fg: "#92400E", tabId: "verbas" },
    { id: "emendas-ba-painel", icon: "📊", label: "Emendas BA Painel", total: null, meta: null, bar: null, alert: 0, ativo: false, trend: null, acento: "#16A34A", bg: "#F0FDF4", fg: "#15803D", tabId: null },
    { id: "emendas-ba-dados",  icon: "📦", label: "Emendas BA Dados",  total: null, meta: null, bar: null, alert: 0, ativo: false, trend: null, acento: "#0D9488", bg: "#F0FDFA", fg: "#0F766E", tabId: null },
    { id: "seplan-loa",        icon: "📄", label: "SEPLAN LOA",        total: null, meta: null, bar: null, alert: 0, ativo: false, trend: null, acento: "#0284C7", bg: "#F0F9FF", fg: "#0369A1", tabId: null },
    { id: "portal-federal",    icon: "🇾🇧", label: "Portal Federal",   total: null, meta: null, bar: null, alert: 0, ativo: false, trend: null, acento: "#2563EB", bg: "#EFF6FF", fg: "#1D4ED8", tabId: null },
    { id: "empresas-rf",       icon: "🏢", label: "Empresas RF",       total: null, meta: null, bar: null, alert: 0, ativo: false, trend: null, acento: "#B45309", bg: "#FFFBEB", fg: "#92400E", tabId: null },
    { id: "tcm-ba",            icon: "⚖️", label: "TCM-BA",           total: null, meta: null, bar: null, alert: 0, ativo: false, trend: null, acento: "#DC2626", bg: "#FEF2F2", fg: "#991B1B", tabId: null },
    { id: "rastreabilidade",   icon: "🔗", label: "Rastreabilidade",   total: null, meta: null, bar: null, alert: 0, ativo: false, trend: null, acento: "#2563EB", bg: "#EFF6FF", fg: "#1E40AF", tabId: null },
];

const ALERTAS: any[] = [];
const EVOLUCAO: any[] = [];

const glass = {
    background: "rgba(255,255,255,0.85)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.6)",
    boxShadow: "0 4px 32px rgba(0,0,0,0.04), 0 1px 4px rgba(0,0,0,0.03)",
};

function getItemLabel(item: any): string {
    if (!item) return "";
    if (typeof item === "string") return item;
    return item.label || item.cargo || item.curso || item.titulo || item.nome || item.descricao || JSON.stringify(item);
}

function getItemSub(item: any): string | null {
    if (!item || typeof item === "string") return null;
    return item.sub || item.instituicao || item.periodo || item.ano || item.local || null;
}

function sanitizeProfissao(val: string | null | undefined): string {
    if (!val) return "—";
    const lixo = ["nascimento:", "naturalidade:", "partido:", "gabinete:", "email:", "telefone:"];
    if (lixo.some(l => val.toLowerCase().trim().startsWith(l))) return "—";
    return val.trim() || "—";
}

export default function VisaoGeralTab({ nome, onNavigateToTab, verbasSummary, albaData }: VisaoGeralTabProps) {
    const [bioExpandida, setBioExpandida] = useState(false);

    if (!albaData) {
        return <div className="p-8 text-center text-slate-400">Carregando dados estruturados...</div>;
    }

    const formacaoAcademica:    any[] = Array.isArray(albaData.formacao_academica)    ? albaData.formacao_academica    : [];
    const carreiraPolitica:     any[] = Array.isArray(albaData.carreira_politica)     ? albaData.carreira_politica     : [];
    const liderancaComissoes:   any[] = Array.isArray(albaData.lideranca_e_comissoes) ? albaData.lideranca_e_comissoes : [];
    const condecoracoes:        any[] = Array.isArray(albaData.condecoracoes)         ? albaData.condecoracoes         : [];
    const tagsEstrategicas:     any[] = Array.isArray(albaData.tags_estrategicas)     ? albaData.tags_estrategicas     : [];

    const bioResumo = albaData.biografia_resumo || albaData.nome_urna || nome || "Biografia em processamento pelo Radar...";

    const d = {
        nomeEleitoral:  albaData.nome_urna || nome,
        partido:        albaData.sigla_partido,
        municipioBase:  albaData.uf || "BA",
        mandatos:       Array.isArray(albaData.mandatos) ? albaData.mandatos : [],
        dadosPessoais: [
            { label: "Nome Completo", valor: albaData.nome_civil || "—" },
            {
                label: "Nascimento",
                valor: albaData.data_nascimento
                    ? albaData.data_nascimento.split("T")[0].split("-").reverse().join("/")
                    : "—"
            },
            { label: "Naturalidade",  valor: albaData.municipio_nascimento ? `${albaData.municipio_nascimento} - ${albaData.uf_nascimento || "BA"}` : "—" },
            { label: "Partido",       valor: `${albaData.partido_nome || ""} (${albaData.sigla_partido || ""})`.trim() || "—" },
            { label: "Profissão",     valor: sanitizeProfissao(albaData.profissao) },
            { label: "Gabinete",      valor: albaData.gabinete_endereco || "—" },
        ],
        telefones: (Array.isArray(albaData.telefones) ? albaData.telefones : []).flatMap((t: string) => t.split(/[/;]/).map((s: string) => s.trim()).filter(Boolean)),
        emailContato:   albaData.email || "—",
        mandatosCount:  albaData.mandatos_count || (Array.isArray(albaData.mandatos) ? albaData.mandatos.length : 0),
        qualidadeScore: (Number(albaData.qualidade_score) <= 1 ? (Number(albaData.qualidade_score) || 0) * 100 : Number(albaData.qualidade_score) || 0).toFixed(0),
    };

    // ── Merge de portais com dados reais (verbasSummary) ──
    // Regra: NUNCA exibir valores mock. Se não há dados, exibe estado de carregamento honesto.
    const portais = PORTAIS_BASE.map(p => {
        if (p.id === "verbas-old") {
            if (verbasSummary) {
                // Dados reais disponíveis
                const totalFormatado = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(verbasSummary.totalGasto || 0);
                const alertCount = verbasSummary.alertasForenses?.reduce((s: number, a: any) => s + a.count, 0) || 0;
                return {
                    ...p,
                    total: totalFormatado,
                    meta:  `${verbasSummary.totalNotas ?? 0} registros · ${verbasSummary.totalFornecedores ?? 0} fornecedores`,
                    alert: alertCount,
                    ativo: true,
                };
            }
            // Sem dados ainda — estado honesto, sem mock de R$ 0,00
            return {
                ...p,
                total: null,  // null = exibe skeleton/carregando
                meta:  null,
                ativo: true,
            };
        }
        return p;
    });

    // ── Timeline ──
    type TimelineItem = {
        labelYear: string;
        text: string;
        isEleito: boolean;
        colorBg: string;
        colorBorder: string;
        colorDot: string;
        startYear: number;
        destaque: boolean;
    };

    const buildTimelineFromArray = (arr: any[]): TimelineItem[] =>
        arr.map((m: any) => {
            const label = getItemLabel(m);
            const sub   = getItemSub(m);
            const anoMatch = (sub || label).match(/\b(19|20)\d{2}(-(19|20)\d{2})?\b/);
            const anoStr   = anoMatch ? anoMatch[0] : "";
            const isEleito = /(eleito|reeleito|suplente|mandato|deputad)/i.test(label);
            return {
                labelYear:   anoStr || (sub || "—"),
                text:        label,
                isEleito,
                colorBg:     isEleito ? "rgba(59,130,246,0.04)" : "white",
                colorBorder: isEleito ? "rgba(59,130,246,0.15)" : "rgba(241,245,249,1)",
                colorDot:    isEleito ? "#3B82F6" : "#E2E8F0",
                startYear:   anoStr ? parseInt(anoStr.substring(0, 4)) : 0,
                destaque:    false,
            };
        }).sort((a, b) => b.startYear - a.startYear);

    const buildTimelineFromMandatos = (arr: any[]): TimelineItem[] =>
        arr.flatMap((m: any) => {
            const rawText = m.descricao || m.cargo || m.texto || m.legislatura || m.periodo || m;
            if (typeof rawText !== "string") return [];
            return rawText.split(/(?<=[.;!])\s+/).map((s: string) => s.trim()).filter((s: string) => s.length > 5).map((sentence: string) => {
                const anoMatch = sentence.match(/\b(19|20)\d{2}(-(19|20)\d{2})?\b/);
                const anoStr   = anoMatch ? anoMatch[0] : "";
                let cleanSentence = sentence;
                if (anoMatch && cleanSentence.startsWith(anoMatch[0])) {
                    cleanSentence = cleanSentence.substring(anoMatch[0].length).replace(/^[-;, ]+/, "").trim();
                }
                const isEleito = /(eleito|reeleito|suplente|mandato)/i.test(cleanSentence);
                return {
                    labelYear:   anoStr || "—",
                    text:        cleanSentence,
                    isEleito,
                    colorBg:     isEleito ? "rgba(59,130,246,0.04)" : "white",
                    colorBorder: isEleito ? "rgba(59,130,246,0.15)" : "rgba(241,245,249,1)",
                    colorDot:    isEleito ? "#3B82F6" : "#E2E8F0",
                    startYear:   anoStr ? parseInt(anoStr.substring(0, 4)) : 0,
                    destaque:    false,
                };
            });
        });

    const rawTimeline = carreiraPolitica.length > 0
        ? buildTimelineFromArray(carreiraPolitica)
        : buildTimelineFromMandatos(d.mandatos);

    const timelineItems = rawTimeline
        .filter((item: TimelineItem, index: number, self: TimelineItem[]) =>
            index === self.findIndex((t: TimelineItem) =>
                t.labelYear === item.labelYear && (t.text.includes(item.text) || item.text.includes(t.text))
            )
        );

    const quadrantes = [
        {
            t: "FORMAÇÃO",
            icon: <GraduationCap className="w-3.5 h-3.5" />,
            items: formacaoAcademica,
            fallback: albaData.biografia_completa?.match(/Forma[\u00e7c][\u00e3a]o[^]*?(?=Atividade|Mandato|$)/i)?.[0]?.replace(/Forma[\u00e7c][\u00e3a]o[\s\w]*:?/i, "").trim() || null,
        },
        {
            t: "PROFISS\u00c3O",
            icon: <Briefcase className="w-3.5 h-3.5" />,
            items: albaData.atividade_profissional ? [albaData.atividade_profissional] : [],
            fallback: sanitizeProfissao(albaData.profissao) !== "—" ? sanitizeProfissao(albaData.profissao) : (albaData.biografia_completa?.match(/Atividade Profissional[^]*?(?=Mandato|Atividade Parlamentar|$)/i)?.[0]?.replace(/Atividade Profissional:?/i, "").trim() || null),
        },
        {
            t: "HISTÓRICO ELEITORAL",
            icon: <Star className="w-3.5 h-3.5" />,
            items: carreiraPolitica.length > 0 ? carreiraPolitica.slice(0, 4) : [],
            fallback: albaData.biografia_completa?.match(/Mandato Eletivo[^]*?(?=Atividade Parlamentar|$)/i)?.[0]?.replace(/Mandato Eletivo:?/i, "").split(/[.;]/)[0]?.trim() || null,
        },
        {
            t: "MESA DIRETORA E COMISS\u00d5ES",
            icon: <Shield className="w-3.5 h-3.5" />,
            items: liderancaComissoes,
            fallback: albaData.biografia_completa?.match(/Atividade Parlamentar[^]*/i)?.[0]?.replace(/Atividade Parlamentar:?/i, "").trim() || null,
        },
    ];

    return (
        <div className="space-y-4 pb-6" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.05) 0%, transparent 50%)" }}>

            {/* ══ HERO ══ */}
            <div className="rounded-3xl overflow-hidden" style={glass}>
                <div className="px-6 py-2 border-b flex items-center justify-between" style={{ borderColor: "rgba(0,0,0,0.04)", background: "rgba(255,255,255,0.5)" }}>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Portfólio de Inteligência Parlamentar</p>
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-600 uppercase tracking-widest">
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        </span>
                        Radar Ativo
                    </div>
                </div>

                <div className="p-6">
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-[24px] font-black tracking-tighter" style={{ color: "#0F172A" }}>{d.nomeEleitoral}</h1>
                                <span className="border text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: "#F1F5F9", borderColor: "#E2E8F0", color: "#475569" }}>{d.partido}</span>
                                <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" /> {d.municipioBase}</span>
                            </div>

                            {tagsEstrategicas.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                    {tagsEstrategicas.slice(0, 8).map((tag: any, i: number) => (
                                        <span key={i} className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                                            {typeof tag === "string" ? tag : tag.label || tag.tag || String(tag)}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <p className="text-[14px] leading-relaxed text-slate-600 mb-2 max-w-2xl text-justify">{bioResumo}</p>

                            <button onClick={() => setBioExpandida(!bioExpandida)} className="text-[12px] font-bold text-indigo-500 hover:text-indigo-700 flex items-center gap-1 mt-2">
                                {bioExpandida ? "Recolher dossiê" : "Ver dossiê completo"} <ChevronDown className={`w-3 h-3 transition-transform ${bioExpandida ? "rotate-180" : ""}`} />
                            </button>

                            {bioExpandida && (
                                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 pt-5 border-t border-slate-50">
                                    {quadrantes.map((q, idx) => {
                                        const hasItems = q.items.length > 0;
                                        const hasFallback = !!q.fallback;
                                        return (
                                            <div key={idx} className="col-span-1 bg-white/40 p-4 rounded-2xl border border-slate-50">
                                                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                                    <span className="text-indigo-400">{q.icon}</span> {q.t}
                                                </p>
                                                {hasItems ? (
                                                    <ul className="space-y-1.5">
                                                        {q.items.slice(0, 5).map((item: any, ii: number) => {
                                                            const label = getItemLabel(item);
                                                            const sub   = getItemSub(item);
                                                            return (
                                                                <li key={ii} className="text-[12px] leading-snug text-slate-700">
                                                                    <span className="font-semibold">{label}</span>
                                                                    {sub && <span className="text-slate-400 font-normal"> · {sub}</span>}
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                ) : hasFallback ? (
                                                    <p className="text-[12px] leading-relaxed text-slate-600 text-justify">{q.fallback}</p>
                                                ) : (
                                                    <p className="text-[12px] text-slate-300 italic">Informação não disponível.</p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 shrink-0">
                            {[
                                { val: d.mandatosCount,         label: "mandatos", color: "#6366F1" },
                                { val: d.qualidadeScore + "%",  label: "score",    color: "#10B981" },
                                { val: d.telefones.length,      label: "contatos", color: "#F59E0B" },
                            ].map(s => (
                                <div key={s.label} className="w-20 py-2.5 rounded-2xl border bg-white/50 text-center" style={{ borderColor: "rgba(0,0,0,0.03)" }}>
                                    <p className="font-mono text-[20px] font-black leading-none" style={{ color: s.color }}>{s.val}</p>
                                    <p className="text-[8px] font-bold uppercase tracking-widest mt-1 text-slate-400">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ══ PAINEL DE PORTAIS ══ */}
            <div className="rounded-3xl p-6" style={glass}>
                <div className="flex items-end justify-between mb-4">
                    <h3 className="text-[15px] font-black text-slate-900 uppercase tracking-tight">Painel de Inteligência</h3>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">10 Canais Monitorados</span>
                        <div className="h-1 w-20 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-400 w-1/3" /></div>
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
                    {portais.map((p) => {
                        const isClickable = p.ativo && p.tabId && onNavigateToTab;
                        const Wrapper = isClickable ? "button" : "div";
                        // Estado de carregamento — dados ainda não chegaram do servidor
                        const isLoading = p.ativo && p.total === null;
                        return (
                            <Wrapper
                                key={p.id}
                                {...(isClickable ? { onClick: () => onNavigateToTab!(p.tabId!) } : {})}
                                className={`rounded-2xl border p-3 transition-all relative overflow-hidden group border-slate-100/50 text-left ${
                                    isClickable
                                        ? "cursor-pointer hover:shadow-md hover:scale-[1.02] hover:border-amber-200"
                                        : ""
                                }`}
                                style={{
                                    backgroundColor: p.ativo ? "rgba(255,255,255,0.95)" : "rgba(248,250,252,0.5)",
                                    opacity: p.ativo ? 1 : 0.55,
                                }}
                            >
                                {p.ativo && (
                                    <div className="absolute top-0 right-0 w-12 h-12 -mr-6 -mt-6 rounded-full opacity-10" style={{ backgroundColor: p.acento }} />
                                )}
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[14px]">{p.icon}</span>
                                    <div className="flex items-center gap-1">
                                        {p.alert > 0 && (
                                            <span className="text-[8px] font-black text-white px-1.5 py-0.5 rounded-full" style={{ backgroundColor: p.acento }}>
                                                {p.alert}
                                            </span>
                                        )}
                                        {p.ativo && p.tabId && (
                                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                                                ATIVO
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <p className="text-[8px] font-black uppercase tracking-widest mb-1" style={{ color: p.ativo ? p.acento : "#94A3B8" }}>
                                    {p.label}
                                </p>

                                {/* Valor principal — real ou skeleton de carregamento */}
                                {isLoading ? (
                                    <div className="space-y-1 mt-1">
                                        <div className="h-4 w-24 rounded-md animate-pulse bg-amber-100/70" />
                                        <div className="h-2.5 w-16 rounded-md animate-pulse bg-slate-100" />
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-[15px] font-mono font-black" style={{ color: p.ativo ? "#1E293B" : "#CBD5E1" }}>
                                            {p.total ?? "—"}
                                        </p>
                                        {p.ativo && p.meta && (
                                            <p className="text-[9px] text-slate-400 font-medium mt-0.5 truncate">{p.meta}</p>
                                        )}
                                    </>
                                )}

                                {p.trend && p.ativo && (
                                    <div className="mt-2"><Sparkline data={p.trend as number[]} color={p.acento} /></div>
                                )}
                                {isClickable && (
                                    <p className="text-[9px] font-bold mt-2" style={{ color: p.acento }}>Ver detalhes →</p>
                                )}
                            </Wrapper>
                        );
                    })}
                </div>
            </div>

            {/* ══ TIMELINE + SIDEBAR ══ */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-7 space-y-4">
                    <div className="rounded-3xl p-6" style={glass}>
                        <h3 className="text-[14px] font-black text-slate-900 uppercase tracking-tighter mb-5">Carreira ALBA</h3>
                        <div className="relative pl-5">
                            <div className="absolute left-[9px] top-1 bottom-4 w-px bg-slate-100" />
                            <div className="space-y-4">
                                {timelineItems.length > 0 ? timelineItems.map((item: any, i: number) => (
                                    <div key={i} className="flex gap-4 items-start relative group">
                                        <div className="absolute -left-[23px] mt-1.5 w-[13px] h-[13px] rounded-full border-[3px] border-white shadow-sm transition-colors z-10"
                                             style={{ backgroundColor: item.colorDot }}>
                                            {item.isEleito && <span className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-40" />}
                                        </div>
                                        <div className="flex-1 p-3.5 rounded-2xl border transition-all hover:bg-slate-50 hover:shadow-sm"
                                             style={{ background: item.colorBg, borderColor: item.colorBorder }}>
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg border shadow-sm ${item.isEleito ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                                                    {item.labelYear}
                                                </span>
                                            </div>
                                            <p className="text-[13px] text-slate-600 leading-relaxed">{item.text}</p>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-[11px] text-slate-300 italic">Nenhum histórico de mandatos registrado.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {ALERTAS.length > 0 && (
                        <div className="rounded-3xl p-6" style={glass}>
                            <h3 className="text-[14px] font-black text-slate-900 uppercase tracking-tighter mb-4">Vetores Críticos</h3>
                            <div className="space-y-2">
                                {ALERTAS.map((a: any, i: number) => (
                                    <div key={i} className="flex items-center gap-3 p-2 rounded-xl border border-slate-100/50 bg-white/40 hover:bg-white transition-all">
                                        <div className="w-1 h-8 rounded-full" style={{ backgroundColor: a.borderCor }} />
                                        <div className="flex-1">
                                            <p className="text-[12px] font-bold text-slate-800 flex items-center gap-2">
                                                {a.desc} <span className="text-[8px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-400">{a.portal}</span>
                                            </p>
                                            <p className="text-[10px] text-slate-400">{a.sub}</p>
                                        </div>
                                        <button className="p-1.5 rounded-lg hover:bg-slate-50"><Eye className="w-3.5 h-3.5 text-slate-300" /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-5 space-y-4">
                    <div className="rounded-3xl p-6" style={glass}>
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">Dossiê Detalhado</p>
                        <div className="space-y-3">
                            {d.dadosPessoais.map(item => (
                                <div key={item.label} className="flex justify-between items-baseline border-b border-slate-50 pb-2 last:border-0">
                                    <span className="text-[10px] font-bold text-slate-300 uppercase">{item.label}</span>
                                    <span className="text-[12px] font-black text-slate-700 text-right max-w-[180px]">{item.valor}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-3xl p-6" style={glass}>
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">Honrarias & Contatos</p>
                        <div className="space-y-4">
                            {condecoracoes.length > 0 && (
                                <div className="space-y-1.5 mb-3">
                                    {condecoracoes.slice(0, 5).map((c: any, i: number) => (
                                        <div key={i} className="flex items-start gap-2 text-[11px] text-slate-600 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-xl">
                                            <Award className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                                            <span>{getItemLabel(c)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="pt-2 border-t border-slate-50 space-y-2">
                                <div className="flex items-center gap-2 text-[12px] font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-xl">
                                    <Mail className="w-3.5 h-3.5" /> {d.emailContato}
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    {d.telefones.map((t: string) => (
                                        <div key={t} className="text-[11px] font-mono font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 flex items-center gap-1.5">
                                            <Phone className="w-3 h-3 opacity-30" /> {t}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {EVOLUCAO.length > 0 && (
                <div className="rounded-3xl p-6" style={glass}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-[14px] font-black text-slate-900 uppercase tracking-tighter">Evolução de Vetores Financeiros</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={EVOLUCAO} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gIndigo" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366F1" stopOpacity={0.1}/><stop offset="95%" stopColor="#6366F1" stopOpacity={0}/></linearGradient>
                                <linearGradient id="gEmerald" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10B981" stopOpacity={0}/></linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="2 4" stroke="#F1F5F9" vertical={false} />
                            <XAxis dataKey="ano" tick={{ fontSize: 10, fill: "#94A3B8", fontWeight: 700 }} axisLine={false} tickLine={false} />
                            <Tooltip />
                            <Area dataKey="estaduais" stroke="#10B981" strokeWidth={2} fill="url(#gEmerald)" type="monotone" dot={false} />
                            <Area dataKey="federais"  stroke="#6366F1" strokeWidth={1.5} fill="url(#gIndigo)" type="monotone" dot={false} strokeDasharray="4 4" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

        </div>
    );
}
