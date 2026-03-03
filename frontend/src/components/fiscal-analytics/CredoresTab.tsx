"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { aggregateByCreditor, addPercentages, formatCurrency, formatPercentage, formatCompactCurrency, type FiscalExpense, type AggregatedData } from "@/lib/fiscal-analytics";
import { AlertTriangle, TrendingUp, X, Filter, Download, Info } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CredoresTabProps {
    citySlug: string;
}

export function CredoresTab({ citySlug }: CredoresTabProps) {
    const [selectedCreditor, setSelectedCreditor] = useState<AggregatedData | null>(null);
    const [selectedExpense, setSelectedExpense] = useState<FiscalExpense | null>(null);
    const [displayLimit, setDisplayLimit] = useState(50);

    const { data: expenses = [], isLoading: loading } = useQuery({
        queryKey: ['creditorsExpenses', citySlug],
        queryFn: async () => {
            const supabase = createClient();
            let allData: any[] = [];
            let page = 0;
            const pageSize = 1000;

            while (true) {
                const { data, error } = await supabase
                    .from("municipal_expenses")
                    .select("*")
                    .eq("municipio_slug", citySlug)
                    .range(page * pageSize, (page + 1) * pageSize - 1);

                if (error) throw error;
                if (!data || data.length === 0) break;

                allData = [...allData, ...data];
                if (data.length < pageSize) break;
                page++;
            }

            return allData.map(exp => ({
                id: exp.id,
                dt_emissao: exp.dt_emissao_despesa,
                vl_despesa: exp.vl_despesa || 0,
                nm_fornecedor: exp.nm_fornecedor || "Não identificado",
                cpf_cnpj: exp.id_fornecedor || exp.cpf_cnpj,
                funcao: exp.funcao || "Não especificado",
                subfuncao: exp.subfuncao,
                ds_historico: exp.ds_historico || exp.historico,
                modalidade_licitacao: exp.modalidade_licitacao,
                orgao: exp.nm_orgao || exp.orgao,
                elemento_despesa: exp.ds_elemento_despesa || exp.elemento_despesa,
                nr_empenho: exp.nr_empenho,
                id_despesa: exp.id_despesa,
                fonte_recurso: exp.fonte_recurso,
                evento: exp.evento
            })) as FiscalExpense[];
        },
        staleTime: 1000 * 60 * 30, // 30 minutos de cache
    });

    const totalBudget = useMemo(() => expenses.reduce((sum, exp) => sum + exp.vl_despesa, 0), [expenses]);

    const creditorsData = useMemo(() => {
        if (expenses.length === 0) return [];
        // aggregateByCreditor agora já retorna AggregatedData[] com as novas métricas
        return aggregateByCreditor(expenses).slice(0, 50); // Pegar top 50 para análise profunda
    }, [expenses]);

    if (loading) {
        return <div className="p-20 text-center text-slate-400 font-medium">Processando inteligência de credores (QI 190)...</div>;
    }

    if (expenses.length === 0) {
        return <div className="p-20 text-center text-slate-400">Nenhuma despesa encontrada para análise.</div>;
    }

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-20">
            {/* Header - Apple Style */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-extrabold text-[#0F172A] tracking-tight flex items-center gap-4">
                        <div className="p-3 bg-blue-600 rounded-2xl shadow-lg">
                            <TrendingUp className="w-8 h-8 text-white" />
                        </div>
                        Inteligência de Credores
                    </h2>
                    <p className="text-slate-500 mt-3 text-lg font-medium leading-relaxed max-w-3xl">
                        Monitoramento contínuo de <span className="text-blue-600 font-bold">concentração orçamentária</span> e análise comportamental de fornecedores.
                    </p>
                </div>
            </div>

            {/* KPIs - Apple Premium Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border-0 shadow-sm hover:shadow-2xl transition-all duration-500 bg-white group ring-1 ring-slate-200/50 overflow-hidden">
                    <div className="h-1 w-full bg-blue-600"></div>
                    <CardHeader className="pb-2 px-6 pt-6">
                        <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Base de Fornecedores
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-6 pb-6">
                        <p className="text-3xl font-black text-slate-900 tracking-tighter">
                            {new Set(expenses.map(e => e.nm_fornecedor)).size}
                        </p>
                        <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-2">Ativos no Período</p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm hover:shadow-2xl transition-all duration-500 bg-white group ring-1 ring-slate-200/50 overflow-hidden">
                    <div className="h-1 w-full bg-indigo-600"></div>
                    <CardHeader className="pb-2 px-6 pt-6">
                        <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Ticket Médio Geral
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-6 pb-6">
                        <p className="text-3xl font-black text-slate-900 tracking-tighter">
                            {formatCompactCurrency(totalBudget / (expenses.length || 1))}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Por Transação</p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm hover:shadow-2xl transition-all duration-500 bg-white group ring-1 ring-slate-200/50 overflow-hidden">
                    <TooltipProvider delayDuration={100}>
                        <div className="h-1 w-full bg-orange-500"></div>
                        <CardHeader className="pb-2 px-6 pt-6 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Dependência Top 5
                            </CardTitle>
                            <Tooltip>
                                <TooltipTrigger><Info className="w-4 h-4 text-slate-300 hover:text-orange-500 transition-colors" /></TooltipTrigger>
                                <TooltipContent className="bg-slate-800 text-white rounded-md text-xs border-0 px-3 py-1.5 max-w-xs text-center"><p>Soma do orçamento consolidada/monopolizada nos 5 maiores credores.</p></TooltipContent>
                            </Tooltip>
                        </CardHeader>
                        <CardContent className="px-6 pb-6">
                            <p className="text-3xl font-black text-orange-600 tracking-tighter">
                                {formatPercentage(
                                    creditorsData.slice(0, 5).reduce((sum, c) => sum + (c.percentage || 0), 0)
                                )}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Concentração Crítica</p>
                        </CardContent>
                    </TooltipProvider>
                </Card>

                <Card className="border-0 shadow-sm hover:shadow-2xl transition-all duration-500 bg-white group ring-1 ring-slate-200/50 overflow-hidden">
                    <TooltipProvider delayDuration={100}>
                        <div className="h-1 w-full bg-red-600"></div>
                        <CardHeader className="pb-2 px-6 pt-6 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Risco de Monopólio
                            </CardTitle>
                            <Tooltip>
                                <TooltipTrigger><Info className="w-4 h-4 text-slate-300 hover:text-red-600 transition-colors" /></TooltipTrigger>
                                <TooltipContent className="bg-slate-800 text-white rounded-md text-xs border-0 px-3 py-1.5 max-w-xs text-center"><p>Indica risco ALTO se um único credor reter mais de 15% do orçamento total do município.</p></TooltipContent>
                            </Tooltip>
                        </CardHeader>
                        <CardContent className="px-6 pb-6">
                            <p className="text-3xl font-black text-red-600 tracking-tighter">
                                {creditorsData[0]?.percentage > 15 ? "ALTO" : "MÉDIO"}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Análise de Dominância</p>
                        </CardContent>
                    </TooltipProvider>
                </Card>
            </div>

            {/* Ranking Table & Visualization */}
            <div className="grid grid-cols-1 xl:grid-cols-1 gap-12">
                <Card className="border-0 shadow-xl ring-1 ring-slate-200 overflow-hidden bg-white rounded-3xl">
                    <CardHeader className="p-8 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-xl font-bold text-slate-900 tracking-tight">Ranking Auditado de Credores</CardTitle>
                                <CardDescription className="text-sm font-medium">Análise completa de concentração e recorrência financeira</CardDescription>
                            </div>
                            <Badge variant="outline" className="px-3 py-1 font-mono text-[10px] uppercase tracking-tighter bg-white">PRISMA 888 - FORENSIC ENGINE</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow className="border-b border-slate-200">
                                    <TableHead className="w-16 text-center font-bold text-xs uppercase tracking-widest text-slate-500 h-14">Rank</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-widest text-slate-500">Fornecedor / Credor</TableHead>
                                    <TableHead className="text-right font-bold text-xs uppercase tracking-widest text-slate-500">Valores Totais</TableHead>
                                    <TableHead className="text-center font-bold text-xs uppercase tracking-widest text-slate-500">
                                        <TooltipProvider delayDuration={100}>
                                            <div className="flex items-center justify-center gap-1.5">
                                                <span>Ticket Médio</span>
                                                <Tooltip>
                                                    <TooltipTrigger asChild><Info className="w-3.5 h-3.5 text-slate-400 hover:text-blue-500 cursor-help" /></TooltipTrigger>
                                                    <TooltipContent className="bg-slate-800 text-white rounded-md text-xs border-0 px-3 py-1.5"><p>Valor médio de cada empenho pago a este credor.</p></TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </TooltipProvider>
                                    </TableHead>
                                    <TableHead className="text-center font-bold text-xs uppercase tracking-widest text-slate-500">Volume</TableHead>
                                    <TableHead className="text-right font-bold text-xs uppercase tracking-widest text-slate-500">
                                        <TooltipProvider delayDuration={100}>
                                            <div className="flex items-center justify-end gap-1.5">
                                                <span>% Orçamento</span>
                                                <Tooltip>
                                                    <TooltipTrigger asChild><Info className="w-3.5 h-3.5 text-slate-400 hover:text-blue-500 cursor-help" /></TooltipTrigger>
                                                    <TooltipContent className="bg-slate-800 text-white rounded-md text-xs border-0 px-3 py-1.5"><p>Impacto nas despesas mensais de Votorantim.</p></TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </TooltipProvider>
                                    </TableHead>
                                    <TableHead className="text-center font-bold text-xs uppercase tracking-widest text-slate-500">
                                        <TooltipProvider delayDuration={100}>
                                            <div className="flex items-center justify-center gap-1.5">
                                                <span>Dependency Score</span>
                                                <Tooltip>
                                                    <TooltipTrigger asChild><Info className="w-3.5 h-3.5 text-slate-400 hover:text-blue-500 cursor-help" /></TooltipTrigger>
                                                    <TooltipContent className="bg-slate-800 text-white rounded-md text-xs border-0 px-3 py-1.5"><p>Rating de Risco/Dependência (1-10) baseado na fatia do orçamento.</p></TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </TooltipProvider>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {creditorsData.map((creditor, index) => {
                                    const isCritical = creditor.dependencyScore > 7;
                                    const isWarning = creditor.dependencyScore > 4 && !isCritical;

                                    return (
                                        <TableRow
                                            key={index}
                                            className="hover:bg-blue-50/30 transition-colors group border-b border-slate-100 cursor-pointer"
                                            onClick={() => {
                                                setSelectedCreditor(creditor);
                                                setDisplayLimit(50);
                                            }}
                                        >
                                            <TableCell className="text-center font-black text-slate-300 group-hover:text-blue-500 transition-colors">
                                                {index + 1}
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900 text-sm tracking-tight truncate max-w-sm" title={creditor.name}>
                                                        {creditor.name}
                                                    </span>
                                                    <span className="text-[10px] font-mono text-blue-600 font-bold mt-1 bg-blue-50 px-2 py-0.5 rounded-sm w-fit">
                                                        {creditor.cnpj || "CNPJ NÃO IDENTIFICADO"}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-black text-slate-900">
                                                {formatCurrency(creditor.total)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                                                    {formatCompactCurrency(creditor.avgTicket || 0)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center font-mono text-slate-500 text-sm">
                                                {creditor.count} <span className="text-[10px] uppercase text-slate-300">notações</span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className={`text-sm font-black ${isCritical ? "text-red-600" : isWarning ? "text-orange-600" : "text-emerald-600"}`}>
                                                        {formatPercentage(creditor.percentage || 0)}
                                                    </span>
                                                    <div className="w-16 h-1 bg-slate-100 mt-1 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full ${isCritical ? "bg-red-600" : isWarning ? "bg-orange-600" : "bg-emerald-600"}`}
                                                            style={{ width: `${creditor.percentage || 0}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge
                                                    className={`rounded-full px-3 py-1 text-[10px] font-black tracking-widest ${isCritical ? "bg-red-100 text-red-700 border-red-200" :
                                                        isWarning ? "bg-orange-100 text-orange-700 border-orange-200" :
                                                            "bg-blue-100 text-blue-700 border-blue-200"
                                                        }`}
                                                    variant="outline"
                                                >
                                                    LEVEL {(creditor.dependencyScore || 0).toFixed(1)}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Creditor Details Sheet */}
            <Sheet open={!!selectedCreditor} onOpenChange={(open) => !open && setSelectedCreditor(null)}>
                <SheetContent className="sm:max-w-[70vw] w-[90vw] bg-slate-50 border-0 shadow-2xl overflow-y-auto">
                    <SheetHeader className="px-4 pb-4">
                        <div className="flex justify-between items-start flex-wrap gap-4">
                            <div>
                                <Badge className="mb-2 bg-blue-600 text-[10px] font-black tracking-widest px-3 py-0.5">PERFIL AUDITADO PRISMA 888</Badge>
                                <SheetTitle className="text-2xl font-black text-slate-900 tracking-tighter leading-tight">
                                    {selectedCreditor?.name}
                                </SheetTitle>
                                <SheetDescription className="text-slate-500 font-mono text-sm mt-2 flex items-center gap-2">
                                    <span className="font-bold uppercase tracking-widest text-[10px] text-slate-400">ID / CNPJ:</span>
                                    {selectedCreditor?.cnpj || "NÃO IDENTIFICADO"}
                                </SheetDescription>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Recebido</p>
                                <p className="text-3xl font-black text-blue-600 tracking-tighter">
                                    {selectedCreditor && formatCurrency(selectedCreditor.total)}
                                </p>
                            </div>
                        </div>
                    </SheetHeader>

                    <div className="px-4 pb-10">
                        <div className="grid grid-cols-1 gap-6 mt-6">
                            <Card className="border-0 shadow-sm bg-white p-6 rounded-2xl ring-1 ring-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Concentração</p>
                                <p className="text-xl font-black text-slate-900">{selectedCreditor && formatPercentage(selectedCreditor.percentage || 0)}</p>
                                <div className="w-full h-1.5 bg-slate-100 mt-2 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600" style={{ width: `${selectedCreditor?.percentage || 0}%` }} />
                                </div>
                            </Card>
                            <Card className="border-0 shadow-sm bg-white p-6 rounded-2xl ring-1 ring-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ticket Médio</p>
                                <p className="text-xl font-black text-slate-900">{selectedCreditor && formatCurrency(selectedCreditor.avgTicket || 0)}</p>
                            </Card>
                            <Card className="border-0 shadow-sm bg-white p-6 rounded-2xl ring-1 ring-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Transações</p>
                                <p className="text-xl font-black text-slate-900">{selectedCreditor?.count} empenhos</p>
                            </Card>
                        </div>

                        <div className="mt-8">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Filter className="w-4 h-4 text-blue-600" />
                                Histórico de Empenhos
                            </h3>
                            <Card className="border-0 shadow-sm bg-white rounded-2xl ring-1 ring-slate-100 overflow-hidden">
                                <ScrollArea className="h-[400px]">
                                    <Table>
                                        <TableHeader className="bg-slate-50">
                                            <TableRow>
                                                <TableHead className="w-12 text-center font-black text-[10px] uppercase tracking-widest">Nº</TableHead>
                                                <TableHead className="w-32 font-black text-[10px] uppercase tracking-widest">Empenho / Data</TableHead>
                                                <TableHead className="w-36 font-black text-[10px] uppercase tracking-widest">Valor</TableHead>
                                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-left">Objeto / Histórico</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(() => {
                                                const creditorExpenses = expenses.filter(e => e.nm_fornecedor === selectedCreditor?.name);
                                                return (
                                                    <>
                                                        {creditorExpenses.slice(0, displayLimit).map((exp, i) => (
                                                            <TableRow
                                                                key={i}
                                                                className="hover:bg-slate-50 cursor-pointer group"
                                                                onClick={() => setSelectedExpense(exp)}
                                                            >
                                                                <TableCell className="text-center font-black text-slate-300">
                                                                    {i + 1}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[10px] font-black text-blue-600 font-mono tracking-tighter">
                                                                            #{exp.nr_empenho || "S/N"}
                                                                        </span>
                                                                        <span className="text-[10px] text-slate-400 font-mono">
                                                                            {exp.dt_emissao}
                                                                        </span>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex flex-col items-start">
                                                                        <span className="font-black text-slate-900 text-sm">
                                                                            {formatCurrency(exp.vl_despesa)}
                                                                        </span>
                                                                        <Badge className="bg-emerald-50 text-emerald-600 text-[8px] font-black border-emerald-100 h-3 px-1 mt-1">
                                                                            AUDITADO
                                                                        </Badge>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex flex-col max-w-2xl">
                                                                        <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tighter truncate">
                                                                            {exp.orgao}
                                                                        </span>
                                                                        <p className="text-[11px] text-slate-500 leading-tight line-clamp-3 italic">
                                                                            {exp.ds_historico || "Referência ou histórico direto não fornecido pela entidade."}
                                                                        </p>
                                                                        <div className="flex gap-2 mt-1">
                                                                            <Badge variant="outline" className="text-[8px] px-1 py-0 h-3 border-slate-200 text-slate-400 bg-slate-50">
                                                                                {exp.modalidade_licitacao || "N/A"}
                                                                            </Badge>
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                        {creditorExpenses.length > displayLimit && (
                                                            <TableRow>
                                                                <TableCell colSpan={4} className="p-0">
                                                                    <div className="p-4 flex justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => setDisplayLimit(prev => Math.min(prev + 50, creditorExpenses.length))}>
                                                                        <Button
                                                                            variant="outline"
                                                                            className="text-xs font-bold text-blue-600 bg-white border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all shadow-sm"
                                                                        >
                                                                            Carregar Mais Empenhos ({creditorExpenses.length - displayLimit} restantes)
                                                                        </Button>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </Card>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Expense Detailing Dialog */}
            <Dialog open={!!selectedExpense} onOpenChange={(open) => !open && setSelectedExpense(null)}>
                <DialogContent className="sm:max-w-2xl bg-white border-0 shadow-2xl rounded-3xl overflow-hidden p-0">
                    <div className="h-2 w-full bg-blue-600"></div>
                    <div className="p-8">
                        <DialogHeader className="mb-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <Badge className="mb-2 bg-blue-50 text-blue-600 border-blue-100 text-[10px] font-black tracking-widest px-3 py-0.5 uppercase">
                                        Empenho #{selectedExpense?.nr_empenho || "S/N"}
                                    </Badge>
                                    <DialogTitle className="text-2xl font-black text-slate-900 tracking-tighter">
                                        Detalhamento do Gasto
                                    </DialogTitle>
                                    <DialogDescription className="text-slate-500 font-mono text-xs mt-1">
                                        Data de Emissão: {selectedExpense?.dt_emissao}
                                    </DialogDescription>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Empenhado</p>
                                    <p className="text-3xl font-black text-emerald-600 tracking-tighter">
                                        {selectedExpense && formatCurrency(selectedExpense.vl_despesa)}
                                    </p>
                                </div>
                            </div>
                        </DialogHeader>

                        <div className="space-y-6">
                            <Card className="border-0 bg-slate-50 p-5 rounded-2xl ring-1 ring-slate-200/50">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Órgão Solicitante</p>
                                <p className="text-sm font-bold text-slate-800 uppercase tracking-tight">{selectedExpense?.orgao}</p>
                            </Card>

                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                <Card className="border-0 bg-slate-50 p-5 rounded-2xl ring-1 ring-slate-200/50">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Modalidade</p>
                                    <p className="text-sm font-bold text-slate-800 tracking-tight">{selectedExpense?.modalidade_licitacao || "N/A"}</p>
                                </Card>
                                <Card className="border-0 bg-slate-50 p-5 rounded-2xl ring-1 ring-slate-200/50">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fase / Evento</p>
                                    <p className="text-sm font-bold text-blue-600 tracking-tight uppercase">{selectedExpense?.evento || "Empenhado"}</p>
                                </Card>
                                <Card className="border-0 bg-slate-50 p-5 rounded-2xl ring-1 ring-slate-200/50">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fonte de Recurso</p>
                                    <p className="text-sm font-bold text-slate-800 tracking-tight truncate" title={selectedExpense?.fonte_recurso || "Não identificada"}>{selectedExpense?.fonte_recurso || "N/A"}</p>
                                </Card>
                                <Card className="border-0 bg-slate-50 p-5 rounded-2xl ring-1 ring-slate-200/50">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Função</p>
                                    <p className="text-sm font-bold text-slate-800 tracking-tight truncate" title={selectedExpense?.funcao || "Não especificado"}>{selectedExpense?.funcao || "N/A"}</p>
                                </Card>
                                <Card className="border-0 bg-slate-50 p-5 rounded-2xl ring-1 ring-slate-200/50 col-span-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Subfunção</p>
                                    <p className="text-sm font-bold text-slate-800 tracking-tight truncate">{selectedExpense?.subfuncao || "N/A"}</p>
                                </Card>
                            </div>

                            <Card className="border-0 bg-slate-50 p-5 rounded-2xl ring-1 ring-slate-200/50">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <AlertTriangle className="w-3 h-3 text-orange-500" />
                                    Histórico Forense (Objeto)
                                </p>
                                <ScrollArea className="h-[100px] w-full rounded-md border border-slate-200/50 bg-white p-4">
                                    <p className="text-xs text-slate-600 leading-relaxed italic">
                                        {selectedExpense?.ds_historico || selectedExpense?.elemento_despesa || "Referência ou histórico não fornecido pela entidade."}
                                    </p>
                                </ScrollArea>
                            </Card>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
