"use client";

import { Button } from "@/components/ui/button";
import { Layers, StickyNote, Radar } from "lucide-react";

interface MapNavigationToolsProps {
    showControls: boolean;
    setShowControls: (val: boolean) => void;
    isNoteMode: boolean;
    setIsNoteMode: (val: boolean) => void;
    showSocialRadar: boolean;
    onToggleSocialRadar: () => void;
    loadingSocial: boolean;
}

export function MapNavigationTools({
    showControls,
    setShowControls,
    isNoteMode,
    setIsNoteMode,
    showSocialRadar,
    onToggleSocialRadar,
    loadingSocial
}: MapNavigationToolsProps) {
    return (
        <div className="absolute top-1/2 -translate-y-1/2 left-6 z-50 flex flex-col gap-2 p-2 bg-white/90 backdrop-blur-md dark:bg-slate-950/90 rounded-2xl shadow-xl border border-slate-200/50">
            <div className="flex flex-col gap-3">
                {/* Layer & Settings Group */}
                <div className="flex flex-col gap-2 pb-3 border-b border-slate-200/50">
                    <Button
                        variant={showControls ? "secondary" : "ghost"}
                        size="icon"
                        className={`h-10 w-10 rounded-xl transition-all ${showControls ? "bg-slate-200" : "hover:bg-slate-100"}`}
                        onClick={() => setShowControls(!showControls)}
                        title="Camadas e Configurações do Mapa"
                    >
                        <Layers className={`h-5 w-5 ${showControls ? "text-slate-900" : "text-slate-600"}`} />
                    </Button>
                </div>

                {/* Action Tools Group */}
                <div className="flex flex-col gap-2 pb-3 border-b border-slate-200/50">
                    <Button
                        variant={isNoteMode ? "default" : "ghost"}
                        size="icon"
                        className={`h-10 w-10 rounded-xl transition-all ${isNoteMode ? "bg-amber-500 text-white shadow-md shadow-amber-500/20" : "hover:bg-slate-100 text-slate-600"}`}
                        onClick={() => setIsNoteMode(!isNoteMode)}
                        title="Adicionar Nota / Alerta"
                    >
                        <StickyNote className="h-5 w-5" />
                    </Button>
                </div>

                {/* Intelligence Group */}
                <div className="flex flex-col gap-2">
                    <Button
                        variant={showSocialRadar ? "default" : "ghost"}
                        size="icon"
                        className={`h-10 w-10 rounded-xl transition-all ${showSocialRadar ? "bg-gradient-to-br from-cyan-500 to-purple-500 text-white shadow-md shadow-purple-500/20" : "hover:bg-slate-100 text-slate-600"}`}
                        onClick={onToggleSocialRadar}
                        disabled={loadingSocial}
                        title="Radar Social (Monitoramento Global)"
                    >
                        <Radar className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
