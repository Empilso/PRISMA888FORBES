"use client";

import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Rocket, Target, Users, Zap, Loader2, X } from "lucide-react";
import { ExamplesRenderer } from "@/components/tasks/ExamplesRenderer";

interface Strategy {
    id: string;
    title: string;
    description: string;
    pillar: string;
    phase: string;
    status: "suggested" | "approved" | "published" | "executed";
    examples?: string[];
    impact?: string;
    effort?: string;
}

interface StrategyDetailModalProps {
    strategy: Strategy | null;
    isOpen: boolean;
    onClose: () => void;
    onActivate: (strategyId: string, strategyTitle: string) => Promise<void>;
    onReject: (strategyId: string, strategyTitle: string) => Promise<void>;
    personaId?: string;
}

// Mapeamento de fases
const PHASE_CONFIG = {
    pre_campaign: { label: "Diagnóstico", icon: Target, color: "bg-blue-50 text-blue-700 border-blue-200" },
    campaign: { label: "Campanha", icon: Users, color: "bg-green-50 text-green-700 border-green-200" },
    final_sprint: { label: "Reta Final", icon: Zap, color: "bg-orange-50 text-orange-700 border-orange-200" },
} as const;

const normalizePhase = (phase: string | null | undefined): string => {
    if (!phase) return "pre_campaign";
    const map: Record<string, string> = {
        diagnostico: "pre_campaign",
        campanha_rua: "campaign",
        campanha: "campaign",
        reta_final: "final_sprint",
    };
    return map[phase] || map[phase.toLowerCase()] || phase;
};

export function StrategyDetailModal(props: StrategyDetailModalProps) {
    const { strategy, isOpen, onClose, onActivate, onReject } = props;
    const [activating, setActivating] = useState(false);
    const [rejecting, setRejecting] = useState(false);

    if (!strategy) return null;

    const phaseKey = normalizePhase(strategy.phase) as keyof typeof PHASE_CONFIG;
    const phaseConfig = PHASE_CONFIG[phaseKey] ?? PHASE_CONFIG.pre_campaign;
    const PhaseIcon = phaseConfig.icon;

    const handleActivate = async () => {
        setActivating(true);
        try {
            await onActivate(strategy.id, strategy.title);
            onClose();
        } finally {
            setActivating(false);
        }
    };

    const handleReject = async () => {
        if (!confirm("Tem certeza que deseja descartar esta sugestão?")) return;
        setRejecting(true);
        try {
            await onReject(strategy.id, strategy.title);
            onClose();
        } finally {
            setRejecting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                className="
                    w-full max-w-3xl
                    max-h-[92dvh]
                    overflow-hidden
                    flex flex-col
                    p-0 gap-0
                    border-none
                    bg-white dark:bg-[#0a0a0b]
                    shadow-2xl
                    rounded-t-3xl sm:rounded-3xl
                "
                style={{
                    position: 'fixed',
                    bottom: 0,
                    left: '50%',
                    top: 'auto',
                    transform: 'translateX(-50%)',
                    minHeight: '82dvh',
                    width: '100%',
                    maxWidth: '48rem',
                }}
            >
                {/* ── Close Button ─────────────────────────────────── */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="absolute right-4 top-4 z-50 rounded-full h-8 w-8 text-slate-400 hover:bg-slate-100"
                >
                    <X className="h-4 w-4" />
                </Button>

                {/* ── Scrollable Content Area ───────────────────────── */}
                <div className="flex-1 overflow-y-auto overscroll-contain">

                    {/* ── Header ───────────────────────────────────── */}
                    <div className="px-5 sm:px-10 pt-8 sm:pt-12 pb-5 space-y-4">
                        {/* Mobile drag indicator */}
                        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto sm:hidden -mt-2 mb-4" />

                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className={`text-[11px] font-semibold px-3 py-1 ${phaseConfig.color}`}>
                                <PhaseIcon className="w-3 h-3 mr-1.5" />
                                {phaseConfig.label}
                            </Badge>
                            {strategy.pillar && (
                                <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100 text-[11px]">
                                    {strategy.pillar}
                                </Badge>
                            )}
                            {strategy.impact && (
                                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-none text-[10px] font-bold ml-auto">
                                    Impacto {strategy.impact}
                                </Badge>
                            )}
                            <span className="text-[10px] text-slate-300 font-mono hidden sm:inline">
                                #{strategy.id.slice(0, 8)}
                            </span>
                        </div>

                        {/* Title */}
                        <DialogTitle className="text-xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50 leading-snug pr-8">
                            {strategy.title}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Detalhes da estratégia selecionada
                        </DialogDescription>

                        {/* IA tag */}
                        <div className="flex items-center gap-1.5 text-slate-400">
                            <Rocket className="w-3.5 h-3.5" />
                            <span className="text-[11px] font-semibold uppercase tracking-wider">Sugerido pela IA</span>
                        </div>
                    </div>

                    {/* ── Divider ──────────────────────────────────── */}
                    <div className="h-px bg-slate-100 mx-5 sm:mx-10" />

                    {/* ── Body ─────────────────────────────────────── */}
                    <div className="px-5 sm:px-10 py-6 space-y-6">
                        {/* Description */}
                        <div className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em] flex items-center gap-1.5">
                                <Target className="w-3 h-3" /> Visão Estratégica
                            </p>
                            <p className="text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300">
                                {strategy.description}
                            </p>
                        </div>

                        {/* Examples */}
                        {strategy.examples && strategy.examples.length > 0 && (
                            <div className="rounded-2xl border border-slate-100 dark:border-white/5 overflow-hidden bg-slate-50/60 dark:bg-white/[0.02]">
                                <div className="px-5 py-3 border-b border-slate-100 dark:border-white/5">
                                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                        💡 Exemplos Práticos
                                    </h4>
                                </div>
                                <div className="p-5">
                                    <ExamplesRenderer
                                        examples={strategy.examples}
                                        mode="workbench"
                                        maxPreview={4}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Sticky Footer Actions ─────────────────────────── */}
                <div className="
                    flex-shrink-0
                    flex items-center gap-3
                    px-5 sm:px-10
                    py-4 sm:py-6
                    border-t border-slate-100 dark:border-slate-800/50
                    bg-white/95 dark:bg-[#0a0a0b]/95
                    backdrop-blur-md
                    pb-[max(1.5rem,env(safe-area-inset-bottom))]
                ">
                    {/* Reject */}
                    <Button
                        variant="outline"
                        className="h-12 px-5 rounded-2xl text-slate-500 border-slate-200 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all"
                        onClick={handleReject}
                        disabled={activating || rejecting}
                    >
                        {rejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                        <span className="ml-2 hidden sm:inline">Descartar</span>
                    </Button>

                    {/* Approve */}
                    <Button
                        className="flex-1 h-12 text-base font-bold rounded-2xl shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-primary/90 hover:to-primary active:scale-[0.98] transition-all"
                        onClick={handleActivate}
                        disabled={activating || rejecting}
                    >
                        {activating ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...</>
                        ) : (
                            <><Rocket className="mr-2 h-4 w-4" /> Aceitar e Publicar no Plano</>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
