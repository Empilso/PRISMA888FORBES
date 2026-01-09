
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowSquareOut, Calendar, Newspaper, Quotes, CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/**
 * Interface for a single Media Result item
 * MATCHES Backend JSON Structure:
 * {
 *    "date": "YYYY-MM-DD",
 *    "source": "G1",
 *    "title": "Manchete",
 *    "url": "...",
 *    "summary": "...",
 *    "sentiment": "neutral"
 * }
 */
export interface MediaItem {
    title: string;
    url: string;
    source: string;
    date?: string;
    summary?: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
    relevance?: number;
}

interface MediaResultsProps {
    results: {
        items_found: number;
        media_sources?: string[];
        details: MediaItem[];
    };
    isLoading?: boolean;
}

export const MediaResults: React.FC<MediaResultsProps> = ({ results, isLoading }) => {
    if (!results || !results.details || results.details.length === 0) {
        return (
            <div className="p-8 text-center bg-slate-50 rounded-lg border border-slate-200 border-dashed">
                <Newspaper className="w-12 h-12 text-slate-300 mx-auto mb-3" weight="duotone" />
                <h3 className="text-sm font-semibold text-slate-600">Nenhum resultado encontrado</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-[250px] mx-auto">
                    Tente ajustar os termos de busca, remover filtros de domínio ou aumentar a profundidade.
                </p>
            </div>
        );
    }

    return (
        <Card className="border-slate-200 shadow-sm animate-in fade-in duration-500">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-500" weight="fill" />
                        <CardTitle className="text-sm font-semibold text-slate-700">
                            Resultados da Varredura
                        </CardTitle>
                        <Badge variant="secondary" className="bg-white border-slate-200 text-slate-600 h-5 text-[10px]">
                            {results.items_found} enchontrados
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[400px] w-full">
                    <div className="divide-y divide-slate-100">
                        {results.details.map((item, index) => (
                            <div key={index} className="p-4 hover:bg-slate-50 transition-colors group">
                                <div className="flex flex-col gap-2">
                                    {/* Header: Source & Date */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] font-medium rounded-sm px-1.5 h-5">
                                                {item.source || "Web"}
                                            </Badge>
                                            {item.date && (
                                                <div className="flex items-center text-[10px] text-slate-400">
                                                    <Calendar className="w-3 h-3 mr-1" />
                                                    {item.date}
                                                </div>
                                            )}
                                        </div>
                                        <a
                                            href={item.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-violet-600"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    </div>

                                    {/* Title */}
                                    <h4 className="text-sm font-medium text-slate-800 leading-snug group-hover:text-violet-700 transition-colors">
                                        <a href={item.url} target="_blank" rel="noreferrer">
                                            {item.title}
                                        </a>
                                    </h4>

                                    {/* Quote / Summary */}
                                    {item.summary && (
                                        <div className="relative pl-3 mt-1 border-l-2 border-slate-200">
                                            <p className="text-xs text-slate-500 italic leading-relaxed">
                                                "{item.summary}"
                                            </p>
                                        </div>
                                    )}

                                    {/* Metadata Footer */}
                                    <div className="flex items-center gap-2 mt-1">
                                        {item.sentiment && (
                                            <span className={cn(
                                                "text-[10px] font-medium px-1.5 py-0.5 rounded",
                                                item.sentiment === 'positive' && "bg-emerald-50 text-emerald-600",
                                                item.sentiment === 'negative' && "bg-rose-50 text-rose-600",
                                                item.sentiment === 'neutral' && "bg-slate-100 text-slate-500"
                                            )}>
                                                {item.sentiment === 'positive' && "Positivo"}
                                                {item.sentiment === 'negative' && "Negativo"}
                                                {item.sentiment === 'neutral' && "Neutro"}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};
