"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
    Loader2, Receipt, TrendingUp, Coins, CalendarDays, ExternalLink, Activity, ArrowRight
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CityAmendmentsData {
    city_id: string;
    total_registros: number;
    total_orcado: number;
    total_empenhado: number;
    total_pago: number;
    por_area: { area: string; qtd: number; orcado: number; pago: number }[];
    por_politico: {
        politician_id: string;
        politician_name: string;
        politician_slug: string | null;
        partido: string | null;
        foto_url: string | null;
        qtd_emendas: number;
        total_orcado: number;
        total_pago: number;
    }[];
    emendas: any[]; // Não renderizaremos a lista toda se não for necessário ainda, mas guardamos caso precise
}

const AREA_COLORS: Record<string, string> = {
    "Saúde": "#10b981",          // Emerald
    "Educação": "#3b82f6",       // Blue
    "Assistência Social": "#f59e0b", // Amber
    "Agricultura": "#84cc16",    // Lime
    "Infraestrutura": "#6366f1", // Indigo
    "Segurança": "#ef4444",      // Red
    "Outros": "#94a3b8"          // Slate
};

const BRL = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

// ── Components ────────────────────────────────────────────────────────────────

export default function EmendasCityTab({ cityId, citySlug }: { cityId: string; citySlug: string }) {

    // Fetch na nova API do backend
    const { data, isLoading, error } = useQuery<CityAmendmentsData>({
        queryKey: ["cityAmendments", cityId],
        queryFn: async () => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/cities/${cityId}/amendments_received`);
            if (!res.ok) throw new Error("Falha ao buscar emendas da cidade");
            return res.json();
        },
        staleTime: 1000 * 60 * 5,
    });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
                <p>Calculando distribuição de emendas...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="p-10 text-center text-red-500 bg-red-50 rounded-2xl border border-red-100">
                <Activity className="w-10 h-10 mx-auto mb-3 opacity-50" />
                Não foi possível carregar as emendas desta cidade.
            </div>
        );
    }

    const {
        total_orcado, total_pago, total_registros, por_area, por_politico
    } = data;

    const topPoliticos = por_politico.slice(0, 10);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* ── KPIs Geológicos ─────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-slate-200/60 shadow-sm bg-white overflow-hidden">
                    <CardContent className="p-6 relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <TrendingUp className="w-16 h-16 text-indigo-500" />
                        </div>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Total Orçado (Prometido)</p>
                        <p className="text-3xl font-extrabold text-indigo-600 tracking-tight">{BRL(total_orcado)}</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200/60 shadow-sm bg-white overflow-hidden">
                    <CardContent className="p-6 relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Coins className="w-16 h-16 text-emerald-500" />
                        </div>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Total Pago (Real)</p>
                        <p className="text-3xl font-extrabold text-emerald-600 tracking-tight">{BRL(total_pago)}</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200/60 shadow-sm bg-white overflow-hidden">
                    <CardContent className="p-6 relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Receipt className="w-16 h-16 text-amber-500" />
                        </div>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Volume de Emendas</p>
                        <p className="text-3xl font-extrabold text-amber-600 tracking-tight">{total_registros} Atos</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* ── Gráfico Pizza ──────────────────────────── */}
                <div className="col-span-1 border border-slate-200/60 p-6 rounded-3xl bg-white shadow-sm flex flex-col items-center">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-6 w-full text-center">
                        Distribuição por Área (Orçado)
                    </h3>

                    {por_area.length > 0 ? (
                        <div className="w-full h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={por_area}
                                        dataKey="orcado"
                                        nameKey="area"
                                        cx="50%" cy="50%"
                                        innerRadius={60} outerRadius={90}
                                        paddingAngle={4}
                                    >
                                        {por_area.map((entry) => (
                                            <Cell key={entry.area} fill={AREA_COLORS[entry.area] || "#94a3b8"} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(v: any) => BRL(v as number)}
                                        contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="mt-4 flex flex-wrap gap-2 justify-center">
                                {por_area.slice(0, 5).map(a => (
                                    <Badge key={a.area} variant="outline" className="text-[10px] bg-slate-50">
                                        <div className="w-2 h-2 rounded-full mr-1" style={{ background: AREA_COLORS[a.area] || "#94a3b8" }} />
                                        {a.area}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Sem dados de área definidos</div>
                    )}
                </div>

                {/* ── Top Políticos (Rankeados) ──────────────── */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">
                                Parlamentares que destinaram recursos
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">Clique para ver o histórico detalhado do parlamentar</p>
                        </div>
                        <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-0">
                            {por_politico.length} mapeados
                        </Badge>
                    </div>

                    {/* ── Galeria de Cards Premium ────────────────── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {por_politico.map((pol) => {
                            const url = pol.politician_slug ? `/admin/radar/${pol.politician_slug}` : null;
                            const initials = pol.politician_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

                            return (
                                <Card key={pol.politician_id} className="border-slate-100 shadow-sm hover:shadow-xl hover:ring-2 hover:ring-indigo-100 transition-all group rounded-[24px] overflow-hidden bg-white">
                                    <CardContent className="p-5">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-lg">
                                                {pol.foto_url ? (
                                                    <img src={pol.foto_url} className="w-full h-full object-cover rounded-xl" alt={pol.politician_name} />
                                                ) : initials}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-900 truncate tracking-tight">{pol.politician_name}</p>
                                                <Badge variant="outline" className="text-[10px] font-bold text-slate-400 border-slate-200 mt-1">
                                                    {pol.partido || "S/P"}
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div className="bg-amber-50 rounded-xl p-3 border border-amber-100/50">
                                                <p className="text-[9px] font-black text-amber-600/60 uppercase tracking-widest mb-0.5">Destinado</p>
                                                <p className="text-sm font-bold text-amber-700">{BRL(pol.total_orcado)}</p>
                                            </div>
                                            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100/50">
                                                <p className="text-[9px] font-black text-emerald-600/60 uppercase tracking-widest mb-0.5">Pago</p>
                                                <p className="text-sm font-bold text-emerald-700">{BRL(pol.total_pago)}</p>
                                            </div>
                                        </div>

                                        {url && (
                                            <Link href={url} className="w-full">
                                                <Button variant="outline" className="w-full h-10 rounded-xl border-slate-200 text-xs font-bold text-slate-600 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-all">
                                                    Ver Radar <ArrowRight className="w-3 h-3 ml-2 group-hover:translate-x-1 transition-transform" />
                                                </Button>
                                            </Link>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* ── Tabela Técnica (Mantida abaixo) ──────────── */}
                    <div className="border border-slate-200/60 p-6 rounded-3xl bg-white shadow-sm overflow-hidden flex flex-col mt-8">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">
                            Detalhamento Técnico por Parlamentar
                        </h3>

                        <div className="rounded-xl border border-slate-200 overflow-hidden flex-1">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left whitespace-nowrap">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                                        <tr>
                                            <th className="px-5 py-3 rounded-tl-xl">Político</th>
                                            <th className="px-5 py-3 text-right">Orçado (R$)</th>
                                            <th className="px-5 py-3 text-right">Pago (R$)</th>
                                            <th className="px-5 py-3 text-center">Atos</th>
                                            <th className="px-5 py-3 rounded-tr-xl"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {topPoliticos.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                                                    Nenhum político enviou emendas para cá.
                                                </td>
                                            </tr>
                                        )}
                                        {topPoliticos.map((pol) => {
                                            const url = pol.politician_slug ? `/admin/radar/${pol.politician_slug}` : null;

                                            return (
                                                <tr key={pol.politician_id} className="hover:bg-slate-50 transition-colors group">
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm">
                                                                <AvatarImage src={pol.foto_url || ''} />
                                                                <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold text-xs ring-1 ring-indigo-200">
                                                                    {pol.politician_name.slice(0, 2).toUpperCase()}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <p className="font-bold text-slate-800">{pol.politician_name}</p>
                                                                <p className="text-[10px] uppercase font-bold text-slate-400">{pol.partido || "Sem Partido"}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4 text-right">
                                                        <span className="font-medium text-slate-700">{BRL(pol.total_orcado)}</span>
                                                    </td>
                                                    <td className="px-5 py-4 text-right">
                                                        <span className="font-bold text-emerald-600">{BRL(pol.total_pago)}</span>
                                                    </td>
                                                    <td className="px-5 py-4 text-center">
                                                        <Badge variant="outline" className="bg-white">{pol.qtd_emendas}</Badge>
                                                    </td>
                                                    <td className="px-5 py-4 text-right text-xs">
                                                        {url ? (
                                                            <Link href={url}>
                                                                <span className="font-bold text-slate-400 hover:text-indigo-600 cursor-pointer">ACESSAR</span>
                                                            </Link>
                                                        ) : (
                                                            <span className="font-bold text-slate-200 cursor-not-allowed">ACESSAR</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

