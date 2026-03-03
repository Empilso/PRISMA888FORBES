"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExamplesRenderer } from "@/components/tasks/ExamplesRenderer";
import { Target, Users, Zap, X, Check, Loader2, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";

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

const PHASE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    pre_campaign: { label: "Diagnóstico", icon: Target, color: "text-blue-600 bg-blue-50 border-blue-200" },
    campaign: { label: "Campanha", icon: Users, color: "text-green-600 bg-green-50 border-green-200" },
    final_sprint: { label: "Reta Final", icon: Zap, color: "text-orange-600 bg-orange-50 border-orange-200" },
};

const PHASE_NORMALIZATION: Record<string, string> = {
    diagnostico: "pre_campaign",
    campanha_rua: "campaign",
    campanha: "campaign",
    reta_final: "final_sprint",
    pre_campaign: "pre_campaign",
    campaign: "campaign",
    final_sprint: "final_sprint",
};

const normalizePhase = (phase: string | null | undefined): string => {
    if (!phase) return "pre_campaign";
    return PHASE_NORMALIZATION[phase] || PHASE_NORMALIZATION[phase.toLowerCase()] || "pre_campaign";
};

// ─── Single Swipeable Card ───────────────────────────────────────────────────

interface SwipeCardProps {
    strategy: Strategy;
    onApprove: () => void;
    onReject: () => void;
    isActive: boolean;
    zIndex: number;
    offset: number; // stack depth
}

