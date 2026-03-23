"use client";

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { DollarSign, WalletCards, ArrowDownToLine, CheckCircle2, BookOpen, Mail, Info } from "lucide-react";
import { formatCompactCurrency, formatCurrency } from "@/lib/fiscal-analytics";

interface VisaoGeralTabProps {
    politicianId: string;
    biografia?: string;
    email?: string;
    nome?: string; // Nome para filtrar alba_verbas
}

const AREA_COLORS: Record<string, string> = {
    "Saúde": "#10B981",
    "Educação": "#3B82F6",
    "Infraestrutura": "#F59E0B",
    "Cidadania": "#8B5CF6",
    "Segurança": "#EF4444",
    "Agricultura": "#84CC16",
    "Turismo": "#EC4899",
    "Cultura": "#06B6D4",
    "Esporte": "#F97316",
    "Meio Ambiente": "#14B8A6",
};

export default function VisaoGeralTab({ politicianId, biografia, email, nome }: VisaoGeralTabProps) {
    const { data: analytics, isLoading } = useQuery({
        queryKey: ["politicianAlbaAnalytics", nome],
        queryFn: async () => {
            if (!nome) return null;

            const { createDadosClient } = await import("@/lib/supabase/dados");
            const supabase = createDadosClient();

            const { data, error } = await supabase
                .from("alba_verbas")
                .select("*")
                .ilike("deputado", `%${nome}%`);

            if (error) throw error;
            if (!data || data.length === 0) return null;

            // Agregação dos dados da alba_verbas
            const totalPago = data.reduce((sum, item) => sum + (Number(item.valor) || 0), 0);
            const totalOrcado = totalPago; // Usando valor como base na falta de orçado explícito
            const totalEmpenhado = totalPago;
            const totalLiquidado = totalPago;

            // Por área (usando a coluna 'categoria')
            const areas: Record<string, number> = {};
            data.forEach(item => {
                const area = item.categoria || "Outros";
                areas[area] = (areas[area] || 0) + (Number(item.valor) || 0);
            });
            const por_area = Object.entries(areas).map(([area, value]) => ({ area, orcado: value }));

            // Por ano/mês
            const anual: Record<number, { empenhado: number, pago: number }> = {};
            data.forEach(item => {
                const ano = Number(item.ano) || 2024;
                if (!anual[ano]) anual[ano] = { empenhado: 0, pago: 0 };
                anual[ano].pago += (Number(item.valor) || 0);
                anual[ano].empenhado += (Number(item.valor) || 0);
            });
            const por_ano = Object.entries(anual).map(([ano, vals]) => ({
                ano: String(ano),
                empenhado: vals.empenhado,
                pago: vals.pago
            }));

            return {
                totalOrcado,
                totalEmpenhado,
                totalLiquidado,
                totalPago,
                por_ano,
                por_area
            };
        },
        staleTime: 1000 * 60 * 30,
    });

    if (isLoading) {
        return <div className="p-20 text-center text-slate-400">Carregando painel analítico...</div>;
    }

    // Mesmo sem analytics (emendas), queremos mostrar a biografia
    const hasAnalytics = analytics && analytics.totalOrcado > 0;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Biografia e Contatos (ALBA) */}
            {biografia && (
                <Card className="border-0 shadow-sm ring-1 ring-slate-100 bg-white overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
                        <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-indigo-500" />
                            Perfil Parlamentar
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                            <div className="lg:col-span-3">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Info className="w-3.5 h-3.5" />
                                    Biografia e Trajetória
                                </h4>
                                <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-slate-200">
                                    {biografia}
                                </div>
                            </div>
                            <div className="lg:col-span-1 space-y-6">
                                <div>
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Contato Oficial</h4>
                                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                                        {email && (
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-full bg-white shadow-sm">
                                                    <Mail className="w-4 h-4 text-indigo-500" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">E-mail Gabinete</span>
                                                    <a href={`mailto:${email}`} className="text-xs font-bold text-slate-700 hover:text-indigo-600 transition-colors break-all">
                                                        {email}
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                        <div className="pt-2">
                                            <Badge variant="outline" className="text-[9px] font-black uppercase bg-indigo-50/50 text-indigo-700 border-indigo-100">
                                                Assembleia Legislativa da Bahia
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {hasAnalytics && (
                <>
                    {/* KPIs - 4 Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card className="border-0 shadow-sm hover:shadow-xl transition-all duration-500 bg-white group ring-1 ring-slate-100 overflow-hidden relative">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-emerald-500" />
                                    Total Orçado
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-extrabold text-emerald-600 tracking-tight group-hover:scale-105 transition-transform origin-left duration-300">
                                    {formatCompactCurrency(analytics?.totalOrcado || 0)}
                                </p>
                            </CardContent>
                            <WalletCards className="w-16 h-16 text-emerald-600 absolute bottom-0 right-0 -mb-4 -mr-4 opacity-5 group-hover:scale-110 transition-transform duration-500" />
                        </Card>

                        <Card className="border-0 shadow-sm hover:shadow-xl transition-all duration-500 bg-white group ring-1 ring-slate-100 overflow-hidden relative">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <ArrowDownToLine className="w-4 h-4 text-amber-500" />
                                    Total Empenhado
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-extrabold text-amber-600 tracking-tight group-hover:scale-105 transition-transform origin-left duration-300">
                                    {formatCompactCurrency(analytics?.totalEmpenhado || 0)}
                                </p>
                            </CardContent>
                            <ArrowDownToLine className="w-16 h-16 text-amber-600 absolute bottom-0 right-0 -mb-4 -mr-4 opacity-5 group-hover:scale-110 transition-transform duration-500" />
                        </Card>

                        <Card className="border-0 shadow-sm hover:shadow-xl transition-all duration-500 bg-white group ring-1 ring-slate-100 overflow-hidden relative">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                                    Total Liquidado
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-extrabold text-indigo-600 tracking-tight group-hover:scale-105 transition-transform origin-left duration-300">
                                    {formatCompactCurrency(analytics?.totalLiquidado || 0)}
                                </p>
                            </CardContent>
                            <CheckCircle2 className="w-16 h-16 text-indigo-600 absolute bottom-0 right-0 -mb-4 -mr-4 opacity-5 group-hover:scale-110 transition-transform duration-500" />
                        </Card>

                        <Card className="border-0 shadow-sm hover:shadow-xl transition-all duration-500 bg-white group ring-1 ring-slate-100 overflow-hidden relative">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-blue-500" />
                                    Total Pago
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-extrabold text-blue-600 tracking-tight group-hover:scale-105 transition-transform origin-left duration-300">
                                    {formatCompactCurrency(analytics?.totalPago || 0)}
                                </p>
                            </CardContent>
                            <DollarSign className="w-16 h-16 text-blue-600 absolute bottom-0 right-0 -mb-4 -mr-4 opacity-5 group-hover:scale-110 transition-transform duration-500" />
                        </Card>
                    </div>

                    {/* Gráficos */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                        {/* Comparativo Anual */}
                        <Card className="col-span-1 border-0 shadow-sm ring-1 ring-slate-100 bg-white">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg font-bold text-slate-800 tracking-tight">Evolução do Empenho vs Pago</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 pt-4">
                                <div style={{ width: "100%", height: 350, minHeight: 350 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analytics?.por_ano || []}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis
                                                dataKey="ano"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 600 }}
                                                dy={10}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tickFormatter={(v) => `R$ ${(v / 1000000).toFixed(0)}M`}
                                                tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }}
                                                dx={-10}
                                            />
                                            <RechartsTooltip
                                                cursor={{ fill: '#f8fafc' }}
                                                contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                                                formatter={(v: any) => formatCurrency(v as number)}
                                            />
                                            <Legend wrapperStyle={{ paddingTop: "20px", fontSize: "12px", fontWeight: "bold", color: "#64748b" }} />
                                            <Bar dataKey="empenhado" name="Empenhado" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="pago" name="Pago" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Por Área */}
                        <Card className="col-span-1 border-0 shadow-sm ring-1 ring-slate-100 bg-white">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg font-bold text-slate-800 tracking-tight">Distribuição Temática (Orçado)</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 pt-4">
                                <div style={{ width: "100%", height: 350, minHeight: 350 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={analytics?.por_area || []}
                                                dataKey="orcado"
                                                nameKey="area"
                                                cx="50%" cy="50%"
                                                innerRadius={70} outerRadius={110}
                                                paddingAngle={4}
                                            >
                                                {(analytics?.por_area || []).map((entry: any) => (
                                                    <Cell key={entry.area} fill={AREA_COLORS[entry.area] || "#94a3b8"} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip
                                                contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                                                formatter={(v: any) => formatCurrency(v as number)}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex flex-wrap justify-center gap-3 mt-2">
                                    {(analytics?.por_area || []).map((area: any) => (
                                        <div key={area.area} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: AREA_COLORS[area.area] || "#94a3b8" }} />
                                            {area.area}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}
