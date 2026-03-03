"use client";

import React, { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { aggregateByProgram, formatCurrency, formatPercentage, type FiscalExpense } from "@/lib/fiscal-analytics";
import { BookOpen } from "lucide-react";

interface ProgramasTabProps {
    citySlug: string;
}

export function ProgramasTab({ citySlug }: ProgramasTabProps) {
    const [expenses, setExpenses] = useState<FiscalExpense[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalBudget, setTotalBudget] = useState(0);

    useEffect(() => {
        fetchExpenses();
    }, [citySlug]);

    async function fetchExpenses() {
        setLoading(true);
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("municipal_expenses")
                .select("*")
                .eq("municipio_slug", citySlug)
                .limit(1000);

            if (error) throw error;

            const mapped: FiscalExpense[] = (data || []).map(exp => ({
                id: exp.id,
                dt_emissao: exp.dt_emissao_despesa,
                vl_despesa: exp.vl_despesa || 0,
                nm_fornecedor: exp.nm_fornecedor || "Não identificado",
                cpf_cnpj: exp.cpf_cnpj,
                funcao: exp.funcao || "Não especificado",
                subfuncao: exp.subfuncao,
                ds_historico: exp.historico,
                modalidade_licitacao: exp.modalidade_licitacao,
                orgao: exp.orgao,
                elemento_despesa: exp.elemento_despesa,
            }));

            setExpenses(mapped);
            setTotalBudget(mapped.reduce((sum, exp) => sum + exp.vl_despesa, 0));
        } catch (error) {
            console.error("Error fetching expenses:", error);
        } finally {
            setLoading(false);
        }
    }

    const programData = useMemo(() => {
        if (expenses.length === 0) return [];
        const aggregated = aggregateByProgram(expenses);
        return aggregated.map(item => ({
            ...item,
            percentage: (item.total / totalBudget) * 100,
        })).sort((a, b) => b.total - a.total).slice(0, 15); // Top 15
    }, [expenses, totalBudget]);

    // Cores: Saúde e Educação em destaque
    const getColor = (program: string) => {
        const lower = program.toLowerCase();
        if (lower.includes("saúde") || lower.includes("saude")) return "#10b981"; // emerald
        if (lower.includes("educação") || lower.includes("educacao")) return "#3b82f6"; // blue
        if (lower.includes("assistência") || lower.includes("assistencia")) return "#f59e0b"; // amber
        return "#64748b"; // slate
    };

    if (loading) {
        return <div className="p-20 text-center text-slate-400">Carregando análise de programas...</div>;
    }

    if (expenses.length === 0) {
        return <div className="p-20 text-center text-slate-400">Nenhuma despesa encontrada.</div>;
    }

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Header - Apple Style */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-purple-50 rounded-lg">
                            <BookOpen className="w-6 h-6 text-purple-600" />
                        </div>
                        Programas Governamentais
                    </h2>
                    <p className="text-slate-500 mt-2 text-lg font-medium leading-relaxed max-w-2xl">
                        Análise de alocação orçamentária por função governamental e subfunção.
                    </p>
                </div>
            </div>

            {/* KPIs - Apple Premium Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-0 shadow-sm hover:shadow-xl transition-all duration-500 bg-white group ring-1 ring-slate-100/80">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            Total de Programas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight group-hover:scale-105 transition-transform origin-left duration-300">
                            {new Set(expenses.map(e => e.funcao)).size}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">FUNÇÕES ATIVAS</p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm hover:shadow-xl transition-all duration-500 bg-white group ring-1 ring-slate-100/80">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            Maior Investimento
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xl font-extrabold text-purple-600 tracking-tight group-hover:scale-105 transition-transform origin-left duration-300 truncate">
                            {programData[0]?.name || "N/A"}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">{programData[0] ? formatCurrency(programData[0].total) : ""}</p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm hover:shadow-xl transition-all duration-500 bg-white group ring-1 ring-slate-100/80">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            Concentração Top 3
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-extrabold text-indigo-600 tracking-tight group-hover:scale-105 transition-transform origin-left duration-300">
                            {formatPercentage(
                                programData.slice(0, 3).reduce((sum, p) => sum + (p.percentage || 0), 0)
                            )}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">DO ORÇAMENTO TOTAL</p>
                    </CardContent>
                </Card>
            </div>

            {/* Gráfico de Barras - Refined */}
            <Card className="border-0 shadow-sm ring-1 ring-slate-100 overflow-hidden bg-white">
                <CardHeader className="p-8 pb-0">
                    <CardTitle className="text-xl font-extrabold text-slate-800 tracking-tight">Investimento por Programa</CardTitle>
                    <CardDescription className="text-sm font-medium">Top 15 funções governamentais por volume de recursos</CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                    <div className="h-[600px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={programData}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 180, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={false} stroke="#F1F5F9" />
                                <XAxis
                                    type="number"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 600 }}
                                    tickFormatter={(value) => `R$ ${(value / 1000000).toFixed(1)}M`}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    width={170}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }}
                                />
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-slate-900 text-white p-4 shadow-2xl rounded-2xl animate-in zoom-in-95 duration-200 ring-1 ring-white/10">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 truncate max-w-[200px]">{data.name}</p>
                                                    <p className="text-lg font-bold">{formatCurrency(data.total)}</p>
                                                    <p className="text-xs font-medium text-purple-400 mt-1">{formatPercentage(data.percentage)} do total</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Bar dataKey="total" radius={[0, 8, 8, 0]} barSize={20}>
                                    {programData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={getColor(entry.name)}
                                            className="transition-all duration-500 hover:opacity-80"
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Tabela Detalhada */}
            <Card>
                <CardHeader>
                    <CardTitle>Detalhamento dos Programas</CardTitle>
                    <CardDescription>Análise completa de todas as funções governamentais</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Função / Subfunção</TableHead>
                                <TableHead className="text-right">Total Investido</TableHead>
                                <TableHead className="text-right">% Orçamento</TableHead>
                                <TableHead className="text-center">Despesas</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {programData.map((program, index) => (
                                <TableRow key={index} className="hover:bg-purple-50">
                                    <TableCell className="font-mono text-slate-500">{index + 1}</TableCell>
                                    <TableCell className="font-semibold text-slate-900">
                                        {program.name}
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-purple-700">
                                        {formatCurrency(program.total)}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-slate-700">
                                        {formatPercentage(program.percentage || 0)}
                                    </TableCell>
                                    <TableCell className="text-center font-mono text-slate-700">
                                        {program.count}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Insights */}
            <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-6">
                    <h3 className="font-bold text-purple-900 mb-2">💡 Análise de Prioridades</h3>
                    <p className="text-sm text-purple-800">
                        Os 3 maiores programas concentram <strong>{formatPercentage(
                            programData.slice(0, 3).reduce((sum, p) => sum + (p.percentage || 0), 0)
                        )}</strong> do orçamento total, indicando áreas prioritárias de investimento municipal.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
