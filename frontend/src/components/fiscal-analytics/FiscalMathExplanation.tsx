import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Minus, Plus, Calculator } from "lucide-react";

interface FiscalMathProps {
    rawTotal: number;       // Empenhado Bruto
    reinforcement: number;  // Reforços
    cancellation: number;   // Anulações
    netTotal: number;       // Líquido (TCE)
}

export function FiscalMathExplanation({ rawTotal, reinforcement, cancellation, netTotal }: FiscalMathProps) {
    const format = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <Card className="mb-6 bg-gradient-to-r from-blue-50/80 via-white to-purple-50/80 border-l-4 border-l-indigo-500 shadow-sm">
            <CardContent className="pt-6 pb-6">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-6">

                    <div className="flex items-center gap-4 min-w-[280px]">
                        <div className="p-3 bg-white rounded-xl border border-indigo-100 shadow-sm ring-4 ring-indigo-50">
                            <Calculator className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                Inteligência Contábil
                                <Badge variant="secondary" className="text-[10px] bg-indigo-100 text-indigo-700 hover:bg-indigo-100">TCE-SP</Badge>
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">Metodologia oficial de cálculo</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 text-sm font-mono flex-1">

                        <div className="flex flex-col items-center group relative">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Bruto</span>
                            <span className="font-bold text-blue-700 bg-blue-50/50 px-3 py-1.5 rounded-lg border border-blue-100 group-hover:bg-blue-100 transition-colors cursor-help" title="Total de Empenhos">
                                {format(rawTotal)}
                            </span>
                        </div>

                        <div className="flex flex-col items-center">
                            <Plus className="w-4 h-4 text-slate-300 mb-6" />
                        </div>

                        <div className="flex flex-col items-center group relative">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Reforços</span>
                            <span className="font-bold text-emerald-700 bg-emerald-50/50 px-3 py-1.5 rounded-lg border border-emerald-100 group-hover:bg-emerald-100 transition-colors cursor-help" title="Reforços de Dotação">
                                {format(reinforcement)}
                            </span>
                        </div>

                        <div className="flex flex-col items-center">
                            <Minus className="w-4 h-4 text-slate-300 mb-6" />
                        </div>

                        <div className="flex flex-col items-center group relative">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Anulações</span>
                            <span className="font-bold text-red-700 bg-red-50/50 px-3 py-1.5 rounded-lg border border-red-100 group-hover:bg-red-100 transition-colors cursor-help" title="Estornos e Cancelamentos">
                                {format(cancellation)}
                            </span>
                        </div>

                        <div className="flex flex-col items-center">
                            <ArrowRight className="w-5 h-5 text-indigo-300 mb-6" />
                        </div>

                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider mb-1">Líquido (TCE)</span>
                            <Badge variant="outline" className="text-lg font-bold bg-white text-indigo-900 border-indigo-200 px-4 py-1 shadow-sm ring-2 ring-indigo-50/50">
                                {format(netTotal)}
                            </Badge>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
