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
}

export function GeneratorDialog({ campaignId, trigger, onSuccess }: GeneratorDialogProps) {
    const [open, setOpen] = useState(false);
    const [personas, setPersonas] = useState<Persona[]>([]);
    const [selectedPersonaName, setSelectedPersonaName] = useState<string>("");
    const [loadingPersonas, setLoadingPersonas] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [runId, setRunId] = useState<string | null>(null);
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

    const handleGenerate = async () => {
        if (!selectedPersonaName) return;

        setGenerating(true);
        try {
            // POST para iniciar a Genesis
            const res = await fetch(`/api/campaign/${campaignId}/genesis`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ persona: selectedPersonaName }),
            });

            if (!res.ok) throw new Error("Falha ao iniciar geração");

            const data = await res.json();

            // Captura o run_id retornado pela API
            if (data.run_id) {
                setRunId(data.run_id);
            }

            toast({
                title: "IA Iniciada! 🚀",
                description: "Acompanhe o progresso no console abaixo.",
                variant: "default",
            });

            // Não fecha mais o dialog para o usuário ver o console
            // setOpen(false);
            if (onSuccess) onSuccess();
        } catch (error) {
            toast({
                title: "Erro",
                description: "Não foi possível iniciar a geração.",
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
                        Escolha um estrategista IA para analisar os dados da campanha e gerar um plano de ação.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Escolha o Estrategista</label>
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

                    {/* Console de Execução em Tempo Real */}
                    {runId && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
                            <label className="text-sm font-medium">Logs de Execução</label>
                            <ExecutionConsole runId={runId} campaignId={campaignId} />
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={generating}>
                        {runId ? "Fechar" : "Cancelar"}
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
