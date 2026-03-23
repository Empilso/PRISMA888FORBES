"use client";

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from "recharts";
import { formatCurrency } from "@/lib/fiscal-analytics";

interface PorAnoTabProps {
    politicianId: string;
}

export default function PorAnoTab({ politicianId }: PorAnoTabProps) {
    const { data, isLoading } = useQuery({
        queryKey: ["politicianAmendments", politicianId],
        queryFn: async () => {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const res = await fetch(`${API_URL}/api/politicians/${politicianId}/amendments?limit=500`);
            if (!res.ok) throw new Error("Erro ao carregar emendas");
            return res.json();
        },
        staleTime: 1000 * 60 * 30,
    });

    const yearlyData = useMemo(() => {
        if (!data || !data.por_ano) return [];
        return [...data.por_ano].sort((a: any, b: any) => a.ano - b.ano);
    }, [data]);

    if (isLoading) {
        return <div className="p-20 text-center text-slate-400">Carregando comparativo anual...</div>;
    }

    if (!yearlyData.length) return null;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-0 shadow-sm ring-1 ring-slate-100 bg-white">
                <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-xl font-extrabold text-slate-800 tracking-tight">Histórico de Execução (2022-2026)</CardTitle>
                    <p className="text-sm text-slate-500 font-medium">Progressão das etapas de pagamento Orçado → Empenhado → Pago ao longo dos ciclos orçamentários.</p>
                </CardHeader>
                <CardContent className="p-8 pt-4">
                    <div style={{ width: "100%", height: 500, minHeight: 500 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={yearlyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis
                                    dataKey="ano"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: "#64748B", fontSize: 13, fontWeight: 700 }}
                                    dy={15}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(v) => `R$ ${(v / 1000000).toFixed(0)}M`}
                                    tick={{ fill: "#64748B", fontSize: 12, fontWeight: 600 }}
                                    dx={-15}
                                />
                                <RechartsTooltip
                                    cursor={{ fill: '#F8FAFC' }}
                                    contentStyle={{ borderRadius: 16, border: "none", boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)" }}
                                    formatter={(v: any) => formatCurrency(v as number)}
                                    labelStyle={{ fontWeight: "bold", color: "#0F172A", marginBottom: 8 }}
                                />
                                <Legend
                                    wrapperStyle={{ paddingBottom: "25px", fontSize: "14px", fontWeight: "bold" }}
                                />
                                <Bar dataKey="orcado" name="Valor Orçado" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={60} />
                                <Bar dataKey="empenhado" name="Valor Empenhado" fill="#F59E0B" radius={[6, 6, 0, 0]} maxBarSize={60} />
                                <Bar dataKey="pago" name="Valor Pago" fill="#3B82F6" radius={[6, 6, 0, 0]} maxBarSize={60} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
