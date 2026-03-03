import React, { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getPaginationRowModel,
    getFilteredRowModel,
    SortingState,
    getSortedRowModel,
    VisibilityState,
    ExpandedState,
    getExpandedRowModel,
} from "@tanstack/react-table";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    ArrowUpDown,
    TrendingUp,
    Search,
    Download,
    ChevronLeft,
    ChevronRight,
    Tractor,
    User,
    Building2,
    FileText,
    Info,
    Settings,
    ChevronDown,
    ChevronUp,
    ExternalLink
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { FiscalMathExplanation } from "../fiscal-analytics/FiscalMathExplanation";

interface FiscalDataGridProps {
    citySlug: string;
}

interface Expense {
    id: string;
    // Core Fields
    nm_fornecedor: string;
    vl_despesa: number;
    dt_emissao_despesa: string;

    // Forensic Fields
    nr_empenho: string;
    historico: string; // or historico_despesa
    funcao: string;
    subfuncao: string;
    cpf_cnpj?: string;
    elemento_despesa?: string;
    orgao?: string;
    evento?: string; // Novo campo
    fonte_recurso?: string;
    modalidade_licitacao?: string;
}

export function FiscalDataGrid({ citySlug }: FiscalDataGridProps) {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [globalFilter, setGlobalFilter] = useState("");
    const [sorting, setSorting] = useState<SortingState>([]);

    // Column Visibility State
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
        cpf_cnpj: false, // Hidden by default
        elemento_despesa: false, // Hidden by default
    });

    // Row Expansion State
    const [expanded, setExpanded] = useState<ExpandedState>({});
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

    // Pagination state (client-side for now for 100 items, can be server-side later)
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    });

    // Filtros Avançados
    const [selectedEvent, setSelectedEvent] = useState<string>("all");
    const [selectedMonth, setSelectedMonth] = useState<string>("all");

    // Totais Matemáticos
    const [mathSummary, setMathSummary] = useState({
        rawTotal: 0,
        reinforcement: 0,
        cancellation: 0,
        netTotal: 0
    });

    const supabase = createClient();

    useEffect(() => {
        fetchExpenses();
    }, [citySlug]);

    const fetchExpenses = async () => {
        setLoading(true);
        try {
            // 1. Fetch Resumo Financeiro (Paginado para cobrir todos os registros)
            let allSummaryData: { vl_despesa: number, evento: string }[] = [];
            let sPage = 0;
            const sSize = 1000;

            while (true) {
                const { data: pageData, error: pageError } = await supabase
                    .from("municipal_expenses")
                    .select("vl_despesa, evento")
                    .eq("municipio_slug", citySlug)
                    .range(sPage * sSize, (sPage + 1) * sSize - 1);

                if (pageError) break;
                if (!pageData || pageData.length === 0) break;

                allSummaryData = [...allSummaryData, ...pageData];
                if (pageData.length < sSize) break;
                sPage++;
            }

            if (allSummaryData.length > 0) {
                let raw = 0, reinf = 0, canc = 0;
                allSummaryData.forEach((item: any) => {
                    const evt = item.evento?.toLowerCase() || '';
                    if (evt === 'empenhado') raw += (item.vl_despesa || 0);
                    else if (evt === 'reforço') reinf += (item.vl_despesa || 0);
                    else if (evt === 'anulação' || evt === 'anulado') canc += (item.vl_despesa || 0);
                });
                setMathSummary({
                    rawTotal: raw,
                    reinforcement: reinf,
                    cancellation: canc,
                    netTotal: raw + reinf - canc
                });
            }

            // 2. Fetch Dados da Grid (Filtrado e Paginado)
            let query = supabase
                .from("municipal_expenses")
                .select("*", { count: 'exact' })
                .eq("municipio_slug", citySlug)
                .order("dt_emissao_despesa", { ascending: false });

            // Aplicar Filtros Dinâmicos
            if (selectedEvent !== "all") {
                query = query.ilike('evento', `%${selectedEvent}%`);
            }
            if (selectedMonth !== "all") {
                query = query.eq('mes', parseInt(selectedMonth));
            }

            // Client-side pagination limit (aumentar se necessário ou implementar server-side pagination completo)
            // Com filtros, 1000 pode ser pouco se o usuário quiser ver tudo?
            // Mas vamos manter 1000 para a grid ser ágil
            query = query.limit(2000);

            const { data, count, error } = await query;
            if (error) throw error;

            setExpenses(data || []);
            setTotalCount(count || 0);

        } catch (error) {
            console.error("Error fetching expenses:", error);
        } finally {
            setLoading(false);
        }
    };

    // Re-fetch quando filtros mudam
    useEffect(() => {
        fetchExpenses();
    }, [citySlug, selectedEvent, selectedMonth]);

    // --- Columns Definition ---
    const columns = useMemo<ColumnDef<Expense>[]>(() => [
        {
            accessorKey: "evento",
            header: "Evento",
            cell: ({ row }) => {
                const evento = row.getValue("evento") as string;
                let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
                let className = "";

                if (evento?.includes("Empenhado")) {
                    variant = "default";
                    className = "bg-blue-600 hover:bg-blue-700 text-white";
                } else if (evento?.includes("Liquidado")) {
                    variant = "secondary";
                    className = "bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-200";
                } else if (evento?.includes("Pago")) {
                    variant = "default";
                    className = "bg-emerald-600 hover:bg-emerald-700 text-white";
                } else if (evento?.includes("Anulação")) {
                    variant = "destructive";
                    className = "bg-red-600 hover:bg-red-700 text-white";
                }

                return ( // Badge centralizada e estilizada
                    <div className="flex justify-center">
                        <Badge variant={variant} className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 ${className}`}>
                            {evento || "N/A"}
                        </Badge>
                    </div>
                );
            },
        },
        {
            accessorKey: "dt_emissao_despesa",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="p-0 hover:bg-transparent font-bold text-xs uppercase tracking-widest text-slate-500"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Data
                        <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                )
            },
            cell: ({ getValue }) => {
                const date = new Date(getValue() as string);
                return <span className="font-mono text-sm text-slate-500">{date.toLocaleDateString('pt-BR')}</span>;
            }
        },
        {
            accessorKey: "nr_empenho",
            header: "Empenho",
            cell: ({ getValue }) => <Badge variant="outline" className="text-[10px] font-mono text-slate-500 border-slate-300 bg-slate-50">{getValue() as string}</Badge>
        },
        {
            accessorKey: "nm_fornecedor",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="p-0 hover:bg-transparent font-bold text-xs uppercase tracking-widest text-slate-500"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Credor & Detalhes
                        <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const fornecedor = row.original.nm_fornecedor;
                const cnpj = row.original.cpf_cnpj;
                const isFolha = fornecedor.includes("FOLHA") || fornecedor.includes("PAGAMENTO");
                const isObras = fornecedor.includes("CONSTRUTORA") || fornecedor.includes("ENGENHARIA");

                return (
                    <div className="flex items-start gap-3 py-2">
                        <div className="mt-1">
                            {isFolha ? <div className="p-2 bg-blue-50 rounded-lg"><User className="w-5 h-5 text-blue-500" /></div> :
                                isObras ? <div className="p-2 bg-orange-50 rounded-lg"><Tractor className="w-5 h-5 text-orange-500" /></div> :
                                    <div className="p-2 bg-slate-100 rounded-lg"><Building2 className="w-5 h-5 text-slate-400" /></div>}
                        </div>
                        <div>
                            <div className="text-base font-bold text-slate-900 leading-snug tracking-tight" title={fornecedor}>
                                {fornecedor}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                {cnpj ? (
                                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10 font-mono">
                                        {cnpj}
                                    </span>
                                ) : (
                                    <span className="text-xs text-slate-400 italic">Sem Documento</span>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        },
        {
            accessorKey: "elemento_despesa",
            header: "Classificação",
            cell: ({ getValue }) => {
                const val = getValue() as string;
                return val ? (
                    <Badge variant="secondary" className="text-[9px] bg-slate-100 text-slate-500 font-normal truncate max-w-[120px]" title={val}>
                        {val}
                    </Badge>
                ) : <span className="text-slate-300">-</span>
            }
        },
        {
            accessorKey: "historico",
            header: "Histórico Forense",
            cell: ({ getValue }) => {
                const text = getValue() as string;
                return (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="max-w-[150px] md:max-w-[400px] text-sm text-slate-600 cursor-help line-clamp-2 leading-relaxed">
                                    {text}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-md text-xs bg-slate-900 text-white p-3 leading-relaxed shadow-xl">
                                {text}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                );
            }
        },
        {
            accessorKey: "funcao",
            header: "Função",
            cell: ({ getValue }) => <Badge className="text-[9px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100">{getValue() as string}</Badge>
        },
        {
            accessorKey: "vl_despesa",
            header: ({ column }) => {
                return (
                    <div className="text-right">
                        <Button
                            variant="ghost"
                            className="p-0 hover:bg-transparent font-bold text-xs uppercase tracking-widest text-slate-500"
                            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        >
                            Valor Auditado
                            <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                    </div>
                )
            },
            cell: ({ getValue }) => {
                const amount = getValue() as number;
                const isHigh = amount > 100000;

                return (
                    <div className={`text-right font-mono text-base font-bold py-2 px-3 rounded-lg ${isHigh ? "bg-red-50 text-red-700 ring-1 ring-red-100" : "text-slate-700"}`}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)}
                    </div>
                );
            }
        },
    ], []);

    const table = useReactTable({
        data: expenses,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(), // Client-side pagination
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        onPaginationChange: setPagination,
        onGlobalFilterChange: setGlobalFilter,
        onSortingChange: setSorting,
        onColumnVisibilityChange: setColumnVisibility,
        onExpandedChange: setExpanded,
        getRowCanExpand: () => true,
        state: {
            pagination,
            globalFilter,
            sorting,
            columnVisibility,
            expanded,
        },
    });

    // Handler para abrir detalhes da despesa
    const handleRowClick = (expense: Expense) => {
        setSelectedExpense(expense);
    };

    const handleExport = () => {
        const headers = ["Data", "Empenho", "Credor", "CNPJ", "Elemento", "Histórico", "Função", "Valor"];
        const rows = expenses.map(e => [
            e.dt_emissao_despesa,
            e.nr_empenho,
            e.nm_fornecedor,
            e.cpf_cnpj || "",
            e.elemento_despesa || "",
            e.historico,
            e.funcao,
            e.vl_despesa.toString().replace(".", ",")
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(";") + "\n"
            + rows.map(e => e.join(";")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `forensic_data_${citySlug}_${new Date().toISOString()}.csv`);
        document.body.appendChild(link);
        link.click();
    };

    if (loading) {
        return <div className="p-20 text-center text-slate-400 font-medium">Carregando Grid Forense...</div>
    }

    if (expenses.length === 0) return null;

    return (
        <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-100 bg-white pb-6 pt-6 px-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <CardTitle className="flex items-center gap-3 text-xl text-slate-900 font-bold tracking-tight">
                            <TrendingUp className="w-6 h-6 text-emerald-600" />
                            Matriz de Despesas
                            <Badge variant="outline" className="ml-2 font-mono text-[10px] uppercase tracking-widest text-slate-400 border-slate-200">Forensic View</Badge>
                        </CardTitle>
                        <CardDescription className="text-base text-slate-500 mt-1">
                            Auditoria completa de <span className="font-semibold text-slate-900">{totalCount.toLocaleString()}</span> registros.
                        </CardDescription>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Buscar no histórico forense..."
                                value={globalFilter}
                                onChange={(e) => setGlobalFilter(e.target.value)}
                                className="pl-10 h-10 text-sm bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                            />
                        </div>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="border-slate-200 hover:bg-slate-50">
                                    <Settings className="w-4 h-4 mr-2" /> Colunas
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56" align="end">
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm mb-3">Visibilidade de Colunas</h4>
                                    {table.getAllLeafColumns().filter(column => column.id !== 'actions').map(column => {
                                        const label = typeof column.columnDef.header === 'string'
                                            ? column.columnDef.header
                                            : column.id;
                                        return (
                                            <div key={column.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={column.id}
                                                    checked={column.getIsVisible()}
                                                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                                                />
                                                <Label
                                                    htmlFor={column.id}
                                                    className="text-sm font-normal cursor-pointer flex-1"
                                                >
                                                    {label}
                                                </Label>
                                            </div>
                                        );
                                    })}
                                </div>
                            </PopoverContent>
                        </Popover>
                        <Button variant="outline" onClick={handleExport} className="border-slate-200 hover:bg-slate-50">
                            <Download className="w-4 h-4 mr-2" /> Exportar
                        </Button>
                        {/* Page Size Selector */}
                        <select
                            value={table.getState().pagination.pageSize}
                            onChange={(e) => table.setPageSize(Number(e.target.value))}
                            className="h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer"
                        >
                            <option value="10">10 linhas</option>
                            <option value="25">25 linhas</option>
                            <option value="50">50 linhas</option>
                            <option value="100">100 linhas</option>
                        </select>
                    </div>
                </div>

                {/* Math Explanation & Filters Bar */}
                <div className="px-6 pb-6 space-y-4">
                    <FiscalMathExplanation {...mathSummary} />

                    <div className="flex flex-wrap gap-4 items-center bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase">Evento</Label>
                            <select
                                value={selectedEvent}
                                onChange={(e) => setSelectedEvent(e.target.value)}
                                className="h-9 rounded-md border border-slate-200 text-sm bg-white px-3 min-w-[150px]"
                            >
                                <option value="all">Todos os Eventos</option>
                                <option value="Empenhado">🔵 Empenhado</option>
                                <option value="Liquidado">🟠 Liquidado</option>
                                <option value="Pago">🟢 Pago</option>
                                <option value="Anulação">🔴 Anulação</option>
                                <option value="Reforço">➕ Reforço</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase">Mês</Label>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="h-9 rounded-md border border-slate-200 text-sm bg-white px-3 min-w-[150px]"
                            >
                                <option value="all">Todo o Ano</option>
                                <option value="1">Janeiro</option>
                                <option value="2">Fevereiro</option>
                                <option value="3">Março</option>
                                <option value="4">Abril</option>
                                <option value="5">Maio</option>
                                <option value="6">Junho</option>
                                <option value="7">Julho</option>
                                <option value="8">Agosto</option>
                                <option value="9">Setembro</option>
                                <option value="10">Outubro</option>
                                <option value="11">Novembro</option>
                                <option value="12">Dezembro</option>
                            </select>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {/* Tabela de Dados */}
                <div className="w-full">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="hover:bg-transparent border-b border-slate-200">
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id} className="text-xs font-bold uppercase tracking-widest text-slate-500 h-12 first:pl-6 last:pr-6 whitespace-nowrap">
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                        className="hover:bg-indigo-50/40 transition-colors border-b border-slate-100 group cursor-pointer"
                                        onClick={() => handleRowClick(row.original)}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id} className="py-4 first:pl-6 last:pr-6 align-top">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="h-32 text-center text-slate-500">
                                        Nenhum resultado encontrado para os filtros aplicados.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between py-4 px-6 border-t border-slate-100 bg-slate-50/30">
                    <div className="text-sm text-slate-500 font-medium">
                        Página {table.getState().pagination.pageIndex + 1} de <span className="text-slate-900">{table.getPageCount()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                            className="h-9 w-9 p-0 rounded-lg border-slate-200"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                            className="h-9 w-9 p-0 rounded-lg border-slate-200"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardContent>

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
                                        Data de Emissão: {selectedExpense ? new Date(selectedExpense.dt_emissao_despesa).toLocaleDateString("pt-BR") : ""}
                                    </DialogDescription>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Empenhado</p>
                                    <p className="text-3xl font-black text-emerald-600 tracking-tighter">
                                        {selectedExpense && new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedExpense.vl_despesa)}
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
                                    <p className="text-sm font-bold text-slate-800 tracking-tight truncate" title={selectedExpense?.modalidade_licitacao || "N/A"}>{selectedExpense?.modalidade_licitacao || "N/A"}</p>
                                </Card>
                                <Card className="border-0 bg-slate-50 p-5 rounded-2xl ring-1 ring-slate-200/50">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fase / Evento</p>
                                    <p className="text-sm font-bold text-blue-600 tracking-tight uppercase truncate" title={selectedExpense?.evento || "Empenhado"}>{selectedExpense?.evento || "Empenhado"}</p>
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
                                    <Info className="w-3 h-3 text-orange-500" />
                                    Histórico Forense (Objeto)
                                </p>
                                <div className="max-h-[120px] overflow-y-auto w-full rounded-md border border-slate-200/50 bg-white p-4">
                                    <p className="text-xs text-slate-600 leading-relaxed italic">
                                        {selectedExpense?.historico || selectedExpense?.elemento_despesa || "Referência ou histórico não fornecido pela entidade."}
                                    </p>
                                </div>
                            </Card>

                            {/* Link Externo */}
                            <div className="pt-4 border-t border-slate-200">
                                <Button
                                    variant="outline"
                                    className="w-full text-slate-500 hover:text-blue-600 border-slate-200"
                                    asChild
                                >
                                    <a
                                        href={`https://www.tce.sp.gov.br/`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        Ver no Portal TCE-SP
                                    </a>
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
