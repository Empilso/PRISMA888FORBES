"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Newspaper, ArrowsClockwise, WarningCircle, MagnifyingGlass } from "@phosphor-icons/react";
import { ScanProgress } from "./ScanProgress";
import { MediaResults, MediaItem } from "./MediaResults";
import { useToast } from "@/components/ui/use-toast";

interface Phase3OrchestratorProps {
    mandateId: string;
    campaignId: string;
    onComplete?: () => void;
}

interface Agent {
    name: string;
    display_name: string;
    description: string;
    role: string;
}

export function Phase3Orchestrator({ mandateId, campaignId, onComplete }: Phase3OrchestratorProps) {
    const { toast } = useToast();

    // ============ STATE MACHINE ============
    const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
    const [logs, setLogs] = useState<string[]>([]);
    const [results, setResults] = useState<MediaItem[]>([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // ============ CONFIGURATION STATE ============
    const [scanningAgents, setScanningAgents] = useState<Agent[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<string>('radar-google-scanner');
    const [targetSites, setTargetSites] = useState<string>("");
    const [searchMode, setSearchMode] = useState<string>('focused');
    const [maxResults, setMaxResults] = useState<number>(10);

    // Polling Ref
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // 1. Initial Load: Fetch Agents & Check Status
    useEffect(() => {
        const loadAgents = async () => {
            try {
                const res = await fetch('/api/agents?type=scanning');
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.length > 0) {
                        setScanningAgents(data);
                        // Default to first agent if none selected or invalid
                        if (!selectedAgent || !data.find((a: Agent) => a.name === selectedAgent)) {
                            setSelectedAgent(data[0].name);
                        }
                    } else {
                        // Fallback if empty
                        setScanningAgents([
                            { name: "radar-google-scanner", display_name: "Google News Scanner (Fallback)", description: "Monitoramento de G1, CNN, UOL e mídia tradicional.", role: "Jornalista Investigativo" }
                        ]);
                    }
                }
            } catch (error) {
                console.error("Failed to load agents", error);
                // Keep default/empty to avoid crash, or set fallback
                setScanningAgents([
                    { name: "radar-google-scanner", display_name: "Google News Scanner (Offline)", description: "Monitoramento de G1, CNN, UOL e mídia tradicional.", role: "Jornalista Investigativo" }
                ]);
            }
        };

        loadAgents();

        // Check if phase is already running or has data
        checkPhaseStatus();

        return () => stopPolling();
    }, []);

    const stopPolling = () => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
    };

    const checkPhaseStatus = async () => {
        try {
            const res = await fetch(`/api/mandates/${mandateId}/phase-status`);
            if (res.ok) {
                const data = await res.json();
                const phaseData = data.phase3;

                if (!phaseData) return;

                // If Running
                if (phaseData.status === 'running') {
                    setStatus('running');
                    setLogs(phaseData.logs || []);
                    startPolling();
                }

                // If Completed/OK/Exists
                if (phaseData.status === 'ok' || phaseData.status === 'completed' || phaseData.status === 'exists') {
                    setStatus('completed');
                    fetchResults();
                }
            }
        } catch (error) {
            console.error("Failed to check status", error);
        }
    };

    const startPolling = () => {
        stopPolling();
        pollingIntervalRef.current = setInterval(async () => {
            try {
                const res = await fetch(`/api/mandates/${mandateId}/phase-status`);
                if (res.ok) {
                    const data = await res.json();
                    const phaseData = data.phase3;

                    if (!phaseData) return;

                    // Update Logs
                    if (phaseData.logs) setLogs(phaseData.logs);

                    // Check Completion
                    if (phaseData.status === 'ok' || phaseData.status === 'completed' || phaseData.status === 'exists') {
                        setStatus('completed');
                        fetchResults();
                        stopPolling();
                        if (onComplete) onComplete();
                    }

                    if (phaseData.status === 'error' || phaseData.status === 'failed') {
                        setStatus('error');
                        setErrorMsg("Falha na execução do agente. Verifique os logs.");
                        stopPolling();
                    }
                }
            } catch (e) {
                console.error("Polling error", e);
            }
        }, 3000);
    };

    const fetchResults = async () => {
        try {
            const res = await fetch(`/api/mandates/${mandateId}/phase-status`);
            if (res.ok) {
                const data = await res.json();
                const phaseData = data.phase3;

                if (phaseData && phaseData.result) {
                    const rawData = phaseData.result;
                    console.log('🔍 [DEBUG] RAW RESPONSE:', rawData);

                    let resultsArray: any[] = [];

                    // CASO 1: O Backend devolveu o array direto
                    if (Array.isArray(rawData)) {
                        resultsArray = rawData;
                    }
                    // CASO 2: O Backend devolveu encapsulado (ex: { results: [...], status: 'ok' }) Variações: result.details, result.results ou result.items
                    else if (rawData && (Array.isArray(rawData.results) || Array.isArray(rawData.details) || Array.isArray(rawData.items))) {
                        resultsArray = rawData.results || rawData.details || rawData.items;
                    }
                    // CASO 3: O Backend devolveu string (JSON escapado)
                    else if (typeof rawData === 'string') {
                        try {
                            const parsed = JSON.parse(rawData);
                            resultsArray = Array.isArray(parsed) ? parsed : (parsed.results || parsed.details || parsed.items || []);
                        } catch (e) {
                            console.error('Erro ao fazer parse manual:', e);
                        }
                    }

                    console.log('✅ [DEBUG] ARRAY FINAL:', resultsArray);

                    // Atualiza estado
                    if (resultsArray.length > 0) {
                        setResults(resultsArray);
                    } else {
                        console.warn('⚠️ Array vazio ou inválido.');
                    }
                    // Sempre garante que completa para mostrar a UI (mesmo empty state)
                    setStatus('completed');
                }
            }
        } catch (e) {
            console.error("Failed to fetch results", e);
            setStatus('completed'); // Fallback para não travar em loading
        }
    };

    const handleStartScan = async () => {
        setStatus('running');
        setResults([]); // Clear previous results
        setLogs(["Iniciando solicitação de varredura..."]); // Initial feedback
        setErrorMsg(null);

        try {
            // Split target sites string into array
            const targetSitesList = targetSites.split(',').map(s => s.trim()).filter(s => s.length > 0);

            const payload = {
                target_sites: targetSitesList,
                search_mode: searchMode,
                max_results: maxResults
            };

            const queryParams = new URLSearchParams({
                force: 'true',
                agent_slug: selectedAgent
            });

            const res = await fetch(`/api/campaigns/${campaignId}/radar/${mandateId}/phase3?${queryParams.toString()}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || "Failed to start scan");
            }

            startPolling();

        } catch (e: any) {
            console.error(e);
            setStatus('error');
            setErrorMsg(e.message || "Não foi possível iniciar a varredura. Tente novamente.");
        }
    };

    // ============ RENDERERS ============

    const renderConfiguration = () => (
        <div className="flex items-start justify-between gap-6 animate-in fade-in duration-500">
            <div className="space-y-4 w-full">
                <p className="text-slate-600 text-sm max-w-lg">
                    Monitora menções, notícias e entrevistas para encontrar novas promessas ou cobranças.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                    {/* AGENT SELECTOR */}
                    <div className="col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                            Agente de Varredura
                        </label>
                        <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                            <SelectTrigger className="w-full bg-white border-slate-200 text-sm">
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                                {scanningAgents.map(agent => (
                                    <SelectItem key={agent.name} value={agent.name}>
                                        <div className="flex flex-col text-left">
                                            <span className="font-medium text-slate-800">{agent.display_name}</span>
                                            {agent.description && <span className="text-xs text-slate-500 truncate max-w-[200px]">{agent.description}</span>}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Selected Agent Info */}
                        {selectedAgent && (
                            <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-100 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                                <span className="text-[10px] text-slate-500">
                                    {scanningAgents.find(a => a.name === selectedAgent)?.description}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* TARGET SITES */}
                    <div className="col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                            Sites Alvo (Whitelisting)
                        </label>
                        <Input
                            placeholder="Ex: g1.globo.com, folha.uol.com.br"
                            value={targetSites}
                            onChange={(e) => setTargetSites(e.target.value)}
                            className="bg-white border-slate-200 text-sm"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">* Separe por vírgula. Deixe vazio para busca ampla.</p>
                    </div>

                    {/* MODE */}
                    <div className="col-span-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                            Modo
                        </label>
                        <div className="flex bg-slate-100 p-1 rounded-md">
                            {['focused', 'open'].map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setSearchMode(mode)}
                                    className={cn(
                                        "flex-1 py-1 text-xs font-medium rounded transition-all",
                                        searchMode === mode ? "bg-white shadow text-violet-600" : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    {mode === 'focused' ? 'Focado' : 'Aberto'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* MAX RESULTS */}
                    <div className="col-span-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex justify-between">
                            <span>Profundidade (Lim: {maxResults})</span>
                        </label>
                        <input
                            type="range"
                            min={5}
                            max={50}
                            step={5}
                            value={maxResults}
                            onChange={(e) => setMaxResults(Number(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-600 mt-2"
                        />
                    </div>
                </div>
            </div>

            <div className="text-xs text-gray-400 mb-2">DEBUG STATUS: {status}</div>
            <Button
                onClick={handleStartScan}
                className="min-w-[150px] mt-2"
                variant="secondary"
            >
                <Newspaper className="mr-2" weight="duotone" />
                Iniciar Varredura
            </Button>
        </div>
    );

    return (
        <div className="relative pl-8 border-l-2 border-transparent">
            {/* Timeline Node */}
            <div className={cn(
                "absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-white shadow-sm transition-colors",
                status === 'completed' ? 'bg-emerald-500' : 'bg-slate-300'
            )} />

            <h3 className="text-lg font-bold text-slate-800 mb-2">3. Monitoramento de Mídia</h3>

            <Card className="border-slate-200 shadow-sm opacity-90">
                <CardContent className="p-6">

                    {/* IDLE STATE: Show Config */}
                    {status === 'idle' && renderConfiguration()}

                    {/* RUNNING / COMPLETED: Show Progress */}
                    {(status === 'running' || status === 'completed') && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                            {/* If running, we prevent unmount by ALWAYS rendering ScanProgress when status is running OR completed */}
                            <ScanProgress
                                status={status}
                                logs={logs}
                                onComplete={() => { }}
                            />

                            {/* COMPLETED: Show Results */}
                            {status === 'completed' && (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 pt-4 border-t border-slate-100">
                                    {(results && results.length > 0) ? (
                                        <MediaResults results={{ items_found: results.length, details: results }} />
                                    ) : (
                                        /* EMPTY STATE */
                                        <div className="text-center py-8 bg-amber-50 rounded-xl border border-amber-200 border-dashed">
                                            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <WarningCircle className="w-6 h-6 text-amber-500" weight="duotone" />
                                            </div>
                                            <h4 className="text-sm font-bold text-slate-800">Nenhuma notícia encontrada</h4>
                                            <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">
                                                A varredura foi concluída, mas nenhuma notícia foi encontrada com os critérios atuais.
                                            </p>
                                            <div className="mt-4">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-xs border-amber-300 text-amber-800 hover:bg-amber-100"
                                                    onClick={() => setStatus('idle')}
                                                >
                                                    <MagnifyingGlass className="mr-2 w-3 h-3" /> Nova Busca
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ERROR STATE */}
                    {status === 'error' && (
                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-lg text-center">
                            <WarningCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
                            <p className="text-sm text-rose-700 font-medium">{errorMsg || "Erro desconhecido"}</p>
                            <Button variant="ghost" size="sm" onClick={() => setStatus('idle')} className="mt-2 text-rose-600 hover:bg-rose-100">
                                Tentar Novamente
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
