"use client";

import { MapPin, Wallet, Lightbulb, CheckSquare, ChevronDown, ChevronUp } from "lucide-react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ElectionResultsTable } from "@/components/dashboard/election-results-table";
import { ElectoralMapCard } from "@/components/dashboard/electoral-map-card";
import { StrategicPriorities } from "@/components/dashboard/strategic-priorities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import React from "react";

export default function DashboardPage() {
    const [showAllResults, setShowAllResults] = React.useState(false);

    // Mock data - em produção virá da API via hooks gerados pelo Orval
    const stats = {
        mappedSections: 37,
        totalVotes: 67247,
        recentInsights: 40,
        pendingTasks: 18,
    };

    const allElectionResults = [
        {
            position: 1,
            candidateNumber: "18",
            candidateName: "WEBER MAGANIATO JUNIOR",
            votes: 14826,
            percentage: 22.05,
            status: "leading" as const,
        },
        {
            position: 2,
            candidateNumber: "48",
            candidateName: "CARLOS AUGUSTO PIVETTA",
            votes: 13276,
            percentage: 19.74,
            status: "competitive" as const,
        },
        {
            position: 3,
            candidateNumber: "22",
            candidateName: "MAURO PAULINO MENDES",
            votes: 9485,
            percentage: 14.10,
            status: "trailing" as const,
        },
        {
            position: 4,
            candidateNumber: "55",
            candidateName: "JOÃO SILVA SANTOS",
            votes: 7234,
            percentage: 10.75,
            status: "trailing" as const,
        },
        {
            position: 5,
            candidateNumber: "12",
            candidateName: "MARIA OLIVEIRA COSTA",
            votes: 6543,
            percentage: 9.73,
            status: "trailing" as const,
        },
        {
            position: 6,
            candidateNumber: "77",
            candidateName: "PEDRO HENRIQUE ALVES",
            votes: 5821,
            percentage: 8.66,
            status: "trailing" as const,
        },
        {
            position: 7,
            candidateNumber: "33",
            candidateName: "ANA PAULA FERREIRA",
            votes: 4987,
            percentage: 7.41,
            status: "trailing" as const,
        },
        {
            position: 8,
            candidateNumber: "90",
            candidateName: "ROBERTO CARLOS LIMA",
            votes: 3654,
            percentage: 5.43,
            status: "trailing" as const,
        },
        {
            position: 9,
            candidateNumber: "44",
            candidateName: "LUCIANA MONTEIRO DIAS",
            votes: 2876,
            percentage: 4.28,
            status: "trailing" as const,
        },
        {
            position: 10,
            candidateNumber: "66",
            candidateName: "FERNANDO AUGUSTO REIS",
            votes: 2134,
            percentage: 3.17,
            status: "trailing" as const,
        },
    ];

    // Mostrar apenas os 3 primeiros ou todos, dependendo do estado
    const electionResults = showAllResults
        ? allElectionResults
        : allElectionResults.slice(0, 3);

    const priorities = [
        {
            id: "1",
            phase: 1,
            title: "1.1 Mapeamento do Terreno Operacional",
            description:
                "Mapear zonas de calor, áreas-base e regiões críticas.",
            status: "in_progress" as const,
            dueDate: "16/12",
        },
        {
            id: "2",
            phase: 1,
            title: "1.2 Pesquisa Qualitativa Profunda",
            description:
                "Detectar necessidades latentes e oportunos ângulos focados.",
            status: "pending" as const,
            dueDate: "18/12",
        },
        {
            id: "3",
            phase: 2,
            title: "2.1 Posicionamento e Narrativas",
            description: "Definir Narrativa, Slogan Interno e Carta de Stakeholder.",
            status: "pending" as const,
            dueDate: "18/12",
        },
    ];

    const recentDiagnoses = [
        {
            id: "1",
            title: "Análise de Sentimento - Região Centro",
            date: "Hoje às 08:45",
            status: "completed",
        },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Seções Mapeadas"
                    value={stats.mappedSections}
                    subtitle="Total de seções mapeadas"
                    icon={MapPin}
                    variant="primary"
                />
                <StatsCard
                    title="Votos Totais"
                    value={stats.totalVotes}
                    subtitle="Votos da última eleição"
                    icon={Wallet}
                    variant="success"
                />
                <StatsCard
                    title="Insights Recentes"
                    value={stats.recentInsights}
                    subtitle="Gerados pela IA esta semana"
                    icon={Lightbulb}
                    variant="warning"
                />
                <StatsCard
                    title="Tarefas Pendentes"
                    value={stats.pendingTasks}
                    subtitle="Ações aguardando execução"
                    icon={CheckSquare}
                    variant="default"
                />
            </div>

            {/* Election Results */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Resultados Últimas Eleições</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                Desempenho dos principais candidatos
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAllResults(!showAllResults)}
                            className="gap-2"
                        >
                            {showAllResults ? (
                                <>
                                    <ChevronUp className="h-4 w-4" />
                                    Recolher
                                </>
                            ) : (
                                <>
                                    Ver ranking completo ({allElectionResults.length})
                                    <ChevronDown className="h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="transition-all duration-300">
                    <ElectionResultsTable results={electionResults} />
                </CardContent>
            </Card>

            {/* Electoral Map */}
            <ElectoralMapCard />

            {/* Strategic Priorities */}
            <StrategicPriorities priorities={priorities} totalCount={8} />

            {/* Recent AI Diagnoses */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Diagnósticos Recentes</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                Análises IA
                            </p>
                        </div>
                        <Button size="sm" className="gap-2">
                            <Plus className="h-4 w-4" />
                            Novo Report
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {recentDiagnoses.map((diagnosis) => (
                            <div
                                key={diagnosis.id}
                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
                                        <Lightbulb className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{diagnosis.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {diagnosis.date}
                                        </p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm">
                                    Ver relatório
                                </Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
