"use client";

import React, { useEffect, useState } from "react";
import { fetchPromises, fetchRadarSummary, triggerRadarRefresh, PromiseData, RadarSummary } from "@/lib/api/radarPromises";
import { AuditDashboard } from "@/components/radar/AuditDashboard";
import { VerdictCard } from "@/components/radar/VerdictCard";
import { AuditPaywall } from "@/components/radar/AuditPaywall";
import { AuditWizard } from "@/components/radar/wizard/AuditWizard"; // IMPORT WIZARD
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, Search, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function RadarAuditPage() {
    const params = useParams();
    const searchParams = useSearchParams();

    // IDs from params
    const campaignId = "045a77c6-38b2-4641-a963-7896c9f2179b";
    const politicoId = params.id as string;

    // SaaS State
    const [hasAccess, setHasAccess] = useState(false);

    // Wizard Control
    const [showWizard, setShowWizard] = useState(false); // Default to Dashboard if data exists

    const [promises, setPromises] = useState<PromiseData[]>([]);
    const [summary, setSummary] = useState<RadarSummary>({
        cumprida: 0, parcial: 0, nao_iniciada: 0, desviada: 0, score_medio: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [totalComputedValue, setTotalComputedValue] = useState(0);

    const loadData = async () => {
        setIsLoading(true);
        try {
            console.log("Fetching promises for:", campaignId, politicoId);
            const [dataPromises, dataSummary] = await Promise.all([
                fetchPromises(campaignId, politicoId, { limit: 100 }),
                fetchRadarSummary(campaignId, politicoId)
            ]);

            console.log("Promises fetched:", dataPromises.length);
            setPromises(dataPromises);
            setSummary(dataSummary);

            // Compute total value
            let total = 0;
            dataPromises.forEach(p => {
                if (p.fontes) {
                    p.fontes.forEach(f => {
                        if (f.vl_despesa) total += f.vl_despesa;
                    });
                }
            });
            setTotalComputedValue(total);

            // Access Logic: simpler for demo
            // If data loaded, we presume access or public view

        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefresh = async () => {
        // Instead of background refresh, show the Wizard
        setShowWizard(true);
    };

    const handleWizardComplete = () => {
        setShowWizard(false);
        loadData(); // Reload data to show results
    };

    useEffect(() => {
        if (hasAccess) {
            loadData();
        } else {
            setIsLoading(false);
        }
    }, [politicoId, hasAccess]);

    const handleUnlock = () => {
        setHasAccess(true);
        // On first unlock, maybe show wizard? 
        // For now, let's go to dashboard and let user click audit
        loadData();
    };

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20">
            {/* TOP HEADER */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" asChild className="hover:bg-slate-100 -ml-2">
                            <Link href="/admin/radar">
                                <ArrowLeft className="w-5 h-5 text-slate-500" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <Search className="w-5 h-5 text-indigo-600" />
                                Auditoria Federal 3D
                            </h1>
                            <p className="text-xs text-slate-500">
                                Analisando Gestão Votorantim (Weber Manga)
                            </p>
                        </div>
                    </div>
                    {hasAccess && (
                        <div className="flex gap-2">
                            {showWizard && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowWizard(false)}
                                    className="text-slate-500"
                                >
                                    Cancelar
                                </Button>
                            )}
                            {!showWizard && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleRefresh}
                                    className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Executar Nova Auditoria (Wizard)
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <main className="max-w-6xl mx-auto px-6 py-8">

                {!hasAccess ? (
                    // STATE A: PAYWALL
                    <AuditPaywall onUnlock={handleUnlock} />
                ) : showWizard ? (
                    // STATE B: WIZARD MODE
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <AuditWizard
                            campaignId={campaignId}
                            politicoId={politicoId}
                            onComplete={handleWizardComplete}
                        />
                    </div>
                ) : (
                    // STATE C: DASHBOARD RESULTS
                    <>
                        {isLoading ? (
                            <div className="space-y-8 animate-pulse">
                                <div className="grid grid-cols-3 gap-4">
                                    <Skeleton className="h-32 rounded-xl bg-slate-200" />
                                    <Skeleton className="h-32 rounded-xl bg-slate-200" />
                                    <Skeleton className="h-32 rounded-xl bg-slate-200" />
                                </div>
                                <div className="space-y-4">
                                    <Skeleton className="h-64 rounded-xl bg-slate-200" />
                                </div>
                            </div>
                        ) : (
                            <>
                                <AuditDashboard summary={summary} totalComputedValue={totalComputedValue} />

                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-bold text-slate-800">
                                        Autos do Processo ({promises.length})
                                    </h2>
                                    <div className="text-sm text-slate-500 bg-white px-3 py-1 rounded border border-slate-200 shadow-sm">
                                        Ordenar por: <span className="font-medium text-indigo-600">Relevância Fiscal</span>
                                    </div>
                                </div>

                                {promises.length === 0 ? (
                                    <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
                                        <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                        <h3 className="text-lg font-bold text-slate-700">Nenhuma promessa auditada</h3>
                                        <p className="text-slate-500 mb-6">Clique em "Executar Nova Auditoria" para iniciar o processo.</p>
                                        <Button onClick={() => setShowWizard(true)}>
                                            Iniciar Auditoria
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-6">
                                        {promises
                                            .sort((a, b) => {
                                                const valA = a.fontes?.reduce((sum, f) => sum + (f.vl_despesa || 0), 0) || 0;
                                                const valB = b.fontes?.reduce((sum, f) => sum + (f.vl_despesa || 0), 0) || 0;
                                                if (valA !== valB) return valB - valA;
                                                return 0;
                                            })
                                            .map((promise) => (
                                                <VerdictCard key={promise.id} promise={promise} />
                                            ))}
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
