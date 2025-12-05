"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2 } from "lucide-react";

interface Strategy {
    id: string;
    title: string;
    description: string;
    pillar: string;
    phase: string;
    status: "suggested" | "approved";
    campaign_id: string;
}

interface StrategicMatrixProps {
    strategies: Strategy[];
    onStrategyClick: (strategy: Strategy) => void;
}

const MATRIX_PHASES = ["Diagnóstico", "Campanha de Rua", "Reta Final"];

const pillarColors: Record<string, string> = {
    "Credibilidade": "bg-blue-50 border-blue-200 hover:border-blue-400",
    "Proximidade": "bg-green-50 border-green-200 hover:border-green-400",
    "Transformação": "bg-purple-50 border-purple-200 hover:border-purple-400",
    "Segurança": "bg-orange-50 border-orange-200 hover:border-orange-400",
    "Competência": "bg-indigo-50 border-indigo-200 hover:border-indigo-400",
    "Saúde": "bg-red-50 border-red-200 hover:border-red-400",
    "Educação": "bg-yellow-50 border-yellow-200 hover:border-yellow-400",
    "Mobilidade": "bg-cyan-50 border-cyan-200 hover:border-cyan-400",
};

export function StrategicMatrix({ strategies, onStrategyClick }: StrategicMatrixProps) {
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Handler para tecla ESC
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isFullscreen) {
                setIsFullscreen(false);
            }
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [isFullscreen]);

    // Extrair pilares únicos
    const uniquePillars = Array.from(new Set(strategies.map(s => s.pillar))).sort();

    console.log('🎯 [MATRIX] Rendering matrix with', strategies.length, 'strategies');
    console.log('🎯 [MATRIX] Unique pillars:', uniquePillars);
    console.log('🎯 [MATRIX] Phases in constants:', MATRIX_PHASES);
    console.log('🎯 [MATRIX] Sample strategy phases from DB:', strategies.slice(0, 3).map(s => s.phase));

    // Mapear fases antigas para novas E normalizar case/formato
    const normalizePhase = (phase: string): string => {
        if (!phase) {
            console.warn('⚠️ [MATRIX] Phase is null/undefined:', phase);
            return "Outros";
        }

        // Lowercase e trim para comparação case-insensitive
        const normalized = phase.toLowerCase().trim();

        const phaseMap: Record<string, string> = {
            // Formato do banco (snake_case)
            "diagnostico": "Diagnóstico",
            "campanha_rua": "Campanha de Rua",
            "reta_final": "Reta Final",
            // Formato alternativo (title case)
            "pré-campanha": "Diagnóstico",
            "1ª fase": "Campanha de Rua",
            "2ª fase": "Campanha de Rua",
            "final": "Reta Final",
            // Formato exato das colunas
            "diagnóstico": "Diagnóstico",
            "campanha de rua": "Campanha de Rua",
        };

        const result = phaseMap[normalized] || phase;
        console.log('🔄 [NORMALIZE]', phase, '→', result);
        return result;
    };

    // Função para buscar estratégias de uma célula
    const getStrategiesForCell = (pillar: string, phase: string): Strategy[] => {
        const filtered = strategies.filter((s) => {
            const normalizedPhase = normalizePhase(s.phase);
            const matches = s.pillar === pillar && normalizedPhase === phase;

            if (matches) {
                console.log('✅ [MATCH]', `Pillar: ${s.pillar} === ${pillar}`, `Phase: ${s.phase} (→ ${normalizedPhase}) === ${phase}`);
            }

            return matches;
        });

        if (filtered.length === 0) {
            console.log('❌ [NO MATCH] Cell [', pillar, ',', phase, '] is empty');
        } else {
            console.log('✅ [CELL]', pillar, '+', phase, '=', filtered.length, 'strategies');
        }

        return filtered;
    };

    return (
        <div className={
            isFullscreen
                ? "fixed inset-0 z-50 bg-background p-6 h-screen w-screen overflow-hidden"
                : "space-y-4"
        }>
            {/* Debug Panel */}
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                <h4 className="text-sm font-semibold mb-2 text-yellow-900">🐛 DEBUG - Fases do Banco</h4>
                <div className="text-xs text-yellow-800 space-y-1">
                    <p><strong>Total de Estratégias:</strong> {strategies.length}</p>
                    <p><strong>Fases Únicas no Banco:</strong> {Array.from(new Set(strategies.map(s => s.phase))).join(', ')}</p>
                    <p><strong>Pilares Únicos:</strong> {uniquePillars.join(', ')}</p>
                </div>
            </div>

            {/* Header da Matriz */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">📊 Matriz Estratégica Tática</h3>
                        <p className="text-sm text-muted-foreground">
                            Visualize a cobertura estratégica por Pilar x Fase. Células vazias indicam oportunidades não exploradas.
                        </p>
                    </div>

                    {/* Botão Fullscreen */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="gap-2"
                        title={isFullscreen ? "Sair da Tela Cheia (ESC)" : "Expandir Visualização"}
                    >
                        {isFullscreen ? (
                            <>
                                <Minimize2 className="h-4 w-4" />
                                Sair da Tela Cheia
                            </>
                        ) : (
                            <>
                                <Maximize2 className="h-4 w-4" />
                                Expandir
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Tabela Matriz */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className={
                    isFullscreen
                        ? "overflow-auto h-[calc(100vh-280px)]"
                        : "overflow-auto max-h-[calc(100vh-400px)]"
                }>
                    <table className="w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-20">
                            <tr>
                                <th
                                    scope="col"
                                    className="sticky left-0 z-30 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r"
                                >
                                    Pilar / Fase
                                </th>
                                {MATRIX_PHASES.map((phase) => (
                                    <th
                                        key={phase}
                                        scope="col"
                                        className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    >
                                        {phase}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {uniquePillars.map((pillar) => (
                                <tr key={pillar} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="sticky left-0 z-10 bg-white px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full ${pillarColors[pillar]?.replace('bg-', 'bg-').replace('-50', '-500') || 'bg-gray-500'}`} />
                                            {pillar}
                                        </div>
                                    </td>
                                    {MATRIX_PHASES.map((phase) => {
                                        const cellStrategies = getStrategiesForCell(pillar, phase);
                                        return (
                                            <td
                                                key={`${pillar}-${phase}`}
                                                className="px-2 py-2 align-top"
                                            >
                                                <div className="min-h-[100px] space-y-2">
                                                    {cellStrategies.length === 0 ? (
                                                        <div className="h-full flex items-center justify-center">
                                                            <span className="text-xs text-gray-300 italic">
                                                                Sem ações
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        cellStrategies.map((strategy) => (
                                                            <Card
                                                                key={strategy.id}
                                                                className={`cursor-pointer transition-all border-2 ${pillarColors[pillar] || 'bg-gray-50 border-gray-200'}`}
                                                                onClick={() => onStrategyClick(strategy)}
                                                            >
                                                                <CardHeader className="p-3 pb-2">
                                                                    <CardTitle className="text-xs line-clamp-2 leading-tight">
                                                                        {strategy.title}
                                                                    </CardTitle>
                                                                </CardHeader>
                                                                <CardContent className="p-3 pt-0">
                                                                    <p className="text-[10px] text-muted-foreground line-clamp-2">
                                                                        {strategy.description}
                                                                    </p>
                                                                    {strategy.status === "approved" && (
                                                                        <Badge className="mt-2 h-4 text-[9px] bg-green-600">
                                                                            ✓ Aprovado
                                                                        </Badge>
                                                                    )}
                                                                </CardContent>
                                                            </Card>
                                                        ))
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Legenda */}
            <div className="bg-white rounded-lg shadow-sm border p-4">
                <h4 className="text-sm font-semibold mb-3">Legenda</h4>
                <div className="flex flex-wrap gap-3 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-600" />
                        <span>Aprovado para Publicação</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded border-2 border-gray-300" />
                        <span>Sugestão da IA</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-300 italic">Sem ações</span>
                        <span>= Oportunidade não explorada</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
