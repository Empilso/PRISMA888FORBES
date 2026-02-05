"use client";

import React, { use } from "react";
import { CompetitorList } from "@/components/campaign/CompetitorList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, Users, Target, FileSearch } from "lucide-react";

export default function CompetitorsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);

    return (
        <div className="space-y-8 p-8 max-w-7xl mx-auto pb-20">
            {/* Cabeçalho de Impacto */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 bg-red-100 rounded-2xl flex items-center justify-center border border-red-200 shadow-sm">
                        <ShieldAlert className="h-8 w-8 text-red-600" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Inteligência Competitiva</h1>
                        <p className="text-muted-foreground text-lg">
                            Monitoramento de adversários, análise de riscos e comparação de narrativas.
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Cards (Mockup por enquanto, para dar o visual "Belo") */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-white to-slate-50 border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            <Users className="h-4 w-4" /> Adversários Mapeados
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">Ativos no Radar</div>
                        <p className="text-xs text-muted-foreground mt-1">Gerencie a lista abaixo</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-white to-slate-50 border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            <FileSearch className="h-4 w-4" /> Planos Analisados
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">IA Pronta</div>
                        <p className="text-xs text-muted-foreground mt-1">Faça upload de PDFs para análise</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-white to-slate-50 border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            <Target className="h-4 w-4" /> Pontos de Ataque
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">Em Breve</div>
                        <p className="text-xs text-muted-foreground mt-1">Aguarde a próxima atualização</p>
                    </CardContent>
                </Card>
            </div>

            {/* Lista Principal */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                    <CardTitle>Gestão de Adversários</CardTitle>
                    <CardDescription>
                        Adicione concorrentes e faça upload de seus planos de governo ou dados de votação.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <CompetitorList campaignId={id} />
                </CardContent>
            </Card>
        </div>
    );
}
