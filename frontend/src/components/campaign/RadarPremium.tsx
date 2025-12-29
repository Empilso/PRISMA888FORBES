"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Crosshair,
    CheckCircle,
    XCircle,
    ArrowsClockwise,
    FileText,
    Bank,
    Newspaper,
    Buildings,
    UserCircle,
    IdentificationBadge,
    Play,
    CaretLeft,
    ListBullets,
    Shield,
    Trash
} from "@phosphor-icons/react";
import { PromisesRadar } from "./PromisesRadar";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";

// ============ TYPES ============
interface City {
    id: string;
    name: string;
    state: string;
}

interface Mandate {
    id: string;
    politician_id: string;
    office_id: string;
    city_id: string;
    politician_name: string;
    politician_partido: string | null;
    office_name: string;
    is_active: boolean;
}

interface PhaseExecution {
    id: string;
    phase: string;
    status: "running" | "ok" | "error";
    started_at: string;
    finished_at: string | null;
    summary: any;
    error_message: string | null;
}

interface PhaseStatus {
    phase1: PhaseExecution | null;
    phase2: PhaseExecution | null;
    phase3: PhaseExecution | null;
    verify: PhaseExecution | null;
}

// ============ COMPONENT ============
interface RadarPremiumProps {
    campaignId: string;
}

