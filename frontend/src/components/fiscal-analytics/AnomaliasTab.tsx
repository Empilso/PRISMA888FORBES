"use client";

import React, { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    detectOutliers,
    detectNegativeValues,
    detectDuplicates,
    formatCurrency,
    type FiscalExpense,
    type Anomaly
} from "@/lib/fiscal-analytics";
import { AlertTriangle, XCircle, Copy, Shield, ChevronLeft, ChevronRight, Info, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

interface AnomaliasTabProps {
    citySlug: string;
}

export function AnomaliasTab({ citySlug }: AnomaliasTabProps) {
    const [expenses, setExpenses] = useState<FiscalExpense[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);

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
                nr_empenho: exp.nr_empenho,
                evento: exp.evento,
                fonte_recurso: exp.fonte_recurso,
            }));

            setExpenses(mapped);
        } catch (error) {
            console.error("Error fetching expenses:", error);
        } finally {
            setLoading(false);
        }
    }

    const anomalies = useMemo(() => {
        if (expenses.length === 0) return { outliers: [], negatives: [], duplicates: [] };

        return {
            outliers: detectOutliers(expenses, 3),
            negatives: detectNegativeValues(expenses),
            duplicates: detectDuplicates(expenses),
        };
    }, [expenses]);

    const totalAnomalies = anomalies.outliers.length + anomalies.negatives.length + anomalies.duplicates.length;

    if (loading) {
        return <div className="p-20 text-center text-slate-400">Analisando dados fiscais...</div>;
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
                        <div className="p-2 bg-red-50 rounded-lg">
                            <Shield className="w-6 h-6 text-red-600" />
                        </div>
                        Detecção de Anomalias
                    </h2>
                    <p className="text-slate-500 mt-2 text-lg font-medium leading-relaxed max-w-2xl">
                        Monitoramento contínuo de integridade e conformidade estatística. Total detectado: <span className="text-red-600 font-bold">{totalAnomalies}</span>
                    </p>
                </div>
            </div>

            {/* KPIs - Apple Premium Cards */}
            <TooltipProvider delayDuration={100}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="border-0 shadow-sm hover:shadow-xl transition-all duration-500 bg-white group ring-1 ring-slate-100/80">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                Índice de Risco
                            </CardTitle>
                            <Tooltip>
                                <TooltipTrigger><Info className="w-3.5 h-3.5 text-slate-300 hover:text-slate-500 cursor-help transition-colors" /></TooltipTrigger>
                                <TooltipContent className="bg-slate-800 text-white rounded-md text-xs border-0 px-3 py-2 max-w-xs shadow-xl"><p>Proporção total de notas fiscais que engatilharam algum alerta de fraude, contabilidade anormal ou erro material.</p></TooltipContent>
                            </Tooltip>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-extrabold text-red-600 tracking-tight group-hover:scale-105 transition-transform origin-left duration-300">
                                {totalAnomalies}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">
                                {((totalAnomalies / expenses.length) * 100).toFixed(1)}% DOS REGISTROS
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm hover:shadow-xl transition-all duration-500 bg-white group ring-1 ring-slate-100/80">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                                Outliers
                            </CardTitle>
                            <Tooltip>
                                <TooltipTrigger><Info className="w-3.5 h-3.5 text-slate-300 hover:text-orange-500 cursor-help transition-colors" /></TooltipTrigger>
                                <TooltipContent className="bg-slate-800 text-white rounded-md text-xs border-0 px-3 py-2 max-w-xs shadow-xl"><p><span className="font-bold text-orange-400">Ponto Fora da Curva:</span> Notas com valores assustadoramente altos em relação ao gasto normal. Pode indicar <strong>superfaturamento</strong> ou compras direcionadas.</p></TooltipContent>
                            </Tooltip>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-extrabold text-orange-600 tracking-tight group-hover:scale-105 transition-transform origin-left duration-300">
                                {anomalies.outliers.length}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">ALTA VARIÂNCIA</p>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm hover:shadow-xl transition-all duration-500 bg-white group ring-1 ring-slate-100/80">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <XCircle className="w-3.5 h-3.5 text-red-500" />
                                Negativos
                            </CardTitle>
                            <Tooltip>
                                <TooltipTrigger><Info className="w-3.5 h-3.5 text-slate-300 hover:text-red-500 cursor-help transition-colors" /></TooltipTrigger>
                                <TooltipContent className="bg-slate-800 text-white rounded-md text-xs border-0 px-3 py-2 max-w-xs shadow-xl"><p><span className="font-bold text-red-400">Risco Contábil:</span> Valores declarados como menores que zero. Costumam ser lançados para apagar rastros e <strong>"maquiar" contas (pedaladas fiscais)</strong> fingindo que a prefeitura gastou menos no ano.</p></TooltipContent>
                            </Tooltip>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-extrabold text-red-500 tracking-tight group-hover:scale-105 transition-transform origin-left duration-300">
                                {anomalies.negatives.length}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">POTENCIAIS ERROS</p>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm hover:shadow-xl transition-all duration-500 bg-white group ring-1 ring-slate-100/80">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Copy className="w-3.5 h-3.5 text-purple-500" />
                                Duplicados
                            </CardTitle>
                            <Tooltip>
                                <TooltipTrigger><Info className="w-3.5 h-3.5 text-slate-300 hover:text-purple-500 cursor-help transition-colors" /></TooltipTrigger>
                                <TooltipContent className="bg-slate-800 text-white rounded-md text-xs border-0 px-3 py-2 max-w-xs shadow-xl"><p><span className="font-bold text-purple-400">Fatiamento:</span> Pagamentos idênticos batendo mesmo dia, credor e valor. É o principal indício de prefeituras <strong>"fatiando" notas para não atingirem o teto que obriga a fazer Licitação</strong>.</p></TooltipContent>
                            </Tooltip>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-extrabold text-purple-600 tracking-tight group-hover:scale-105 transition-transform origin-left duration-300">
                                {anomalies.duplicates.length}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">DADOS REPETIDOS</p>
                        </CardContent>
                    </Card>
                </div>
            </TooltipProvider>

            {/* Tabs de Anomalias - Refined */}
            <Tabs defaultValue="outliers" className="w-full">
                <TabsList className="bg-slate-100/80 p-1.5 rounded-full ring-1 ring-slate-200/50 mb-8">
                    <TabsTrigger value="outliers" className="rounded-full px-8 py-2 text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-orange-600 gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Outliers ({anomalies.outliers.length})
                    </TabsTrigger>
                    <TabsTrigger value="negatives" className="rounded-full px-8 py-2 text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-red-600 gap-2">
                        <XCircle className="w-4 h-4" />
                        Valores Negativos ({anomalies.negatives.length})
                    </TabsTrigger>
                    <TabsTrigger value="duplicates" className="rounded-full px-8 py-2 text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-purple-600 gap-2">
                        <Copy className="w-4 h-4" />
                        Duplicados ({anomalies.duplicates.length})
                    </TabsTrigger>
                </TabsList>

                {/* Outliers */}
                <TabsContent value="outliers">
                    <Card>
                        <CardHeader>
                            <CardTitle>Valores Atípicos (Z-Score &gt; 3)</CardTitle>
                            <CardDescription>
                                Despesas estatisticamente anormais, que se desviam significativamente da média
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {anomalies.outliers.length > 0 ? (
                                <AnomalyTable anomalies={anomalies.outliers} onRowClick={setSelectedAnomaly} />
                            ) : (
                                <div className="p-10 text-center text-green-600 font-medium">
                                    ✅ Nenhum outlier detectado
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Negativos */}
                <TabsContent value="negatives">
                    <Card>
                        <CardHeader>
                            <CardTitle>Valores Negativos</CardTitle>
                            <CardDescription>
                                Despesas com valores negativos, que podem indicar estornos ou erros de lançamento
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {anomalies.negatives.length > 0 ? (
                                <AnomalyTable anomalies={anomalies.negatives} onRowClick={setSelectedAnomaly} />
                            ) : (
                                <div className="p-10 text-center text-green-600 font-medium">
                                    ✅ Nenhum valor negativo detectado
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Duplicados */}
                <TabsContent value="duplicates">
                    <Card>
                        <CardHeader>
                            <CardTitle>Possíveis Duplicatas</CardTitle>
                            <CardDescription>
                                Despesas com mesma data, credor e valor, que podem indicar lançamento duplicado
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {anomalies.duplicates.length > 0 ? (
                                <AnomalyTable anomalies={anomalies.duplicates} onRowClick={setSelectedAnomaly} />
                            ) : (
                                <div className="p-10 text-center text-green-600 font-medium">
                                    ✅ Nenhuma duplicata detectada
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Premium Forensic Detail Dialog */}
            <Dialog open={!!selectedAnomaly} onOpenChange={(open) => !open && setSelectedAnomaly(null)}>
                <DialogContent className="sm:max-w-2xl bg-white border-0 shadow-2xl rounded-3xl overflow-hidden p-0">
                    <div className="h-2 w-full bg-red-600"></div>
                    <div className="p-8">
                        <DialogHeader className="mb-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <Badge variant="destructive" className="mb-2 text-[10px] font-black tracking-widest px-3 py-0.5 uppercase bg-red-100 text-red-700 hover:bg-red-200 border-0">
                                        Risco {selectedAnomaly?.riskScore}/10
                                    </Badge>
                                    <DialogTitle className="text-2xl font-black text-slate-900 tracking-tighter flex items-center gap-2">
                                        <Shield className="w-5 h-5 text-red-600" /> Detalhamento da Anomalia
                                    </DialogTitle>
                                    <DialogDescription className="text-slate-500 font-mono text-xs mt-1">
                                        Empenho #{selectedAnomaly?.nr_empenho || "S/N"} • Emissão: {selectedAnomaly ? new Date(selectedAnomaly.dt_emissao).toLocaleDateString("pt-BR") : ""}
                                    </DialogDescription>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Empenhado</p>
                                    <p className="text-3xl font-black text-red-600 tracking-tighter">
                                        {selectedAnomaly && new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedAnomaly.vl_despesa)}
                                    </p>
                                </div>
                            </div>
                        </DialogHeader>

                        <div className="space-y-6">
                            {/* Forensic Alert Card */}
                            <Card className="border-0 bg-red-50 p-5 rounded-2xl ring-1 ring-red-200 shadow-inner">
                                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                                    <AlertTriangle className="w-3 h-3" />
                                    Fundamento da Suspeita Primária
                                </p>
                                <p className="text-sm font-bold text-red-900 uppercase tracking-tight mb-4">{selectedAnomaly?.reason}</p>

                                {selectedAnomaly?.forensicAnalysis && (
                                    <div className="border-t border-red-200/60 pt-4 mt-4">
                                        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <Shield className="w-3 h-3" />
                                            Parecer Analítico Forense
                                        </p>
                                        <p className="text-xs text-red-800 leading-relaxed font-medium whitespace-pre-line">
                                            {selectedAnomaly.forensicAnalysis}
                                        </p>
                                    </div>
                                )}
                            </Card>

                            <Card className="border-0 bg-slate-50 p-5 rounded-2xl ring-1 ring-slate-200/50">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Credor / Fornecedor</p>
                                <p className="text-sm font-bold text-slate-800 uppercase tracking-tight">{selectedAnomaly?.nm_fornecedor}</p>
                                {selectedAnomaly?.cpf_cnpj && <p className="text-xs font-mono text-slate-500 mt-1">{selectedAnomaly.cpf_cnpj}</p>}
                            </Card>

                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                <Card className="border-0 bg-slate-50 p-5 rounded-2xl ring-1 ring-slate-200/50">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Modalidade</p>
                                    <p className="text-sm font-bold text-slate-800 tracking-tight truncate" title={selectedAnomaly?.modalidade_licitacao || "N/A"}>{selectedAnomaly?.modalidade_licitacao || "N/A"}</p>
                                </Card>
                                <Card className="border-0 bg-slate-50 p-5 rounded-2xl ring-1 ring-slate-200/50">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fase / Evento</p>
                                    <p className="text-sm font-bold text-slate-800 tracking-tight uppercase truncate" title={selectedAnomaly?.evento || "Empenhado"}>{selectedAnomaly?.evento || "Empenhado"}</p>
                                </Card>
                                <Card className="border-0 bg-slate-50 p-5 rounded-2xl ring-1 ring-slate-200/50">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fonte</p>
                                    <p className="text-sm font-bold text-slate-800 tracking-tight truncate" title={selectedAnomaly?.fonte_recurso || "N/A"}>{selectedAnomaly?.fonte_recurso || "N/A"}</p>
                                </Card>
                            </div>

                            <Card className="border-0 bg-slate-50 p-5 rounded-2xl ring-1 ring-slate-200/50">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Info className="w-3 h-3 text-orange-500" />
                                    Histórico Documentado
                                </p>
                                <div className="max-h-[120px] overflow-y-auto w-full rounded-md border border-slate-200/50 bg-white p-4">
                                    <p className="text-xs text-slate-600 leading-relaxed italic">
                                        {selectedAnomaly?.ds_historico || selectedAnomaly?.elemento_despesa || "Referência ou histórico não fornecido pela entidade."}
                                    </p>
                                </div>
                            </Card>

                            <div className="pt-4 border-t border-slate-200">
                                <Button
                                    variant="outline"
                                    className="w-full text-slate-500 hover:text-red-600 border-slate-200"
                                    asChild
                                >
                                    <a href={`https://www.tce.sp.gov.br/`} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        Auditar no TCE-SP
                                    </a>
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Componente auxiliar para renderizar tabelas de anomalias com paginação
function AnomalyTable({ anomalies, onRowClick }: { anomalies: Anomaly[], onRowClick: (anomaly: Anomaly) => void }) {
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(25);

    const totalPages = Math.ceil(anomalies.length / pageSize);
    const startIndex = currentPage * pageSize;
    const endIndex = Math.min(startIndex + pageSize, anomalies.length);
    const paginatedData = anomalies.slice(startIndex, endIndex);

    return (
        <div>
            {/* Controles de Paginação Superior */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
                <div className="text-sm text-slate-600">
                    Mostrando <strong>{startIndex + 1}</strong> a <strong>{endIndex}</strong> de <strong>{anomalies.length}</strong> anomalias
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-600">Exibir:</span>
                    <select
                        value={pageSize}
                        onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(0);
                        }}
                        className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm cursor-pointer"
                    >
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                    </select>
                </div>
            </div>

            {/* Tabela com Scroll */}
            <TooltipProvider delayDuration={100}>
                <div className="max-h-[500px] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">
                                    <Tooltip>
                                        <TooltipTrigger className="cursor-help flex items-center gap-1">Risk <Info className="w-3 h-3 text-slate-400" /></TooltipTrigger>
                                        <TooltipContent className="bg-slate-800 text-white rounded-md text-xs border-0 px-3 py-2 max-w-[200px] shadow-xl">Grau de severidade de 1 a 10 gerado pela IA forense baseado no padrão do indício encontrado.</TooltipContent>
                                    </Tooltip>
                                </TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead>Credor</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                                <TableHead>Função</TableHead>
                                <TableHead>Motivo da Suspeita</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedData.map((anomaly, index) => (
                                <TableRow key={index} className="hover:bg-red-50 cursor-pointer transition-colors" onClick={() => onRowClick(anomaly)}>
                                    <TableCell>
                                        <Badge
                                            variant="destructive"
                                            className={
                                                anomaly.riskScore >= 8
                                                    ? "bg-red-600"
                                                    : anomaly.riskScore >= 5
                                                        ? "bg-orange-600"
                                                        : "bg-yellow-600"
                                            }
                                        >
                                            {anomaly.riskScore}/10
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                        {new Date(anomaly.dt_emissao).toLocaleDateString('pt-BR')}
                                    </TableCell>
                                    <TableCell className="font-semibold text-slate-900 max-w-xs truncate">
                                        {anomaly.nm_fornecedor}
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-red-700">
                                        {formatCurrency(anomaly.vl_despesa)}
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-600">
                                        {anomaly.funcao}
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-700 max-w-[300px]">
                                        {anomaly.forensicAnalysis ? (
                                            <Tooltip>
                                                <TooltipTrigger className="text-left cursor-help border-b border-dashed border-slate-400 pb-0.5 hover:text-slate-900 hover:border-slate-800 transition-colors">
                                                    {anomaly.reason}
                                                </TooltipTrigger>
                                                <TooltipContent className="bg-slate-800 text-white rounded-md border-0 p-4 max-w-sm shadow-2xl z-50">
                                                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-700">
                                                        <Shield className="w-4 h-4 text-orange-400" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Laudo Pericial</span>
                                                    </div>
                                                    <p className="text-xs leading-relaxed text-slate-200 whitespace-pre-line">
                                                        {anomaly.forensicAnalysis}
                                                    </p>
                                                </TooltipContent>
                                            </Tooltip>
                                        ) : (
                                            anomaly.reason
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </TooltipProvider>

            {/* Controles de Paginação Inferior */}
            <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50">
                <div className="text-sm text-slate-500">
                    Página <strong>{currentPage + 1}</strong> de <strong>{totalPages}</strong>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(0)}
                        disabled={currentPage === 0}
                    >
                        Primeira
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 0}
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Anterior
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage >= totalPages - 1}
                    >
                        Próxima
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages - 1)}
                        disabled={currentPage >= totalPages - 1}
                    >
                        Última
                    </Button>
                </div>
            </div>
        </div>
    );
}
