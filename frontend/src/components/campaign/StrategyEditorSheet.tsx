"use client";


import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { ExamplesRenderer } from "@/components/tasks/ExamplesRenderer";

interface Strategy {
    id: string;
    title: string;
    description: string;
    pillar: string;
    phase: string;
    status: "suggested" | "approved" | "published" | "executed";
    examples?: string[];
    campaign_id: string;
}

interface StrategyEditorSheetProps {
    strategy: Strategy | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedStrategy: Strategy) => void;
}

const PILLARS = [
    "Credibilidade",
    "Proximidade",
    "Transformação",
    "Segurança",
    "Competência",
    "Saúde",
    "Educação",
    "Mobilidade",
    "Outro"
];

const PHASES = [
    "Pré-Campanha",
    "1ª Fase",
    "2ª Fase",
    "Final",
    "Diagnóstico",
    "Campanha de Rua",
    "Reta Final"
];

export function StrategyEditorSheet({ strategy, isOpen, onClose, onSave }: StrategyEditorSheetProps) {
    const [editedStrategy, setEditedStrategy] = useState<Strategy | null>(strategy);
    const [saving, setSaving] = useState(false);
    const supabase = createClient();
    const { toast } = useToast();

    useEffect(() => {
        setEditedStrategy(strategy);
    }, [strategy]);

    const handleSave = async () => {
        if (!editedStrategy) return;

        setSaving(true);
        console.log('💾 [SAVE] Updating strategy:', editedStrategy.id);

        const { error } = await supabase
            .from("strategies")
            .update({
                title: editedStrategy.title,
                description: editedStrategy.description,
                pillar: editedStrategy.pillar,
                phase: editedStrategy.phase,
            })
            .eq("id", editedStrategy.id);

        if (error) {
            console.error('❌ [ERROR] Failed to update strategy:', error);
            toast({
                title: "Erro ao salvar",
                description: error.message,
                variant: "destructive",
            });
        } else {
            console.log('✅ [SUCCESS] Strategy updated');
            toast({
                title: "✅ Salvo!",
                description: "Estratégia atualizada com sucesso.",
            });
            onSave(editedStrategy);
            onClose();
        }

        setSaving(false);
    };

    if (!editedStrategy) return null;

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
                <SheetHeader>
                    <div className="flex items-center justify-between">
                        <SheetTitle>Editor de Estratégia</SheetTitle>
                        <Badge variant={editedStrategy.status === "approved" ? "default" : "secondary"}>
                            {editedStrategy.status === "approved" ? "✅ Aprovado" : "📝 Sugerido"}
                        </Badge>
                    </div>
                    <SheetDescription>
                        Edite os detalhes da estratégia gerada pela IA
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-6 py-6">
                    {/* Título */}
                    <div className="space-y-2">
                        <Label htmlFor="title">Título</Label>
                        <Input
                            id="title"
                            value={editedStrategy.title}
                            onChange={(e) => setEditedStrategy({ ...editedStrategy, title: e.target.value })}
                            placeholder="Ex: Evento com Lideranças Comunitárias"
                        />
                    </div>

                    {/* Descrição */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-slate-600 font-medium">
                                Descrição Completa
                            </Label>
                            <Textarea
                                id="description"
                                value={editedStrategy.description}
                                onChange={(e) => setEditedStrategy({ ...editedStrategy, description: e.target.value })}
                                placeholder="Descreva a estratégia em detalhes..."
                                className="min-h-[180px] text-base leading-relaxed bg-slate-50/50 border-slate-200 focus:bg-white transition-all resize-y"
                            />
                        </div>

                        {/* Seção de Exemplos Práticos da IA */}
                        {strategy?.examples && strategy.examples.length > 0 && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <ExamplesRenderer
                                    examples={strategy.examples}
                                    mode="workbench"
                                    onInsert={(text) => {
                                        const currentDesc = editedStrategy.description || "";
                                        const separator = currentDesc ? "\n\n" : "";
                                        const newText = currentDesc + separator + text;
                                        setEditedStrategy({ ...editedStrategy, description: newText });
                                        toast({
                                            title: "Exemplo inserido",
                                            description: "O texto foi adicionado à descrição.",
                                        });
                                    }}
                                    maxPreview={3}
                                />
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {editedStrategy.description.length} caracteres
                    </p>

                    {/* Pilar */}
                    <div className="space-y-2">
                        <Label htmlFor="pillar">Pilar Estratégico</Label>
                        <Select
                            value={editedStrategy.pillar}
                            onValueChange={(value) => setEditedStrategy({ ...editedStrategy, pillar: value })}
                        >
                            <SelectTrigger id="pillar">
                                <SelectValue placeholder="Selecione um pilar" />
                            </SelectTrigger>
                            <SelectContent>
                                {PILLARS.map((pillar) => (
                                    <SelectItem key={pillar} value={pillar}>
                                        {pillar}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Fase */}
                    <div className="space-y-2">
                        <Label htmlFor="phase">Fase da Campanha</Label>
                        <Select
                            value={editedStrategy.phase}
                            onValueChange={(value) => setEditedStrategy({ ...editedStrategy, phase: value })}
                        >
                            <SelectTrigger id="phase">
                                <SelectValue placeholder="Selecione uma fase" />
                            </SelectTrigger>
                            <SelectContent>
                                {PHASES.map((phase) => (
                                    <SelectItem key={phase} value={phase}>
                                        {phase}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <SheetFooter>
                    <Button variant="outline" onClick={onClose} disabled={saving}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Salvar Alterações
                            </>
                        )}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
