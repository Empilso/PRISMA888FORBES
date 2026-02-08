"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowRight, WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";

export default function DeprecatedRadarPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
            <div className="max-w-2xl w-full space-y-6">
                <Alert className="border-amber-200 bg-amber-50">
                    <WarningCircle className="h-5 w-5 text-amber-600" />
                    <AlertTitle className="text-amber-900 font-bold text-lg">
                        🚧 Página Descontinuada
                    </AlertTitle>
                    <AlertDescription className="text-amber-800 mt-2">
                        Esta página faz parte do sistema antigo (Janeiro 2026) e foi arquivada para evitar instabilidades.
                    </AlertDescription>
                </Alert>

                <div className="bg-white p-8 rounded-2xl border shadow-sm space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">
                            Sistema Atualizado para Modo Enterprise
                        </h1>
                        <p className="text-slate-600">
                            O módulo de Radar foi completamente refatorado e agora está disponível no Dashboard principal
                            com funcionalidades aprimoradas de análise adversária.
                        </p>
                    </div>

                    <div className="border-t pt-6">
                        <h2 className="font-bold text-slate-800 mb-3">Novas Funcionalidades:</h2>
                        <ul className="space-y-2 text-slate-600">
                            <li className="flex items-start gap-2">
                                <span className="text-green-600 mt-1">✓</span>
                                <span><strong>Sala de Guerra:</strong> Análise adversária com IA de contra-inteligência</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-600 mt-1">✓</span>
                                <span><strong>Seleção Inteligente:</strong> Concorrentes automaticamente detectados por cargo e cidade</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-600 mt-1">✓</span>
                                <span><strong>Logs em Tempo Real:</strong> Rastreamento completo de execuções da IA</span>
                            </li>
                        </ul>
                    </div>

                    <Button asChild className="w-full bg-violet-600 hover:bg-violet-700" size="lg">
                        <Link href="/campaign">
                            Acessar Dashboard Enterprise
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </div>

                <p className="text-center text-sm text-slate-400">
                    Os componentes antigos foram arquivados em <code className="bg-slate-100 px-2 py-1 rounded text-xs">old_legacy_january/</code>
                </p>
            </div>
        </div>
    );
}
