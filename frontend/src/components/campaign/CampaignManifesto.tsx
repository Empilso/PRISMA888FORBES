"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, ChevronDown, ChevronUp, Brain, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface CampaignManifestoProps {
    campaignId: string;
    planContent?: string | null; // Novo prop para receber o conteúdo direto da versão
}

export function CampaignManifesto({ campaignId, planContent }: CampaignManifestoProps) {
    const [strategicPlan, setStrategicPlan] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        // Se o conteúdo foi passado via prop (ex: selecionou uma versão), usa ele
        if (planContent !== undefined) {
            setStrategicPlan(planContent);
            setLoading(false);
            return;
        }

        // Fallback: Busca o plano "atual" da campanha (legado)
        const fetchStrategicPlan = async () => {
            setLoading(true);
            console.log('📄 [MANIFESTO] Fetching strategic plan for campaign:', campaignId);

            const { data, error } = await supabase
                .from("campaigns")
                .select("ai_strategic_plan")
                .eq("id", campaignId)
                .single();

            if (error) {
                console.error('❌ [MANIFESTO] Error fetching:', error);
            } else {
                console.log('✅ [MANIFESTO] Plan loaded:', data?.ai_strategic_plan ? 'YES' : 'NO');
                setStrategicPlan(data?.ai_strategic_plan || null);
            }

            setLoading(false);
        };

        fetchStrategicPlan();
    }, [campaignId, planContent, supabase]);

    if (loading) {
        return (
            <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
                <CardContent className="p-6">
                    <div className="space-y-3">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Estado vazio - aguardando geração
    if (!strategicPlan) {
        return (
            <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
                <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                            <Brain className="h-12 w-12 text-gray-400 animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-700">
                                📊 Dossiê Estratégico
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Aguardando geração pela Genesis AI... Execute a crew para gerar o plano estratégico completo.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Com conteúdo - Accordion
    return (
        <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 via-indigo-50 to-purple-50 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-0">
                {/* Header - Sempre visível */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full p-6 flex items-center justify-between hover:bg-purple-100/50 transition-colors rounded-t-lg"
                >
                    <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                            <div className="relative">
                                <FileText className="h-10 w-10 text-purple-600" />
                                <Sparkles className="h-4 w-4 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
                            </div>
                        </div>
                        <div className="text-left">
                            <h3 className="text-xl font-bold text-purple-900 flex items-center gap-2">
                                📊 Dossiê Estratégico da Campanha
                            </h3>
                            <p className="text-sm text-purple-700 mt-1">
                                {isOpen
                                    ? "Análise completa gerada pela Genesis AI"
                                    : "Clique para ver a análise completa, narrativas e pilares estratégicos"
                                }
                            </p>
                        </div>
                    </div>
                    <div className="flex-shrink-0">
                        {isOpen ? (
                            <ChevronUp className="h-6 w-6 text-purple-600" />
                        ) : (
                            <ChevronDown className="h-6 w-6 text-purple-600" />
                        )}
                    </div>
                </button>

                {/* Conteúdo - Accordion */}
                {isOpen && (
                    <div className="border-t-2 border-purple-200 bg-white p-8 rounded-b-lg">
                        <div className="prose prose-slate prose-headings:text-purple-900 prose-h1:text-3xl prose-h1:font-bold prose-h1:mb-4 prose-h2:text-2xl prose-h2:font-semibold prose-h2:mt-8 prose-h2:mb-3 prose-h2:text-indigo-800 prose-h3:text-xl prose-h3:font-medium prose-h3:text-indigo-700 prose-p:text-gray-700 prose-p:leading-relaxed prose-li:text-gray-700 prose-strong:text-purple-800 prose-a:text-indigo-600 max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {strategicPlan}
                            </ReactMarkdown>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
