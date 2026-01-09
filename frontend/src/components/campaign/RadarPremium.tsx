"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Agent } from "@/types/agent";
import {
    Terminal,
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
    Trash,
    UsersThree,
    UploadSimple,
    WarningCircle,
    MagnifyingGlass
} from "@phosphor-icons/react";
import { PromisesRadar } from "./PromisesRadar";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CategoryDetailModal } from "./CategoryDetailModal";
import { ChevronDown, ChevronUp, Loader2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Phase3Orchestrator } from "./Phase3Orchestrator";

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
    initialPoliticianId?: string;
}

export function RadarPremium({ campaignId, initialPoliticianId }: RadarPremiumProps) {
    // View State
    const [view, setView] = useState<"grid" | "wizard" | "list">("grid");
    const router = useRouter();

    // Auto-scroll for logs
    const endOfLogsRef = useRef<HTMLDivElement>(null);

    // Data State
    const [cities, setCities] = useState<City[]>([]);
    const [mandates, setMandates] = useState<Mandate[]>([]);
    const [selectedCity, setSelectedCity] = useState<string>("");
    const [selectedMandate, setSelectedMandate] = useState<string>("");

    // Wizard State
    const [phaseStatus, setPhaseStatus] = useState<PhaseStatus>({
        phase1: null, phase2: null, phase3: null, verify: null
    });
    const [selectedCategory, setSelectedCategory] = useState<any>(null); // For detail modal
    const [isLoading, setIsLoading] = useState({
        phase1: false,
        phase2: false,
        phase3: false
    });
    const [statusMessage, setStatusMessage] = useState("");

    // Scroll logs into view
    useEffect(() => {
        // Only scroll if Phase 3 is active/visible
        if (view === "wizard" && phaseStatus?.phase3?.logs?.length) {
            endOfLogsRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [phaseStatus?.phase3?.logs, view]);

    // Scanning Agents State (Phase 3)
    const [scanningAgents, setScanningAgents] = useState<Agent[]>([]);
    const [selectedScanningAgent, setSelectedScanningAgent] = useState<string>("radar-google-scanner");
    // State for whitelisting and configuration
    const [targetSites, setTargetSites] = useState<string>("");
    const [searchMode, setSearchMode] = useState<string>("hybrid");
    const [maxResults, setMaxResults] = useState<number>(10);
    const [phase3Results, setPhase3Results] = useState<any>(null); // Results container // Whitelisting input
    const [showLogs, setShowLogs] = useState(false);

    // Fetch Scanning Agents on Mount
    useEffect(() => {
        const fetchAgents = async () => {
            try {
                const res = await fetch(`${API_URL}/api/agents?type=scanning`);
                if (res.ok) {
                    const data = await res.json();
                    setScanningAgents(data);
                    // Select default if exists and valid
                    if (data.length > 0) {
                        const defaultAgent = data.find((a: Agent) => a.name === "radar-google-scanner");
                        if (defaultAgent) setSelectedScanningAgent(defaultAgent.name);
                        else setSelectedScanningAgent(data[0].name);
                    }
                }
            } catch (e) {
                console.error("Failed to fetch scanning agents:", e);
            }
        };
        fetchAgents();
    }, []);

    // Upload State
    const [isUploadingPlan, setIsUploadingPlan] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Document Status
    const [currentDocument, setCurrentDocument] = useState<{
        id: string;
        filename: string;
        file_url: string;
        created_at: string;
        has_text: boolean;
    } | null>(null);
    const [isDeletingDoc, setIsDeletingDoc] = useState(false);

    // Background Processing State (for polling)
    const [backgroundProcessing, setBackgroundProcessing] = useState<{
        phase1: boolean;
        phase2: boolean;
        phase3: boolean;
    }>({ phase1: false, phase2: false, phase3: false });

    // Global Error State
    const [connectionError, setConnectionError] = useState(false);

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
                setConnectionError(true);
            }
        };
        fetchCities();
    }, []);

    // 2. Fetch Mandates (Grid) or Auto-Select
    useEffect(() => {
        const fetchMandates = async () => {
            try {
                // If initialPoliticianId is provided, we might not have selectedCity yet.
                // We should fetch mandates for this politician specifically? 
                // BUT the API currently filters by city_id or office_id.
                // Let's modify the fetch to be broader if we have initialPoliticianId?
                // Or just fetch ALL mandates if city is selected.

                let url = `${API_URL}/api/mandates?is_active=true`;
                if (selectedCity) {
                    url += `&city_id=${selectedCity}`;
                } else if (initialPoliticianId) {
                    // Fetch all mandates, we will filter client side or backend should support filter by politician_id (it doesn't explicitly in the List params but maybe we can add it?)
                    // Inspecting backend: list_mandates params: city_id, office_id, campaign_id, is_active.
                    // It does NOT support politician_id filter directly in the list endpoint.
                    // However, we can fetch all mandates for the campaign if we have campaignId.
                    // The component has campaignId prop.
                    url += `&campaign_id=${campaignId}`;
                } else {
                    // If no city and no initial politician, maybe don't fetch anything or fetch all?
                    // If we are in Grid mode without city selected, we show nothing?
                    if (!selectedCity) return;
                }

                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    setMandates(data);

                    // Auto-select if initialPoliticianId is present
                    if (initialPoliticianId) {
                        const target = data.find((m: Mandate) => m.politician_id === initialPoliticianId);
                        if (target) {
                            setSelectedMandate(target.id);
                            setView("wizard");
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to fetch mandates:", error);
                setConnectionError(true);
            }
        };
        fetchMandates();
    }, [selectedCity, initialPoliticianId, campaignId]);

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

    // 4. Fetch Document Status (Wizard)
    useEffect(() => {
        const fetchDocument = async () => {
            if (!selectedMandate) {
                setCurrentDocument(null);
                return;
            }
            try {
                const res = await fetch(`${API_URL}/api/mandates/${selectedMandate}/document`);
                if (res.ok) {
                    const data = await res.json();
                    setCurrentDocument(data.document);
                }
            } catch (error) {
                console.error("Failed to fetch document:", error);
            }
        };
        fetchDocument();
    }, [selectedMandate]);


    // --- Actions ---

    // --- Upload Plan ---
    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !selectedMandate) return;

        setIsUploadingPlan(true);
        setStatusMessage("Enviando plano...");

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch(`${API_URL}/campaigns/${campaignId}/radar/${selectedMandate}/upload-plan`, {
                method: "POST",
                body: formData,
            });

            if (res.ok) {
                const data = await res.json();
                setStatusMessage(`✅ ${data.message || "Upload concluído!"}`);
                // Refresh Status and Document immediately
                const statusRes = await fetch(`${API_URL}/api/mandates/${selectedMandate}/phase-status`);
                if (statusRes.ok) {
                    const statusData = await statusRes.json();
                    setPhaseStatus(statusData);
                }
                // Refresh document
                const docRes = await fetch(`${API_URL}/api/mandates/${selectedMandate}/document`);
                if (docRes.ok) {
                    const docData = await docRes.json();
                    setCurrentDocument(docData.document);
                }
            } else {
                const err = await res.json();
                setStatusMessage(`❌ Erro no upload: ${err.detail}`);
            }
        } catch (error) {
            setStatusMessage(`❌ Erro de conexão: ${error}`);
        } finally {
            setIsUploadingPlan(false);
            if (fileInputRef.current) fileInputRef.current.value = ""; // Reset input
            setTimeout(() => setStatusMessage(""), 5000);
        }
    };

    const handleDeleteDocument = async () => {
        if (!selectedMandate || !currentDocument) return;
        if (!confirm(`Excluir o documento "${currentDocument.filename}"?`)) return;

        setIsDeletingDoc(true);
        try {
            const res = await fetch(`${API_URL}/api/mandates/${selectedMandate}/document/${currentDocument.id}`, {
                method: "DELETE",
            });
            if (res.ok) {
                setCurrentDocument(null);
                setStatusMessage("✅ Documento excluído");
                setTimeout(() => setStatusMessage(""), 3000);
            } else {
                const err = await res.json();
                setStatusMessage(`❌ Erro: ${err.detail}`);
            }
        } catch (error) {
            setStatusMessage(`❌ Erro: ${error}`);
        } finally {
            setIsDeletingDoc(false);
        }
    };

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

    const refreshData = async () => {
        if (!selectedMandate) return null;
        try {
            const statusRes = await fetch(`${API_URL}/api/mandates/${selectedMandate}/phase-status`);
            if (statusRes.ok) {
                const statusData = await statusRes.json();
                setPhaseStatus(statusData);
                return statusData;
            }
        } catch (error) {
            console.error("Failed to refresh data (ignoring to prevent crash):", error);
        }
        return null;
    };

    const executePhase = async (phase: "phase1" | "phase2" | "phase3", force: boolean = false) => {
        console.log(`🔄 executePhase called: phase=${phase}, selectedMandate=${selectedMandate}, force=${force}`);
        if (!selectedMandate) {
            console.log("⚠️ No mandate selected, returning early");
            setStatusMessage("⚠️ Selecione um mandato primeiro");
            return;
        }

        // Immediate visual feedback
        setIsLoading(prev => ({ ...prev, [phase]: true }));
        setStatusMessage(`🚀 Iniciando ${phase === "phase1" ? "extração" : phase === "phase2" ? "análise" : "varredura"}...`);

        try {
            let url = `${API_URL}/api/campaigns/${campaignId}/radar/${selectedMandate}/${phase}`;
            if (force) url += "?force=true";

            // Append Agent Slug for Phase 3
            if (phase === "phase3" && selectedScanningAgent) {
                url += `${force ? '&' : '?'}agent_slug=${selectedScanningAgent}`;
            }

            const options: RequestInit = { method: "POST" };

            // Phase 3: Add Target Sites body + Config
            if (phase === "phase3") {
                const sitesList = targetSites.split(',').map(s => s.trim()).filter(s => s.length > 0);
                options.headers = { 'Content-Type': 'application/json' };
                options.body = JSON.stringify({
                    target_sites: sitesList,
                    search_mode: searchMode,
                    max_results: maxResults
                });
            }

            console.log(`📤 Calling: ${url}`);
            const res = await fetch(url, options);
            const data = await res.json();

            // Clean Debug Log
            const matches = data.matches_found ?? data.summary?.matches_found ?? 0;
            console.log(`[Radar] Status: ${data.status} | Matches: ${matches}`);

            if (res.ok) {
                // CASE 1: Async Processing (Polling)
                if (data.status === "processing" || data.status === "running") {
                    setBackgroundProcessing(prev => ({ ...prev, [phase]: true }));
                    setStatusMessage(`⏳ ${data.message || "Processamento iniciado em segundo plano."}`);

                    // Start polling for completion
                    let elapsedTime = 0;
                    const pollInterval = setInterval(async () => {
                        elapsedTime += 5;
                        setStatusMessage(`⏳ ${data.message || "Processando em segundo plano..."} (${elapsedTime}s)`);

                        try {
                            const statusData = await refreshData();
                            const phaseData = statusData?.[phase];

                            if (phaseData?.status === "ok") {
                                clearInterval(pollInterval);
                                setBackgroundProcessing(prev => ({ ...prev, [phase]: false }));
                                const finalMatches = phaseData.summary?.matches_found ?? 0;
                                setStatusMessage(`✅ ${finalMatches} evidências carregadas com sucesso`);
                                setTimeout(() => setStatusMessage(""), 5000);
                            } else if (phaseData?.status === "error") {
                                clearInterval(pollInterval);
                                setBackgroundProcessing(prev => ({ ...prev, [phase]: false }));
                                setStatusMessage(`❌ Erro: ${phaseData.error_message || "Falha no processamento"}`);
                            }
                        } catch (e) {
                            console.error("Polling error:", e);
                        }
                    }, 5000);

                    setTimeout(() => {
                        clearInterval(pollInterval);
                        setBackgroundProcessing(prev => ({ ...prev, [phase]: false }));
                    }, 600000); // 10 minutes timeout

                }
                // CASE 2: Immediate Success (Cached or Finished)
                else if (data.status === "exists" || data.status === "ok" || data.status === "completed") {
                    await refreshData();
                    setStatusMessage(`✅ ${matches} evidências carregadas com sucesso`);
                    setTimeout(() => setStatusMessage(""), 5000);
                }
            } else {
                console.error(`❌ Error response:`, data);
                setStatusMessage(`❌ ${data.detail || "Erro ao executar fase"}`);
            }
        } catch (error) {
            console.error(`❌ Connection error:`, error);
            setStatusMessage(`❌ Erro de conexão: ${error}`);
        } finally {
            setIsLoading(prev => ({ ...prev, [phase]: false }));
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

    // --- Chamber Logic (Lifted from PromisesRadar) ---
    const [chamber, setChamber] = useState<any[]>([]);

    useEffect(() => {
        if (!campaignId) return;
        const fetchChamber = async () => {
            try {
                const res = await fetch(`${API_URL}/api/campaigns/${campaignId}/chamber`);
                if (res.ok) {
                    const data = await res.json();
                    setChamber(data);
                }
            } catch (error) {
                console.error("Failed to fetch chamber:", error);
                // Don't necessarily block main view for chamber error, but could warn
                // setConnectionError(true); 
            }
        };
        fetchChamber();
    }, [campaignId]);

    const updateCouncilorStatus = async (politicianId: string, newStatus: string) => {
        setChamber(prev => prev.map(c => c.id === politicianId ? { ...c, status: newStatus } : c));
        try {
            await fetch(`${API_URL}/api/campaigns/${campaignId}/chamber/${politicianId}/status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            });
        } catch (e) {
            console.error("Failed to update status", e);
        }
    };

    const getStatusBadge = (status?: string) => {
        switch (status) {
            case "base": return { color: "bg-emerald-100 text-emerald-700 border-emerald-200", label: "Base" };
            case "oposicao": return { color: "bg-red-100 text-red-700 border-red-200", label: "Oposição" };
            default: return { color: "bg-slate-100 text-slate-600 border-slate-200", label: "Neutro" };
        }
    };

    // --- Render ---

    if (view === "list") {
        return (
            <div className="space-y-6">
                {/* CONNECTION ERROR ALERT */}
                {connectionError && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Erro de Conexão</AlertTitle>
                        <AlertDescription>
                            Não foi possível conectar ao servidor. Verifique se o backend está rodando em {API_URL}.
                            <Button
                                variant="outline"
                                size="sm"
                                className="ml-4 h-6 px-2 text-xs bg-white text-red-600 border-red-200"
                                onClick={() => window.location.reload()}
                            >
                                Tentar Novamente
                            </Button>
                        </AlertDescription>
                    </Alert>
                )}

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

            {/* CONNECTION ERROR ALERT */}
            {connectionError && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Erro de Conexão</AlertTitle>
                    <AlertDescription>
                        Não foi possível conectar ao servidor. Verifique se o backend está rodando em {API_URL}.
                        <Button
                            variant="outline"
                            size="sm"
                            className="ml-4 h-6 px-2 text-xs bg-white text-red-600 border-red-200"
                            onClick={() => window.location.reload()}
                        >
                            Tentar Novamente
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

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


            {/* VIEW: GRID */}
            {
                view === "grid" && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">

                        {/* Section 1: Executive (Mayor) */}
                        <div>
                            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Buildings className="h-4 w-4" weight="duotone" /> Poder Executivo
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {mandates.length === 0 ? (
                                    <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                        Nenhum mandato executivo encontrado nesta cidade.
                                    </div>
                                ) : (
                                    mandates.map((mandate) => (
                                        <Card
                                            key={mandate.id}
                                            className="hover:shadow-lg transition-all cursor-pointer group border-slate-200 hover:border-violet-300 relative overflow-hidden"
                                            onClick={() => handleSelectMandate(mandate.id)}
                                        >
                                            <div className="absolute top-0 left-0 w-1 h-full bg-violet-500"></div>
                                            <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                                                {/* Delete Button */}
                                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 bg-white/80 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-full"
                                                        onClick={(e) => handleDeleteMandate(mandate.id, mandate.politician_name, e)}
                                                    >
                                                        <Trash weight="bold" className="h-4 w-4" />
                                                    </Button>
                                                </div>

                                                <div className="h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-violet-50 transition-colors border-4 border-white shadow-md">
                                                    <UserCircle className="h-12 w-12 text-slate-400 group-hover:text-violet-600" weight="duotone" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-slate-800">{mandate.politician_name}</h3>
                                                    <div className="flex items-center justify-center gap-2 mt-1">
                                                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-violet-100 text-violet-700 uppercase">Prefeito</span>
                                                        {mandate.politician_partido && (
                                                            <span className="text-xs text-slate-500 font-medium">• {mandate.politician_partido}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="w-full mt-2">
                                                    <Button className="w-full bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-100" variant="ghost">
                                                        Analisar Promessas
                                                        <CaretLeft className="h-4 w-4 ml-2 rotate-180" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Section 2: Legislative (Chamber) */}
                        <div>
                            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <UsersThree className="h-4 w-4" weight="duotone" /> Poder Legislativo (Câmara Municipal)
                            </h2>
                            {chamber.length > 0 ? (
                                <Card className="border-slate-200 shadow-sm bg-slate-50/30">
                                    <CardHeader className="pb-3 border-b border-slate-200/50 mb-3 bg-white/50 rounded-t-xl">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-violet-100 p-1.5 rounded-lg">
                                                    <UsersThree className="h-5 w-5 text-violet-600" weight="duotone" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-base font-bold text-slate-700">
                                                        Vereadores Eleitos
                                                    </CardTitle>
                                                    <p className="text-xs text-slate-500">Gestão de Apoio</p>
                                                </div>
                                            </div>
                                            <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                                                {chamber.length} parlamentares
                                            </span>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                            {chamber.map((ver: any) => {
                                                const badge = getStatusBadge(ver.status);
                                                return (
                                                    <div
                                                        key={ver.id}
                                                        className="relative group bg-white p-4 rounded-xl border border-slate-200 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all hover:border-violet-200 cursor-pointer"
                                                        onClick={() => router.push(`/admin/radar/${ver.id}`)}
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex items-center gap-3 overflow-hidden">
                                                                <div className="h-10 w-10 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-100">
                                                                    {ver.photograph ? (
                                                                        <img src={ver.photograph} alt={ver.name} className="h-full w-full object-cover" />
                                                                    ) : (
                                                                        <span className="h-full w-full flex items-center justify-center text-slate-400 font-bold text-xs">{ver.partido || "IND"}</span>
                                                                    )}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-sm font-bold text-slate-800 truncate" title={ver.name}>{ver.name}</p>
                                                                    <p className="text-xs text-slate-500 font-medium">{ver.partido} • Vereador</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Status Control */}
                                                        <div className="mt-auto pt-2 border-t border-slate-50" onClick={(e) => e.stopPropagation()}>
                                                            <Select value={ver.status || "neutro"} onValueChange={(val) => updateCouncilorStatus(ver.id, val)}>
                                                                <SelectTrigger className={`h-8 w-full text-xs font-bold border-0 ${badge.color} transition-colors focus:ring-0 focus:ring-offset-0`}>
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="base" className="text-xs font-bold text-emerald-700 focus:bg-emerald-50 focus:text-emerald-800">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-2 h-2 rounded-full bg-emerald-500" /> Base do Governo
                                                                        </div>
                                                                    </SelectItem>
                                                                    <SelectItem value="oposicao" className="text-xs font-bold text-red-700 focus:bg-red-50 focus:text-red-800">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-2 h-2 rounded-full bg-red-500" /> Oposição
                                                                        </div>
                                                                    </SelectItem>
                                                                    <SelectItem value="neutro" className="text-xs font-bold text-slate-600 focus:bg-slate-50 focus:text-slate-800">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-2 h-2 rounded-full bg-slate-300" /> Neutro / Indefinido
                                                                        </div>
                                                                    </SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm">
                                    Câmara Municipal não importada para esta cidade.
                                </div>
                            )}
                        </div>

                    </div>
                )
            }

            {/* VIEW: WIZARD */}
            {
                view === "wizard" && currentMandate && (
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

                                                {/* Document Status Indicator */}
                                                {currentDocument ? (
                                                    <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                                                        <FileText className="h-5 w-5 text-emerald-600" weight="duotone" />
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium text-emerald-700">{currentDocument.filename}</p>
                                                            <p className="text-xs text-emerald-600">
                                                                {currentDocument.has_text ? "✓ Texto extraído" : "⚠ Aguardando extração"}
                                                            </p>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={handleDeleteDocument}
                                                            disabled={isDeletingDoc}
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                            title="Excluir documento"
                                                        >
                                                            <Trash size={16} />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                                                        <FileText className="h-5 w-5 text-amber-600" weight="duotone" />
                                                        <p className="text-sm text-amber-700">
                                                            Nenhum documento carregado. Faça upload do PDF do Plano de Governo.
                                                        </p>
                                                    </div>
                                                )}

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
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    className="hidden"
                                                    accept="application/pdf"
                                                    onChange={handleFileChange}
                                                />
                                                <div className="flex gap-2">
                                                    <Button
                                                        onClick={() => executePhase("phase1")}
                                                        disabled={isLoading.phase1 || isUploadingPlan}
                                                        className="flex-1"
                                                        variant={phaseStatus.phase1?.status === "ok" ? "outline" : "default"}
                                                    >
                                                        {isLoading.phase1 ? <ArrowsClockwise className="animate-spin mr-2" /> : <Play className="mr-2" weight="fill" />}
                                                        {phaseStatus.phase1?.status === "ok" ? "Re-extrair" : "Extrair Promessas"}
                                                    </Button>

                                                    <Button
                                                        onClick={handleUploadClick}
                                                        disabled={isUploadingPlan || isLoading.phase1}
                                                        variant="secondary"
                                                        className="w-12 px-0"
                                                        title="Fazer Upload Manual do Plano (PDF)"
                                                    >
                                                        {isUploadingPlan ? <ArrowsClockwise className="animate-spin" /> : <UploadSimple size={20} />}
                                                    </Button>
                                                </div>
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
                                                                <div
                                                                    key={idx}
                                                                    className="flex items-center justify-between bg-white p-3 rounded border border-slate-100 shadow-sm cursor-pointer hover:bg-slate-50 hover:shadow-md transition-all group"
                                                                    onClick={() => setSelectedCategory(cat)}
                                                                >
                                                                    <div>
                                                                        <p className="font-bold text-slate-800 text-sm group-hover:text-violet-700 transition-colors">{cat.nome}</p>
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

                                                {/* Detail Modal */}
                                                <CategoryDetailModal
                                                    isOpen={!!selectedCategory}
                                                    onClose={() => setSelectedCategory(null)}
                                                    category={selectedCategory}
                                                />
                                            </div>

                                            <div className="flex flex-col items-end gap-2">
                                                {/* Background Processing Indicator */}
                                                {backgroundProcessing.phase2 && (
                                                    <div className="flex items-center gap-2 text-blue-600 text-sm bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200">
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        <span>Processando em segundo plano...</span>
                                                    </div>
                                                )}

                                                <Button
                                                    onClick={() => executePhase("phase2", phaseStatus.phase2?.status === "ok")}
                                                    disabled={isLoading.phase2 || backgroundProcessing.phase2}
                                                    className="min-w-[180px]"
                                                    variant={phaseStatus.phase2?.status === "ok" ? "outline" : "secondary"}
                                                >
                                                    {isLoading.phase2 ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                            Iniciando...
                                                        </>
                                                    ) : backgroundProcessing.phase2 ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                            Aguardando...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Bank className="mr-2" weight="duotone" />
                                                            {phaseStatus.phase2?.status === "ok" ? "Re-analisar Dados" : "Consultar Dados"}
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Step 3: Mídia (Orchestrator) */}
                            {currentMandate && (
                                <Phase3Orchestrator
                                    mandateId={currentMandate.id}
                                    campaignId={campaignId as string}
                                />
                            )}
                        </div>
                    </div>
                )
            }
        </div>
    );
};
