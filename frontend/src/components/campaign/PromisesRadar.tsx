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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Crosshair,
    CheckCircle,
    Clock,
    XCircle,
    Warning,
    ArrowsClockwise,
    Eye,
    Sparkle,
    Newspaper,
    YoutubeLogo,
    InstagramLogo,
    ArrowSquareOut,
    ShieldCheck,
    Sword,
    ArrowRight,
    CalendarBlank,
    IdentificationBadge
} from "@phosphor-icons/react";

// ============ TYPES ============
interface Politician {
    id: string;
    name: string;
    slug: string;
    partido: string | null;
    tipo: string;
}

// ============ MOCK DATA ============
const MOCK_POLITICIANS: Politician[] = [
    { id: "candidate", name: "Carlos Pivetta (Você)", slug: "candidate", partido: "PL", tipo: "prefeito" },
];

const MOCK_PROMISES = [
    {
        id: "1",
        summary: "Construir 10 novas UBS em bairros periféricos",
        category: "Saúde",
        origin: "Plano de Governo",
        status: "cumprida",
        confidence: "high",
        lastUpdated: "2025-12-10T14:30:00Z",
        fullText: "Comprometo-me a construir 10 novas Unidades Básicas de Saúde (UBS) nos bairros periféricos da cidade, priorizando regiões com maior déficit de atendimento médico.",
        originalExcerpt: "\"...nos primeiros 100 dias, iniciaremos a construção de 10 UBS em áreas carentes...\"",
        originDate: "2024-08-15",
        // Timeline fields
        dataPromessa: "2024-08-15",
        dataPrimeiraEmenda: "2024-11-20",
        dataLicitacao: "2025-01-15",
        dataUltimaNoticia: "2025-12-08",
        executions: [
            { type: "Emenda Parlamentar", value: "R$ 5.000.000,00", beneficiary: "Secretaria de Saúde", date: "2024-11-20" },
            { type: "Licitação", value: "R$ 12.000.000,00", beneficiary: "Construtora ABC", date: "2025-01-15" },
        ],
        similarityScore: 0.92,
        aiJustification: "A promessa foi verificada como CUMPRIDA com base em 3 emendas parlamentares direcionadas à construção de UBS, totalizando R$ 17 milhões. Notícias do Jornal da Cidade confirmam a inauguração de 8 unidades até a presente data.",
        newsUrl: "https://example.com/noticias/ubs-inauguradas",
        videoUrl: "https://youtube.com/watch?v=example",
        postUrl: "https://instagram.com/p/example",
    },
    {
        id: "2",
        summary: "Dobrar o número de vagas em creches municipais",
        category: "Educação",
        origin: "Discurso de Campanha",
        status: "parcial",
        confidence: "medium",
        lastUpdated: "2025-12-08T10:15:00Z",
        fullText: "Vamos dobrar o número de vagas em creches municipais para atender todas as famílias que necessitam desse serviço essencial.",
        originalExcerpt: "\"...minha meta é dobrar as vagas em creches nos próximos 2 anos...\"",
        originDate: "2024-09-20",
        dataPromessa: "2024-09-20",
        dataPrimeiraEmenda: "2025-02-10",
        dataLicitacao: null,
        dataUltimaNoticia: "2025-11-15",
        executions: [
            { type: "Convênio", value: "R$ 3.000.000,00", beneficiary: "Rede Municipal de Ensino", date: "2025-02-10" },
        ],
        similarityScore: 0.78,
        aiJustification: "A promessa está PARCIALMENTE cumprida. Foi identificado aumento de 40% nas vagas, mas ainda abaixo da meta de 100%. Recursos alocados são insuficientes para atingir o objetivo completo.",
        newsUrl: "https://example.com/noticias/creches",
        videoUrl: null,
        postUrl: "https://instagram.com/p/creches",
    },
    {
        id: "3",
        summary: "Reduzir IPTU em 20% para imóveis residenciais",
        category: "Economia",
        origin: "Plano de Governo",
        status: "nao_iniciada",
        confidence: "high",
        lastUpdated: "2025-12-05T08:00:00Z",
        fullText: "Implementaremos uma redução de 20% no IPTU para todos os imóveis residenciais da cidade.",
        originalExcerpt: "\"...o IPTU será reduzido em 20% já no primeiro ano de mandato...\"",
        originDate: "2024-07-10",
        dataPromessa: "2024-07-10",
        dataPrimeiraEmenda: null,
        dataLicitacao: null,
        dataUltimaNoticia: null,
        executions: [],
        similarityScore: 0.95,
        aiJustification: "Nenhuma ação legislativa ou administrativa foi identificada para implementar esta promessa. Não há projetos de lei em tramitação relacionados à redução do IPTU.",
        newsUrl: null,
        videoUrl: null,
        postUrl: null,
    },
    {
        id: "4",
        summary: "Criar programa de renda mínima municipal",
        category: "Assistência Social",
        origin: "Entrevista",
        status: "desviada",
        confidence: "medium",
        lastUpdated: "2025-12-01T16:45:00Z",
        fullText: "Implantaremos o programa 'Renda Cidadã' para famílias em situação de vulnerabilidade.",
        originalExcerpt: "\"...vamos criar o Renda Cidadã, um programa de transferência de renda...\"",
        originDate: "2024-10-05",
        dataPromessa: "2024-10-05",
        dataPrimeiraEmenda: null,
        dataLicitacao: null,
        dataUltimaNoticia: "2025-03-20",
        executions: [],
        similarityScore: 0.45,
        aiJustification: "A promessa foi DESVIADA. O decreto que criaria o programa foi revogado 30 dias após sua publicação. Não há perspectiva de retomada segundo fontes oficiais.",
        newsUrl: "https://example.com/noticias/renda-minima-cancelada",
        videoUrl: null,
        postUrl: null,
    },
];

