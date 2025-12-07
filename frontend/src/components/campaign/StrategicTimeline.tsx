import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Calendar, CheckCircle, Edit } from "lucide-react";

interface Strategy {
    id: string;
    title: string;
    description: string;
    pillar: string;
    phase: string;
    status: "suggested" | "approved";
}

interface StrategicTimelineProps {
    strategies: Strategy[];
    onStrategyClick: (strategy: Strategy) => void;
}

const MONTHS = [
    { name: "Junho", color: "bg-blue-50/50" },
    { name: "Julho", color: "bg-blue-50/50" },
    { name: "Agosto", color: "bg-amber-50/50" },
    { name: "Setembro", color: "bg-orange-50/50" },
    { name: "Outubro", color: "bg-red-50/50" }
];

// Configuração visual das Fases
const PHASE_STYLES: Record<string, { bg: string; border: string; text: string }> = {
    "Pré-Campanha": { bg: "bg-blue-200", border: "border-blue-400", text: "text-blue-900" },
    "1ª Fase": { bg: "bg-amber-200", border: "border-amber-400", text: "text-amber-900" },
    "2ª Fase": { bg: "bg-orange-200", border: "border-orange-400", text: "text-orange-900" },
    "Reta Final": { bg: "bg-red-200", border: "border-red-400", text: "text-red-900" },
    "Final": { bg: "bg-red-200", border: "border-red-400", text: "text-red-900" },
    // Fallback
    "default": { bg: "bg-slate-200", border: "border-slate-400", text: "text-slate-900" }
};

