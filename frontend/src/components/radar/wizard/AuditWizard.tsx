"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, FileText, Landmark, Search, ShieldCheck } from "lucide-react";
import { Step1Extraction } from "./Step1Extraction";
import { Step2Fiscal } from "./Step2Fiscal";
import { Step3Media } from "./Step3Media";

export function AuditWizard({ campaignId, politicoId, onComplete }: { campaignId: string, politicoId: string, onComplete: () => void }) {
    const [currentStep, setCurrentStep] = useState(1);
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);

    const handleNext = () => {
        setCompletedSteps(prev => [...prev, currentStep]);
        if (currentStep < 3) {
            setCurrentStep(prev => prev + 1);
        } else {
            onComplete();
        }
    };

    const steps = [
        { id: 1, title: "Extração Documental", icon: FileText, desc: "Análise do Plano de Governo" },
        { id: 2, title: "Auditoria Fiscal", icon: Landmark, desc: "Cruzamento TCE-SP" },
        { id: 3, title: "Busca de Evidências", icon: Search, desc: "Varredura de Mídia & Redes" },
    ];

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col h-[80vh] max-h-[900px]">
            {/* WIZARD HEADER (Sidebar or Topbar) - Let's do Topbar for Enterprise feel */}
            <div className="bg-slate-900 text-white p-6">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <ShieldCheck className="w-6 h-6 text-emerald-400" />
                            Auditoria Federal 3D
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">Protocolo de Verificação de Promessas de Campanha</p>
                    </div>
                    <div className="text-right">
                        <span className="text-xs font-mono text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                            MÓDULO ENTERPRISE ATIVO
                        </span>
                    </div>
                </div>

                {/* STEPPER */}
                <div className="flex items-center justify-between relative px-4">
                    {/* Progress Line */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-800 -z-0" />
                    <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-emerald-500 transition-all duration-500 ease-in-out -z-0"
                        style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                    />

                    {steps.map((step, idx) => {
                        const isCompleted = completedSteps.includes(step.id);
                        const isCurrent = currentStep === step.id;
                        const isFuture = !isCompleted && !isCurrent;

                        return (
                            <div key={step.id} className="relative z-10 flex flex-col items-center gap-2 group cursor-default">
                                <motion.div
                                    initial={false}
                                    animate={{
                                        scale: isCurrent ? 1.1 : 1,
                                        backgroundColor: isCompleted || isCurrent ? "#10b981" : "#1e293b",
                                        borderColor: isCurrent ? "#34d399" : "#334155"
                                    }}
                                    className={cn(
                                        "w-12 h-12 rounded-full border-4 flex items-center justify-center transition-colors duration-300 shadow-lg",
                                        isFuture && "hover:border-slate-600"
                                    )}
                                >
                                    {isCompleted ? (
                                        <Check className="w-6 h-6 text-white" />
                                    ) : (
                                        <step.icon className={cn("w-5 h-5", isCurrent ? "text-white" : "text-slate-400")} />
                                    )}
                                </motion.div>
                                <div className="text-center absolute top-14 w-40">
                                    <p className={cn("text-sm font-bold transition-colors", isCurrent || isCompleted ? "text-white" : "text-slate-500")}>
                                        {step.title}
                                    </p>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">{step.desc}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* WIZARD BODY */}
            <div className="flex-1 bg-slate-50 relative overflow-y-auto p-8">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="h-full"
                    >
                        {currentStep === 1 && (
                            <Step1Extraction
                                onNext={handleNext}
                                campaignId={campaignId}
                                politicoId={politicoId}
                            />
                        )}
                        {currentStep === 2 && (
                            <Step2Fiscal
                                onNext={handleNext}
                                campaignId={campaignId}
                                politicoId={politicoId}
                            />
                        )}
                        {currentStep === 3 && (
                            <Step3Media
                                onComplete={() => {
                                    setCompletedSteps([1, 2, 3]);
                                    onComplete();
                                }}
                                campaignId={campaignId}
                                politicoId={politicoId}
                            />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
