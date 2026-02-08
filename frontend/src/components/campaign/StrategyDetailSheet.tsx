import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Rocket, Target, Users, Zap, Loader2, X, AlertTriangle, Calendar as CalendarIcon, User, Tag, Clock } from "lucide-react";

import { TraceLogViewer } from "@/components/console/TraceLogViewer";

interface Strategy {
    id: string;
    title: string;
    description: string;
    pillar: string;
    phase: string;
    status: "suggested" | "approved" | "published" | "executed";
}

interface StrategyDetailModalProps {
    strategy: Strategy | null;
    isOpen: boolean;
    onClose: () => void;
    onActivate: (strategyId: string, strategyTitle: string) => Promise<void>;
    onReject: (strategyId: string, strategyTitle: string) => Promise<void>;
    personaId?: string; // Enterprise Feature
}

// Mapeamento de fases
const PHASE_CONFIG = {
    pre_campaign: { label: "Diagnóstico", icon: Target, color: "bg-blue-100 text-blue-800" },
    campaign: { label: "Campanha", icon: Users, color: "bg-green-100 text-green-800" },
    final_sprint: { label: "Reta Final", icon: Zap, color: "bg-orange-100 text-orange-800" },
} as const;

// Helper para normalizar fase
const normalizePhase = (phase: string | null | undefined): string => {
    if (!phase) return 'unknown';
    const map: Record<string, string> = {
        'diagnostico': 'pre_campaign',
        'campanha_rua': 'campaign',
        'campanha': 'campaign',
        'reta_final': 'final_sprint',
    };
    return map[phase] || map[phase.toLowerCase()] || phase;
};

export function StrategyDetailModal(props: StrategyDetailModalProps) {
    const { strategy, isOpen, onClose, onActivate, onReject, personaId } = props;
    const [activating, setActivating] = useState(false);
    const [rejecting, setRejecting] = useState(false);

    if (!strategy) return null;

    const phaseConfig = PHASE_CONFIG[normalizePhase(strategy.phase) as keyof typeof PHASE_CONFIG];

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
        if (!confirm("Tem certeza que deseja descartar esta ideia?")) return;
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
            <DialogContent className="sm:max-w-4xl max-h-[90vh] h-full flex flex-col p-0 gap-0 bg-slate-50/50 overflow-hidden border-none shadow-2xl">

                {/* Header Compacto */}
                <DialogHeader className="px-6 py-4 border-b bg-white flex-shrink-0 flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="h-6 font-medium border-primary/20 text-primary bg-primary/5 uppercase text-[10px] tracking-wider px-2">
                            {strategy.pillar}
                        </Badge>
                        <div className="h-4 w-px bg-slate-200" />
                        <span className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
                            {phaseConfig && <phaseConfig.icon className="w-3.5 h-3.5" />}
                            {phaseConfig?.label}
                        </span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 -mr-2">
                        <X className="w-4 h-4 text-slate-400" />
                    </Button>
                </DialogHeader>

                {/* Body - Split Layout */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

                    {/* Main Content (Left) */}
                    <div className="flex-1 bg-white p-6 overflow-y-auto border-r border-slate-100">
                        <DialogTitle className="text-2xl font-bold leading-tight text-slate-900 mb-6">
                            {strategy.title}
                        </DialogTitle>
                        <DialogDescription className="hidden">
                            Detalhes da estratégia selecionada
                        </DialogDescription>

                        <Tabs defaultValue="details" className="w-full">
                            <TabsList className="mb-4 bg-slate-100/50">
                                <TabsTrigger value="details">Detalhes</TabsTrigger>
                                <TabsTrigger value="history">Histórico</TabsTrigger>
                            </TabsList>
                            <TabsContent value="details" className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-slate-500 text-xs uppercase tracking-wide">Descrição da Estratégia</Label>
                                    <Textarea
                                        className="min-h-[300px] text-base leading-relaxed bg-slate-50/30 border-slate-200 resize-none focus-visible:ring-1 focus-visible:ring-primary/20"
                                        defaultValue={strategy.description}
                                    />

                                    {/* --- Enterprise Log Viewer --- */}
                                    <div className="border-t my-6 border-slate-100" />
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                            📜 Histórico de Execução (Neural Trace)
                                        </h3>
                                        {props.personaId ? (
                                            <div className="rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                                                <TraceLogViewer personaId={props.personaId} className="h-[300px]" />
                                            </div>
                                        ) : (
                                            <div className="text-xs text-slate-400 italic">
                                                ID do Agente não vinculado a esta estratégia.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </TabsContent>
                            <TabsContent value="history" className="py-8 text-center text-slate-400">
                                <Clock className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                <p className="text-sm">Nenhum histórico de alterações.</p>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Sidebar (Right) */}
                    <div className="w-full md:w-80 bg-slate-50/50 p-6 flex flex-col gap-6 overflow-y-auto">
                        <div className="space-y-4">
                            <Label className="text-xs font-semibold text-slate-900 uppercase">Configurações da Tarefa</Label>

                            {/* Responsável */}
                            <div className="space-y-1.5">
                                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5" /> Responsável
                                </span>
                                <Select disabled>
                                    <SelectTrigger className="bg-white border-slate-200 h-9">
                                        <SelectValue placeholder="Selecionar..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="me">Eu (Admin)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Data */}
                            <div className="space-y-1.5">
                                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                                    <CalendarIcon className="w-3.5 h-3.5" /> Data Limite
                                </span>
                                <Button variant="outline" disabled className="w-full justify-start text-left font-normal h-9 bg-white border-slate-200 text-slate-500">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    Definir data
                                </Button>
                            </div>

                            {/* Tags */}
                            <div className="space-y-1.5">
                                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                                    <Tag className="w-3.5 h-3.5" /> Tags
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="secondary" className="bg-white border text-slate-600 font-normal">
                                        IA Strategy
                                    </Badge>
                                    <Button variant="outline" size="sm" className="h-6 text-[10px] border-dashed text-slate-400">
                                        + Add
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Info Box */}
                        <div className="mt-auto bg-blue-50/50 border border-blue-100 rounded-lg p-3">
                            <p className="text-xs text-blue-700 leading-snug">
                                <strong className="font-semibold block mb-1">Dica da IA:</strong>
                                Ao transformar em tarefa, o status mudará para "Em Progresso" no seu Kanban.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Fixed */}
                <DialogFooter className="px-6 py-4 border-t bg-white flex flex-row justify-between items-center w-full flex-shrink-0 z-10 gap-4">
                    <Button
                        variant="ghost"
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 -ml-2"
                        onClick={handleReject}
                        disabled={activating || rejecting}
                    >
                        {rejecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <X className="w-4 h-4 mr-2" />}
                        Descartar
                    </Button>

                    <Button
                        size="lg"
                        className="shadow-xl shadow-primary/20 rounded-full h-11 px-8 font-semibold bg-gradient-to-r from-primary to-primary/90 hover:to-primary"
                        onClick={handleActivate}
                        disabled={activating || rejecting}
                    >
                        {activating ? (
                            <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processando...</>
                        ) : (
                            <><Rocket className="mr-2 h-5 w-5" /> Aceitar e Transformar em Tarefa</>
                        )}
                    </Button>
                </DialogFooter>

            </DialogContent>
        </Dialog>
    );
}
