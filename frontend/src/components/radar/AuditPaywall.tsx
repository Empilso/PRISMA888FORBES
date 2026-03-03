"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, ShieldCheck, Search, FileText, CheckCircle2 } from "lucide-react";

interface AuditPaywallProps {
    onUnlock: () => void;
}

export function AuditPaywall({ onUnlock }: AuditPaywallProps) {
    const [isUnlocking, setIsUnlocking] = useState(false);

    const handleUnlock = () => {
        setIsUnlocking(true);
        // Simula processamento de pagamento/liberação
        setTimeout(() => {
            onUnlock();
        }, 2000);
    };

    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 animate-in fade-in duration-700">
            <div className="max-w-3xl w-full text-center space-y-8">

                {/* Header Section */}
                <div className="space-y-4">
                    <div className="inline-flex items-center justify-center p-4 bg-indigo-50 rounded-full mb-4 ring-1 ring-indigo-100">
                        <Lock className="w-10 h-10 text-indigo-600" />
                    </div>
                    <h2 className="text-4xl font-serif font-bold text-slate-900 tracking-tight">
                        Auditoria Federal 3D Disponível
                    </h2>
                    <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                        Desbloqueie o acesso aos dados fiscais reais do TCE-SP, análise documental e varredura de notícias para este mandato.
                    </p>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left my-12">
                    <Card className="border-indigo-100 bg-white/50 hover:bg-white hover:shadow-lg transition-all duration-300">
                        <CardContent className="p-6 space-y-3">
                            <Search className="w-8 h-8 text-blue-600 mb-2" />
                            <h3 className="font-bold text-slate-900">Raio-X Fiscal (TCE-SP)</h3>
                            <p className="text-sm text-slate-500">
                                Cruzamento de cada promessa com 46.455 empenhos e notas fiscais reais.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-indigo-100 bg-white/50 hover:bg-white hover:shadow-lg transition-all duration-300">
                        <CardContent className="p-6 space-y-3">
                            <FileText className="w-8 h-8 text-emerald-600 mb-2" />
                            <h3 className="font-bold text-slate-900">Análise Documental</h3>
                            <p className="text-sm text-slate-500">
                                Verificação automática no PDF oficial do Plano de Governo registrado.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-indigo-100 bg-white/50 hover:bg-white hover:shadow-lg transition-all duration-300">
                        <CardContent className="p-6 space-y-3">
                            <ShieldCheck className="w-8 h-8 text-violet-600 mb-2" />
                            <h3 className="font-bold text-slate-900">Veredito do Juiz IA</h3>
                            <p className="text-sm text-slate-500">
                                Parecer jurídico e técnico gerado por Inteligência Artificial avançada.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Call to Action */}
                <div className="space-y-4">
                    <Button
                        size="lg"
                        onClick={handleUnlock}
                        disabled={isUnlocking}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg px-8 py-6 h-auto shadow-xl shadow-indigo-200 hover:shadow-indigo-300 transform hover:-translate-y-1 transition-all rounded-xl w-full md:w-auto min-w-[300px]"
                    >
                        {isUnlocking ? (
                            <span className="flex items-center gap-2">
                                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                                Liberando Acesso...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <CheckCircle2 className="w-6 h-6" />
                                ATIVAR AUDITORIA (PREMIUM)
                            </span>
                        )}
                    </Button>
                    <p className="text-xs text-slate-400 uppercase tracking-widest font-medium mt-4">
                        Acesso Seguro • Dados Oficiais • Atualização em Tempo Real
                    </p>
                </div>
            </div>
        </div>
    );
}