// ============ STATUS CONFIG ============
const STATUS_CONFIG = {
    cumprida: { label: "Cumprida", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle },
    parcial: { label: "Parcial", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
    nao_iniciada: { label: "Não Iniciada", color: "bg-slate-100 text-slate-700 border-slate-200", icon: XCircle },
    desviada: { label: "Desviada", color: "bg-red-100 text-red-700 border-red-200", icon: Warning },
};

const CONFIDENCE_CONFIG = {
    high: { label: "Alta", color: "text-emerald-600" },
    medium: { label: "Média", color: "text-amber-600" },
    low: { label: "Baixa", color: "text-red-600" },
};

// ============ COMPONENT ============
export function PromisesRadar({ campaignId, initialPoliticoId }: { campaignId: string, initialPoliticoId?: string }) {
    const [politicians, setPoliticians] = useState<Politician[]>(MOCK_POLITICIANS);
    const [selectedPolitician, setSelectedPolitician] = useState<string>(initialPoliticoId || "");
    const [isLoading, setIsLoading] = useState(false);
    const [processingStatus, setProcessingStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
    const [statusMessage, setStatusMessage] = useState("");
    const [selectedPromise, setSelectedPromise] = useState<typeof MOCK_PROMISES[0] | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Sync with prop - FORCE update when initialPoliticoId changes
    useEffect(() => {
        console.log('[PromisesRadar] initialPoliticoId changed to:', initialPoliticoId);
        if (initialPoliticoId) {
            console.log('[PromisesRadar] Setting selectedPolitician to:', initialPoliticoId);
            setSelectedPolitician(initialPoliticoId);
        }
    }, [initialPoliticoId]);

    // API data state (with mock fallback)
    const [promises, setPromises] = useState<typeof MOCK_PROMISES>(MOCK_PROMISES);
    const [stats, setStats] = useState({
        cumprida: MOCK_PROMISES.filter(p => p.status === "cumprida").length,
        parcial: MOCK_PROMISES.filter(p => p.status === "parcial").length,
        nao_iniciada: MOCK_PROMISES.filter(p => p.status === "nao_iniciada").length,
        desviada: MOCK_PROMISES.filter(p => p.status === "desviada").length,
    });
    const [useApiData, setUseApiData] = useState(false);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    // Fetch politicians list on mount
    useEffect(() => {
        const fetchPoliticians = async () => {
            try {
                const res = await fetch(`${API_URL}/api/politicians?campaign_id=${campaignId}&limit=50`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.length > 0) {
                        const mapped = data.map((p: any) => ({
                            id: p.slug || p.id,
                            name: `${p.name}${p.partido ? ` (${p.partido})` : ""}`,
                            slug: p.slug,
                            partido: p.partido,
                            tipo: p.tipo
                        }));
                        setPoliticians(mapped);
                        // If no selection yet, verify if initialPoliticoId matches one, else default to first
                        if (!selectedPolitician && !initialPoliticoId) {
                            // Only default if not driven by prop
                            // actually, let's just leave it empty or default to first?
                            // User wants context switch.
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to fetch politicians:", error);
            }
        };

        fetchPoliticians();
    }, [campaignId]); // Remove campaignId from dependencies to avoid loop? No it's fine.




    // Fetch radar data when politician changes
    useEffect(() => {
        if (!selectedPolitician) return;

        const fetchData = async () => {
            try {
                // Fetch summary
                const summaryRes = await fetch(
                    `${API_URL}/campaigns/${campaignId}/radar/${selectedPolitician}/summary`
                );
                if (summaryRes.ok) {
                    const summaryData = await summaryRes.json();
                    setStats({
                        cumprida: summaryData.cumprida || 0,
                        parcial: summaryData.parcial || 0,
                        nao_iniciada: summaryData.nao_iniciada || 0,
                        desviada: summaryData.desviada || 0,
                    });
                }

                // Fetch promises list
                const promisesRes = await fetch(
                    `${API_URL}/campaigns/${campaignId}/radar/${selectedPolitician}/promises`
                );
                if (promisesRes.ok) {
                    const promisesData = await promisesRes.json();
                    if (promisesData.length > 0) {
                        // Transform API data to match component format
                        const transformed = promisesData.map((p: any) => ({
                            id: p.id,
                            summary: p.resumo_promessa,
                            category: p.categoria,
                            origin: p.origem,
                            status: (p.status_atual || 'nao_iniciada').toLowerCase(),
                            confidence: (p.confiabilidade || 'MEDIA').toLowerCase(),
                            lastUpdated: p.last_updated_at || new Date().toISOString(),
                            fullText: p.resumo_promessa,
                            originalExcerpt: p.trecho_original || '',
                            originDate: p.data_promessa,
                            dataPromessa: p.data_promessa,
                            dataPrimeiraEmenda: p.data_primeira_emenda,
                            dataLicitacao: p.data_licitacao,
                            dataUltimaNoticia: p.data_ultima_noticia,
                            executions: (p.fontes || []).filter((f: any) => f.tipo === 'EMENDA' || f.tipo === 'LICITACAO').map((f: any) => ({
                                type: f.tipo,
                                value: f.valor_pago ? `R$ ${f.valor_pago.toLocaleString('pt-BR')}` : '-',
                                beneficiary: f.descricao || '-',
                                date: f.data || '-'
                            })),
                            similarityScore: p.score_similaridade || 0,
                            aiJustification: p.justificativa_ia || 'Sem justificativa disponível.',
                            newsUrl: (p.fontes || []).find((f: any) => f.tipo === 'NOTICIA')?.url || null,
                            videoUrl: (p.fontes || []).find((f: any) => f.tipo === 'VIDEO')?.url || null,
                            postUrl: (p.fontes || []).find((f: any) => f.tipo === 'POST')?.url || null,
                        }));
                        setPromises(transformed);
                        setUseApiData(true);
                    } else {
                        setPromises([]);
                        setUseApiData(true);
                    }
                }
            } catch (error) {
                console.log('[PromisesRadar] API fetch failed, using mock data:', error);
            }
        };

        fetchData();
    }, [campaignId, selectedPolitician]);

    const handleRefresh = async () => {
        if (!selectedPolitician) {
            setStatusMessage("Selecione um político primeiro");
            return;
        }

        setIsLoading(true);
        setProcessingStatus("processing");
        setStatusMessage("Extraindo promessas do plano de governo...");

        try {
            const res = await fetch(
                `${API_URL}/campaigns/${campaignId}/radar/${selectedPolitician}/refresh-phase1`,
                { method: 'POST' }
            );

            if (res.ok) {
                const data = await res.json();
                setProcessingStatus("success");
                setStatusMessage(`✅ ${data.message || `${data.promises_inseridas} promessas extraídas`}`);

                // Refetch data
                setTimeout(async () => {
                    const summaryRes = await fetch(`${API_URL}/campaigns/${campaignId}/radar/${selectedPolitician}/summary`);
                    if (summaryRes.ok) {
                        const summaryData = await summaryRes.json();
                        setStats({
                            cumprida: summaryData.cumprida || 0,
                            parcial: summaryData.parcial || 0,
                            nao_iniciada: summaryData.nao_iniciada || 0,
                            desviada: summaryData.desviada || 0,
                        });
                    }

                    const promisesRes = await fetch(`${API_URL}/campaigns/${campaignId}/radar/${selectedPolitician}/promises`);
                    if (promisesRes.ok) {
                        const promisesData = await promisesRes.json();
                        const transformed = promisesData.map((p: any) => ({
                            id: p.id,
                            summary: p.resumo_promessa,
                            category: p.categoria,
                            origin: p.origem,
                            status: (p.status_atual || 'nao_iniciada').toLowerCase(),
                            confidence: (p.confiabilidade || 'MEDIA').toLowerCase(),
                            lastUpdated: p.last_updated_at || new Date().toISOString(),
                            fullText: p.resumo_promessa,
                            originalExcerpt: p.trecho_original || '',
                            originDate: p.data_promessa,
                            dataPromessa: p.data_promessa,
                            dataPrimeiraEmenda: null,
                            dataLicitacao: null,
                            dataUltimaNoticia: null,
                            executions: [],
                            similarityScore: 0,
                            aiJustification: 'Promessa recém-extraída. Verificação pendente.',
                            newsUrl: null,
                            videoUrl: null,
                            postUrl: null,
                        }));
                        setPromises(transformed);
                    }
                }, 500);
            } else {
                const err = await res.json();
                setProcessingStatus("error");
                setStatusMessage(`❌ ${err.detail || "Erro ao processar"}`);
            }
        } catch (error) {
            setProcessingStatus("error");
            setStatusMessage(`❌ Erro de conexão: ${error}`);
        } finally {
            setIsLoading(false);
            // Reset status after 5 seconds
            setTimeout(() => {
                setProcessingStatus("idle");
                setStatusMessage("");
            }, 5000);
        }
    };

    const openDetails = (promise: typeof MOCK_PROMISES[0]) => {
        setSelectedPromise(promise);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200">
                        <Crosshair className="h-6 w-6 text-white" weight="duotone" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Radar de Promessas</h1>
                        <p className="text-sm text-slate-500">Monitoramento de compromissos de campanha</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Select value={selectedPolitician} onValueChange={setSelectedPolitician}>
                        <SelectTrigger className="w-[250px]">
                            <SelectValue placeholder="Selecione o político" />
                        </SelectTrigger>
                        <SelectContent>
                            {politicians.map((pol) => (
                                <SelectItem key={pol.id} value={pol.id}>
                                    {pol.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        onClick={handleRefresh}
                        disabled={isLoading || !selectedPolitician}
                        className="bg-violet-600 hover:bg-violet-700"
                    >
                        <ArrowsClockwise className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} weight="bold" />
                        {isLoading ? "Processando..." : "Atualizar Radar"}
                    </Button>
                </div>
            </div>

            {/* Status Message */}
            {statusMessage && (
                <div className={`p-4 rounded-xl border ${processingStatus === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                    processingStatus === "error" ? "bg-red-50 border-red-200 text-red-700" :
                        "bg-violet-50 border-violet-200 text-violet-700"
                    }`}>
                    <p className="text-sm font-medium">{statusMessage}</p>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-600 flex items-center gap-2">
                            <CheckCircle weight="duotone" className="h-4 w-4" />
                            Cumpridas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-emerald-700">{stats.cumprida}</div>
                    </CardContent>
                </Card>

                <Card className="border-amber-100 bg-gradient-to-br from-amber-50 to-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-amber-600 flex items-center gap-2">
                            <Clock weight="duotone" className="h-4 w-4" />
                            Parciais
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-amber-700">{stats.parcial}</div>
                    </CardContent>
                </Card>

                <Card className="border-slate-100 bg-gradient-to-br from-slate-50 to-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                            <XCircle weight="duotone" className="h-4 w-4" />
                            Não Iniciadas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-slate-700">{stats.nao_iniciada}</div>
                    </CardContent>
                </Card>

                <Card className="border-red-100 bg-gradient-to-br from-red-50 to-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
                            <Warning weight="duotone" className="h-4 w-4" />
                            Desviadas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-red-700">{stats.desviada}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Promises Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-3">
                        Lista de Promessas
                        {selectedPolitician && (
                            <span className="text-sm font-normal px-3 py-1 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
                                📋 {politicians.find(p => p.id === selectedPolitician)?.name || selectedPolitician}
                            </span>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Promessa</th>
                                    <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Categoria</th>
                                    <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Origem</th>
                                    <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                                    <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Confiança</th>
                                    <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Última Atualização</th>
                                    <th className="text-center py-3 px-4 text-xs font-bold text-slate-500 uppercase">Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {promises.map((promise) => {
                                    const statusConfig = STATUS_CONFIG[promise.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.nao_iniciada;
                                    const StatusIcon = statusConfig.icon;
                                    const confidenceConfig = CONFIDENCE_CONFIG[promise.confidence as keyof typeof CONFIDENCE_CONFIG] || CONFIDENCE_CONFIG.medium;

                                    return (
                                        <tr key={promise.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 px-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-medium text-slate-800 text-sm">{promise.summary}</span>
                                                    {/* Enterprise Feature: Origin Badge */}
                                                    {(promise.origin || selectedPolitician) && (
                                                        <div className="flex items-center gap-1">
                                                            <IdentificationBadge className="h-3 w-3 text-slate-400" />
                                                            <span className="text-[10px] uppercase font-bold text-slate-400">
                                                                {/* If we have source_type or similar, use it. Otherwise use origin + politician context */}
                                                                {promise.origin}
                                                                {selectedPolitician && politicians.find(p => p.id === selectedPolitician)?.name.includes("Weber") ? " • WEBER MANGA" :
                                                                    selectedPolitician && politicians.find(p => p.id === selectedPolitician)?.name.includes("Pivetta") ? " • PIVETTA" : ""}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                                                    {promise.category}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className="text-sm text-slate-500">{promise.origin}</span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${statusConfig.color}`}>
                                                    <StatusIcon weight="fill" className="h-3 w-3" />
                                                    {statusConfig.label}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className={`text-xs font-bold ${confidenceConfig.color}`}>
                                                    {confidenceConfig.label}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className="text-xs text-slate-500">
                                                    {new Date(promise.lastUpdated).toLocaleDateString('pt-BR', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openDetails(promise)}
                                                    className="text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                                                >
                                                    <Eye weight="duotone" className="h-4 w-4 mr-1" />
                                                    Detalhes
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Details Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    {selectedPromise && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-xl">{selectedPromise.summary}</DialogTitle>
                                <DialogDescription>
                                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_CONFIG[selectedPromise.status as keyof typeof STATUS_CONFIG].color}`}>
                                        {STATUS_CONFIG[selectedPromise.status as keyof typeof STATUS_CONFIG].label}
                                    </span>
                                    <span className="ml-2 text-slate-400">•</span>
                                    <span className="ml-2 text-slate-500">Score: {(selectedPromise.similarityScore * 100).toFixed(0)}%</span>
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6 mt-4">
                                {/* Full Text */}
                                <div>
                                    <h4 className="text-sm font-bold text-slate-700 mb-2">Resumo Completo</h4>
                                    <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-lg">{selectedPromise.fullText}</p>
                                </div>

                                {/* Original Excerpt */}
                                <div>
                                    <h4 className="text-sm font-bold text-slate-700 mb-2">Trecho Original</h4>
                                    <blockquote className="text-sm text-slate-600 italic border-l-4 border-violet-300 pl-4 py-2 bg-violet-50/50 rounded-r-lg">
                                        {selectedPromise.originalExcerpt}
                                    </blockquote>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Fonte: {selectedPromise.origin} • {selectedPromise.originDate}
                                    </p>
                                </div>

                                {/* Timeline Section */}
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                        <CalendarBlank weight="duotone" className="h-4 w-4" />
                                        Linha do Tempo
                                    </h4>
                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                        {selectedPromise.dataPromessa && (
                                            <>
                                                <span className="bg-violet-100 text-violet-700 px-2 py-1 rounded-full font-medium">
                                                    Promessa ({new Date(selectedPromise.dataPromessa).toLocaleDateString('pt-BR')})
                                                </span>
                                            </>
                                        )}
                                        {selectedPromise.dataPrimeiraEmenda && (
                                            <>
                                                <ArrowRight className="h-3 w-3 text-slate-400" />
                                                <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">
                                                    1ª Emenda ({new Date(selectedPromise.dataPrimeiraEmenda).toLocaleDateString('pt-BR')})
                                                </span>
                                            </>
                                        )}
                                        {!selectedPromise.dataPrimeiraEmenda && selectedPromise.dataPromessa && (
                                            <>
                                                <ArrowRight className="h-3 w-3 text-slate-400" />
                                                <span className="bg-slate-200 text-slate-500 px-2 py-1 rounded-full font-medium italic">
                                                    (sem emenda)
                                                </span>
                                            </>
                                        )}
                                        {selectedPromise.dataLicitacao && (
                                            <>
                                                <ArrowRight className="h-3 w-3 text-slate-400" />
                                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                                                    Licitação ({new Date(selectedPromise.dataLicitacao).toLocaleDateString('pt-BR')})
                                                </span>
                                            </>
                                        )}
                                        {selectedPromise.dataUltimaNoticia && (
                                            <>
                                                <ArrowRight className="h-3 w-3 text-slate-400" />
                                                <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                                                    Última Notícia ({new Date(selectedPromise.dataUltimaNoticia).toLocaleDateString('pt-BR')})
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Executions */}
                                {selectedPromise.executions.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-700 mb-2">Execuções Associadas</h4>
                                        <div className="space-y-2">
                                            {selectedPromise.executions.map((exec, idx) => (
                                                <div key={idx} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg text-sm">
                                                    <div>
                                                        <span className="font-medium text-slate-700">{exec.type}</span>
                                                        <span className="text-slate-400 mx-2">•</span>
                                                        <span className="text-slate-500">{exec.beneficiary}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="font-bold text-emerald-600">{exec.value}</span>
                                                        <span className="text-slate-400 text-xs ml-2">{exec.date}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* AI Justification */}
                                <div className="bg-gradient-to-br from-violet-50 to-purple-50 p-4 rounded-xl border border-violet-100">
                                    <h4 className="text-sm font-bold text-violet-700 mb-2 flex items-center gap-2">
                                        <Sparkle weight="fill" className="h-4 w-4" />
                                        Justificativa da IA
                                    </h4>
                                    <p className="text-sm text-slate-700">{selectedPromise.aiJustification}</p>
                                </div>

                                {/* Action Buttons */}
                                <div className="border-t pt-4 space-y-3">
                                    <div className="flex gap-2">
                                        <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                                            <ShieldCheck weight="duotone" className="h-4 w-4 mr-2" />
                                            Gerar Defesa
                                        </Button>
                                        <Button className="flex-1 bg-red-600 hover:bg-red-700">
                                            <Sword weight="duotone" className="h-4 w-4 mr-2" />
                                            Gerar Ataque
                                        </Button>
                                    </div>

                                    <div className="flex gap-2">
                                        {selectedPromise.newsUrl && (
                                            <Button variant="outline" size="sm" className="flex-1" asChild>
                                                <a href={selectedPromise.newsUrl} target="_blank" rel="noopener noreferrer">
                                                    <Newspaper weight="duotone" className="h-4 w-4 mr-1" />
                                                    Ver Notícia
                                                    <ArrowSquareOut className="h-3 w-3 ml-1" />
                                                </a>
                                            </Button>
                                        )}
                                        {selectedPromise.videoUrl && (
                                            <Button variant="outline" size="sm" className="flex-1 text-red-600 border-red-200 hover:bg-red-50" asChild>
                                                <a href={selectedPromise.videoUrl} target="_blank" rel="noopener noreferrer">
                                                    <YoutubeLogo weight="duotone" className="h-4 w-4 mr-1" />
                                                    Ver Vídeo
                                                    <ArrowSquareOut className="h-3 w-3 ml-1" />
                                                </a>
                                            </Button>
                                        )}
                                        {selectedPromise.postUrl && (
                                            <Button variant="outline" size="sm" className="flex-1 text-pink-600 border-pink-200 hover:bg-pink-50" asChild>
                                                <a href={selectedPromise.postUrl} target="_blank" rel="noopener noreferrer">
                                                    <InstagramLogo weight="duotone" className="h-4 w-4 mr-1" />
                                                    Ver Post
                                                    <ArrowSquareOut className="h-3 w-3 ml-1" />
                                                </a>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
