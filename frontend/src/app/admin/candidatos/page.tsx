"use client";

import React, { useState, useEffect } from "react";
import {
    Search,
    Download,
    ChevronDown,
    BarChart3,
    LayoutDashboard,
    Edit,
    Trash2,
    Loader2,
    Bot,
    Check,
    CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface Campaign {
    id: string;
    candidate_name: string;
    ballot_name: string;
    party: string;
    city: string;
    role: string;
    number: number;
    created_at: string;
    slug: string;
    metrics?: {
        ia_count: number;
        approved_count: number;
        has_plan: boolean;
    };
}

import { deleteCampaign } from "@/app/actions/delete-campaign";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CandidatosPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [candidates, setCandidates] = useState<Campaign[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createClient();
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        fetchCandidates();
    }, []);

    const fetchCandidates = async () => {
        try {
            const { data: campaigns, error } = await supabase
                .from("campaigns")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;

            // Enrich with metrics
            if (campaigns && campaigns.length > 0) {
                const campaignIds = campaigns.map(c => c.id);

                // 1. Fetch Strategies Counts
                const { data: strategies } = await supabase
                    .from("strategies")
                    .select("campaign_id, status")
                    .in("campaign_id", campaignIds);

                // 2. Fetch Runs (to check has_plan)
                const { data: runs } = await supabase
                    .from("analysis_runs")
                    .select("campaign_id")
                    .in("campaign_id", campaignIds);

                const enrichedCandidates = campaigns.map(c => {
                    const campStrategies = strategies?.filter(s => s.campaign_id === c.id) || [];
                    const campRuns = runs?.filter(r => r.campaign_id === c.id) || [];

                    return {
                        ...c,
                        metrics: {
                            ia_count: campStrategies.filter(s => s.status === 'suggested').length,
                            approved_count: campStrategies.filter(s => s.status === 'approved').length,
                            has_plan: campRuns.length > 0
                        }
                    };
                });

                setCandidates(enrichedCandidates);
            } else {
                setCandidates([]);
            }

        } catch (error) {
            console.error("Erro ao buscar candidatos:", error);
            toast({
                title: "Erro",
                description: "Não foi possível carregar a lista de candidatos.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Tem certeza que deseja excluir a campanha de ${name}? Esta ação é irreversível.`)) {
            return;
        }

        try {
            toast({ title: "Excluindo...", description: "Removendo campanha e dados associados." });
            const result = await deleteCampaign(id);

            if (result.success) {
                toast({ title: "Sucesso", description: "Campanha excluída com sucesso." });
                fetchCandidates(); // Recarregar lista
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({
                title: "Erro ao excluir",
                description: error.message || "Ocorreu um erro inesperado.",
                variant: "destructive",
            });
        }
    };

    // Filter candidates based on search query
    const filteredCandidates = candidates.filter(c =>
        c.candidate_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.ballot_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.number?.toString().includes(searchQuery)
    );

    const getInitials = (name: string) => {
        return name
            ?.split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase() || "??";
    };

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Candidatos Cadastrados</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Gestão e monitoramento de candidaturas ativas
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2 border-gray-300">
                        <Download className="h-4 w-4" />
                        Exportar Lista
                    </Button>
                    <Button
                        className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => router.push("/admin/candidatos/novo")}
                    >
                        Adicionar Candidato
                    </Button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Buscar por nome, número ou município..."
                        className="pl-10 h-10 border-gray-300"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button variant="outline" className="gap-2 border-gray-300 text-gray-700">
                    Todos os Partidos
                    <ChevronDown className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="gap-2 border-gray-300 text-gray-700">
                    Todos os Status
                    <ChevronDown className="h-4 w-4" />
                </Button>
            </div>

            {/* Table */}
            <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Foto
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Nome / Progresso
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Partido
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Município
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Cargo
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Ações
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                                            Carregando candidatos...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredCandidates.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                        Nenhum candidato encontrado.
                                    </td>
                                </tr>
                            ) : (
                                filteredCandidates.map((candidato) => (
                                    <tr key={candidato.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-4 w-16">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                <span className="text-sm font-semibold text-blue-700">
                                                    {getInitials(candidato.candidate_name)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-col gap-1.5">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {candidato.candidate_name}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {candidato.ballot_name || "-"} • Nº {candidato.number}
                                                    </div>
                                                </div>

                                                {/* KPIs / Placar */}
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200 px-1.5 py-0 h-5 text-[10px] gap-1 font-medium hover:bg-slate-200">
                                                        <Bot className="w-3 h-3" />
                                                        {candidato.metrics?.ia_count}
                                                    </Badge>
                                                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100 px-1.5 py-0 h-5 text-[10px] gap-1 font-medium hover:bg-emerald-100">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        {candidato.metrics?.approved_count} Aprov.
                                                    </Badge>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-700">
                                            {candidato.party || "-"}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-700">
                                            {candidato.city}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-700">
                                            {candidato.role}
                                        </td>
                                        <td className="px-4 py-4">
                                            <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
                                                Ativo
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span>
                                                                <Button
                                                                    size="sm"
                                                                    className={`h-8 text-xs px-3 ${!candidato.metrics?.has_plan ? 'bg-slate-300 text-slate-500 hover:bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                                                                    onClick={(e) => {
                                                                        if (!candidato.metrics?.has_plan) {
                                                                            e.preventDefault();
                                                                            return;
                                                                        }
                                                                        router.push(`/campaign/${candidato.id}/dashboard`);
                                                                    }}
                                                                    disabled={!candidato.metrics?.has_plan}
                                                                >
                                                                    <LayoutDashboard className="h-3.5 w-3.5 mr-1" />
                                                                    Dashboard
                                                                </Button>
                                                            </span>
                                                        </TooltipTrigger>
                                                        {!candidato.metrics?.has_plan && (
                                                            <TooltipContent>
                                                                <p>Gere a Análise IA primeiro no Setup</p>
                                                            </TooltipContent>
                                                        )}
                                                    </Tooltip>
                                                </TooltipProvider>

                                                <Link href={`/admin/campaign/${candidato.id}/setup`}>
                                                    <Button
                                                        size="sm"
                                                        className="h-8 bg-purple-600 hover:bg-purple-700 text-white text-xs px-3"
                                                    >
                                                        <BarChart3 className="h-3.5 w-3.5 mr-1" />
                                                        ⚙️ Setup IA
                                                    </Button>
                                                </Link>

                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600"
                                                    onClick={() => router.push(`/admin/candidatos/novo?id=${candidato.id}`)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                                                    onClick={() => handleDelete(candidato.id, candidato.candidate_name)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                        Mostrando <span className="font-semibold">{filteredCandidates.length}</span> candidatos
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="text-xs border-gray-300" disabled>
                            Anterior
                        </Button>
                        <Button size="sm" className="text-xs bg-blue-600 hover:bg-blue-700 text-white">
                            Página 1 de 1
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs border-gray-300" disabled>
                            Próxima
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
