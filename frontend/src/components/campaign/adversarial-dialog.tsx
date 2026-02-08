"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ShieldAlert, Target, Zap, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface AdversarialDialogProps {
    campaignId: string;
}

interface AdversarialWeakness {
    weakness_point: string;
    competitor_quote: string;
    our_counter_narrative: string;
    risk_level: 'Low' | 'Medium' | 'High';
}

interface AdversarialReport {
    competitor_name: string;
    analysis_summary: string;
    weaknesses: AdversarialWeakness[];
}

export function AdversarialDialog({ campaignId }: AdversarialDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [competitors, setCompetitors] = useState<{ id: string; name: string }[]>([]);
    const [selectedCompetitorId, setSelectedCompetitorId] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<AdversarialReport | null>(null);
    const { toast } = useToast();
    const supabase = createClient();

    useEffect(() => {
        if (isOpen) {
            fetchCompetitors();
        }
    }, [isOpen]);

    const fetchCompetitors = async () => {
        if (!campaignId) return;

        try {
            // 1. Identifica o Cargo do Candidato
            const { data: campaign, error: campError } = await supabase
                .from("campaigns")
                .select("role, city")
                .eq("id", campaignId)
                .single();

            if (campError || !campaign) {
                console.error("Erro ao buscar campanha:", campError);
                return;
            }

            const role = campaign.role ? campaign.role.toLowerCase() : "";
            const isLocalElection = role.includes("prefeito") || role.includes("vereador");

            if (isLocalElection && campaign.city) {
                // LÓGICA 1: Eleição Municipal -> Busca Políticos da Base Global (Mesma Cidade)

                // A. Busca ID da cidade
                const { data: cityData } = await supabase
                    .from("cities")
                    .select("id")
                    .ilike("name", campaign.city) // Match por nome
                    .single();

                if (cityData) {
                    // B. Busca Políticos dessa cidade
                    const { data: politicians } = await supabase
                        .from("politicians")
                        .select("id, name, partido, tipo")
                        .eq("city_id", cityData.id);

                    if (politicians) {
                        // Formata para o select
                        const formatted = politicians.map(p => ({
                            id: p.id,
                            name: `${p.name} (${p.partido || 'N/A'}) - ${p.tipo || 'Político'}`
                        }));
                        setCompetitors(formatted);
                        return; // Retorna pois já carregou
                    }
                }
            }

            // LÓGICA 2: Outros ou Fallback -> Busca Concorrentes Manuais
            const { data: manualCompetitors } = await supabase
                .from("competitors")
                .select("id, name")
                .eq("campaign_id", campaignId);

            if (manualCompetitors) {
                setCompetitors(manualCompetitors);
            }

        } catch (error) {
            console.error("Erro ao carregar concorrentes:", error);
        }
    };

    const handleAnalyze = async () => {
        if (!selectedCompetitorId) return;
        setLoading(true);
        setReport(null);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/competitor/${selectedCompetitorId}/analyze`, {
                method: 'POST'
            });

            if (!res.ok) throw new Error("Falha na análise");

            const data = await res.json();
            if (data.report) {
                setReport(data.report);
                toast({ title: "Análise Concluída", description: "Relatório de contra-inteligência gerado." });
            } else {
                toast({ title: "Aviso", description: "O motor não retornou um relatório estruturado. Verifique se o concorrente tem PDF." });
            }

        } catch (error) {
            console.error(error);
            toast({ title: "Erro", description: "Não foi possível realizar a análise.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'High': return 'text-red-600 bg-red-50 border-red-200';
            case 'Medium': return 'text-amber-600 bg-amber-50 border-amber-200';
            default: return 'text-blue-600 bg-blue-50 border-blue-200';
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="destructive"
                    className="shadow-lg shadow-red-200 hover:shadow-red-300 transition-all gap-2 font-bold"
                >
                    <ShieldAlert className="h-4 w-4" />
                    Sala de Guerra (War Room)
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-6 border-b bg-slate-50">
                    <DialogTitle className="flex items-center gap-2 text-2xl text-slate-800">
                        <Target className="h-6 w-6 text-red-600" />
                        Motor Adversário (Counter-Intel)
                    </DialogTitle>
                    <DialogDescription>
                        A IA analisa o PDF do concorrente em busca de contradições e gera vacinas narrativas.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col">
                    {!report ? (
                        <div className="p-8 flex flex-col items-center justify-center h-full space-y-6">
                            <div className="w-full max-w-sm space-y-4">
                                <label className="text-sm font-medium text-slate-700">Selecione o Alvo:</label>
                                <Select value={selectedCompetitorId} onValueChange={setSelectedCompetitorId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Escolha um concorrente..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {competitors.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Button
                                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                                    size="lg"
                                    onClick={handleAnalyze}
                                    disabled={!selectedCompetitorId || loading}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Analisando Vulnerabilidades...
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="mr-2 h-4 w-4" />
                                            INICIAR ATAQUE LÓGICO
                                        </>
                                    )}
                                </Button>
                            </div>
                            {loading && (
                                <p className="text-sm text-slate-400 animate-pulse text-center max-w-md">
                                    Lendo plano de governo, cruzando vetores semânticos e formulando contra-narrativas...
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col h-full bg-slate-50/50">
                            <div className="p-6 border-b bg-white shadow-sm flex justify-between items-center">
                                <div>
                                    <h2 className="font-bold text-lg text-slate-800">Relatório: {report.competitor_name}</h2>
                                    <p className="text-sm text-slate-500 line-clamp-1">{report.analysis_summary}</p>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => setReport(null)}>Nova Análise</Button>
                            </div>

                            <ScrollArea className="flex-1 p-6">
                                <div className="space-y-6">
                                    {report.weaknesses.map((weakness, idx) => (
                                        <Card key={idx} className="border-l-4 border-l-red-500 overflow-hidden">
                                            <CardHeader className="bg-white pb-3">
                                                <CardTitle className="flex justify-between items-start gap-4">
                                                    <span className="text-lg font-bold text-slate-800">
                                                        #{idx + 1} {weakness.weakness_point}
                                                    </span>
                                                    <span className={`text-xs px-2 py-1 rounded-full border font-bold ${getRiskColor(weakness.risk_level)}`}>
                                                        Risco: {weakness.risk_level}
                                                    </span>
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4 pt-0">
                                                <div className="bg-slate-50 p-3 rounded-md border border-slate-100 mt-4">
                                                    <p className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                                                        <AlertTriangle className="h-3 w-3" /> O que eles disseram (Fonte)
                                                    </p>
                                                    <p className="text-sm italic text-slate-600">"{weakness.competitor_quote}"</p>
                                                </div>

                                                <div className="bg-green-50 p-4 rounded-md border border-green-100">
                                                    <p className="text-xs font-bold text-green-700 uppercase mb-1 flex items-center gap-1">
                                                        <Zap className="h-3 w-3" /> Nossa Resposta (Vacina)
                                                    </p>
                                                    <p className="text-base font-medium text-slate-800 leading-relaxed">
                                                        {weakness.our_counter_narrative}
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
