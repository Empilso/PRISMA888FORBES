"use client";

import React, { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { aggregateByModality, formatCurrency, formatPercentage, type FiscalExpense } from "@/lib/fiscal-analytics";
import { AlertTriangle, FileText } from "lucide-react";

interface LicitacoesTabProps {
    citySlug: string;
}

export function LicitacoesTab({ citySlug }: LicitacoesTabProps) {
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
                modalidade_licitacao: exp.modalidade_licitacao || "Não informada",
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

    const modalityData = useMemo(() => {
        if (expenses.length === 0) return [];
        const aggregated = aggregateByModality(expenses);
        return aggregated.map(item => ({
            ...item,
            percentage: (item.total / totalBudget) * 100,
        })).sort((a, b) => b.total - a.total);
    }, [expenses, totalBudget]);

    // Cores para gráfico de pizza
    const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

    // Detectar modalidades suspeitas (Dispensa acima de threshold)
    const dispensaData = modalityData.find(m => m.name.toLowerCase().includes("dispensa"));
    const isHighDispensa = dispensaData && dispensaData.percentage > 15;

    if (loading) {
        return <div className="p-20 text-center text-slate-400">Carregando análise de licitações...</div>;
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
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                        Análise de Licitações
                    </h2>
                    <p className="text-slate-500 mt-2 text-lg font-medium leading-relaxed max-w-2xl">
                        Distribuição das despesas por modalidade de contratação e monitoramento de conformidade.
                    </p>
                </div>
            </div>

            {/* KPIs - Apple Premium Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-0 shadow-sm hover:shadow-xl transition-all duration-500 bg-white group ring-1 ring-slate-100/80">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            Total de Modalidades
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight group-hover:scale-105 transition-transform origin-left duration-300">
                            {modalityData.length}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">CLASSIFICAÇÕES ATIVAS</p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm hover:shadow-xl transition-all duration-500 bg-white group ring-1 ring-slate-100/80">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            Modalidade Dominante
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xl font-extrabold text-blue-600 tracking-tight group-hover:scale-105 transition-transform origin-left duration-300 truncate">
                            {modalityData[0]?.name || "N/A"}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">{formatPercentage(modalityData[0]?.percentage || 0)} DO VOLUME TOTAL</p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm hover:shadow-xl transition-all duration-500 bg-white group ring-1 ring-slate-100/80">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            Dispensa de Licitação
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className={`text-3xl font-extrabold tracking-tight group-hover:scale-105 transition-transform origin-left duration-300 ${isHighDispensa ? 'text-orange-600' : 'text-emerald-600'}`}>
                            {formatPercentage(dispensaData?.percentage || 0)}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">PARTICIPAÇÃO NO ORÇAMENTO</p>
                    </CardContent>
                </Card>
            </div>

            {/* Alerta de Dispensa Alta */}
            {isHighDispensa && (
                <Card className="bg-orange-50 border-orange-300">
                    <CardContent className="p-6">
                        <h3 className="font-bold text-orange-900 mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            Alerta: Alta Taxa de Dispensa de Licitação
                        </h3>
                        <p className="text-sm text-orange-800">
                            <strong>{formatPercentage(dispensaData?.percentage || 0)}</strong> das despesas foram realizadas
                            sem licitação. Recomenda-se auditoria para verificar conformidade legal.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Gráfico de Pizza - Refined */}
            <Card className="border-0 shadow-sm ring-1 ring-slate-100 overflow-hidden bg-white">
                <CardHeader className="p-8 pb-0">
                    <CardTitle className="text-xl font-extrabold text-slate-800 tracking-tight">Distribuição por Modalidade</CardTitle>
                    <CardDescription className="text-sm font-medium">Proporção de cada tipo de contratação no volume total</CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={modalityData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={140}
                                    paddingAngle={5}
                                    dataKey="total"
                                >
                                    {modalityData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-slate-900 text-white p-4 shadow-2xl rounded-2xl animate-in zoom-in-95 duration-200 ring-1 ring-white/10">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{data.name}</p>
                                                    <p className="text-lg font-bold">{formatCurrency(data.total)}</p>
                                                    <p className="text-xs font-medium text-blue-400 mt-1">{formatPercentage(data.percentage)} do total</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Legend
                                    verticalAlign="middle"
                                    align="right"
                                    layout="vertical"
                                    iconType="circle"
                                    wrapperStyle={{ paddingLeft: '40px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Tabela Detalhada */}
            <Card>
                <CardHeader>
                    <CardTitle>Detalhamento das Modalidades</CardTitle>
                    <CardDescription>Ranking completo com alertas de conformidade</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Modalidade</TableHead>
                                <TableHead className="text-right">Total Contratado</TableHead>
                                <TableHead className="text-right">% Orçamento</TableHead>
                                <TableHead className="text-center">Contratos</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {modalityData.map((modality, index) => {
                                const isDispensa = modality.name.toLowerCase().includes("dispensa");
                                const isInexigivel = modality.name.toLowerCase().includes("inexig");
                                const needsAttention = (isDispensa || isInexigivel) && modality.percentage > 10;

                                return (
                                    <TableRow key={index} className="hover:bg-blue-50">
                                        <TableCell className="font-mono text-slate-500">{index + 1}</TableCell>
                                        <TableCell className="font-semibold text-slate-900">
                                            {modality.name}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-blue-700">
                                            {formatCurrency(modality.total)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={needsAttention ? "destructive" : "secondary"}>
                                                {formatPercentage(modality.percentage)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center font-mono text-slate-700">
                                            {modality.count}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {needsAttention ? (
                                                <Badge variant="outline" className="text-orange-600 border-orange-600">
                                                    Revisar
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="text-green-700">
                                                    Normal
                                                </Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
