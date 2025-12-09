"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Calendar, CheckCircle, Edit, GripVertical } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface Strategy {
    id: string;
    title: string;
    description: string;
    pillar: string;
    phase: string;
    status: "suggested" | "approved";
    start_date?: string | null;
    end_date?: string | null;
    campaign_id: string;
}

interface StrategicTimelineProps {
    strategies: Strategy[];
    onStrategyClick: (strategy: Strategy) => void;
    onStrategyUpdate?: (strategy: Strategy) => void;
}

const MONTHS = [
    { name: "Junho", color: "bg-blue-50/30" },
    { name: "Julho", color: "bg-blue-50/30" },
    { name: "Agosto", color: "bg-amber-50/30" },
    { name: "Setembro", color: "bg-orange-50/30" },
    { name: "Outubro", color: "bg-red-50/30" }
];

// Configuração visual das Fases
const PHASE_STYLES: Record<string, { bg: string; border: string; text: string }> = {
    "Pré-Campanha": { bg: "bg-blue-200", border: "border-blue-400", text: "text-blue-900" },
    "1ª Fase": { bg: "bg-amber-200", border: "border-amber-400", text: "text-amber-900" },
    "2ª Fase": { bg: "bg-orange-200", border: "border-orange-400", text: "text-orange-900" },
    "Reta Final": { bg: "bg-red-200", border: "border-red-400", text: "text-red-900" },
    "Final": { bg: "bg-red-200", border: "border-red-400", text: "text-red-900" },
    "default": { bg: "bg-slate-200", border: "border-slate-400", text: "text-slate-900" }
};

// Constantes de Tempo
const BASE_YEAR = 2026;
const BASE_DATE = new Date(`${BASE_YEAR}-06-01T00:00:00`); // 01 Jun
const COLUMNS_TOTAL = 20; // 5 meses * 4 semanas
const DAYS_PER_COL = 7;