export function RadarPremium({ campaignId }: RadarPremiumProps) {
    // View State
    const [view, setView] = useState<"grid" | "wizard" | "list">("grid");

    // Data State
    const [cities, setCities] = useState<City[]>([]);
    const [mandates, setMandates] = useState<Mandate[]>([]);
    const [selectedCity, setSelectedCity] = useState<string>("");
    const [selectedMandate, setSelectedMandate] = useState<string>("");

    // Wizard State
    const [phaseStatus, setPhaseStatus] = useState<PhaseStatus>({
        phase1: null, phase2: null, phase3: null, verify: null
    });
    const [isLoading, setIsLoading] = useState({
        phase1: false,
        phase2: false,
        phase3: false
    });
    const [statusMessage, setStatusMessage] = useState("");

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    // --- Data Fetching ---

    // 1. Fetch Cities
    useEffect(() => {
        const fetchCities = async () => {
            try {
                const res = await fetch(`${API_URL}/api/cities?limit=100`);
                if (res.ok) {
                    const data = await res.json();
                    setCities(data);
                    // Standardize: If Votorantim exists, pre-select it
                    const voto = data.find((c: City) => c.name.includes("Votorantim"));
                    if (voto) setSelectedCity(voto.id);
                    else if (data.length > 0) setSelectedCity(data[0].id);
                }
            } catch (error) {
                console.error("Failed to fetch cities:", error);
            }
        };
        fetchCities();
    }, []);

    // 2. Fetch Mandates (Grid)
    useEffect(() => {
        const fetchMandates = async () => {
            if (!selectedCity) return;
            try {
                // Fetch ALL mandates for the city (no office filter)
                const res = await fetch(`${API_URL}/api/mandates?city_id=${selectedCity}&is_active=true`);
                if (res.ok) {
                    const data = await res.json();
                    setMandates(data);
                }
            } catch (error) {
                console.error("Failed to fetch mandates:", error);
            }
        };
        fetchMandates();
    }, [selectedCity]);

    // 3. Fetch Status (Wizard)
    useEffect(() => {
        const fetchPhaseStatus = async () => {
            if (!selectedMandate) return;
            try {
                const res = await fetch(`${API_URL}/api/mandates/${selectedMandate}/phase-status`);
                if (res.ok) {
                    const data = await res.json();
                    setPhaseStatus(data);
                }
            } catch (error) {
                console.error("Failed to fetch phase status:", error);
            }
        };
        fetchPhaseStatus();
    }, [selectedMandate]);


    // --- Actions ---

    const handleDeleteMandate = async (mandateId: string, name: string, event: React.MouseEvent) => {
        event.stopPropagation(); // Prevent card click
        if (!confirm(`Tem certeza que deseja excluir o político "${name}" do Radar? Essa ação é irreversível.`)) {
            return;
        }

        try {
            // Mandate usually maps to politician Delete in backend if 1:1, or we need a Mandate delete endpoint
            // BUT user said "delete politician". Radar lists MANDATES.
            // Mandate has politician_id. We should delete the POLITICIAN to be consistent with Admin.
            // Need to fetch mandate details to get politician_id? 
            // The mandate objects in 'mandates' state likely have politician_id.

            const mandate = mandates.find(m => m.id === mandateId);
            if (!mandate) return;

            const res = await fetch(`${API_URL}/api/politicians/${mandate.politician_id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                // Remove from state
                setMandates(prev => prev.filter(m => m.id !== mandateId));
            } else {
                const err = await res.json();
                alert(err.detail || "Erro ao excluir político");
            }
        } catch (error) {
            console.error("Failed to delete from Radar:", error);
            alert("Erro ao excluir");
        }
    };

    // ... existing actions ...

    const handleSelectMandate = (mandateId: string) => {
        setSelectedMandate(mandateId);
        setView("wizard");
    };

    const handleBackToGrid = () => {
        setView("grid");
        setSelectedMandate("");
    };

    const executePhase = async (phase: "phase1" | "phase2" | "phase3") => {
        if (!selectedMandate) return;

        setIsLoading(prev => ({ ...prev, [phase]: true }));
        setStatusMessage(`Executando...`);

        try {
            const res = await fetch(
                `${API_URL}/campaigns/${campaignId}/radar/${selectedMandate}/${phase}`,
                { method: "POST" }
            );

            if (res.ok) {
                const data = await res.json();
                setStatusMessage(`✅ ${data.message || "Fase executada com sucesso"}`);

                // Refresh status
                const statusRes = await fetch(`${API_URL}/api/mandates/${selectedMandate}/phase-status`);
                if (statusRes.ok) {
                    const statusData = await statusRes.json();
                    setPhaseStatus(statusData);
                }
            } else {
                const err = await res.json();
                setStatusMessage(`❌ ${err.detail || "Erro ao executar fase"}`);
            }
        } catch (error) {
            setStatusMessage(`❌ Erro de conexão: ${error}`);
        } finally {
            setIsLoading(prev => ({ ...prev, [phase]: false }));
            setTimeout(() => setStatusMessage(""), 5000);
        }
    };

    // --- Helpers ---

    const currentMandate = mandates.find(m => m.id === selectedMandate);
    const formatDate = (dateStr: string | null) => dateStr ? new Date(dateStr).toLocaleString("pt-BR") : "-";

    const getStatusColor = (exec: PhaseExecution | null) => {
        if (!exec) return "bg-slate-100 text-slate-500 border-slate-200";
        if (exec.status === "running") return "bg-blue-100 text-blue-700 border-blue-200";
        if (exec.status === "ok") return "bg-emerald-100 text-emerald-700 border-emerald-200";
        return "bg-red-100 text-red-700 border-red-200";
    };

    // --- Render ---

    if (view === "list") {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4 mb-4">
                    <Button variant="ghost" onClick={() => setView("wizard")} className="text-slate-500 hover:text-slate-800">
                        <CaretLeft className="h-4 w-4 mr-2" />
                        Voltar para Wizard
                    </Button>
                    <h2 className="text-xl font-bold">Detalhamento de Promessas</h2>
                </div>
                <PromisesRadar campaignId={campaignId} initialPoliticoId={currentMandate?.politician_id} />
            </div>
        )
    }

    return (
        <div className="space-y-6">

            {/* Header Global */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200">
                        <Crosshair className="h-6 w-6 text-white" weight="duotone" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Radar Premium</h1>
                        <p className="text-sm text-slate-500">Monitoramento de Mandatos</p>
                    </div>
                </div>

                {/* City Selector (Only in Grid) */}
                {view === "grid" && (
                    <div className="w-[200px]">
                        <Select value={selectedCity} onValueChange={setSelectedCity}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione a cidade" />
                            </SelectTrigger>
                            <SelectContent>
                                {cities.map((city) => (
                                    <SelectItem key={city.id} value={city.id}>
                                        {city.name} - {city.state}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            {/* VIEW: GRID */}
            {view === "grid" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {mandates.length === 0 ? (
                        <div className="col-span-full py-12 text-center text-slate-400">
                            Nenhum mandato encontrado nesta cidade.
                        </div>
                    ) : (
                        mandates.map((mandate) => (
                            <Card
                                key={mandate.id}
                                className="hover:shadow-lg transition-all cursor-pointer group border-slate-200 hover:border-violet-300"
                                onClick={() => handleSelectMandate(mandate.id)}
                            >
                                <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 bg-white/80 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-full"
                                            onClick={(e) => handleDeleteMandate(mandate.id, mandate.politician_name, e)}
                                        >
                                            <Trash weight="bold" className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-violet-50 transition-colors">
                                        <UserCircle className="h-10 w-10 text-slate-400 group-hover:text-violet-600" weight="duotone" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800">{mandate.politician_name}</h3>
                                        <p className="text-sm text-slate-500">{mandate.office_name} {mandate.politician_partido && `• ${mandate.politician_partido}`}</p>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-500">
                                            Clique para analisar
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            )}

            {/* VIEW: WIZARD */}
            {view === "wizard" && currentMandate && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* Actions Bar */}
                    <div className="flex items-center gap-4">
                        <Button variant="outline" onClick={handleBackToGrid} size="sm">
                            <CaretLeft className="h-4 w-4 mr-2" />
                            Voltar
                        </Button>
                        <div className="h-6 w-px bg-slate-200" />
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <IdentificationBadge className="h-4 w-4 text-violet-600" />
                            <span className="font-bold">{currentMandate.politician_name}</span>
                            <span>•</span>
                            <span>{currentMandate.office_name}</span>
                        </div>
                    </div>

                    {/* Stepper Status */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Phase 1 Status */}
                        <div className={`p-4 rounded-xl border flex items-center gap-3 ${getStatusColor(phaseStatus.phase1)}`}>
                            <FileText className="h-8 w-8 opacity-80" weight="duotone" />
                            <div>
                                <p className="text-xs font-bold uppercase opacity-70">Fase 1: Plano</p>
                                <p className="text-sm font-medium">
                                    {phaseStatus.phase1?.status === "ok" ? "Concluída" :
                                        phaseStatus.phase1?.status === "running" ? "Executando..." : "Não Iniciada"}
                                </p>
                            </div>
                        </div>

                        {/* Phase 2 Status */}
                        <div className={`p-4 rounded-xl border flex items-center gap-3 ${getStatusColor(phaseStatus.phase2)}`}>
                            <Bank className="h-8 w-8 opacity-80" weight="duotone" />
                            <div>
                                <p className="text-xs font-bold uppercase opacity-70">Fase 2: Dados</p>
                                <p className="text-sm font-medium">
                                    {phaseStatus.phase2?.status === "ok" ? "Concluída" : "Não Iniciada"}
                                </p>
                            </div>
                        </div>

                        {/* Phase 3 Status */}
                        <div className={`p-4 rounded-xl border flex items-center gap-3 ${getStatusColor(phaseStatus.phase3)}`}>
                            <Newspaper className="h-8 w-8 opacity-80" weight="duotone" />
                            <div>
                                <p className="text-xs font-bold uppercase opacity-70">Fase 3: Mídia</p>
                                <p className="text-sm font-medium">
                                    {phaseStatus.phase3?.status === "ok" ? "Concluída" : "Não Iniciada"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Steps Content */}
                    <div className="space-y-8">

                        {/* Status Feedback */}
                        {statusMessage && (
                            <div className={`p-4 rounded-xl border ${statusMessage.includes("✅") ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                                statusMessage.includes("❌") ? "bg-red-50 border-red-200 text-red-700" :
                                    "bg-violet-50 border-violet-200 text-violet-700"
                                }`}>
                                <p className="text-sm font-medium">{statusMessage}</p>
                            </div>
                        )}



                        {/* Step 1: Plano de Governo */}
                        <div className="relative pl-8 border-l-2 border-slate-200 pb-8">
                            <div className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-white shadow-sm ${phaseStatus.phase1?.status === 'ok' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            <h3 className="text-lg font-bold text-slate-800 mb-2">1. Plano de Governo</h3>
                            <Card className="border-slate-200 shadow-sm">
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between gap-6">
                                        <div className="space-y-4 w-full">
                                            <p className="text-slate-600 text-sm">
                                                O sistema irá analisar o PDF do plano de governo e extrair automaticamente as promessas.
                                            </p>

                                            {/* LOADING STATE - STEPS */}
                                            {isLoading.phase1 && (
                                                <div className="space-y-3 mt-4">
                                                    <div className="flex items-center gap-2 text-sm text-violet-600 font-medium animate-pulse">
                                                        <ArrowsClockwise className="h-4 w-4 animate-spin" />
                                                        Processando documento e extraindo promessas com IA...
                                                    </div>
                                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                                        <div className="bg-violet-600 h-2 rounded-full w-2/3 animate-[pulse_2s_infinite]" />
                                                    </div>
                                                    <div className="space-y-2 pt-2">
                                                        <Skeleton className="h-4 w-3/4" />
                                                        <Skeleton className="h-4 w-1/2" />
                                                    </div>
                                                </div>
                                            )}

                                            {/* SUCCESS STATE */}
                                            {!isLoading.phase1 && phaseStatus.phase1?.status === "ok" && (
                                                <div className="mt-4 space-y-4 w-full animate-in fade-in slide-in-from-bottom-2 duration-500">

                                                    {/* Document Info */}
                                                    <div className="flex items-center gap-4 text-sm text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100 w-fit">
                                                        <Shield className="h-4 w-4 text-slate-400" />
                                                        Status do Documento: <span className="text-emerald-600 font-medium">Disponível ({phaseStatus.phase1.summary?.document_info?.filename})</span>
                                                    </div>

                                                    {/* Summary Metrics */}
                                                    <div className="flex items-center justify-between bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                                                        <div>
                                                            <p className="text-emerald-900 font-bold text-2xl">
                                                                {phaseStatus.phase1.summary?.total_promises || phaseStatus.phase1.summary?.promises_count || 0}
                                                            </p>
                                                            <p className="text-emerald-800 text-xs font-medium uppercase tracking-wide">
                                                                Promessas Identificadas
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-emerald-700 text-xs">
                                                                Extraído em {formatDate(phaseStatus.phase1.finished_at)}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Categories Chips */}
                                                    {phaseStatus.phase1.summary?.by_category && (
                                                        <div className="flex flex-wrap gap-2">
                                                            {phaseStatus.phase1.summary.by_category.map((cat: any, idx: number) => (
                                                                <span key={idx} className="bg-white text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-slate-200 shadow-sm">
                                                                    {cat.categoria} <span className="text-slate-400 ml-1">({cat.qtd})</span>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Sample Accordion */}
                                                    <Collapsible>
                                                        <CollapsibleTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="w-full justify-between hover:bg-slate-50 text-slate-600 border border-transparent hover:border-slate-200">
                                                                <span className="flex items-center gap-2">
                                                                    <ListBullets className="h-4 w-4" />
                                                                    Exibir amostra de promessas
                                                                </span>
                                                                <ChevronDown className="h-4 w-4 text-slate-400" />
                                                            </Button>
                                                        </CollapsibleTrigger>
                                                        <CollapsibleContent className="mt-2 space-y-2">
                                                            {phaseStatus.phase1.summary?.sample_promises?.map((prom: any, idx: number) => (
                                                                <div key={idx} className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm text-start">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="text-[10px] font-bold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded uppercase border border-violet-100">
                                                                            {prom.categoria}
                                                                        </span>
                                                                        <span className="text-[10px] text-slate-400">Plano de Governo</span>
                                                                    </div>
                                                                    <p className="text-sm text-slate-700 leading-relaxed">
                                                                        {prom.resumo}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </CollapsibleContent>
                                                    </Collapsible>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <Button
                                                onClick={() => executePhase("phase1")}
                                                disabled={isLoading.phase1}
                                                className="min-w-[180px]"
                                                variant={phaseStatus.phase1?.status === "ok" ? "outline" : "default"}
                                            >
                                                {isLoading.phase1 ? <ArrowsClockwise className="animate-spin mr-2" /> : <Play className="mr-2" weight="fill" />}
                                                {phaseStatus.phase1?.status === "ok" ? "Re-extrair" : "Extrair Promessas"}
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>


                        {/* Step 2: Enriquecimento */}
                        <div className="relative pl-8 border-l-2 border-slate-200 pb-8">
                            <div className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-white shadow-sm ${phaseStatus.phase2?.status === 'ok' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            <h3 className="text-lg font-bold text-slate-800 mb-2">2. Dados Oficiais & Transparência</h3>
                            <Card className="border-slate-200 shadow-sm opacity-90">
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between gap-6">
                                        <div className="space-y-4 w-full">
                                            <p className="text-slate-600 text-sm max-w-lg">
                                                Cruza promessas com dados oficiais da Câmara e Portal da Transparência (Emendas e Despesas).
                                            </p>

                                            {/* ANALYSIS RESULT */}
                                            {phaseStatus.phase2?.status === "ok" && phaseStatus.phase2.summary?.data && (
                                                <div className="mt-4 bg-slate-50 rounded-lg p-4 border border-slate-100">
                                                    <p className="text-sm text-slate-700 italic mb-4">
                                                        "{phaseStatus.phase2.summary.data.observacoes_gerais}"
                                                    </p>
                                                    <div className="grid grid-cols-1 gap-3">
                                                        {phaseStatus.phase2.summary.data.categorias?.map((cat: any, idx: number) => (
                                                            <div key={idx} className="flex items-center justify-between bg-white p-3 rounded border border-slate-100 shadow-sm">
                                                                <div>
                                                                    <p className="font-bold text-slate-800 text-sm">{cat.nome}</p>
                                                                    <p className="text-xs text-slate-500">
                                                                        {cat.qtd_promessas} promessas • {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cat.valor_pago_total)} pagos
                                                                    </p>
                                                                </div>
                                                                <div className={`text-xs font-bold px-2 py-1 rounded-full border ${cat.avaliacao?.includes("baixa") ? "bg-red-50 text-red-700 border-red-200" :
                                                                    cat.avaliacao?.includes("desviado") ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                                        "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                    }`}>
                                                                    {cat.avaliacao}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <Button
                                            onClick={() => executePhase("phase2")}
                                            disabled={isLoading.phase2}
                                            className="min-w-[180px]"
                                            variant={phaseStatus.phase2?.status === "ok" ? "outline" : "secondary"}
                                        >
                                            {isLoading.phase2 ? <ArrowsClockwise className="animate-spin mr-2" /> : <Bank className="mr-2" weight="duotone" />}
                                            {phaseStatus.phase2?.status === "ok" ? "Re-analisar Dados" : "Consultar Dados"}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Step 3: Mídia */}
                        <div className="relative pl-8 border-l-2 border-transparent">
                            <div className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-white shadow-sm ${phaseStatus.phase3?.status === 'ok' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            <h3 className="text-lg font-bold text-slate-800 mb-2">3. Monitoramento de Mídia</h3>
                            <Card className="border-slate-200 shadow-sm opacity-90">
                                <CardContent className="p-6 flex items-center justify-between gap-6">
                                    <div className="space-y-4">
                                        <p className="text-slate-600 text-sm max-w-lg">
                                            Monitora menções, notícias e entrevistas para encontrar novas promessas ou cobranças.
                                        </p>

                                        {/* Final Action */}
                                        <div className="pt-4">
                                            <Button
                                                onClick={() => setView("list")}
                                                className="bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-200"
                                            >
                                                <ListBullets className="h-4 w-4 mr-2" />
                                                Ver Lista Detalhada de Promessas
                                            </Button>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => executePhase("phase3")}
                                        disabled={isLoading.phase3}
                                        className="min-w-[180px]"
                                        variant="secondary"
                                    >
                                        {isLoading.phase3 ? <ArrowsClockwise className="animate-spin mr-2" /> : <Newspaper className="mr-2" weight="duotone" />}
                                        Varredura de Mídia
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}

