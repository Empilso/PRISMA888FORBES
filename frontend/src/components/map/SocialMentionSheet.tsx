"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Instagram, Sparkles, Loader2 } from "lucide-react";
import { SocialMention } from "./SocialRadarLayer";

import TypingText from "@/components/ui/typing-text";

interface SocialMentionSheetProps {
    mention: SocialMention | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onGenerateStrategy: () => void;
    isGenerating: boolean;
    fullStrategy: string;
}

export function SocialMentionSheet({
    mention,
    isOpen,
    onOpenChange,
    onGenerateStrategy,
    isGenerating,
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

                        {fullStrategy && (
                            <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-4 rounded-2xl border border-purple-100/50 animate-in fade-in duration-500">
                                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
                                    <TypingText text={fullStrategy} speed={10} />
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <SheetFooter className="mt-10">
                    <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>Fechar Insights</Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