export function StrategicTimeline({ strategies, onStrategyClick, onStrategyUpdate }: StrategicTimelineProps) {
    const supabase = createClient();
    const { toast } = useToast();

    // State local para manipulação otimista
    const [items, setItems] = useState<Strategy[]>(strategies);
    const containerRef = useRef<HTMLDivElement>(null);
    const dragStateRef = useRef<{
        isDragging: boolean;
        type: 'move' | 'resize-start' | 'resize-end' | null;
        strategyId: string | null;
        startX: number;
        originalStart: number;
        originalSpan: number;
        colWidth: number;
    }>({
        isDragging: false,
        type: null,
        strategyId: null,
        startX: 0,
        originalStart: 0,
        originalSpan: 0,
        colWidth: 0
    });

    // Sincronizar props com state
    useEffect(() => {
        setItems(strategies);
    }, [strategies]);

    // Helpers de Posição
    const getColFromDate = (dateStr: string | null): number | null => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        const diffTime = date.getTime() - BASE_DATE.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const col = Math.floor(diffDays / DAYS_PER_COL) + 1;
        return col; // 1-based
    };

    const getDateFromCol = (col: number): string => {
        const daysToAdd = (col - 1) * DAYS_PER_COL;
        const date = new Date(BASE_DATE);
        date.setDate(date.getDate() + daysToAdd);
        return date.toISOString().split('T')[0];
    };

    const getDefaultPosition = (phase: string, index: number) => {
        let startCol = 2;
        let span = 4;
        switch (phase) {
            case "Pré-Campanha": startCol = 2 + (index % 4); span = 3; break;
            case "1ª Fase": startCol = 9 + (index % 2); span = 3; break;
            case "2ª Fase": startCol = 13 + (index % 2); span = 3; break;
            case "Reta Final":
            case "Final": startCol = 17 + (index % 2); span = 3; break;
        }
        return { start: startCol, span };
    };

    const getStrategyPosition = (strategy: Strategy, index: number) => {
        const dbStart = getColFromDate(strategy.start_date || null);
        const dbEnd = getColFromDate(strategy.end_date || null);

        if (dbStart && dbEnd) {
            const span = Math.max(1, dbEnd - dbStart);
            return { start: Math.max(1, Math.min(COLUMNS_TOTAL, dbStart)), span };
        }
        return getDefaultPosition(strategy.phase, index);
    };

    // Drag Handlers
    const handleMouseDown = (e: React.MouseEvent, strategyId: string, type: 'move' | 'resize-start' | 'resize-end') => {
        e.stopPropagation();
        e.preventDefault();

        if (!containerRef.current) return;

        const strategy = items.find(s => s.id === strategyId);
        if (!strategy) return;

        // Encontrar índice
        const index = items.filter(s => s.pillar === strategy.pillar).findIndex(s => s.id === strategyId); // index aproximado, mas ok para default
        const currentPos = getStrategyPosition(strategy, index);

        // Calcular largura da coluna em pixels
        // O grid tem 'min-w-[1000px]' e padding. Vamos pegar a largura do wrapper do grid.
        // O elemento pai do item (linha) tem width total. 1 coluna = width / 20.
        const gridElement = containerRef.current.querySelector('.grid-cols-20');
        const gridWidth = gridElement?.getBoundingClientRect().width || 1000;
        const colWidth = gridWidth / COLUMNS_TOTAL;

        dragStateRef.current = {
            isDragging: true,
            type,
            strategyId,
            startX: e.clientX,
            originalStart: currentPos.start,
            originalSpan: currentPos.span,
            colWidth
        };

        // Adicionar listeners globais
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = type === 'move' ? 'grabbing' : 'col-resize';
    };

    const handleMouseMove = (e: MouseEvent) => {
        const state = dragStateRef.current;
        if (!state.isDragging || !state.strategyId) return;

        const deltaX = e.clientX - state.startX;
        const deltaCols = Math.round(deltaX / state.colWidth);

        setItems(prev => prev.map(s => {
            if (s.id !== state.strategyId) return s;

            let newStart = state.originalStart;
            let newSpan = state.originalSpan;

            if (state.type === 'move') {
                newStart = Math.max(1, Math.min(COLUMNS_TOTAL - newSpan + 1, state.originalStart + deltaCols));
            } else if (state.type === 'resize-start') {
                const proposedStart = Math.max(1, Math.min(state.originalStart + state.originalSpan - 1, state.originalStart + deltaCols));
                const endCol = state.originalStart + state.originalSpan;
                newStart = proposedStart;
                newSpan = endCol - newStart;
            } else if (state.type === 'resize-end') {
                const proposedSpan = Math.max(1, Math.min(COLUMNS_TOTAL - state.originalStart + 1, state.originalSpan + deltaCols));
                newSpan = proposedSpan;
            }

            // Atualiza temporariamente no objeto (usando campos temporarios ou convertendo direto pra date)
            // Para UI fluida, precisamos que getStrategyPosition leia esses valores
            // Vamos converter de volta para Data para salvar no state
            return {
                ...s,
                start_date: getDateFromCol(newStart),
                end_date: getDateFromCol(newStart + newSpan)
            };
        }));
    };

    const handleMouseUp = async (e: MouseEvent) => {
        const state = dragStateRef.current;
        if (!state.isDragging || !state.strategyId) return;

        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        dragStateRef.current.isDragging = false;

        // Persistir no Banco
        const strategy = items.find(s => s.id === state.strategyId);
        if (strategy) {
            try {
                const { error } = await supabase
                    .from('strategies')
                    .update({
                        start_date: strategy.start_date,
                        end_date: strategy.end_date
                    })
                    .eq('id', strategy.id);

                if (error) throw error;

                toast({
                    title: "Cronograma Atualizado",
                    description: "Data da estratégia salva com sucesso.",
                });

                if (onStrategyUpdate) onStrategyUpdate(strategy);

            } catch (error) {
                console.error("Erro ao salvar timeline:", error);
                toast({
                    title: "Erro",
                    description: "Não foi possível salvar a alteração.",
                    variant: "destructive"
                });
                // Reverter? Idealmente sim, mas para MVP vamos deixar assim
            }
        }
    };

    // Grouping Logic (Mesma de antes)
    const uniquePillars = Array.from(new Set(items.map(s => s.pillar || "Geral"))).sort();
    const phaseOrder: Record<string, number> = { "Pré-Campanha": 1, "1ª Fase": 2, "2ª Fase": 3, "Reta Final": 4, "Final": 4 };

    const groupedData = useMemo(() => {
        return uniquePillars.map(pillar => {
            const groupItems = items
                .filter(s => (s.pillar || "Geral") === pillar)
                .sort((a, b) => {
                    const orderA = phaseOrder[a.phase] || 0;
                    const orderB = phaseOrder[b.phase] || 0;
                    return orderA - orderB || a.title.localeCompare(b.title);
                });
            return { pillar, items: groupItems };
        });
    }, [items]); // Dep on items for drag updates

    if (!items || items.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground bg-slate-50/50">
                <div className="text-center">
                    <Calendar className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p>Nenhuma estratégia para exibir na Timeline.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-50 relative overflow-hidden rounded-lg border shadow-sm" ref={containerRef}>
            {/* Header Legenda Fixa */}
            <div className="flex items-center justify-between px-6 py-3 border-b bg-white z-30 shadow-sm shrink-0">
                <div className="flex items-center gap-2">
                    <div className="bg-indigo-100 p-1.5 rounded-md">
                        <Calendar className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-slate-800">Roadmap Interativo</h2>
                        <p className="text-[10px] text-slate-500">Arraste para ajustar prazos</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    {/* Legendas simples */}
                    <div className="flex items-center text-[10px] text-slate-500 gap-3">
                        <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-blue-300 mr-1.5"></div> Pré</span>
                        <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-amber-300 mr-1.5"></div> 1ª Fase</span>
                        <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-orange-300 mr-1.5"></div> 2ª Fase</span>
                        <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-red-300 mr-1.5"></div> Final</span>
                    </div>
                </div>
            </div>

            {/* Scroll Container Principal - Vertical + Horizontal */}
            <div className="h-[calc(100vh-300px)] w-full overflow-auto bg-white relative border rounded-xl shadow-sm">
                <div className="min-w-[1000px] pb-10"> {/* Ensure min width for gantt */}

                    {/* Sticky Month Header */}
                    <div className="sticky top-0 z-20 bg-white border-b shadow-sm min-w-full w-fit">
                        <div className="flex pl-[200px] py-2">
                            {MONTHS.map((month, i) => (
                                <div key={i} className="flex-1 text-center font-bold text-xs text-slate-400 uppercase tracking-widest border-r border-slate-100 last:border-0">
                                    {month.name}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Body */}
                    <div className="relative pt-4 px-6">
                        {/* Background Grid Lines (Absolute) */}
                        <div className="absolute inset-0 pl-[224px] pt-[45px] pr-6 pointer-events-none h-full">
                            <div className="grid grid-cols-20 h-full w-full border-l border-slate-100">
                                {Array.from({ length: 20 }).map((_, i) => (
                                    <div key={i} className={`h-full border-r border-slate-100 ${i % 4 === 0 ? 'border-r-slate-200' : ''}`} />
                                ))}
                            </div>
                        </div>

                        {/* Rows */}
                        <div className="space-y-8 relative z-10">
                            {groupedData.map((group) => (
                                <div key={group.pillar} className="relative">
                                    {/* Linha Vertical do Pilar */}
                                    <div className="absolute left-[190px] top-4 bottom-4 w-px bg-slate-200 -z-10" />

                                    {/* Cabeçalho do Pilar */}
                                    <div className="grid grid-cols-[200px_1fr] mb-2">
                                        <div className="sticky left-0 z-10 bg-slate-50/80 pr-6 text-right relative border-r border-slate-100 py-1">
                                            <h3 className="font-bold text-slate-700 text-xs uppercase tracking-tight">{group.pillar}</h3>
                                            <div className="absolute right-[-4px] top-2 w-2 h-2 rounded-full bg-slate-300 border-2 border-white"></div>
                                        </div>
                                        <div /> {/* Espaço vazio grid */}
                                    </div>

                                    {/* Tasks do Pilar */}
                                    <div className="space-y-2">
                                        {group.items.map((strategy, idx) => {
                                            const pos = getStrategyPosition(strategy, idx);
                                            const styles = PHASE_STYLES[strategy.phase] || PHASE_STYLES.default;

                                            return (
                                                <div key={strategy.id} className="grid grid-cols-[200px_1fr] items-center group/row hover:bg-slate-50/50 rounded-md transition-colors">
                                                    {/* Task Label (Esquerda) */}
                                                    <div className="sticky left-0 z-10 bg-white pr-6 pl-2 py-1 truncate text-[11px] text-slate-500 text-right cursor-pointer hover:text-primary transition-colors border-r border-slate-50" onClick={() => onStrategyClick(strategy)} title={strategy.title}>
                                                        {strategy.title}
                                                    </div>

                                                    {/* Task Bar Area */}
                                                    <div className="relative h-8 grid grid-cols-20 items-center pl-0">
                                                        <div
                                                            style={{
                                                                gridColumnStart: pos.start,
                                                                gridColumnEnd: `span ${pos.span}`,
                                                                backgroundColor: styles.bg.replace('bg-', 'var(--tw-bg-opacity, 1) '), // Hacky way to get color or use class
                                                            }}
                                                            // Apply classes dynamically
                                                            className={`relative h-6 rounded-md shadow-sm border group/bar flex items-center px-2 select-none ${styles.bg} ${styles.border} ${styles.text} cursor-move hover:ring-2 ring-primary/20 hover:shadow-md transition-shadow`}
                                                            onMouseDown={(e) => handleMouseDown(e, strategy.id, 'move')}
                                                        >
                                                            {/* Resize Handle Left */}
                                                            <div
                                                                className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize hover:bg-black/10 rounded-l-md active:bg-black/20 z-10"
                                                                onMouseDown={(e) => handleMouseDown(e, strategy.id, 'resize-start')}
                                                            />

                                                            <span className="text-[9px] font-bold truncate block w-full pointer-events-none">
                                                                {strategy.title}
                                                            </span>

                                                            {/* Resize Handle Right */}
                                                            <div
                                                                className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize hover:bg-black/10 rounded-r-md active:bg-black/20 z-10"
                                                                onMouseDown={(e) => handleMouseDown(e, strategy.id, 'resize-end')}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
