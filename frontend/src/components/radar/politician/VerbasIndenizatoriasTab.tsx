"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createDadosClient } from "@/lib/supabase/dados";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Cell
} from "recharts";
import {
    DollarSign,
    FileText,
    Calendar,
    AlertCircle,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    TrendingDown
} from "lucide-react";
import { formatCurrency, formatCompactCurrency } from "@/lib/fiscal-analytics";
import { Button } from "@/components/ui/button";

interface VerbasIndenizatoriasTabProps {
    politicianName: string;
    parlamentar_id?: number;
}

const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#EF4444", "#06B6D4", "#F97316"];

export default function VerbasIndenizatoriasTab({ politicianName, parlamentar_id }: VerbasIndenizatoriasTabProps) {
    const [page, setPage] = useState(1);
    const pageSize = 20;

    const { data: allData, isLoading } = useQuery({
        queryKey: ["verbasIndenizatorias", politicianName, parlamentar_id],
        queryFn: async () => {
            const supabase = createDadosClient();

            let query = supabase.from("alba_verbas").select("*");

            // A tabela alba_verbas não possui parlamentar_id, buscamos pelo nome do deputado
            query = query.ilike("deputado", `%${politicianName}%`);

            const { data, error } = await query.order("valor", { ascending: false });

            if (error) throw error;
            return data || [];
        },
        staleTime: 1000 * 60 * 15,
    });

    const analytics = useMemo(() => {
        if (!allData || allData.length === 0) return null;

        const totalGasto = allData.reduce((sum, item) => sum + (item.valor || 0), 0);
        const totalGlosado = allData.reduce((sum, item) => sum + (item.valor_glosado || 0), 0);
        const totalNotas = allData.length;

        const anosSet = new Set(allData.map(item => item.ano).filter(Boolean));
        const anosCobertos = Array.from(anosSet).sort().join(", ");

        // Agrupamento por Categoria para o Gráfico
        const catMap: Record<string, number> = {};
        allData.forEach(item => {
            const cat = item.categoria || "Outros";
            catMap[cat] = (catMap[cat] || 0) + (item.valor || 0);
        });

        const chartData = Object.entries(catMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        return {
            totalGasto,
            totalGlosado,
            totalNotas,
            anosCobertos,
            chartData
        };
    }, [allData]);

    const paginatedData = useMemo(() => {
        if (!allData) return [];
        const start = (page - 1) * pageSize;
        return allData.slice(start, start + pageSize);
    }, [allData, page]);

    if (isLoading) {
        return <div className="p-20 text-center text-slate-400 animate-pulse">Consultando DADOS-PRISMA (ALBA)...</div>;
    }

    if (!allData || allData.length === 0) {
        return (
            <div className="p-20 text-center bg-white border rounded-3xl">
                <AlertCircle className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-700">Nenhum dado encontrado</h3>
                <p className="text-slate-500 mt-2">Não localizamos verbas indenizatórias para {politicianName} na base da ALBA.</p>
            </div>
        );
    }

    const totalPages = Math.ceil(allData.length / pageSize);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-0 shadow-sm bg-white ring-1 ring-slate-100 overflow-hidden relative group">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-emerald-500" />
                            Total Gasto
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-extrabold text-emerald-600 tracking-tight">
                            {formatCompactCurrency(analytics?.totalGasto || 0)}
                        </p>
                    </CardContent>
                    <div className="absolute bottom-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                        <DollarSign className="w-12 h-12 text-emerald-600" />
                    </div>
                </Card>

                <Card className="border-0 shadow-sm bg-white ring-1 ring-slate-100 overflow-hidden relative group">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <TrendingDown className="w-4 h-4 text-rose-500" />
                            Valor Glosado
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-extrabold text-rose-600 tracking-tight">
                            {formatCompactCurrency(analytics?.totalGlosado || 0)}
                        </p>
                    </CardContent>
                    <div className="absolute bottom-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                        <TrendingDown className="w-12 h-12 text-rose-600" />
                    </div>
                </Card>

                <Card className="border-0 shadow-sm bg-white ring-1 ring-slate-100 overflow-hidden relative group">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <FileText className="w-4 h-4 text-indigo-500" />
                            Total de Notas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-extrabold text-indigo-600 tracking-tight">
                            {analytics?.totalNotas}
                        </p>
                    </CardContent>
                    <div className="absolute bottom-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                        <FileText className="w-12 h-12 text-indigo-600" />
                    </div>
                </Card>

                <Card className="border-0 shadow-sm bg-white ring-1 ring-slate-100 overflow-hidden relative group">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-amber-500" />
                            Anos Cobertos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xl font-bold text-slate-700 tracking-tight leading-tight">
                            {analytics?.anosCobertos}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Gráfico */}
            <Card className="border-0 shadow-sm ring-1 ring-slate-100 bg-white">
                <CardHeader>
                    <CardTitle className="text-lg font-bold text-slate-800">Gastos por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                    <div style={{ width: "100%", height: 350, minHeight: 350 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics?.chartData} layout="vertical" margin={{ left: 40, right: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    width={150}
                                    tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                                />
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                                    formatter={(v: any) => formatCurrency(Number(v) || 0)}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {analytics?.chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Tabela */}
            <Card className="border-0 shadow-sm ring-1 ring-slate-100 bg-white overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                    <CardTitle className="text-lg font-bold text-slate-800">Detalhamento das Notas Fiscais</CardTitle>
                </CardHeader>
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow>
                            <TableHead className="font-bold text-slate-500">Comp.</TableHead>
                            <TableHead className="font-bold text-slate-500">Categoria</TableHead>
                            <TableHead className="font-bold text-slate-500">Fornecedor</TableHead>
                            <TableHead className="font-bold text-slate-500">CNPJ/CPF</TableHead>
                            <TableHead className="font-bold text-slate-500 text-right">Valor</TableHead>
                            <TableHead className="font-bold text-slate-500 text-center">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedData.map((item, idx) => (
                            <TableRow key={`${item.id}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                                <TableCell className="font-medium text-slate-600">{item.competencia}</TableCell>
                                <TableCell className="max-w-[200px] truncate text-slate-500 text-xs font-semibold uppercase">{item.categoria}</TableCell>
                                <TableCell className="max-w-[250px] truncate font-bold text-slate-700">{item.nome_fornecedor}</TableCell>
                                <TableCell className="text-slate-400 font-mono text-[10px]">{item.cnpj_fornecedor}</TableCell>
                                <TableCell className={`text-right font-extrabold ${item.valor > 10000 ? "text-rose-600" : "text-slate-900"}`}>
                                    {formatCurrency(item.valor)}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center justify-center gap-2">
                                        {item.link_pdf_nf && (
                                            <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600">
                                                <a href={item.link_pdf_nf} target="_blank" rel="noopener noreferrer">
                                                    <FileText className="w-4 h-4" />
                                                </a>
                                            </Button>
                                        )}
                                        {item.link_detalhe && (
                                            <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0 text-slate-400 hover:text-amber-600">
                                                <a href={item.link_detalhe} target="_blank" rel="noopener noreferrer">
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {/* Paginação */}
                <div className="flex items-center justify-between px-6 py-4 bg-slate-50/50 border-t border-slate-100">
                    <p className="text-sm text-slate-500">
                        Mostrando <span className="font-bold">{paginatedData.length}</span> de <span className="font-bold">{allData.length}</span> registros
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="bg-white"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm font-bold text-slate-700 mx-2">
                            Página {page} de {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="bg-white"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
