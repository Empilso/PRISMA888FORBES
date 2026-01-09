"use client";

import React, { use, useEffect, useState } from "react";
import { RadarPremium } from "@/components/campaign/RadarPremium";
import { Button } from "@/components/ui/button";
import { CaretLeft, Spinner } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RadarDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: politicianId } = use(params);
    const [campaignId, setCampaignId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    useEffect(() => {
        const fetchContext = async () => {
            try {
                // 1. We need to find the campaign for this politician.
                // Assuming we can fetch the politician and get their campaign_id directly.
                // Or verify if they have a 'mandate'.
                // For now, let's try to fetch politician details.

                // HACK: In this MVP, we might treat the politician_id as the SLUG or ID.
                // Let's assume we can query politicians endpoint.

                // Try searching for the politician to resolve campaign
                // We'll search by ID.
                const res = await fetch(`${API_URL}/api/politicians/${politicianId}`);

                if (res.ok) {
                    const data = await res.json();
                    if (data.campaign_id) {
                        setCampaignId(data.campaign_id);
                    } else {
                        // Fallback: If no campaign_id directly on politician (legacy?), try mandates?
                        setError("Este político não está associado a uma campanha ativa.");
                    }
                } else {
                    // Maybe it's a slug "candidate"?
                    if (politicianId === 'candidate') {
                        // Fallback for "candidate" slug used in mocks
                        // We need a valid UUID for the campaign. Let's assume there's a default one or we can fetch list of campaigns.
                        // But for now, let's fail gracefully if API fails.
                        setError("Não foi possível carregar os dados do político.");
                    } else {
                        setError("Político não encontrado.");
                    }
                }
            } catch (err) {
                console.error(err);
                setError("Erro de conexão ao buscar dados.");
            } finally {
                setIsLoading(false);
            }
        };

        if (politicianId) {
            fetchContext();
        }
    }, [politicianId]);

    if (isLoading) {
        return (
            <div className="h-[50vh] flex flex-col items-center justify-center gap-4">
                <Spinner className="h-8 w-8 animate-spin text-violet-600" />
                <p className="text-slate-500 font-medium">Carregando contexto do Radar...</p>
            </div>
        );
    }

    if (error || !campaignId) {
        return (
            <div className="p-8 max-w-2xl mx-auto text-center space-y-6">
                <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                    <h2 className="text-lg font-bold text-red-800 mb-2">Erro de Acesso</h2>
                    <p className="text-red-600">{error || "Campanha não identificada."}</p>
                </div>
                <Button variant="outline" asChild>
                    <Link href="/admin/radar">
                        <CaretLeft className="mr-2 h-4 w-4" />
                        Voltar para Lista
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
            {/* Breadcrumb / Back Navigation */}
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                <Link href="/admin/radar" className="hover:text-violet-600 hover:underline flex items-center transition-colors">
                    <CaretLeft className="mr-1 h-3 w-3" />
                    Radar
                </Link>
                <span>/</span>
                <span className="font-medium text-slate-900">Detalhamento</span>
            </div>

            {/* Render with initialPoliticianId to allow auto-selection inside RadarPremium */}
            {/* Note: We need to update RadarPremium to verify if it accepts initialPoliticoId or if we need to modify it */}
            <RadarPremium campaignId={campaignId} initialPoliticianId={politicianId} />
        </div>
    );
}