export function StrategicTimeline({ strategies, onStrategyClick }: StrategicTimelineProps) {
    if (!strategies || strategies.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground bg-slate-50/50">
                <div className="text-center">
                    <Calendar className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p>Nenhuma estratégia para exibir na Timeline.</p>
                </div>
            </div>
        );
    }

    // 1. Organizar e Ordenar Dados
    const uniquePillars = Array.from(new Set(strategies.map(s => s.pillar || "Geral"))).sort();

    // Mapeia ordem cronológica das fases para ordenação visual
    const phaseOrder: Record<string, number> = { "Pré-Campanha": 1, "1ª Fase": 2, "2ª Fase": 3, "Reta Final": 4, "Final": 4 };

    const groupedData = useMemo(() => {
        return uniquePillars.map(pillar => {
            const items = strategies
                .filter(s => (s.pillar || "Geral") === pillar)
                .sort((a, b) => {
                    // Ordenar por fase depois titulo
                    const orderA = phaseOrder[a.phase] || 0;
                    const orderB = phaseOrder[b.phase] || 0;
                    return orderA - orderB || a.title.localeCompare(b.title);
                });
            return { pillar, items };
        });
    }, [strategies]);

    // Função para determinar posição (start/span) baseada na fase
    // Usa lógica de 20 colunas (4 por mês)
    const getPosition = (phase: string, index: number) => {
        let startCol = 0;
        let span = 4; // Duração padrão

        switch (phase) {
            case "Pré-Campanha": // Jun/Jul (Cols 1-8)
                // Distribui entre col 2 e 6 para variar
                startCol = 2 + (index % 4);
                span = 3;
                break;
            case "1ª Fase": // Ago (Cols 9-12)
                startCol = 9 + (index % 2);
                span = 3;
                break;
            case "2ª Fase": // Set (Cols 13-16)
                startCol = 13 + (index % 2);
                span = 3;
                break;
            case "Reta Final": // Out (Cols 17-20)
            case "Final":
                startCol = 17 + (index % 2);
                span = 3;
                break;
            default:
                startCol = 2; // Default no começo
        }

        return { start: startCol, span };
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 relative overflow-hidden">
            {/* Header de Legenda */}
            <div className="flex items-center justify-between px-6 py-3 border-b bg-white z-20 shadow-sm shrink-0">
                <div className="flex items-center gap-2">
                    <div className="bg-indigo-100 p-1.5 rounded-md">
                        <Calendar className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-slate-800">Roadmap Tático</h2>
                        <p className="text-[10px] text-slate-500">Visualização Gantt do Plano de Governo</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <span className="flex items-center text-[10px] text-slate-500 font-medium"><div className="w-2 h-2 rounded-full bg-blue-300 mr-1.5"></div> Pré-Campanha</span>
                    <span className="flex items-center text-[10px] text-slate-500 font-medium"><div className="w-2 h-2 rounded-full bg-amber-300 mr-1.5"></div> 1ª Fase</span>
                    <span className="flex items-center text-[10px] text-slate-500 font-medium"><div className="w-2 h-2 rounded-full bg-orange-300 mr-1.5"></div> 2ª Fase</span>
                    <span className="flex items-center text-[10px] text-slate-500 font-medium"><div className="w-2 h-2 rounded-full bg-red-300 mr-1.5"></div> Reta Final</span>
                </div>
            </div>

            <ScrollArea className="flex-1 w-full bg-white relative">
                <div className="min-w-[1000px] p-6 relative">

                    {/* Background Grid & Months */}
                    <div className="absolute inset-0 pl-[200px] pt-[50px] pr-6 pointer-events-none">
                        <div className="grid grid-cols-5 h-full w-full border-l border-slate-200">
                            {MONTHS.map((month, i) => (
                                <div key={i} className={`h-full border-r border-slate-100 ${month.color}`}>
                                    {/* Linha vertical tracejada de "Hoje" no mês atual (Ex: Junho) */}
                                    {i === 0 && (
                                        <div className="h-full w-px bg-red-400 absolute left-[15%] top-0 z-10 opacity-30 dashed border-l border-red-300">
                                            <div className="bg-red-500 text-white text-[9px] px-1 py-0.5 rounded absolute -top-1 -left-4 font-bold tracking-tighter">HOJE</div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Timeline Header Row (Meses) */}
                    <div className="flex mb-6 pl-[200px] sticky top-0 bg-white/95 backdrop-blur z-10 border-b pb-2">
                        {MONTHS.map((month, i) => (
                            <div key={i} className="flex-1 text-center font-bold text-xs text-slate-400 uppercase tracking-widest py-1">
                                {month.name}
                            </div>
                        ))}
                    </div>

                    {/* Corpo do Gantt */}
                    <div className="space-y-8 relative z-0 pb-10">
                        {groupedData.map((group) => (
                            <div key={group.pillar} className="relative">
                                {/* Linha de Conexão Vertical do Grupo (Pilar) */}
                                <div className="absolute left-[190px] top-4 bottom-4 w-px bg-slate-200 -z-10" />

                                <div className="grid grid-cols-[200px_1fr] group/row">
                                    {/* Label do Pilar */}
                                    <div className="py-2 pr-6 flex items-start justify-end text-right relative">
                                        <div>
                                            <h3 className="font-bold text-slate-700 text-xs uppercase tracking-tight">{group.pillar}</h3>
                                            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{group.items.length} tasks</span>
                                        </div>
                                        {/* Bolinha conectora no pilar */}
                                        <div className="absolute right-[-4px] top-[14px] w-2 h-2 rounded-full bg-slate-300 border-2 border-white"></div>
                                    </div>

                                    {/* Área de Tarefas */}
                                    <div className="relative space-y-3 py-1">
                                        {/* Grid invisível para posicionamento (20 colunas = 5 meses * 4 semanas) */}
                                        <div className="absolute inset-0 grid grid-cols-20 pointer-events-none"></div>

                                        {group.items.map((strategy, idx) => {
                                            const pos = getPosition(strategy.phase, idx);
                                            // Fallback to default if phase name doesn't match exactly
                                            const styles = PHASE_STYLES[strategy.phase] || PHASE_STYLES.default;

                                            // Lógica visual: se não for o último, desenha uma linha conectando ao próximo (apenas decorativo)
                                            const isLast = idx === group.items.length - 1;

                                            return (
                                                <div
                                                    key={strategy.id}
                                                    className="relative grid grid-cols-20 items-center hover:z-20 group/task"
                                                >
                                                    {/* Conector Curvo (Fake Dependency Line) */}
                                                    {!isLast && (
                                                        <div
                                                            className="absolute border-l-2 border-b-2 border-slate-200/60 rounded-bl-xl -z-10 pointer-events-none"
                                                            style={{
                                                                top: '14px', // Metade da altura da barra (h-7 = 28px)
                                                                left: `${(pos.start * 5) + 2}%`, // Começa no início desta barra
                                                                width: '12px',
                                                                height: '36px', // Conecta até a próxima linha (gap + height)
                                                            }}
                                                        />
                                                    )}

                                                    <div
                                                        className="col-span-full flex items-center group/bar"
                                                        style={{
                                                            gridColumnStart: pos.start,
                                                            gridColumnEnd: `span ${pos.span}`
                                                        }}
                                                    >
                                                        <TooltipProvider delayDuration={200}>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <div
                                                                        onClick={() => onStrategyClick(strategy)}
                                                                        className={`
                                                                            h-7 rounded-sm border shadow-sm cursor-pointer w-full
                                                                            flex items-center px-2 relative transition-all
                                                                            ${styles.bg} ${styles.border} ${styles.text}
                                                                            hover:shadow-md hover:brightness-95 active:scale-95
                                                                            ${strategy.status === 'approved' ? 'ring-2 ring-green-500 ring-offset-1 z-10' : ''}
                                                                        `}
                                                                    >
                                                                        {strategy.status === 'approved' && (
                                                                            <div className="absolute -left-2 bg-white rounded-full p-0.5 border border-green-500 shadow-sm z-20">
                                                                                <CheckCircle className="h-3 w-3 text-green-600" />
                                                                            </div>
                                                                        )}

                                                                        <span className="text-[10px] font-bold truncate w-full select-none leading-none">
                                                                            {strategy.title}
                                                                        </span>
                                                                    </div>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="right" align="start" className="max-w-xs p-4 bg-slate-900 border-slate-800 text-white shadow-xl z-50">
                                                                    <div className="space-y-1">
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                            <Badge variant="outline" className="text-white border-white/20 text-[10px]">{strategy.phase}</Badge>
                                                                            {strategy.status === 'approved' && <Badge className="bg-green-600 h-5 text-[10px] hover:bg-green-700">Aprovado</Badge>}
                                                                        </div>
                                                                        <h4 className="font-bold text-sm leading-tight text-slate-100">{strategy.title}</h4>
                                                                        <p className="text-xs text-slate-300 leading-relaxed max-h-[150px] overflow-y-auto mt-2 border-l-2 border-white/20 pl-2">
                                                                            {strategy.description}
                                                                        </p>
                                                                        <div className="pt-3 mt-2 border-t border-white/10 text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                                                                            <Edit className="h-3 w-3" /> Clique para Abrir Detalhes
                                                                        </div>
                                                                    </div>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </div>
    );
}
