"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    FileText, ChevronDown, ChevronUp, Brain, Sparkles,
    Play, Pause, Volume2, List
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface CampaignManifestoProps {
    campaignId: string;
    planContent?: string | null;
}

interface TocItem {
    id: string;
    text: string;
    level: number;
}

export function CampaignManifesto({ campaignId, planContent }: CampaignManifestoProps) {
    const [strategicPlan, setStrategicPlan] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [toc, setToc] = useState<TocItem[]>([]);

    // Refs para controle de áudio
    const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
    const synthRef = useRef<SpeechSynthesis | null>(null);

    const supabase = createClient();

    // 1. Carregar Dados
    useEffect(() => {
        if (planContent !== undefined) {
            setStrategicPlan(planContent);
            setLoading(false);
            if (planContent) generateToc(planContent);
            return;
        }

        const fetchStrategicPlan = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from("campaigns")
                .select("ai_strategic_plan")
                .eq("id", campaignId)
                .single();

            if (!error && data?.ai_strategic_plan) {
                setStrategicPlan(data.ai_strategic_plan);
                generateToc(data.ai_strategic_plan);
            }
            setLoading(false);
        };

        fetchStrategicPlan();
    }, [campaignId, planContent]); // Removed supabase from dependencies to prevent infinite loop

    // 2. Gerar Table of Contents (TOC)
    const generateToc = (content: string) => {
        const lines = content.split('\n');
        const items: TocItem[] = [];

        lines.forEach((line, index) => {
            const match = line.match(/^(#{1,2})\s+(.+)/);
            if (match) {
                const level = match[1].length;
                const text = match[2];
                const id = `section-${index}`;
                items.push({ id, text, level });
            }
        });
        setToc(items);
    };

    // 3. Controle de Áudio (Speech API)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            synthRef.current = window.speechSynthesis;
        }

        // Carregar vozes (alguns navegadores carregam assincronamente)
        const loadVoices = () => {
            if (synthRef.current) {
                synthRef.current.getVoices();
            }
        };

        loadVoices();
        if (window.speechSynthesis && window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }

        return () => {
            if (synthRef.current) {
                synthRef.current.cancel();
            }
        };
    }, []);

    const cleanMarkdownForSpeech = (markdown: string) => {
        return markdown
            .replace(/[#*`_]/g, '') // Remove marcadores MD
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links: apenas texto
            .replace(/\n/g, '. '); // Quebras de linha viram pausas
    };

    const toggleAudio = (e: React.MouseEvent) => {
        e.stopPropagation();

        if (!strategicPlan || !synthRef.current) return;

        if (isPlaying) {
            synthRef.current.pause();
            setIsPlaying(false);
        } else {
            if (synthRef.current.paused && synthRef.current.speaking) {
                synthRef.current.resume();
                setIsPlaying(true);
            } else {
                // Nova Leitura
                synthRef.current.cancel(); // Limpa fila anterior

                const textToRead = cleanMarkdownForSpeech(strategicPlan);

                // IMPORTANT: Atribuir ao Ref para evitar Garbage Collection do browser (Chrome Bug)
                speechRef.current = new SpeechSynthesisUtterance(textToRead);

                speechRef.current.lang = 'pt-BR';
                speechRef.current.rate = 1.2; // Ritmo fluido
                speechRef.current.pitch = 1.0;

                // Tenta selecionar voz 'Google Português do Brasil' ou similar
                const voices = synthRef.current.getVoices();
                const ptVoice = voices.find(v => v.name.includes("Google") && v.lang.includes("pt-BR"))
                    || voices.find(v => v.lang.includes("pt-BR"))
                    || voices.find(v => v.lang.includes("pt"));

                if (ptVoice) {
                    speechRef.current.voice = ptVoice;
                }

                speechRef.current.onend = () => {
                    setIsPlaying(false);
                };

                speechRef.current.onerror = (event) => {
                    console.error("Erro no áudio:", event);
                    setIsPlaying(false);
                };

                synthRef.current.speak(speechRef.current);
                setIsPlaying(true);
            }
        }
    };

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // Component Customizado para Renderizar Headlines com ID
    const MarkdownComponents = {
        h1: ({ node, ...props }: any) => {
            const text = props.children[0]?.toString() || "";
            const id = toc.find(t => t.text === text)?.id;
            return <h1 id={id} className="scroll-mt-24" {...props} />
        },
        h2: ({ node, ...props }: any) => {
            const text = props.children[0]?.toString() || "";
            const id = toc.find(t => t.text === text)?.id;
            return <h2 id={id} className="scroll-mt-24" {...props} />
        }
    };

    if (loading) {
        return (
            <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
                <CardContent className="p-6 space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (!strategicPlan) {
        return (
            <Card className="border-2 border-dashed border-slate-200 bg-slate-50/50">
                <CardContent className="p-8 flex flex-col items-center text-center">
                    <Brain className="h-12 w-12 text-slate-300 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-600">Dossiê não encontrado</h3>
                    <p className="text-sm text-slate-500">Execute uma nova análise para gerar o dossiê estratégico.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-none shadow-xl bg-white overflow-hidden ring-1 ring-slate-200/50">
            {/* Header Interativo */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-6 flex items-center justify-between cursor-pointer bg-gradient-to-r from-purple-50 via-white to-purple-50 hover:bg-purple-50/80 transition-colors border-b border-purple-100"
            >
                <div className="flex items-center gap-5">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-200">
                            <FileText className="h-6 w-6" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> AI
                        </div>
                    </div>

                    <div className="text-left">
                        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                            Dossiê Estratégico
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-none font-normal">
                                Leitura: ~5 min
                            </Badge>
                        </h3>
                        <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                            Baseado em análise de dados profundos e inteligência artificial.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Button
                        size="sm"
                        variant={isPlaying ? "default" : "outline"}
                        className={`rounded-full shadow-sm gap-2 transition-all ${isPlaying ? "bg-purple-600 hover:bg-purple-700 border-none" : "hover:border-purple-300 hover:text-purple-700"}`}
                        onClick={toggleAudio}
                    >
                        {isPlaying ? (
                            <><Pause className="h-4 w-4" /> Pausar Leitura</>
                        ) : (
                            <><Play className="h-4 w-4" /> Ouvir Dossiê</>
                        )}
                    </Button>

                    <div className="w-px h-8 bg-slate-200 mx-2" />

                    {isOpen ? (
                        <ChevronUp className="h-6 w-6 text-slate-400" />
                    ) : (
                        <ChevronDown className="h-6 w-6 text-slate-400" />
                    )}
                </div>
            </div>

            {/* Conteúdo Expandido */}
            {isOpen && (
                <div className="bg-white max-h-[60vh] overflow-y-auto pr-2">
                    {/* Mini Sumário (TOC) */}
                    {toc.length > 0 && (
                        <div className="bg-slate-50/80 border-b border-slate-100 px-8 py-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                                <List className="h-3 w-3" /> Sumário Executivo
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {toc.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => scrollToSection(item.id)}
                                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${item.level === 1
                                            ? "bg-white border-slate-200 text-slate-700 hover:border-purple-300 hover:text-purple-700 font-medium shadow-sm"
                                            : "bg-slate-50/50 border-transparent text-slate-500 hover:bg-white hover:text-slate-700"
                                            }`}
                                    >
                                        {item.text.replace(/^#+\s/, '')}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Texto Formatado */}
                    <div className="p-8 md:p-12 max-w-5xl mx-auto">
                        <div className="prose prose-lg prose-slate max-w-none
                            prose-headings:font-bold prose-headings:tracking-tight
                            prose-h1:text-3xl prose-h1:text-purple-900 prose-h1:mb-6 prose-h1:border-b prose-h1:pb-4 prose-h1:border-purple-100
                            prose-h2:text-2xl prose-h2:text-slate-800 prose-h2:mt-10 prose-h2:mb-4
                            prose-p:text-slate-600 prose-p:leading-8
                            prose-blockquote:border-l-4 prose-blockquote:border-purple-500 prose-blockquote:bg-purple-50/50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:italic prose-blockquote:rounded-r-lg
                            prose-li:text-slate-600 prose-li:marker:text-purple-400
                            prose-strong:text-purple-900 prose-strong:font-bold"
                        >
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={MarkdownComponents}
                            >
                                {strategicPlan}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
}
