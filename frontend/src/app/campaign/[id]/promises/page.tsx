"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowRight, WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";

export default function DeprecatedPromisesPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
            <div className="max-w-2xl w-full space-y-6">
                <Alert className="border-amber-200 bg-amber-50">
                    <WarningCircle className="h-5 w-5 text-amber-600" />
                    <AlertTitle className="text-amber-900 font-bold text-lg">
                        🚧 Módulo Descontinuado
                    </AlertTitle>
                    <AlertDescription className="text-amber-800 mt-2">
                        O módulo de "Promessas" foi migrado para o novo sistema Enterprise.
                    </AlertDescription>
                </Alert>

                <div className="bg-white p-8 rounded-2xl border shadow-sm space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">
                            Funcionalidade Integrada ao Dashboard
                        </h1>
                        <p className="text-slate-600">
                            O rastreamento de promessas agora está integrado à Sala de Guerra,
                            permitindo análise adversária completa com cruzamento de dados e verificação de fontes.
                        </p>
                    </div>

                    <Button asChild className="w-full bg-violet-600 hover:bg-violet-700" size="lg">
                        <Link href="/campaign">
                            Ir para Dashboard Principal
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </div>

                <p className="text-center text-sm text-slate-400">
                    Componentes antigos arquivados em <code className="bg-slate-100 px-2 py-1 rounded text-xs">old_legacy_january/</code>
                </p>
            </div>
        </div>
    );
}
