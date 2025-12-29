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
    MapPin,
    Plus,
    MagnifyingGlass,
    Buildings,
} from "@phosphor-icons/react";

interface City {
    id: string;
    name: string;
    state: string;
    ibge_code: string | null;
    slug: string;
    created_at: string;
    updated_at: string;
}

const BRAZILIAN_STATES = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
    "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
    "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export default function CitiesPage() {
    const [cities, setCities] = useState<City[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [stateFilter, setStateFilter] = useState("");

    // Form state
    const [formName, setFormName] = useState("");
    const [formState, setFormState] = useState("");
    const [formIbgeCode, setFormIbgeCode] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    const fetchCities = async () => {
        setIsLoading(true);
        try {
            let url = `${API_URL}/api/cities?limit=100`;
            if (stateFilter) url += `&state=${stateFilter}`;
            if (searchTerm) url += `&search=${searchTerm}`;

            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setCities(data);
            }
        } catch (error) {
            console.error("Failed to fetch cities:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCities();
    }, [stateFilter]);

    const handleSearch = () => {
        fetchCities();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const res = await fetch(`${API_URL}/api/cities`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formName,
                    state: formState,
                    ibge_code: formIbgeCode || null,
                }),
            });

            if (res.ok) {
                setFormName("");
                setFormState("");
                setFormIbgeCode("");
                setIsDialogOpen(false);
                fetchCities();
            } else {
                const err = await res.json();
                alert(err.detail || "Erro ao criar cidade");
            }
        } catch (error) {
            console.error("Failed to create city:", error);
            alert("Erro ao criar cidade");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-200">
                        <Buildings className="h-6 w-6 text-white" weight="duotone" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Cidades</h1>
                        <p className="text-sm text-slate-500">Gerenciamento de cidades para o Radar</p>
                    </div>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="h-4 w-4 mr-2" weight="bold" />
                            Nova Cidade
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Cadastrar Nova Cidade</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome da Cidade</Label>
                                <Input
                                    id="name"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="Ex: Votorantim"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="state">Estado (UF)</Label>
                                <select
                                    id="state"
                                    value={formState}
                                    onChange={(e) => setFormState(e.target.value)}
                                    className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white"
                                    required
                                >
                                    <option value="">Selecione...</option>
                                    {BRAZILIAN_STATES.map((uf) => (
                                        <option key={uf} value={uf}>{uf}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ibge_code">Código IBGE (opcional)</Label>
                                <Input
                                    id="ibge_code"
                                    value={formIbgeCode}
                                    onChange={(e) => setFormIbgeCode(e.target.value)}
                                    placeholder="Ex: 3556909"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
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
                        <select
                            value={stateFilter}
                            onChange={(e) => setStateFilter(e.target.value)}
                            className="h-10 px-3 rounded-md border border-slate-200 bg-white min-w-[120px]"
                        >
                            <option value="">Todos os estados</option>
                            {BRAZILIAN_STATES.map((uf) => (
                                <option key={uf} value={uf}>{uf}</option>
                            ))}
                        </select>
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
                        <MapPin weight="duotone" className="h-5 w-5" />
                        Lista de Cidades ({cities.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8 text-slate-500">Carregando...</div>
                    ) : cities.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            Nenhuma cidade cadastrada. Clique em "Nova Cidade" para começar.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Código IBGE</TableHead>
                                    <TableHead>Slug</TableHead>
                                    <TableHead>Criado em</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {cities.map((city) => (
                                    <TableRow key={city.id}>
                                        <TableCell className="font-medium">{city.name}</TableCell>
                                        <TableCell>
                                            <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold">
                                                {city.state}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-slate-500">{city.ibge_code || "-"}</TableCell>
                                        <TableCell className="text-slate-500 font-mono text-xs">{city.slug}</TableCell>
                                        <TableCell className="text-slate-500 text-xs">
                                            {new Date(city.created_at).toLocaleDateString("pt-BR")}
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
