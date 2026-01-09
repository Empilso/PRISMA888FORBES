
import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, MagnifyingGlass, Spinner } from "@phosphor-icons/react";
import { useToast } from "@/components/ui/use-toast"; // Assuming use-toast exists, if not use standard alert for now or check

// Types
interface TSEImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    cities: { id: string; name: string; state: string }[];
}

interface TSECandidate {
    id: number;
    nome_urna: string;
    numero: number;
    partido: string;
    status: string;
    resultado: string;
}

export function TSEImportModal({ isOpen, onClose, onSuccess, cities }: TSEImportModalProps) {
    const [selectedCityId, setSelectedCityId] = useState("");
    const [selectedCargo, setSelectedCargo] = useState("11"); // 11=Prefeito
    const [selectedYear, setSelectedYear] = useState("2024");
    const [isLoading, setIsLoading] = useState(false);
    const [candidates, setCandidates] = useState<TSECandidate[]>([]);
    const [selectedCandidates, setSelectedCandidates] = useState<number[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Auto-select Votorantim if present
    useEffect(() => {
        if (isOpen && cities.length > 0 && !selectedCityId) {
            const votorantim = cities.find(c => c.name.toLowerCase().includes("votorantim"));
            if (votorantim) setSelectedCityId(votorantim.id);
        }
    }, [isOpen, cities, selectedCityId]);

    const fetchCandidates = async () => {
        if (!selectedCityId) return;

        setIsLoading(true);
        setCandidates([]);
        setSelectedCandidates([]); // Reset selection

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const res = await fetch(`${API_URL}/api/tse/candidates?city_id=${selectedCityId}&cargo=${selectedCargo}&year=${selectedYear}`);

            if (res.ok) {
                const data = await res.json();
                setCandidates(data.candidates);
                // Auto-select all by default
                setSelectedCandidates(data.candidates.map((c: TSECandidate) => c.id));
            } else {
                const err = await res.json();
                alert(`Erro ao buscar: ${err.detail}`);
            }
        } catch (error) {
            console.error("Fetch error:", error);
            alert("Erro de conexão com o servidor.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleCandidate = (id: number) => {
        if (selectedCandidates.includes(id)) {
            setSelectedCandidates(selectedCandidates.filter(c => c !== id));
        } else {
            setSelectedCandidates([...selectedCandidates, id]);
        }
    };

    const handleImport = async () => {
        if (selectedCandidates.length === 0) return;

        setIsSaving(true);
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

        try {
            let successCount = 0;
            let errorCount = 0;

            const city = cities.find(c => c.id === selectedCityId);

            // Loop sequential import (safer than promise.all for now to avoid db locking if not bulk optimized)
            for (const candId of selectedCandidates) {
                const candidate = candidates.find(c => c.id === candId);
                if (!candidate) continue;

                // Mapear cargo code para slug do sistema
                const cargoSlug = selectedCargo === "11" ? "prefeito" : "vereador";

                // Payload
                const payload = {
                    name: candidate.nome_urna,
                    city_id: selectedCityId,
                    campaign_id: null, // Sem campanha vinculada inicialmente
                    tipo: cargoSlug,
                    partido: candidate.partido,
                    // Poderíamos salvar o número também se tivéssemos campo
                };

                const res = await fetch(`${API_URL}/api/politicians`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                if (res.ok) successCount++;
                else errorCount++;
            }

            alert(`Importação concluída!\n✅ Sucessos: ${successCount}\n❌ Erros (provável duplicidade): ${errorCount}`);
            onSuccess();
            onClose();

        } catch (error) {
            console.error("Import error:", error);
            alert("Erro durante a importação.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Download weight="bold" className="h-5 w-5 text-blue-600" />
                        Importar Candidatos do TSE
                    </DialogTitle>
                </DialogHeader>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Cidade</Label>
                        <Select value={selectedCityId} onValueChange={setSelectedCityId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione a cidade" />
                            </SelectTrigger>
                            <SelectContent>
                                {cities.map(city => (
                                    <SelectItem key={city.id} value={city.id}>
                                        {city.name} - {city.state}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Cargo</Label>
                        <Select value={selectedCargo} onValueChange={setSelectedCargo}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="13">Vereador</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Ano da Eleição</Label>
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="2024">2024</SelectItem>
                                <SelectItem value="2020">2020</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-end">
                        <Button
                            onClick={fetchCandidates}
                            disabled={!selectedCityId || isLoading}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                            {isLoading ? <Spinner className="animate-spin mr-2" /> : <MagnifyingGlass className="mr-2" />}
                            Buscar no TSE
                        </Button>
                    </div>
                </div>

                {/* Results List */}
                <div className="flex-1 border rounded-md overflow-hidden bg-slate-50 relative">
                    {candidates.length > 0 ? (
                        <div className="absolute inset-0 flex flex-col">
                            <div className="p-3 border-b bg-white flex justify-between items-center text-sm text-slate-500">
                                <span>{candidates.length} candidatos encontrados</span>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedCandidates(candidates.map(c => c.id))}>Marcar Todos</Button>
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedCandidates([])}>Desmarcar Todos</Button>
                                </div>
                            </div>
                            <ScrollArea className="flex-1 p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {candidates.map(candidate => (
                                        <div
                                            key={candidate.id}
                                            className={`
                                                flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors
                                                ${selectedCandidates.includes(candidate.id) ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:border-blue-300'}
                                            `}
                                            onClick={() => handleToggleCandidate(candidate.id)}
                                        >
                                            <Checkbox
                                                checked={selectedCandidates.includes(candidate.id)}
                                                onCheckedChange={() => handleToggleCandidate(candidate.id)}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-900 truncate">{candidate.nome_urna}</p>
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{candidate.partido}</span>
                                                    <span>Nº {candidate.numero}</span>
                                                    <span className={`px-1.5 py-0.5 rounded ${candidate.resultado === 'Eleito' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                                        {candidate.resultado || candidate.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400">
                            {isLoading ? "Buscando dados..." : "Nenhum dado carregado. Selecione a cidade e busque."}
                        </div>
                    )}
                </div>

                <DialogFooter className="pt-4">
                    <div className="flex justify-between w-full items-center">
                        <span className="text-sm text-slate-500">
                            {selectedCandidates.length} selecionados
                        </span>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
                            <Button
                                onClick={handleImport}
                                disabled={selectedCandidates.length === 0 || isSaving}
                                className="bg-green-600 hover:bg-green-700 text-white"
                            >
                                {isSaving ? <Spinner className="animate-spin mr-2" /> : <Download className="mr-2" />}
                                Confirmar Importação
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
