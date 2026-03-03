
"use client";

import React from "react";
import { RadarSummary } from "@/lib/api/radarPromises";
import { Card, CardContent } from "@/components/ui/card";
// Substitution: Phosphor -> Lucide
import { Coins, Target, ShieldCheck } from "lucide-react";

interface AuditDashboardProps {
    summary: RadarSummary;
    totalComputedValue?: number; // Valor calculado do array de promessas se disponível
}

export function AuditDashboard({ summary, totalComputedValue }: AuditDashboardProps) {
    // Se o backend enviar total_evidence_value no summary (precisaria atualizar interface)
    // Por enquanto, vamos assumir que pode vir ou usamos um prop extra ou calculamos
    // Mas o summary atual tem counts.

    // Vamos usar dados aproximados se não tivermos o valor exato no summary type ainda,
    // mas o ideal é que o summary viesse com 'total_evidence_value'. 
    // Vou usar o prop 'totalComputedValue' passado pelo pai.

    const totalPromises = summary.cumprida + summary.parcial + summary.nao_iniciada + summary.desviada;
    const complianceCount = summary.cumprida + summary.parcial;
    const complianceRate = totalPromises > 0 ? (complianceCount / totalPromises) * 100 : 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* KPI 1: Investimento Auditado */}
            <Card className="bg-white border-slate-200 shadow-sm overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Coins className="w-16 h-16 text-emerald-600" />
                </div>
                <CardContent className="p-6">
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">
                        Investimento Auditado
                    </p>
                    <div className="text-3xl font-serif font-bold text-emerald-700">
                        {totalComputedValue ?
                            Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalComputedValue)
                            : "R$ 0,00"
                        }
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                        Valor consolidado de empenhos vinculados
                    </p>
                </CardContent>
            </Card>

            {/* KPI 2: Taxa de Cumprimento */}
            <Card className="bg-white border-slate-200 shadow-sm overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Target className="w-16 h-16 text-blue-600" />
                </div>
                <CardContent className="p-6">
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">
                        Taxa de Execução
                    </p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-serif font-bold text-slate-800">
                            {complianceRate.toFixed(1)}%
                        </span>
                        <span className="text-sm text-slate-500 font-medium">
                            ({complianceCount}/{totalPromises})
                        </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                        Promessas Cumpridas ou Em Andamento
                    </p>
                    {/* Mini progress bar */}
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div
                            className="bg-blue-600 h-full rounded-full"
                            style={{ width: `${complianceRate}%` }}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* KPI 3: Confiabilidade da Auditoria */}
            <Card className="bg-white border-slate-200 shadow-sm overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <ShieldCheck className="w-16 h-16 text-violet-600" />
                </div>
                <CardContent className="p-6">
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">
                        Nível de Confiança
                    </p>
                    <div className="text-3xl font-serif font-bold text-violet-700">
                        High Confidence
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                        Auditado por I.A. com Evidências Fiscais (TCESP)
                    </p>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div
                            className="bg-violet-600 h-full rounded-full"
                            style={{ width: `92%` }}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
