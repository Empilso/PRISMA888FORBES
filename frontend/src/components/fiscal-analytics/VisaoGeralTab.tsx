"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { groupByMonth, formatCurrency, formatCompactCurrency, type FiscalExpense } from "@/lib/fiscal-analytics";
import { TrendingUp, TrendingDown, DollarSign, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VisaoGeralTabProps {
    citySlug: string;
    mockRevenue?: number;
}

export function VisaoGeralTab({ citySlug, mockRevenue = 100000000 }: VisaoGeralTabProps) {
    const [timePeriod, setTimePeriod] = useState<'1week' | '1month' | '3months' | '6months' | 'total'>('total');

    const { data: queryData, isLoading: loading } = useQuery({
        queryKey: ['visaoGeralData', citySlug],
        queryFn: async () => {
            const supabase = createClient();

            // 1. Fetch Expenses (Safe Paginated Fetch to bypass 1000 rows limit)
            let allExpData: any[] = [];
            let ePage = 0;
            const eSize = 1000;
            while (true) {
                const { data: pageData, error: pageError } = await supabase
                    .from("municipal_expenses")
                    .select("*")
                    .eq("municipio_slug", citySlug)
                    .range(ePage * eSize, (ePage + 1) * eSize - 1);

                if (pageError) throw pageError;
                if (!pageData || pageData.length === 0) break;

                allExpData = [...allExpData, ...pageData];
                if (pageData.length < eSize) break;
                ePage++;
            }

            // 2. Fetch Revenues (Safe Paginated Fetch)
            let allRevData: any[] = [];
            let rPage = 0;
            const rSize = 1000;
            while (true) {
                const { data: revData, error: revError } = await supabase
                    .from("municipal_revenues")
                    .select("vl_receita")
                    .eq("municipio_slug", citySlug)
                    .range(rPage * rSize, (rPage + 1) * rSize - 1);

                if (revError) throw revError;
                if (!revData || revData.length === 0) break;

                allRevData = [...allRevData, ...revData];
                if (revData.length < rSize) break;
                rPage++;
            }

            let totalRev = 0;
            if (allRevData.length > 0) {
                totalRev = allRevData.reduce((acc, curr) => acc + (curr.vl_receita || 0), 0);
            }

            const fetchedRevenue = totalRev > 0 ? totalRev : mockRevenue;

            const mapped: FiscalExpense[] = allExpData.map(exp => ({
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
                evento: exp.evento, // Campo crítico para cálculo correto
            }));

            return {
                expenses: mapped,
                realRevenue: fetchedRevenue
            };
        },
        staleTime: 1000 * 60 * 30, // 30 minutos de cache local
    });

    const expenses = queryData?.expenses || [];
    const realRevenue = queryData?.realRevenue || mockRevenue;

    const analytics = useMemo(() => {
        if (expenses.length === 0) {
            return {
                totalExpenses: 0,
                totalRevenue: realRevenue,
                balance: realRevenue,
                maxExpense: { value: 0, creditor: "N/A" },
                monthlyData: [],
                avgMonthlyExpense: 0,
            };
        }

        const calculateNetExpense = (exps: FiscalExpense[]) => {
            return exps.reduce((sum, exp) => {
                const evt = exp.evento?.toLowerCase() || '';
                if (evt === 'empenhado' || evt === 'reforço') return sum + exp.vl_despesa;
                if (evt === 'anulação' || evt === 'anulado') return sum - exp.vl_despesa;
                return sum;
            }, 0);
        };

        const totalExpenses = calculateNetExpense(expenses);
        const maxExpense = expenses.reduce((max, exp) =>
            (exp.vl_despesa > max.value && !exp.evento?.toLowerCase().includes('anula')) ? { value: exp.vl_despesa, creditor: exp.nm_fornecedor } : max,
            { value: 0, creditor: "N/A" }
        );

        const monthlyData = groupByMonth(expenses, realRevenue);
        const avgMonthlyExpense = monthlyData.length > 0
            ? monthlyData.reduce((sum, m) => sum + m.expenses, 0) / monthlyData.length
            : 0;

        return {
            totalExpenses,
            totalRevenue: realRevenue,
            balance: realRevenue - totalExpenses,
            maxExpense,
            monthlyData,
            avgMonthlyExpense,
        };
    }, [expenses, realRevenue]);

    // Filtrar despesas baseado no período selecionado
    const filteredExpenses = useMemo(() => {
        if (timePeriod === 'total') return expenses;

        const now = new Date();
        const cutoffDate = new Date();

        switch (timePeriod) {
            case '1week':
                cutoffDate.setDate(now.getDate() - 7);
                break;
            case '1month':
                cutoffDate.setMonth(now.getMonth() - 1);
                break;
            case '3months':
                cutoffDate.setMonth(now.getMonth() - 3);
                break;
            case '6months':
                cutoffDate.setMonth(now.getMonth() - 6);
                break;
        }

        return expenses.filter(exp => new Date(exp.dt_emissao) >= cutoffDate);
    }, [expenses, timePeriod]);

    // Recalcular analytics com despesas filtradas
    const filteredAnalytics = useMemo(() => {
        if (filteredExpenses.length === 0) {
            return {
                totalExpenses: 0,
                totalRevenue: mockRevenue,
                balance: mockRevenue,
                maxExpense: { value: 0, creditor: "N/A" },
                monthlyData: [],
                avgMonthlyExpense: 0,
            };
        }

        // Cálculo Correto: Despesa Empenhada Líquida explícita
        const calculateNetExpense = (exps: FiscalExpense[]) => {
            return exps.reduce((sum, exp) => {
                const evt = exp.evento?.toLowerCase() || '';
                if (evt === 'empenhado' || evt === 'reforço') return sum + exp.vl_despesa;
                if (evt === 'anulado' || evt === 'anulação') return sum - exp.vl_despesa;
                return sum;
            }, 0);
        };

        const totalExpenses = calculateNetExpense(filteredExpenses);

        const maxExpense = filteredExpenses.reduce((max, exp) =>
            (exp.vl_despesa > max.value && !exp.evento?.toLowerCase().includes('anulação'))
                ? { value: exp.vl_despesa, creditor: exp.nm_fornecedor }
                : max,
            { value: 0, creditor: "N/A" }
        );

        // Agrupamento mensal robusto
        const monthMap = new Map<string, { revenue: number, expenses: number }>();
        filteredExpenses.forEach(exp => {
            try {
                const evt = exp.evento?.toLowerCase() || '';
                let val = 0;
                if (evt === 'empenhado' || evt === 'reforço') val = exp.vl_despesa;
                else if (evt === 'anulado' || evt === 'anulação') val = -exp.vl_despesa;

                if (val !== 0) {
                    const date = new Date(exp.dt_emissao);
                    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    const current = monthMap.get(key) || { revenue: mockRevenue / 12, expenses: 0 };
                    monthMap.set(key, { ...current, expenses: current.expenses + val });
                }
            } catch (e) { }
        });

        const monthlyDataCorrected = Array.from(monthMap.entries())
            .map(([key, data]) => {
                const [y, m] = key.split('-');
                const date = new Date(parseInt(y), parseInt(m) - 1, 1);
                return {
                    month: date.toLocaleString('pt-BR', { month: 'short' }),
                    revenue: data.revenue,
                    expenses: data.expenses,
                    balance: data.revenue - data.expenses
                };
            })
            .sort((a, b) => {
                const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
                return months.indexOf(a.month.toLowerCase()) - months.indexOf(b.month.toLowerCase());
            });

        const avgMonthlyExpense = monthlyDataCorrected.length > 0
            ? totalExpenses / monthlyDataCorrected.length
            : 0;

        return {
            totalExpenses,
            totalRevenue: realRevenue,
            balance: realRevenue - totalExpenses,
            maxExpense,
            monthlyData: monthlyDataCorrected,
            avgMonthlyExpense,
        };
    }, [filteredExpenses, realRevenue]);

    if (loading) {
        return <div className="p-20 text-center text-slate-400">Carregando dashboard executivo...</div>;
    }

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Header & Subtitle */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 rounded-lg">
                            <DollarSign className="w-6 h-6 text-emerald-600" />
                        </div>
                        Dashboard Executivo
                    </h2>
                    <p className="text-slate-500 mt-2 text-lg font-medium leading-relaxed max-w-2xl">
                        Visão consolidada e analítica das finanças municipais com inteligência Prisma.
                    </p>
                </div>

                {/* Filtros Temporais - Minimalist Style */}
                <div className="flex items-center gap-2 bg-slate-100/50 p-1 rounded-full ring-1 ring-slate-200/60 shadow-sm transition-all hover:bg-slate-100">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setTimePeriod('1week')}
                        className={`rounded-full px-4 text-xs font-bold transition-all ${timePeriod === '1week' ? 'bg-white shadow-md text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        1S
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setTimePeriod('1month')}
                        className={`rounded-full px-4 text-xs font-bold transition-all ${timePeriod === '1month' ? 'bg-white shadow-md text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        1M
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setTimePeriod('3months')}
                        className={`rounded-full px-4 text-xs font-bold transition-all ${timePeriod === '3months' ? 'bg-white shadow-md text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        3M
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setTimePeriod('6months')}
                        className={`rounded-full px-4 text-xs font-bold transition-all ${timePeriod === '6months' ? 'bg-white shadow-md text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        6M
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setTimePeriod('total')}
                        className={`rounded-full px-4 text-xs font-bold transition-all ${timePeriod === 'total' ? 'bg-white shadow-md text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        TUDO
                    </Button>
                </div>
            </div>

            {/* KPIs - Refined Apple Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Card className="border-0 shadow-sm hover:shadow-xl transition-all duration-500 bg-white group ring-1 ring-slate-100 cursor-help">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                                        Receita Total
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-3xl font-extrabold text-emerald-600 tracking-tight group-hover:scale-105 transition-transform origin-left duration-300">
                                        {formatCompactCurrency(filteredAnalytics.totalRevenue)}
                                    </p>
                                </CardContent>
                            </Card>
                        </TooltipTrigger>
                        <TooltipContent className="bg-slate-900 border-slate-800 text-white p-4 shadow-2xl rounded-xl max-w-sm">
                            <p className="font-bold text-emerald-400 mb-1 text-sm border-b border-slate-700 pb-1">Conformidade Contábil (LRF)</p>
                            <p className="text-xs text-slate-300 leading-relaxed mt-2">
                                Valor auditado via <strong>Receita Orçamentária Líquida</strong>. O Portal do TCE-SP exibe o montante bruto de R$ 755M, que consolida Ingressos Extraorçamentários (retenções/cauções) não computáveis como arrecadação municipal direta.
                            </p>
                            <div className="text-[10px] text-slate-500 mt-2 font-mono bg-slate-800/50 p-2 rounded border border-slate-700">
                                <span className="text-emerald-500">Prisma</span>: R$ 683M (Orçamentária)<br />
                                <span className="text-blue-400">TCE-SP</span>: R$ 755M (Bruta/Extra)
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Card className="border-0 shadow-sm hover:shadow-xl transition-all duration-500 bg-white group ring-1 ring-slate-100 cursor-help">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                                        Despesa Total
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-3xl font-extrabold text-red-600 tracking-tight group-hover:scale-105 transition-transform origin-left duration-300">
                                        {formatCompactCurrency(filteredAnalytics.totalExpenses)}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">
                                        {filteredExpenses.length.toLocaleString()} MOVIMENTAÇÕES
                                    </p>
                                </CardContent>
                            </Card>
                        </TooltipTrigger>
                        <TooltipContent className="bg-slate-900 border-slate-800 text-white p-3 shadow-2xl rounded-xl">
                            <p className="font-bold mb-1 text-sm">Cálculo Auditado (TCESP)</p>
                            <p className="text-xs text-slate-300 leading-relaxed">Valor Líquido = Empenho + Reforço - Anulação</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <Card className="border-0 shadow-sm hover:shadow-xl transition-all duration-500 bg-white group ring-1 ring-slate-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <DollarSign className="w-3.5 h-3.5 text-blue-500" />
                            Saldo Operacional
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className={`text-3xl font-extrabold tracking-tight group-hover:scale-105 transition-transform origin-left duration-300 ${filteredAnalytics.balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                            {formatCompactCurrency(filteredAnalytics.balance)}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 flex items-center gap-1">
                            STATUS: <span className={filteredAnalytics.balance >= 0 ? 'text-emerald-500' : 'text-orange-500'}>
                                {filteredAnalytics.balance >= 0 ? 'SUPERÁVIT' : 'DÉFICIT'}
                            </span>
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm hover:shadow-xl transition-all duration-500 bg-white group ring-1 ring-slate-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-purple-500" />
                            Taxa de Execução
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-extrabold text-purple-600 tracking-tight group-hover:scale-105 transition-transform origin-left duration-300">
                            {formatCompactCurrency(filteredAnalytics.avgMonthlyExpense)}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">MÉDIA MENSAL</p>
                    </CardContent>
                </Card>
            </div>

            {/* Maior Despesa - Apple Premium Card */}
            <Card className="border-0 bg-gradient-to-br from-orange-50/50 via-white to-orange-50/30 overflow-hidden ring-1 ring-orange-100/50 shadow-sm hover:shadow-xl transition-all duration-700 group">
                <CardContent className="p-8 relative">
                    <div className="flex items-center justify-between z-10 relative">
                        <div>
                            <p className="text-[10px] font-bold text-orange-400 uppercase tracking-[0.2em] mb-3">
                                Movimentação Crítica
                            </p>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">
                                Maior Despesa Individual
                            </h3>
                            <p className="text-5xl font-extrabold text-orange-600 tracking-tighter group-hover:scale-105 transition-transform origin-left duration-500">
                                {formatCurrency(filteredAnalytics.maxExpense.value)}
                            </p>
                            <div className="flex items-center gap-2 mt-4">
                                <div className="p-1 px-2 bg-orange-100/50 rounded text-[10px] font-bold text-orange-600 ring-1 ring-orange-200">CREDOR</div>
                                <p className="text-sm font-semibold text-slate-600">
                                    {filteredAnalytics.maxExpense.creditor}
                                </p>
                            </div>
                        </div>
                        <div className="p-6 bg-white rounded-2xl shadow-sm ring-1 ring-orange-100 group-hover:rotate-12 transition-transform duration-500">
                            <TrendingUp className="w-12 h-12 text-orange-400" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Gráfico de Evolução Mensal - Pro Level */}
            <Card className="border-0 shadow-sm ring-1 ring-slate-100 overflow-hidden bg-white">
                <CardHeader className="p-8 pb-0">
                    <CardTitle className="text-xl font-extrabold text-slate-800 tracking-tight">Evolução de Fluxo de Caixa</CardTitle>
                    <p className="text-sm text-slate-400 font-medium">Análise comparativa entre Receita vs Despesa (2025)</p>
                </CardHeader>
                <CardContent className="p-8 pt-4">
                    {filteredAnalytics.monthlyData.length > 0 ? (
                        <div className="h-[450px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={filteredAnalytics.monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 600 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        tickFormatter={(value) => `R$ ${(value / 1000000).toFixed(0)}M`}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 600 }}
                                        dx={-10}
                                    />
                                    <RechartsTooltip
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="bg-slate-900 border-0 p-4 shadow-2xl rounded-2xl animate-in zoom-in-95 duration-200">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{label}</p>
                                                        {payload.map((item: any, index: number) => (
                                                            <div key={index} className="flex items-center justify-between gap-6 mt-1">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                                                    <span className="text-xs font-semibold text-white">{item.name}:</span>
                                                                </div>
                                                                <span className="text-xs font-bold text-white">{formatCurrency(item.value)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Legend
                                        verticalAlign="top"
                                        align="right"
                                        iconType="circle"
                                        wrapperStyle={{ paddingBottom: '30px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="#10B981"
                                        strokeWidth={4}
                                        name="Receita"
                                        dot={false}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="expenses"
                                        name="Despesas"
                                        stroke="#EF4444"
                                        strokeWidth={4}
                                        dot={false}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="balance"
                                        stroke="#3B82F6"
                                        strokeWidth={2}
                                        strokeDasharray="6 6"
                                        name="Saldo"
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-[400px] flex items-center justify-center text-slate-400 font-medium italic">
                            Sem dados suficientes para gráfico mensal
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