function SwipeCard({ strategy, onApprove, onReject, isActive, zIndex, offset }: SwipeCardProps) {
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 0, 200], [-18, 0, 18]);
    const opacity = useTransform(x, [-250, -50, 0, 50, 250], [0, 1, 1, 1, 0]);

    // Overlay colors
    const approveOpacity = useTransform(x, [0, 150], [0, 1]);
    const rejectOpacity = useTransform(x, [-150, 0], [1, 0]);

    const phaseKey = normalizePhase(strategy.phase);
    const phaseConfig = PHASE_CONFIG[phaseKey] || PHASE_CONFIG.pre_campaign;

    return (
        <motion.div
            style={{
                x,
                rotate,
                opacity,
                zIndex,
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                // Stacking effect for cards behind
                scale: isActive ? 1 : 1 - offset * 0.04,
                translateY: isActive ? 0 : offset * 14,
            }}
            animate={!isActive ? {
                scale: 1 - offset * 0.04,
                y: offset * 14,
            } : {}}
            drag={isActive ? "x" : false}
            dragConstraints={{ left: -500, right: 500 }}
            dragElastic={0.8}
            onDragEnd={(_, info) => {
                if (info.offset.x > 120) onApprove();
                else if (info.offset.x < -120) onReject();
            }}
            className="w-full"
        >
            {/* The card itself */}
            <div className="relative bg-white rounded-[32px] shadow-2xl shadow-slate-200/60 overflow-hidden border border-slate-100 select-none">
                {/* Approve Overlay */}
                <motion.div
                    style={{ opacity: approveOpacity }}
                    className="absolute inset-0 bg-emerald-500/10 z-10 pointer-events-none flex items-start justify-end p-8 rounded-[32px]"
                >
                    <div className="bg-emerald-500 text-white rounded-2xl px-5 py-3 font-black text-2xl tracking-wider rotate-[-15deg] border-4 border-white shadow-lg">
                        ACEITAR ✓
                    </div>
                </motion.div>

                {/* Reject Overlay */}
                <motion.div
                    style={{ opacity: rejectOpacity }}
                    className="absolute inset-0 bg-red-500/10 z-10 pointer-events-none flex items-start justify-start p-8 rounded-[32px]"
                >
                    <div className="bg-red-500 text-white rounded-2xl px-5 py-3 font-black text-2xl tracking-wider rotate-[15deg] border-4 border-white shadow-lg">
                        PASSAR ✕
                    </div>
                </motion.div>

                {/* Content */}
                <div className="p-8 pb-4">
                    {/* Phase + Pillar Badges */}
                    <div className="flex items-center gap-2 mb-6">
                        <Badge variant="outline" className={`text-[11px] font-semibold px-3 py-1 ${phaseConfig.color}`}>
                            <phaseConfig.icon className="w-3 h-3 mr-1.5" />
                            {phaseConfig.label}
                        </Badge>
                        {strategy.pillar && (
                            <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[11px]">
                                {strategy.pillar}
                            </Badge>
                        )}
                        {strategy.impact && (
                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-none text-[10px] font-bold ml-auto">
                                Impacto {strategy.impact}
                            </Badge>
                        )}
                    </div>

                    {/* Title */}
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 leading-[1.15] mb-5">
                        {strategy.title}
                    </h2>

                    {/* Description */}
                    <p className="text-base text-slate-600 leading-relaxed mb-6">
                        {strategy.description}
                    </p>

                    {/* Examples */}
                    {strategy.examples && strategy.examples.length > 0 && (
                        <div className="rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden">
                            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    💡 Exemplos Práticos
                                </span>
                            </div>
                            <div className="p-5">
                                <ExamplesRenderer
                                    examples={strategy.examples}
                                    mode="card"
                                    maxPreview={3}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Swipe hint */}
                {isActive && (
                    <div className="flex items-center justify-between px-8 py-4 text-[11px] text-slate-300 font-medium select-none pointer-events-none">
                        <span className="flex items-center gap-1"><ChevronLeft className="w-3 h-3" /> Arrastar para rejeitar</span>
                        <span className="flex items-center gap-1">Arrastar para aceitar <ChevronRight className="w-3 h-3" /></span>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// ─── Deck Orchestrator ────────────────────────────────────────────────────────

interface StrategySwipeDeckProps {
    campaignId: string;
    onTaskCreated?: () => void;
}

export function StrategySwipeDeck({ campaignId, onTaskCreated }: StrategySwipeDeckProps) {
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [actionLoading, setActionLoading] = useState<"approve" | "reject" | null>(null);
    const [exiting, setExiting] = useState<{ direction: "left" | "right" } | null>(null);

    const supabase = createClient();
    const { toast } = useToast();

    useEffect(() => {
        fetchStrategies();
    }, [campaignId]);

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight") handleAction("approve");
            if (e.key === "ArrowLeft") handleAction("reject");
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [currentIndex, strategies, actionLoading]);

    const fetchStrategies = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/campaign/${campaignId}/strategies?status=published`, {
                cache: "no-store",
            });
            if (!res.ok) throw new Error("Falha ao buscar estratégias");
            const data: Strategy[] = await res.json();
            setStrategies(data);
            setCurrentIndex(0);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = useCallback(async (action: "approve" | "reject") => {
        if (actionLoading || currentIndex >= strategies.length) return;
        const strategy = strategies[currentIndex];
        if (!strategy) return;

        setActionLoading(action);
        setExiting({ direction: action === "approve" ? "right" : "left" });

        try {
            if (action === "approve") {
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;
                const res = await fetch(`/api/campaign/${campaignId}/strategies/${strategy.id}/activate`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
                    },
                });
                if (!res.ok) throw new Error("Falha ao aprovar");
                toast({
                    title: "✅ Estratégia Aprovada!",
                    description: `"${strategy.title}" foi adicionada ao seu plano.`,
                });
                onTaskCreated?.();
            } else {
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;
                await fetch(`/api/campaign/${campaignId}/strategies/${strategy.id}/reject`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
                    },
                });
                toast({
                    title: "Estratégia ignorada",
                    description: "Você pode voltar às sugestões a qualquer momento.",
                    variant: "default",
                });
            }
        } catch (err: any) {
            toast({ title: "Erro", description: err.message, variant: "destructive" });
        } finally {
            setActionLoading(null);
            setExiting(null);
            setCurrentIndex((i) => i + 1);
        }
    }, [actionLoading, currentIndex, strategies, campaignId, onTaskCreated]);

    const remaining = strategies.length - currentIndex;
    const progress = strategies.length > 0 ? (currentIndex / strategies.length) * 100 : 0;

    // ── Render ────────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                <span className="ml-3 text-slate-500">Carregando estratégias...</span>
            </div>
        );
    }

    if (strategies.length === 0 || currentIndex >= strategies.length) {
        const isDone = strategies.length > 0 && currentIndex >= strategies.length;
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
                    {isDone ? (
                        <Check className="h-9 w-9 text-indigo-500" />
                    ) : (
                        <Sparkles className="h-9 w-9 text-indigo-400" />
                    )}
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                    {isDone ? "Você revisou todas as sugestões! 🎉" : "Nenhuma sugestão disponível"}
                </h3>
                <p className="text-slate-500 max-w-sm text-sm">
                    {isDone
                        ? "Confira seu Plano Mestre com as estratégias aprovadas."
                        : "A IA ainda está gerando sugestões. Volte em breve!"}
                </p>
                {isDone && (
                    <Button onClick={fetchStrategies} variant="outline" className="rounded-full mt-2">
                        <Sparkles className="w-4 h-4 mr-2" /> Recarregar
                    </Button>
                )}
            </div>
        );
    }

    // Show up to 3 cards stacked
    const visibleCards = strategies.slice(currentIndex, currentIndex + 3);

    return (
        <div className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto py-4">
            {/* Progress */}
            <div className="w-full space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                    <span>Estratégia {Math.min(currentIndex + 1, strategies.length)} de {strategies.length}</span>
                    <span>{remaining} restantes</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Card Stack */}
            <div className="relative w-full" style={{ height: 560 }}>
                <AnimatePresence>
                    {visibleCards.map((strategy, i) => (
                        <SwipeCard
                            key={strategy.id}
                            strategy={strategy}
                            isActive={i === 0}
                            zIndex={10 - i}
                            offset={i}
                            onApprove={() => handleAction("approve")}
                            onReject={() => handleAction("reject")}
                        />
                    ))}
                </AnimatePresence>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-6 mt-2">
                {/* Reject */}
                <button
                    onClick={() => handleAction("reject")}
                    disabled={!!actionLoading}
                    className="
                        group relative w-16 h-16 rounded-full border-2 border-slate-200 bg-white
                        flex items-center justify-center shadow-lg
                        hover:border-red-400 hover:shadow-red-100/60 hover:shadow-xl
                        active:scale-95 transition-all duration-200 disabled:opacity-50
                    "
                    title="Ignorar (←)"
                >
                    {actionLoading === "reject" ? (
                        <Loader2 className="w-5 h-5 animate-spin text-red-400" />
                    ) : (
                        <X className="w-6 h-6 text-slate-400 group-hover:text-red-500 transition-colors" />
                    )}
                </button>

                {/* Counter badge */}
                <div className="flex flex-col items-center gap-0.5">
                    <span className="text-2xl font-black text-slate-800">{remaining}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">restantes</span>
                </div>

                {/* Approve */}
                <button
                    onClick={() => handleAction("approve")}
                    disabled={!!actionLoading}
                    className="
                        group relative w-16 h-16 rounded-full border-2 border-slate-200 bg-white
                        flex items-center justify-center shadow-lg
                        hover:border-emerald-400 hover:shadow-emerald-100/60 hover:shadow-xl
                        active:scale-95 transition-all duration-200 disabled:opacity-50
                    "
                    title="Aceitar (→)"
                >
                    {actionLoading === "approve" ? (
                        <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                    ) : (
                        <Check className="w-6 h-6 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                    )}
                </button>
            </div>

            {/* Keyboard hint */}
            <p className="text-[11px] text-slate-300 font-medium">
                Dica: use as teclas <kbd className="bg-slate-100 text-slate-500 rounded px-1 py-0.5 text-[10px] font-mono">←</kbd> e <kbd className="bg-slate-100 text-slate-500 rounded px-1 py-0.5 text-[10px] font-mono">→</kbd> para navegar
            </p>
        </div>
    );
}
