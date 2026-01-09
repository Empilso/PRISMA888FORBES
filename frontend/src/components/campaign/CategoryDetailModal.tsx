
import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Building2, Calendar, FileText } from 'lucide-react';

interface ExpenseDetail {
    fornecedor: string;
    valor: number;
    data: string;
    orgao: string;
    empenho?: string;
    promessa_relacionada: string;
}

interface CategoryData {
    nome: string;
    qtd_promessas: number;
    valor_pago_total: number;
    avaliacao: string;
    detalhes?: ExpenseDetail[];
}

interface CategoryDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    category: CategoryData | null;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString('pt-BR');
};

const isCompany = (text: string) => {
    if (!text) return false;
    return /LTDA|S\.A|EIRELI|ME|EPP|INC|LLC|CORPORATION|S\/A|S\.A\.|LIMITED|CONSTRUTORA|ENGENHARIA|SERVICOS/i.test(text);
};

export function CategoryDetailModal({ isOpen, onClose, category }: CategoryDetailModalProps) {
    if (!category) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[85vh] h-[85vh] flex flex-col p-0">
                <div className="p-6 flex flex-col h-full overflow-hidden">
                    <DialogHeader className="shrink-0 mb-4">
                        <div className="flex items-center gap-3">
                            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                {category.nome}
                            </DialogTitle>
                            <Badge variant={
                                category.avaliacao === 'alta eficácia' ? 'default' :
                                    category.avaliacao === 'média eficácia' ? 'secondary' : 'destructive'
                            }>
                                {category.avaliacao}
                            </Badge>
                        </div>
                        <DialogDescription className="text-base text-muted-foreground">
                            Investimento Total Identificado: <span className="font-bold text-foreground">{formatCurrency(category.valor_pago_total)}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="flex-1 mt-4 pr-4">
                        {!category.detalhes || category.detalhes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground border-2 border-dashed rounded-lg">
                                <AlertCircle className="w-8 h-8 mb-2" />
                                <p>Nenhum detalhe disponível para esta categoria.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[300px]">Fornecedor / Beneficiário</TableHead>
                                        <TableHead className="w-[120px]">Valor</TableHead>
                                        <TableHead className="w-[100px]">Data</TableHead>
                                        <TableHead className="w-[140px]">Empenho</TableHead>
                                        <TableHead>Evidência (Promessa & Origem)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {category.detalhes.map((item, idx) => (
                                        <TableRow key={idx} className="hover:bg-muted/50">
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className={`font-medium ${isCompany(item.fornecedor) ? 'text-blue-700 dark:text-blue-400 font-bold' : ''}`}>
                                                        {isCompany(item.fornecedor) && <Building2 className="inline w-3 h-3 mr-1 mb-0.5" />}
                                                        {item.fornecedor || "Não identificado"}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">{item.orgao}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono font-medium">
                                                {formatCurrency(item.valor)}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3 text-muted-foreground" />
                                                    {formatDate(item.data)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm font-mono text-muted-foreground">
                                                {item.empenho || '-'}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <div className="text-sm text-foreground/90 italic">
                                                        "{item.promessa_relacionada}"
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog >
    );
}
