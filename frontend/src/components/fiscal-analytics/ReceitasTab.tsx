"use client";

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatPercentage } from "@/lib/fiscal-analytics";
import { TrendingUp, Loader2 } from "lucide-react";

interface ReceitasTabProps {
    citySlug: string;
    totalRevenue: number;
}

interface RevenueData {
    id: string;
    fonte: string;
    vl_receita: number;
    tipo_receita?: string;
    rubrica?: string;
}

export function ReceitasTab({ citySlug, totalRevenue }: ReceitasTabProps) {
    const { data: queryData, isLoading: loading } = useQuery({
        queryKey: ['receitasData', citySlug],
        queryFn: async () => {
            const supabase = createClient();

            let allData: any[] = [];
            let page = 0;
            const pageSize = 1000;

            while (true) {
                const { data, error } = await supabase
                    .from("municipal_revenues")
                    .select("*")
                    .eq("municipio_slug", citySlug)
                    .range(page * pageSize, (page + 1) * pageSize - 1);

                if (error) {
                    const isTableNotFound = error?.message?.includes('relation') ||
                        error?.code === '42P01' ||
                        error?.details?.includes('municipal_revenues');

                    if (!isTableNotFound) {
                        console.error("Error fetching revenues:", error);
                    }
                    return null;
                }

                if (!data || data.length === 0) break;

                allData = [...allData, ...data];
                if (data.length < pageSize) break;
                page++;
            }

            const mapped: RevenueData[] = allData.map(rev => ({
                id: rev.id,
                fonte: rev.fonte_receita || rev.rubrica || "Sem classificação",
                vl_receita: rev.vl_receita || 0,
                // FORÇA a aplicação do nosso classificador avançado local ignorando categorias antigas gravadas do banco
                tipo_receita: classifyRevenue(rev.fonte_receita || rev.rubrica),
                rubrica: rev.rubrica,
            }));

            const total = mapped.reduce((sum, r) => sum + r.vl_receita, 0);
            return {
                revenues: mapped,
                realTotal: total
            };
        },
        staleTime: 1000 * 60 * 30, // 30 minutos de cache local
    });

    const revenues = queryData?.revenues || [];
    const realTotal = queryData?.realTotal || totalRevenue;

    // Classificador avançado de tipo de receita (MCASP)
    function classifyRevenue(fonte: string = ""): string {
        const lower = fonte.toLowerCase();

        // 1. Tributos (Impostos, Taxas, Contribuições de Melhoria)
        if (lower.includes("imposto") || lower.includes("taxa") || lower.includes("iptu") || lower.includes("iss") || lower.includes("itbi") || lower.includes("multa") || lower.includes("dívida ativa") || lower.includes("divida ativa")) {
            return "Tributária";
        }

        // 2. Transferências Correntes (União, Estado, FPM, FUNDEB, SUS, ICMS, IPVA)
        if (lower.includes("transfer") || lower.includes("fpm") || lower.includes("icms") || lower.includes("ipva") || lower.includes("sus") || lower.includes("fundeb") || lower.includes("fnde") || lower.includes("cota-parte") || lower.includes("cota") || lower.includes("repasse")) {
            return "Transferências";
        }

        // 3. Receitas de Contribuições (Previdência, Iluminação Pública)
        if (lower.includes("contribui") || lower.includes("cosip") || lower.includes("previdência") || lower.includes("iprev")) {
            return "Contribuições (Previdenciárias/CIP)";
        }

        // 4. Receitas de Capital (Alienação de Bens, Operações de Crédito)
        if (lower.includes("alienação") || lower.includes("crédito") || lower.includes("credito") || lower.includes("financiamento") || lower.includes("amortização") || lower.includes("capital")) {
            return "Receitas de Capital";
        }

        // 5. Receitas Patrimoniais e Agropecuárias/Serviços
        if (lower.includes("patrimon") || lower.includes("aluguel") || lower.includes("rendimento") || lower.includes("juros") || lower.includes("remuneração") || lower.includes("aplicação") || lower.includes("serviços")) {
            return "Patrimonial & Serviços";
        }

        return "Outras (Correntes)";
    }

    const revenueByType = useMemo(() => {
        const aggregated = revenues.reduce((acc, item) => {
            const existing = acc.find(x => x.tipo === item.tipo_receita);
            if (existing) {
                existing.valor += item.vl_receita;
            } else {
                acc.push({ tipo: item.tipo_receita || "Outras", valor: item.vl_receita });
            }
            return acc;
        }, [] as { tipo: string; valor: number }[]);
        return aggregated.sort((a, b) => b.valor - a.valor);
    }, [revenues]);

    const pieData = useMemo(() => {
        return revenueByType.map(item => ({
            name: item.tipo,
            value: item.valor,
            percentage: (item.valor / realTotal) * 100,
        }));
    }, [revenueByType, realTotal]);

    const tableData = useMemo(() => {
        // Agregar por fonte (pode haver múltiplos registros da mesma fonte)
        const aggregated = revenues.reduce((acc, item) => {
            const existing = acc.find(x => x.fonte === item.fonte);
            if (existing) {
                existing.valor += item.vl_receita;
            } else {
                acc.push({
                    fonte: item.fonte,
                    valor: item.vl_receita,
                    tipo: classifyRevenue(item.fonte),
                    percentage: 0,
                });
            }
            return acc;
        }, [] as { fonte: string; valor: number; tipo: string; percentage: number }[]);

        return aggregated
            .map(item => ({
                ...item,
                percentage: (item.valor / realTotal) * 100,
            }))
            .sort((a, b) => b.valor - a.valor)
            .sort((a, b) => b.valor - a.valor)
            .slice(0, 150); // Top 150 fontes para mais granularidade
    }, [revenues, realTotal]);

    const COLORS: Record<string, string> = {
        "Tributária": "#10b981", // Emerald
        "Transferências": "#3b82f6", // Blue
        "Contribuições (Previdenciárias/CIP)": "#8b5cf6", // Violet
        "Receitas de Capital": "#f59e0b", // Amber
        "Patrimonial & Serviços": "#ec4899", // Pink
        "Outras (Correntes)": "#64748b", // Slate
    };

    if (loading) {
        return (
            <div className="p-20 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
                <p className="text-slate-500 mt-4">Carregando dados de receitas...</p>
            </div>
        );
    }

    if (revenues.length === 0) {
        return <div className="p-20 text-center text-slate-400">Nenhuma receita encontrada.</div>;
    }

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Header com Total - Apple Style */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-emerald-600" />
                        </div>
                        Análise de Receitas
                    </h2>
                    <p className="text-slate-500 mt-2 text-lg font-medium leading-relaxed max-w-2xl">
                        Distribuição das fontes de recursos municipais. Total arrecadado: <span className="text-emerald-600 font-bold">{formatCurrency(realTotal)}</span>
                    </p>
                </div>
            </div>

            {/* Aviso se não há dados reais */}
            {revenues.length === 0 && (
                <Card className="bg-amber-50 border-amber-300">
                    <CardContent className="p-6">
                        <h3 className="font-bold text-amber-900 mb-2">⚠️ Dados de Receita Indisponíveis</h3>
                        <p className="text-sm text-amber-800">
                            A tabela <code className="bg-amber-100 px-1 py-0.5 rounded">municipal_revenues</code> ainda não foi populada.
                            Execute a migration <code className="bg-amber-100 px-1 py-0.5 rounded">create_municipal_revenues.sql</code> e importe os dados do TCE-SP.
                        </p>
                        <p className="text-xs text-amber-700 mt-2">
                            Exibindo valor calculado de despesas: <strong>{formatCurrency(realTotal)}</strong>
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* KPIs - Apple Premium Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {pieData.map((item, index) => (
                    <Card key={index} className="border-0 shadow-sm hover:shadow-xl transition-all duration-500 bg-white group ring-1 ring-slate-100/80">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[item.name as keyof typeof COLORS] || "#64748b" }} />
                                {item.name}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight group-hover:scale-105 transition-transform origin-left duration-300">
                                {formatCurrency(item.value)}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">
                                {formatPercentage(item.percentage)} DO TOTAL
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Gráfico de Pizza - Refined */}
            <Card className="border-0 shadow-sm ring-1 ring-slate-100 overflow-hidden bg-white">
                <CardHeader className="p-8 pb-0">
                    <CardTitle className="text-xl font-extrabold text-slate-800 tracking-tight">Composição de Receita</CardTitle>
                    <CardDescription className="text-sm font-medium">Distribuição percentual por classificação oficial</CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={140}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || "#64748b"} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-slate-900 text-white p-4 shadow-2xl rounded-2xl animate-in zoom-in-95 duration-200 ring-1 ring-white/10">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{data.name}</p>
                                                    <p className="text-lg font-bold">{formatCurrency(data.value)}</p>
                                                    <p className="text-xs font-medium text-emerald-400 mt-1">{formatPercentage(data.percentage)} do total</p>
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
                                    wrapperStyle={{ paddingLeft: '40px', fontSize: '12px', fontWeight: 'semibold', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Tabela Detalhada */}
            <Card>
                <CardHeader>
                    <CardTitle>Detalhamento das Receitas (Top 50)</CardTitle>
                    <CardDescription>{revenues.length} registros encontrados, mostrando as maiores fontes</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="max-h-[600px] overflow-y-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                                <TableRow>
                                    <TableHead className="w-12">#</TableHead>
                                    <TableHead>Fonte de Receita</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead className="text-right">Valor Arrecadado</TableHead>
                                    <TableHead className="text-right">% do Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tableData.map((receita, index) => (
                                    <TableRow key={index} className="hover:bg-emerald-50">
                                        <TableCell className="font-mono text-slate-500">{index + 1}</TableCell>
                                        <TableCell className="font-semibold text-slate-900">
                                            {receita.fonte}
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className="px-2 py-1 rounded text-xs font-semibold"
                                                style={{
                                                    backgroundColor: `${COLORS[receita.tipo as keyof typeof COLORS] || "#64748b"}20`,
                                                    color: COLORS[receita.tipo as keyof typeof COLORS] || "#64748b"
                                                }}
                                            >
                                                {receita.tipo}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-emerald-700">
                                            {formatCurrency(receita.valor)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-slate-700">
                                            {formatPercentage(receita.percentage)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Alerta de Dependência */}
            <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-6">
                    <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                        📊 Análise de Dependência
                    </h3>
                    <p className="text-sm text-blue-800">
                        <strong>{formatPercentage(
                            (revenueByType.find(x => x.tipo === "Transferências")?.valor || 0) / realTotal * 100
                        )}</strong> da receita municipal provém de <strong>Transferências</strong> (União + Estado).
                        {((revenueByType.find(x => x.tipo === "Transferências")?.valor || 0) / realTotal * 100) > 60 && " Alto grau de dependência de repasses governamentais."}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
