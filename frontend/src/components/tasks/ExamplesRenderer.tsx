
import React from "react";
import { Lightbulb, Copy, ArrowDownToLine } from "lucide-react";

interface ExamplesRendererProps {
    examples?: string[];
    mode?: "card" | "full" | "workbench";
    maxPreview?: number;
    onViewAll?: () => void;
    onInsert?: (text: string) => void;
}

export function ExamplesRenderer({
    examples,
    mode = "card",
    maxPreview = 2,
    onViewAll,
    onInsert
}: ExamplesRendererProps) {
    const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

    if (!examples || examples.length === 0) return null;

    const handleCopy = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    // --- MODE: CARD (Preview) ---
    if (mode === "card") {
        const visibleExamples = examples.slice(0, maxPreview);
        const remainingCount = examples.length - maxPreview;

        return (
            <div className="mt-3 pt-3 border-t border-slate-100 mb-2">
                <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide flex items-center gap-2">
                    <div className="bg-yellow-100 p-1 rounded-md">
                        <Lightbulb className="w-3 h-3 text-yellow-600" />
                    </div>
                    Exemplos:
                </div>
                {visibleExamples.map((ex, i) => (
                    <div key={i} className="text-xs text-slate-600 flex items-start gap-1.5 mb-1.5">
                        <span className="text-primary font-bold">•</span>
                        <span className="line-clamp-2 leading-snug">{ex}</span>
                    </div>
                ))}
                {remainingCount > 0 && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onViewAll?.();
                        }}
                        className="text-xs text-primary font-medium mt-1 flex items-center hover:underline cursor-pointer"
                    >
                        + Ver todos os {examples.length} exemplos...
                    </button>
                )}
            </div>
        );
    }

    // --- MODE: WORKBENCH (Detailed, Cards, Interactive) ---
    if (mode === "workbench") {
        return (
            <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <div className="bg-yellow-100 p-1 rounded-md">
                        <Lightbulb className="w-3.5 h-3.5 text-yellow-600" />
                    </div>
                    Exemplos práticos (sugestões da IA)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {examples.map((ex, i) => (
                        <div key={i} className="group bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl p-3 shadow-sm transition-all relative">
                            <div className="flex justify-between items-start gap-2 mb-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-100">
                                    Exemplo {i + 1}
                                </span>
                                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleCopy(ex, i)}
                                        className="p-1 hover:bg-white rounded text-slate-400 hover:text-slate-600 transition-colors"
                                        title="Copiar para área de transferência"
                                    >
                                        {copiedIndex === i ? (
                                            <span className="text-xs font-bold text-green-600">Copiado!</span>
                                        ) : (
                                            <Copy className="w-3.5 h-3.5" />
                                        )}
                                    </button>
                                    {onInsert && (
                                        <button
                                            onClick={() => onInsert(ex)}
                                            className="p-1 hover:bg-white rounded text-blue-400 hover:text-blue-600 transition-colors"
                                            title="Inserir na descrição"
                                        >
                                            <ArrowDownToLine className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed line-clamp-4 relative" title={ex}>
                                {ex}
                            </p>
                            <div className="hidden sm:block absolute bottom-1 right-2 text-[10px] text-slate-300 select-none pointer-events-none">
                                Sugestão IA
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // --- MODE: FULL (Legacy Modal/Details) ---
    return (
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
            <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <div className="bg-yellow-100 p-1.5 rounded-full">
                    <Lightbulb className="w-4 h-4 text-yellow-600" />
                </div>
                Exemplos Práticos
            </h4>
            <div className="space-y-3">
                {examples.map((ex, i) => (
                    <div key={i} className="flex items-start gap-3">
                        <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 mt-0.5">
                            {i + 1}
                        </span>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            {ex}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
