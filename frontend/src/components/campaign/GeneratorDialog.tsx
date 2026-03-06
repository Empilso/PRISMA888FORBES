"use client";

import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Bot } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { ExecutionConsole } from "@/components/admin/ExecutionConsole";

interface Persona {
    id: string;
    name: string;
    display_name: string;
    description: string;
    is_active: boolean;
}

interface GeneratorDialogProps {
    campaignId: string;
    trigger?: React.ReactNode;
    onSuccess?: () => void;
    onRunStarted?: (runId: string) => void;
}

export function GeneratorDialog({ campaignId, trigger, onSuccess, onRunStarted }: GeneratorDialogProps) {
    const [open, setOpen] = useState(false);
    const [personas, setPersonas] = useState<Persona[]>([]);
    const [selectedPersonaName, setSelectedPersonaName] = useState<string>("");
    const [loadingPersonas, setLoadingPersonas] = useState(false);
    const [generating, setGenerating] = useState(false);
    const { toast } = useToast();
    const supabase = createClient();

    // Fetch Personas ao abrir o modal
    useEffect(() => {
        if (open) {
            fetchPersonas();
        }
    }, [open]);

    const fetchPersonas = async () => {
        setLoadingPersonas(true);
        try {
            const { data, error } = await supabase
                .from('personas')
                .select('id, name, display_name, description, is_active')
                .eq('is_active', true);

            if (error) throw error;

            if (data) {
                setPersonas(data);
            }
        } catch (error) {
            console.error("Erro ao buscar personas", error);
            toast({
                title: "Erro",
                description: "Não foi possível carregar os estrategistas.",
                variant: "destructive",
            });
        } finally {
            setLoadingPersonas(false);
        }
    };

    const [strategyMode, setStrategyMode] = useState<string>("territory");

    // Fetch initial strategy mode
    useEffect(() => {
        if (open && campaignId) {
            const fetchMode = async () => {
                const { data } = await supabase.from("campaigns").select("strategy_mode").eq("id", campaignId).single();
                if (data?.strategy_mode) {
                    setStrategyMode(data.strategy_mode);
                }
            };
            fetchMode();
        }
    }, [open, campaignId]);

    const handleGenerate = async () => {
        if (!selectedPersonaName) return;

        setGenerating(true);
        try {
            // 1. Salvar o Modo de Estratégia Escolhido (Tentativa Otimista)
            try {
                const { error: updateError } = await supabase
                    .from("campaigns")
                    .update({ strategy_mode: strategyMode })
                    .eq("id", campaignId);

                if (updateError) {
                    // Se falhar (ex: coluna não existe pois migration não rodou), logamos mas NÃO paramos.
                    // A geração vai acontecer, só não salvou a preferência para o futuro.
                    console.warn("⚠️ Não foi possível salvar o modo de estratégia (Schema desatualizado?):", updateError);
                    toast({
                        title: "Aviso de Banco de Dados",
                        description: "Sua escolha foi aplicada nesta análise, mas não pôde ser salva como padrão.",
                        variant: "default", // Não é erro crítico
                    });
                }
            } catch (ignoredDbError) {
                console.warn("⚠️ Erro ignorado ao salvar modo:", ignoredDbError);
            }

            // Continua mesmo com erro no passo 1...

            // 2. Iniciar a Genesis
            // Enviamos o strategyMode também no corpo para garantir que a IA use o valor correto
            // mesmo que o salvamento no banco tenha falhado.
            const res = await fetch(`/api/campaign/${campaignId}/genesis`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "ngrok-skip-browser-warning": "true"
                },
                body: JSON.stringify({
                    persona: selectedPersonaName,
                    strategy_mode: strategyMode
                }),
            });

            if (!res.ok) throw new Error("Falha ao iniciar geração");

            const data = await res.json();

            // Captura o run_id retornado pela API
            if (data.run_id && onRunStarted) {
                onRunStarted(data.run_id);
            }

            toast({
                title: "IA Iniciada! 🚀",
                description: `Estratégia: ${strategyMode.toUpperCase()}. Acompanhe o progresso.`,
                variant: "default",
            });

            setOpen(false);
        } catch (error: any) {
            toast({
                title: "Erro",
                description: error.message || "Não foi possível iniciar a geração.",
                variant: "destructive",
            });
        } finally {
            setGenerating(false);
        }
    };

    const selectedPersona = personas.find((p) => p.name === selectedPersonaName);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-0 shadow-lg transition-all hover:scale-105">
                        <Sparkles className="h-4 w-4" />
                        Gerar Nova Análise
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Bot className="h-6 w-6 text-purple-600" />
                        Configurar Inteligência
                    </DialogTitle>
                    <DialogDescription>
                        Escolha um estrategista IA e defina o foco da campanha.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* SELETOR DE ESTRATEGISTA */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">1. Escolha o Estrategista</label>
                        <Select
                            value={selectedPersonaName}
                            onValueChange={setSelectedPersonaName}
                            disabled={loadingPersonas || generating}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={loadingPersonas ? "Carregando estrategistas..." : "Selecione uma persona..."} />
                            </SelectTrigger>
                            <SelectContent>
                                {personas.map((p) => (
                                    <SelectItem key={p.id} value={p.name}>
                                        {p.display_name || p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedPersona && (
                        <div className="bg-muted/50 p-4 rounded-lg border text-sm space-y-2 animate-in fade-in slide-in-from-top-2">
                            <p className="font-medium text-primary">Sobre {selectedPersona.display_name || selectedPersona.name}:</p>
                            <p className="text-muted-foreground text-xs">{selectedPersona.description}</p>
                        </div>
                    )}

                    {/* SELETOR DE MODO DE ESTRATÉGIA */}
                    <div className="space-y-2 pt-2 border-t">
                        <label className="text-sm font-medium">2. Foco da Estratégia (Arquétipo)</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div
                                className={`cursor-pointer rounded-lg border p-3 hover:border-purple-500 transition-all ${strategyMode === 'territory' ? 'bg-purple-50 border-purple-600 ring-1 ring-purple-600' : 'bg-card'}`}
                                onClick={() => setStrategyMode('territory')}
                            >
                                <div className="font-semibold text-sm mb-1 text-purple-900">🏙️ Território</div>
                                <div className="text-[10px] text-muted-foreground leading-tight">
                                    Para Prefeitos e Vereadores de Bairro. Foco em zeladoria e geografia.
                                </div>
                            </div>

                            <div
                                className={`cursor-pointer rounded-lg border p-3 hover:border-blue-500 transition-all ${strategyMode === 'structural' ? 'bg-blue-50 border-blue-600 ring-1 ring-blue-600' : 'bg-card'}`}
                                onClick={() => setStrategyMode('structural')}
                            >
                                <div className="font-semibold text-sm mb-1 text-blue-900">🤝 Estrutura</div>
                                <div className="text-[10px] text-muted-foreground leading-tight">
                                    Para Deputados de Base e Dobradinhas. Foco em alianças e líderes.
                                </div>
                            </div>

                            <div
                                className={`cursor-pointer rounded-lg border p-3 hover:border-amber-500 transition-all ${strategyMode === 'ideological' ? 'bg-amber-50 border-amber-600 ring-1 ring-amber-600' : 'bg-card'}`}
                                onClick={() => setStrategyMode('ideological')}
                            >
                                <div className="font-semibold text-sm mb-1 text-amber-900">📣 Opinião</div>
                                <div className="text-[10px] text-muted-foreground leading-tight">
                                    Para Voto Ideológico/Causa. Foco em redes sociais e temas.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={generating}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleGenerate}
                        disabled={!selectedPersonaName || generating}
                        className="bg-purple-600 hover:bg-purple-700"
                    >
                        {generating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Iniciando...
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Iniciar Geração
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
