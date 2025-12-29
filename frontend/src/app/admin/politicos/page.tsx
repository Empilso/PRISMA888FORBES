"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    User,
    Plus,
    MagnifyingGlass,
    UsersThree,
    MapPin,
    Trash,
} from "@phosphor-icons/react";

interface City {
    id: string;
    name: string;
    state: string;
}

interface Campaign {
    id: string;
    name: string;
}

interface Politician {
    id: string;
    name: string;
    city_id: string | null;
    campaign_id: string | null;
    tipo: string;
    slug: string;
    partido: string | null;
    foto_url: string | null;
    created_at: string;
    city_name: string | null;
    city_state: string | null;
}

const POLITICIAN_TYPES = [
    { value: "prefeito", label: "Prefeito(a)" },
    { value: "vereador", label: "Vereador(a)" },
    { value: "deputado_estadual", label: "Deputado(a) Estadual" },
    { value: "deputado_federal", label: "Deputado(a) Federal" },
    { value: "senador", label: "Senador(a)" },
    { value: "governador", label: "Governador(a)" },
    { value: "outro", label: "Outro" },
];

const PARTIES = [
    "PT", "PL", "UNIÃO", "PP", "MDB", "PSD", "REPUBLICANOS", "PDT", "PSDB",
    "PSB", "PODEMOS", "CIDADANIA", "AVANTE", "SOLIDARIEDADE", "PSC", "PV",
    "REDE", "PCdoB", "PSOL", "NOVO", "PATRIOTA", "PTB", "DC", "PMB", "PRTB",
    "PMN", "PROS", "PSL", "Outro"
];

