"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Instagram, Sparkles, Loader2, Activity, Target, Megaphone, CheckSquare } from "lucide-react";
import { SocialMention } from "./SocialRadarLayer";

import TypingText from "@/components/ui/typing-text";

export interface GeoSocialOutput {
    diagnostico: string;
    estrategia_tato: string;
    conteudo_sugerido: string;
    tarefa_delega: string;
}

interface SocialMentionSheetProps {
    mention: SocialMention | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onGenerateStrategy: () => void;
    onDelegateTask: () => void;
    isGenerating: boolean;
    isDelegating: boolean;
    fullStrategy: GeoSocialOutput | null | any;
}

export function SocialMentionSheet({
    mention,
    isOpen,
    onOpenChange,
    onGenerateStrategy,
    onDelegateTask,
    isGenerating,
    isDelegating,
    fullStrategy
}: SocialMentionSheetProps) {
    if (!mention) return null;

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-md overflow-y-auto">
                <SheetHeader className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${mention.platform === 'instagram' ? 'bg-pink-100 text-pink-600' : 'bg-slate-100 text-slate-900'}`}>
                            {mention.platform === 'instagram' ? <Instagram className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
                        </div>
                        <div>
                            <SheetTitle className="text-xl font-bold">Incluso Social</SheetTitle>
                            <SheetDescription className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                                @{mention.rival_handle.replace('@', '')} • {mention.platform}
                            </SheetDescription>
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 italic text-slate-700 relative">
                        <span className="absolute -top-2 -left-1 text-4xl text-slate-200">"</span>
                        {mention.text}
                    </div>
                </SheetHeader>

                <div className="mt-8 space-y-6">
                    <div className="space-y-2">
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-purple-600" /> Análise de Sentimento (IA)
                        </h4>
                        <div className="flex gap-2">
                            <Badge variant={mention.sentiment_label === 'Positivo' ? 'default' : mention.sentiment_label === 'Negativo' ? 'destructive' : 'secondary'} className="rounded-md">
                                {mention.sentiment_label === 'Positivo' ? '😊 Positivo' : mention.sentiment_label === 'Negativo' ? '😡 Negativo' : '😐 Neutro'}
                            </Badge>
                            <Badge variant="outline" className="rounded-md">📍 {mention.inferred_neighborhood || 'Geral'}</Badge>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-slate-900">Micro-Estratégia Tática</h4>
                            {!fullStrategy && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 gap-2 bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                                    onClick={onGenerateStrategy}
                                    disabled={isGenerating}
                                >
                                    {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                    Gerar com IA
                                </Button>
                            )}
                        </div>

                        {fullStrategy && fullStrategy.diagnostico && (
                            <div className="space-y-4 animate-in fade-in duration-500 delay-150">
                                {/* Diagnóstico */}
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-3 opacity-5"><Activity className="w-16 h-16" /></div>
                                    <h5 className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-2">
                                        <Activity className="h-4 w-4 text-blue-500" /> Diagnóstico da IA
                                    </h5>
                                    <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                        <TypingText text={fullStrategy.diagnostico} speed={10} />
                                    </p>
                                </div>

                                {/* Estratégia Tática */}
                                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-xl border border-purple-100 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-3 opacity-5"><Target className="w-16 h-16" /></div>
                                    <h5 className="flex items-center gap-2 text-sm font-bold text-purple-900 mb-2">
                                        <Target className="h-4 w-4 text-purple-600" /> Manobra Estratégica
                                    </h5>
                                    <p className="text-sm text-purple-800 leading-relaxed font-medium">
                                        <TypingText text={fullStrategy.estrategia_tato} speed={10} />
                                    </p>
                                </div>

                                {/* Conteúdo Sugerido */}
                                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200/60 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-3 opacity-5"><Megaphone className="w-16 h-16" /></div>
                                    <h5 className="flex items-center gap-2 text-sm font-bold text-amber-900 mb-2">
                                        <Megaphone className="h-4 w-4 text-amber-600" /> Copy & Roteiro
                                    </h5>
                                    <p className="text-sm text-amber-800 leading-relaxed italic">
                                        <TypingText text={fullStrategy.conteudo_sugerido} speed={10} />
                                    </p>
                                </div>

                                {/* Kanban Delegation */}
                                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200/60 shadow-sm relative overflow-hidden flex items-start gap-3">
                                    <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600 mt-1">
                                        <CheckSquare className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h5 className="text-sm font-bold text-emerald-900 mb-1">
                                            Ação Delegada
                                        </h5>
                                        <p className="text-sm text-emerald-800 leading-relaxed font-medium">
                                            <TypingText text={fullStrategy.tarefa_delega} speed={15} />
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {fullStrategy && (
                            <div className="pt-6 border-t border-slate-100 mt-6">
                                <Button
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-11 rounded-xl shadow-lg shadow-emerald-200/50"
                                    onClick={onDelegateTask}
                                    disabled={isDelegating}
                                >
                                    {isDelegating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckSquare className="h-4 w-4" />}
                                    Delegar para Equipe (Kanban)
                                </Button>
                                <p className="text-[10px] text-center text-slate-400 mt-2 font-medium">
                                    Isso criará uma tarefa pendente para sua equipe de rua.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <SheetFooter className="mt-10">
                    <Button variant="outline" className="w-full h-11 rounded-xl" onClick={() => onOpenChange(false)}>Fechar Insights</Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
