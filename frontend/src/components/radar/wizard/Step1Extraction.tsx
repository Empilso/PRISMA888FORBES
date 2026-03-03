"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Bot, ArrowRight, Loader2, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

interface Step1Props {
    onNext: () => void;
    campaignId: string;
    politicoId: string;
}

export function Step1Extraction({ onNext, campaignId, politicoId }: Step1Props) {
    const [isExtracting, setIsExtracting] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [promisesFound, setPromisesFound] = useState(0);

    const handleExtraction = async () => {
        setIsExtracting(true);
        try {
            console.log("Iniciando extração via API...");

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/campaigns/${campaignId}/radar/${politicoId}/refresh-phase1`, {
                method: 'POST'
            });

            if (!res.ok) {
                throw new Error(`Erro na API: ${res.status}`);
            }

            const data = await res.json();
            console.log("Extração concluída:", data);

            if (data.status === 'ok') {
                setPromisesFound(data.promises_inseridas);
                setIsComplete(true);
            } else {
                throw new Error(data.detail || "Erro desconhecido na extração");
            }
        } catch (e) {
            console.error("Erro na extração:", e);
            // On error, we don't proceed to complete state mostly, but for UX let's alert
            alert("Erro ao extrair plano de governo. Verifique se o PDF existe.");
        } finally {
            setIsExtracting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto h-full flex flex-col">
            <div className="mb-8 text-center space-y-2">
                <h3 className="text-2xl font-bold text-slate-800">Passo 1: Extração do Plano de Governo</h3>
                <p className="text-slate-500">Nossa IA irá ler o PDF oficial e identificar todas as promessas de campanha automaticamente.</p>
            </div>

            <div className="flex-1 grid grid-cols-2 gap-8 items-center">
                {/* DOCUMENT PREVIEW */}
                <Card className="h-96 bg-slate-100 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center p-6 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[url('https://cdn.arquivo-pdf.com/preview-doc.png')] opacity-10 bg-cover bg-center" />
                    <FileText className="w-16 h-16 text-slate-400 mb-4 group-hover:scale-110 transition-transform" />
                    <p className="font-medium text-slate-700">Plano de Governo 2025-2028.pdf</p>
                    <p className="text-xs text-slate-400 mt-1">2.4 MB • Versão Final</p>

                    {isComplete && (
                        <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center backdrop-blur-[1px]">
                            <div className="bg-white p-4 rounded-full shadow-lg">
                                <CheckCircle className="w-8 h-8 text-emerald-500" />
                            </div>
                        </div>
                    )}
                </Card>

                {/* ACTION PANEL */}
                <div className="space-y-6">
                    {!isComplete ? (
                        <div className="space-y-4">
                            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                                <div className="flex items-center gap-3 mb-2">
                                    <Bot className="w-5 h-5 text-blue-600" />
                                    <h4 className="font-bold text-blue-800">Agente de Leitura Pronto</h4>
                                </div>
                                <p className="text-sm text-blue-600">
                                    O Agente irá processar o documento utilizando NLP (Natural Language Processing) para separar promessas reais de falácias genéricas.
                                </p>
                            </div>

                            <Button
                                size="lg"
                                className="w-full h-14 text-lg gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
                                onClick={handleExtraction}
                                disabled={isExtracting}
                            >
                                {isExtracting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Lendo Documento...
                                    </>
                                ) : (
                                    <>
                                        <FileText className="w-5 h-5" />
                                        Iniciar Extração IA
                                    </>
                                )}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-xl text-center space-y-2">
                                <h4 className="text-emerald-800 font-medium uppercase tracking-wide text-sm">Sucesso</h4>
                                <p className="text-4xl font-extrabold text-emerald-600">{promisesFound}</p>
                                <p className="text-emerald-700 font-medium">Promessas Identificadas</p>
                            </div>

                            <div className="space-y-2 text-sm text-slate-500">
                                <div className="flex justify-between border-b py-2">
                                    <span>Saúde</span>
                                    <span className="font-medium text-slate-800">42 promessas</span>
                                </div>
                                <div className="flex justify-between border-b py-2">
                                    <span>Educação</span>
                                    <span className="font-medium text-slate-800">35 promessas</span>
                                </div>
                                <div className="flex justify-between border-b py-2">
                                    <span>Infraestrutura</span>
                                    <span className="font-medium text-slate-800">28 promessas</span>
                                </div>
                            </div>

                            <Button
                                size="lg"
                                className="w-full h-14 text-lg gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200"
                                onClick={onNext}
                            >
                                Continuar para Auditoria Fiscal
                                <ArrowRight className="w-5 h-5" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