export default function PoliticiansPage() {
    const [politicians, setPoliticians] = useState<Politician[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [cityFilter, setCityFilter] = useState("");
    const [campaignFilter, setCampaignFilter] = useState("");

    // Form state
    const [formName, setFormName] = useState("");
    const [formCityId, setFormCityId] = useState("");
    const [formCampaignId, setFormCampaignId] = useState("");
    const [formTipo, setFormTipo] = useState("prefeito");
    const [formPartido, setFormPartido] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    const fetchPoliticians = async () => {
        setIsLoading(true);
        try {
            let url = `${API_URL}/api/politicians?limit=100`;
            if (cityFilter) url += `&city_id=${cityFilter}`;
            if (campaignFilter) url += `&campaign_id=${campaignFilter}`;
            if (searchTerm) url += `&search=${searchTerm}`;

            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setPoliticians(data);
            }
        } catch (error) {
            console.error("Failed to fetch politicians:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCities = async () => {
        try {
            const res = await fetch(`${API_URL}/api/cities?limit=200`);
            if (res.ok) {
                const data = await res.json();
                setCities(data);
            }
        } catch (error) {
            console.error("Failed to fetch cities:", error);
        }
    };

    const fetchCampaigns = async () => {
        try {
            // Fetch campaigns from Supabase via a simple endpoint or direct
            // For now, we'll use a placeholder
            const res = await fetch(`${API_URL}/api/personas`);
            if (res.ok) {
                const data = await res.json();
                // Extract unique campaigns from personas or use campaigns table
                // This is a workaround - ideally we'd have a /api/campaigns endpoint
            }
        } catch (error) {
            console.error("Failed to fetch campaigns:", error);
        }
    };

    useEffect(() => {
        fetchPoliticians();
        fetchCities();
        fetchCampaigns();
    }, []);

    useEffect(() => {
        fetchPoliticians();
    }, [cityFilter, campaignFilter]);

    const handleSearch = () => {
        fetchPoliticians();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const res = await fetch(`${API_URL}/api/politicians`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formName,
                    city_id: formCityId || null,
                    campaign_id: formCampaignId || null,
                    tipo: formTipo,
                    partido: formPartido || null,
                }),
            });

            if (res.ok) {
                setFormName("");
                setFormCityId("");
                setFormCampaignId("");
                setFormTipo("prefeito");
                setFormPartido("");
                setIsDialogOpen(false);
                fetchPoliticians();
            } else {
                const err = await res.json();
                alert(err.detail || "Erro ao criar político");
            }
        } catch (error) {
            console.error("Failed to create politician:", error);
            alert("Erro ao criar político");
        } finally {
            setIsSubmitting(false);
        }
    };

    const getTypeLabel = (tipo: string) => {
        const found = POLITICIAN_TYPES.find(t => t.value === tipo);
        return found ? found.label : tipo;
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Tem certeza que deseja excluir o político "${name}"? Isso também liberará o e-mail do usuário vinculado.`)) {
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/politicians/${id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                fetchPoliticians(); // Refresh list
            } else {
                const err = await res.json();
                alert(err.detail || "Erro ao excluir político");
            }
        } catch (error) {
            console.error("Failed to delete politician:", error);
            alert("Erro ao excluir político");
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200">
                        <UsersThree className="h-6 w-6 text-white" weight="duotone" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Políticos</h1>
                        <p className="text-sm text-slate-500">Gerenciamento de políticos para o Radar</p>
                    </div>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-violet-600 hover:bg-violet-700">
                            <Plus className="h-4 w-4 mr-2" weight="bold" />
                            Novo Político
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Cadastrar Novo Político</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome Completo</Label>
                                <Input
                                    id="name"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="Ex: Carlos Augusto Pivetta"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="tipo">Cargo</Label>
                                    <Select value={formTipo} onValueChange={setFormTipo}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {POLITICIAN_TYPES.map((t) => (
                                                <SelectItem key={t.value} value={t.value}>
                                                    {t.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="partido">Partido</Label>
                                    <Select value={formPartido} onValueChange={setFormPartido}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PARTIES.map((p) => (
                                                <SelectItem key={p} value={p}>
                                                    {p}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="city">Cidade</Label>
                                <Select value={formCityId} onValueChange={setFormCityId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione a cidade..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {cities.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.name} - {c.state}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={isSubmitting} className="bg-violet-600 hover:bg-violet-700">
                                    {isSubmitting ? "Salvando..." : "Salvar"}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <Input
                                placeholder="Buscar por nome..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            />
                        </div>
                        <Select value={cityFilter || "all"} onValueChange={(v) => setCityFilter(v === "all" ? "" : v)}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Filtrar por cidade" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas as cidades</SelectItem>
                                {cities.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.name} - {c.state}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleSearch} variant="outline">
                            <MagnifyingGlass className="h-4 w-4 mr-2" />
                            Buscar
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User weight="duotone" className="h-5 w-5" />
                        Lista de Políticos ({politicians.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8 text-slate-500">Carregando...</div>
                    ) : politicians.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            Nenhum político cadastrado. Clique em "Novo Político" para começar.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Cargo</TableHead>
                                    <TableHead>Partido</TableHead>
                                    <TableHead>Cidade</TableHead>
                                    <TableHead>Slug</TableHead>
                                    <TableHead>Criado em</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {politicians.map((p) => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-medium">{p.name}</TableCell>
                                        <TableCell>
                                            <span className="bg-violet-100 text-violet-700 px-2 py-1 rounded text-xs font-medium">
                                                {getTypeLabel(p.tipo)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {p.partido ? (
                                                <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold">
                                                    {p.partido}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {p.city_name ? (
                                                <div className="flex items-center gap-1 text-sm">
                                                    <MapPin className="h-3 w-3 text-slate-400" />
                                                    {p.city_name} - {p.city_state}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-slate-500 font-mono text-xs">{p.slug}</TableCell>
                                        <TableCell className="text-slate-500 text-xs">
                                            {new Date(p.created_at).toLocaleDateString("pt-BR")}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleDelete(p.id, p.name)}
                                            >
                                                <Trash className="h-4 w-4" weight="bold" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
