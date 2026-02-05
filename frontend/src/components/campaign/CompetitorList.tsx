"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash, Plus, ShieldAlert, Users, FileSpreadsheet, FileText, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface CompetitorFile {
    name: string;
    type: 'csv' | 'pdf';
    rows?: number;
    chunks?: number;
    pages?: number;
}

interface Competitor {
    id: string;
    name: string;
    party: string;
    risk_level: 'high' | 'medium' | 'low';
    color: string;
    files?: CompetitorFile[];
}

interface CompetitorListProps {
    campaignId: string;
}

export function CompetitorList({ campaignId }: CompetitorListProps) {
    const supabase = createClient();
    const { toast } = useToast();
    const [competitors, setCompetitors] = useState<Competitor[]>([]);
    const [loading, setLoading] = useState(true);
    const [newCompetitor, setNewCompetitor] = useState<Partial<Competitor>>({
        name: "",
        party: "",
        risk_level: "high",
        color: "#EF4444"
    });
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const [uploadType, setUploadType] = useState<'csv' | 'pdf' | null>(null);

    const handleFileUpload = async (competitorId: string, file: File, type: 'csv' | 'pdf') => {
        setUploadingId(competitorId);
        setUploadType(type);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch(`${apiUrl}/api/competitor/${competitorId}/upload/${type}`, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.detail || 'Erro no upload');
            }

            const result = await res.json();
            toast({
                title: type === 'csv' ? "📊 CSV Importado!" : "📄 PDF Processado!",
                description: result.message
            });

            // Refresh list to show file indicators
            fetchCompetitors();

        } catch (error: any) {
            console.error('Upload error:', error);
            toast({
                title: "Erro no Upload",
                description: error.message || "Falha ao processar arquivo",
                variant: "destructive"
            });
        } finally {
            setUploadingId(null);
            setUploadType(null);
        }
    };

    const triggerFileUpload = (competitorId: string, type: 'csv' | 'pdf') => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = type === 'csv' ? '.csv' : '.pdf';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) handleFileUpload(competitorId, file, type);
        };
        input.click();
    };

    const hasFile = (comp: Competitor, type: 'csv' | 'pdf') => {
        return comp.files?.some(f => f.type === type) || false;
    };

    const fetchCompetitors = async () => {
        setLoading(true);
        console.log("🔍 Buscando concorrentes para campanha:", campaignId);

        const { data, error } = await supabase
            .from("competitors")
            .select("*")
            .eq("campaign_id", campaignId)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("❌ Erro ao buscar concorrentes:", error);
            // Não mostrar erro na UI se for 404/tabela não existe, apenas log console
        } else {
            console.log("✅ Concorrentes encontrados:", data?.length);
            setCompetitors(data || []);
        }
        setLoading(false);
    };

    const handleAdd = async () => {
        if (!newCompetitor.name) return;

        try {
            const { error } = await supabase.from("competitors").insert({
                campaign_id: campaignId,
                name: newCompetitor.name,
                party: newCompetitor.party,
                risk_level: newCompetitor.risk_level,
                color: newCompetitor.color
            });

            if (error) throw error;

            toast({ title: "Adicionado", description: "Concorrente adicionado ao radar." });
            setNewCompetitor({ name: "", party: "", risk_level: "high", color: "#EF4444" });
            fetchCompetitors();
        } catch (error) {
            console.error(error);
            toast({ title: "Erro", description: "Não foi possível adicionar.", variant: "destructive" });
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const { error } = await supabase.from("competitors").delete().eq("id", id);
            if (error) throw error;
            fetchCompetitors();
            toast({ title: "Removido", description: "Concorrente removido." });
        } catch (error) {
            toast({ title: "Erro", description: "Falha ao remover.", variant: "destructive" });
        }
    };

    useEffect(() => {
        if (campaignId) fetchCompetitors();
    }, [campaignId]);

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'high': return 'bg-red-100 text-red-700 border-red-200';
            case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const getRiskLabel = (level: string) => {
        switch (level) {
            case 'high': return 'Alta Ameaça';
            case 'medium': return 'Média Ameaça';
            case 'low': return 'Baixa Ameaça';
            default: return level;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" /> Radar de Ameaças
                </h3>
            </div>

            <div className="grid gap-4">
                {/* Lista */}
                {loading ? (
                    <div className="text-xs text-slate-400">Carregando radar...</div>
                ) : competitors.length === 0 ? (
                    <div className="text-sm text-slate-500 italic border border-dashed rounded-lg p-4 text-center">
                        Nenhum concorrente monitorado. Adicione os principais adversários.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {competitors.map((comp) => (
                            <div key={comp.id} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm hover:shadow-md transition-all group">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-3 h-3 rounded-full shadow-sm"
                                        style={{ backgroundColor: comp.color }}
                                        title="Cor no Mapa"
                                    />
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">{comp.name}</p>
                                        <p className="text-xs text-slate-500">{comp.party || 'Sem partido'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {/* Upload Buttons */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={`h-6 w-6 ${hasFile(comp, 'csv') ? 'text-emerald-600' : 'text-slate-400 opacity-0 group-hover:opacity-100'} transition-all`}
                                        onClick={() => triggerFileUpload(comp.id, 'csv')}
                                        disabled={uploadingId === comp.id}
                                        title={hasFile(comp, 'csv') ? "CSV carregado ✓" : "Upload CSV de votos"}
                                    >
                                        {uploadingId === comp.id && uploadType === 'csv' ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : hasFile(comp, 'csv') ? (
                                            <CheckCircle className="w-3 h-3" />
                                        ) : (
                                            <FileSpreadsheet className="w-3 h-3" />
                                        )}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={`h-6 w-6 ${hasFile(comp, 'pdf') ? 'text-blue-600' : 'text-slate-400 opacity-0 group-hover:opacity-100'} transition-all`}
                                        onClick={() => triggerFileUpload(comp.id, 'pdf')}
                                        disabled={uploadingId === comp.id}
                                        title={hasFile(comp, 'pdf') ? "PDF carregado ✓" : "Upload PDF Plano de Governo"}
                                    >
                                        {uploadingId === comp.id && uploadType === 'pdf' ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : hasFile(comp, 'pdf') ? (
                                            <CheckCircle className="w-3 h-3" />
                                        ) : (
                                            <FileText className="w-3 h-3" />
                                        )}
                                    </Button>

                                    <Badge variant="outline" className={`text-[10px] ${getRiskColor(comp.risk_level)}`}>
                                        {getRiskLabel(comp.risk_level)}
                                    </Badge>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => handleDelete(comp.id)}
                                    >
                                        <Trash className="w-3 h-3 text-red-500" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Form de Adição Rápida */}
                <div className="flex gap-2 items-end pt-2 border-t mt-2">
                    <div className="grid gap-2 flex-1">
                        <Input
                            placeholder="Nome do Adversário"
                            value={newCompetitor.name}
                            onChange={(e) => setNewCompetitor(prev => ({ ...prev, name: e.target.value }))}
                            className="h-8 text-sm"
                        />
                        <div className="flex gap-2">
                            <Input
                                placeholder="Partido"
                                value={newCompetitor.party}
                                onChange={(e) => setNewCompetitor(prev => ({ ...prev, party: e.target.value }))}
                                className="h-8 text-sm flex-1"
                            />
                            <Select
                                value={newCompetitor.risk_level}
                                onValueChange={(v: any) => setNewCompetitor(prev => ({ ...prev, risk_level: v }))}
                            >
                                <SelectTrigger className="h-8 w-[110px] text-xs">
                                    <SelectValue placeholder="Risco" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="high">Alta</SelectItem>
                                    <SelectItem value="medium">Média</SelectItem>
                                    <SelectItem value="low">Baixa</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Color Picker Simplificado */}
                            <div className="flex gap-1 items-center bg-slate-100 p-1 rounded-md">
                                {['#EF4444', '#F59E0B', '#3B82F6', '#10B981'].map(color => (
                                    <button
                                        key={color}
                                        className={`w-4 h-4 rounded-full transition-transform hover:scale-125 ${newCompetitor.color === color ? 'ring-2 ring-slate-400 scale-110' : ''}`}
                                        style={{ backgroundColor: color }}
                                        onClick={() => setNewCompetitor(prev => ({ ...prev, color }))}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        onClick={handleAdd}
                        disabled={!newCompetitor.name}
                        className="h-full bg-slate-900 hover:bg-slate-800"
                    >
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
