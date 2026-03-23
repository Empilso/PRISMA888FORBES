"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    AlertCircle,
    Trash2,
    RefreshCcw,
    MapPin,
    TrendingUp,
    Coins,
    Users,
    Plus,
    Search,
    FileText,
    Receipt,
    Building2,
    ChevronRight,
    ExternalLink
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AlbaCandidateList } from "@/components/radar/AlbaCandidateList";

interface CityStat {
    id: string;
    name: string;
    state: string;
    slug: string;
    expense_count?: number;
    total_budget?: number;
    last_audit?: string;
}

interface Politician {
    id: string;
    name: string;
    tipo: string;
    partido: string | null;
    foto_url: string | null;
    slug: string;
    city_name: string | null;
    city_state: string | null;
    city_id: string | null;
    campaign_id: string | null;
    created_at: string;
}

const TIPO_LABEL: Record<string, string> = {
    prefeito: "Prefeito(a)",
    vereador: "Vereador(a)",
    deputado_estadual: "Dep. Estadual",
    deputado_federal: "Dep. Federal",
    senador: "Senador(a)",
    governador: "Governador(a)",
    outro: "Outro",
};

const TIPO_COLOR: Record<string, string> = {
    prefeito: "bg-blue-100 text-blue-700 border-blue-200",
    vereador: "bg-green-100 text-green-700 border-green-200",
    deputado_estadual: "bg-purple-100 text-purple-700 border-purple-200",
    deputado_federal: "bg-orange-100 text-orange-700 border-orange-200",
    senador: "bg-red-100 text-red-700 border-red-200",
    governador: "bg-indigo-100 text-indigo-700 border-indigo-200",
    outro: "bg-slate-100 text-slate-700 border-slate-200",
};

function getInitials(name: string) {
    return name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
}

export default function GestaoMunicipal() {
    const [cities, setCities] = useState<CityStat[]>([]);
    const [politicians, setPoliticians] = useState<Politician[]>([]);
    const [loadingCities, setLoadingCities] = useState(true);
    const [loadingPoliticians, setLoadingPoliticians] = useState(true);
    const [syncingCities, setSyncingCities] = useState(false);
    const [searchPolitician, setSearchPolitician] = useState("");
    const supabase = createClient();
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    useEffect(() => {
        fetchCities();
        fetchPoliticians();
    }, []);

    const fetchCities = async () => {
        try {
            setLoadingCities(true);
            const { data: citiesData, error } = await supabase.from("cities").select("*");
            if (error) throw error;
            setCities(citiesData || []);
        } catch (error) {
            console.error("Error loading cities:", error);
        } finally {
            setLoadingCities(false);
        }
    };

    const fetchPoliticians = async () => {
        try {
            setLoadingPoliticians(true);
            const res = await fetch(`${API_URL}/api/politicians?limit=200`);
            if (res.ok) {
                const data = await res.json();
                setPoliticians(data);
            }
        } catch (error) {
            console.error("Error loading politicians:", error);
        } finally {
            setLoadingPoliticians(false);
        }
    };

    const handleDeleteCity = async (slug: string) => {
        if (!confirm(`TEM CERTEZA? Isso apagará TODO o histórico de auditoria de ${slug}.`)) return;
        try {
            const res = await fetch(`${API_URL}/api/admin/reset-city/${slug}`, { method: "POST" });
            if (res.ok) {
                await supabase.from("cities").delete().eq("slug", slug);
                fetchCities();
            } else {
                alert("Erro ao limpar cidade.");
            }
        } catch (e) {
            console.error(e);
            alert("Erro de conexão.");
        }
    };

    const handleSyncCities = async () => {
        if (!confirm("Sincronizar cidades pendentes de emendas para a base de municípios (BA)?")) return;
        setSyncingCities(true);
        try {
            const res = await fetch(`${API_URL}/api/amendments/sync-cities`, { method: "POST" });
            const data = await res.json();
            if (res.ok) {
                alert(`Sincronização concluída! ${data.inserted} cidades inseridas, ${data.updated_amendments} vinculadas.`);
                fetchCities();
            } else {
                alert(`Erro: ${data.detail || "Falha na sincronização"}`);
            }
        } catch (e) {
            console.error(e);
            alert("Erro de conexão com a API.");
        } finally {
            setSyncingCities(false);
        }
    };

    const handleDeletePolitician = async (id: string, name: string) => {
        if (!confirm(`Excluir "${name}"? Esta ação também remove os dados vinculados.`)) return;
        try {
            const res = await fetch(`${API_URL}/api/politicians/${id}`, { method: "DELETE" });
            if (res.ok) {
                fetchPoliticians();
            } else {
                alert("Erro ao excluir candidato.");
            }
        } catch (e) {
            console.error(e);
            alert("Erro de conexão.");
        }
    };

    const filteredPoliticians = politicians.filter((p) => {
        const term = searchPolitician.toLowerCase();
        return (
            !term ||
            p.name.toLowerCase().includes(term) ||
            (p.partido || "").toLowerCase().includes(term) ||
            (p.city_name || "").toLowerCase().includes(term) ||
            (p.tipo || "").toLowerCase().includes(term)
        );
    });

    return (
        <div className="container mx-auto py-10">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">RADAR!</h1>
                    <p className="text-slate-500">Gerencie municípios e candidatos monitorados pelo Radar.</p>
                </div>
            </div>

            {/* Main Navigation Tabs */}
            <Tabs defaultValue="radar_saas" className="w-full">
                <TabsList className="mb-8 p-1 bg-slate-900 text-slate-400 border border-slate-800 h-auto gap-1">
                    <TabsTrigger
                        value="radar_saas"
                        className="gap-2 px-6 py-2.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white font-black uppercase tracking-tighter italic transition-all"
                    >
                        Radar Global <Badge variant="secondary" className="ml-1 bg-blue-900 border-blue-700 text-blue-100 text-[10px]">{politicians.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger
                        value="radar_alba"
                        className="gap-2 px-6 py-2.5 data-[state=active]:bg-purple-600 data-[state=active]:text-white font-black uppercase tracking-tighter italic transition-all"
                    >
                        Deputados ALBA <Badge variant="secondary" className="ml-1 bg-purple-900 border-purple-700 text-purple-100 text-[10px]">63</Badge>
                    </TabsTrigger>
                </TabsList>

                {/* --- Radar Global (SAAS) --- */}
                <TabsContent value="radar_saas" className="space-y-8">
                    <Tabs defaultValue="cidades" className="w-full">
                        <TabsList className="mb-6 bg-slate-100 border border-slate-200 p-1 h-auto">
                            <TabsTrigger
                                value="cidades"
                                className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm px-5 py-2.5"
                            >
                                <Building2 className="w-4 h-4" />
                                Cidades
                                <Badge variant="secondary" className="ml-1 text-xs bg-slate-200 text-slate-600">
                                    {cities.length}
                                </Badge>
                            </TabsTrigger>
                            <TabsTrigger
                                value="candidatos"
                                className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm px-5 py-2.5"
                            >
                                <Users className="w-4 h-4" />
                                Candidatos
                                <Badge variant="secondary" className="ml-1 text-xs bg-slate-200 text-slate-600">
                                    {politicians.length}
                                </Badge>
                            </TabsTrigger>
                        </TabsList>

                        {/* ─── TAB CIDADES ─── */}
                        <TabsContent value="cidades">
                            <div className="flex justify-between items-center mb-6">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-slate-400 hover:text-slate-600 font-normal text-xs"
                                    onClick={handleSyncCities}
                                    disabled={syncingCities}
                                    title="Sincronizar cidades baseadas em registros de emendas"
                                >
                                    <RefreshCcw className={`w-3 h-3 mr-1 ${syncingCities ? 'animate-spin' : ''}`} />
                                    {syncingCities ? "Sincronizando..." : "Sync Emendas pendentes"}
                                </Button>
                                <Link href="/admin/cities/new">
                                    <Button className="bg-slate-900 text-white shadow-lg gap-2">
                                        <Plus className="w-4 h-4" />
                                        Nova Cidade
                                    </Button>
                                </Link>
                            </div>

                            {loadingCities ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-xl" />
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {cities.map((city) => (
                                        <Card key={city.id} className="hover:shadow-lg transition-shadow border-slate-200">
                                            <CardHeader
                                                className="pb-2 cursor-pointer"
                                                onClick={() => (window.location.href = `/admin/territorios/${city.slug}`)}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                                                            {city.state}
                                                        </div>
                                                        <div>
                                                            <CardTitle className="text-lg hover:underline">{city.name}</CardTitle>
                                                            <CardDescription className="text-xs font-mono">{city.slug}</CardDescription>
                                                        </div>
                                                    </div>
                                                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                                        Ativo
                                                    </Badge>
                                                </div>
                                            </CardHeader>
                                            <CardContent
                                                className="py-4 space-y-3 cursor-pointer"
                                                onClick={() => (window.location.href = `/admin/territorios/${city.slug}`)}
                                            >
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <TrendingUp className="w-4 h-4 text-slate-400" />
                                                    <span>Auditoria Fiscal Habilitada</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <Coins className="w-4 h-4 text-slate-400" />
                                                    <span>Gestão de Promessas Ativa</span>
                                                </div>
                                            </CardContent>
                                            <CardFooter className="pt-2 border-t bg-slate-50 flex justify-between">
                                                <Link href={`/admin/cities/${city.slug}/onboarding`}>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                                    >
                                                        <RefreshCcw className="w-4 h-4 mr-2" /> Sincronizar
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteCity(city.slug);
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    ))}

                                    {cities.length === 0 && (
                                        <div className="col-span-full py-20 text-center text-slate-400">
                                            <MapPin className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                            <p>Nenhuma cidade cadastrada.</p>
                                            <p className="text-sm">Clique em "+ Nova Cidade" para começar.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </TabsContent>

                        {/* ─── TAB CANDIDATOS ─── */}
                        <TabsContent value="candidatos">
                            <div className="flex items-center justify-between mb-6 gap-4">
                                <div className="relative flex-1 max-w-sm">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        placeholder="Buscar por nome, partido ou cidade..."
                                        className="pl-10 bg-white border-slate-200"
                                        value={searchPolitician}
                                        onChange={(e) => setSearchPolitician(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Link href="/admin/politicos">
                                        <Button variant="outline" className="gap-2 border-slate-300">
                                            <ExternalLink className="w-4 h-4" />
                                            Gerenciar Políticos
                                        </Button>
                                    </Link>
                                    <Link href="/admin/politicos">
                                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-lg shadow-indigo-200">
                                            <Plus className="w-4 h-4" />
                                            Novo Candidato
                                        </Button>
                                    </Link>
                                </div>
                            </div>

                            {loadingPoliticians ? (
                                <div className="space-y-3">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-xl" />
                                    ))}
                                </div>
                            ) : filteredPoliticians.length === 0 ? (
                                <div className="py-20 text-center text-slate-400">
                                    <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                    <p className="font-medium">
                                        {searchPolitician ? "Nenhum candidato encontrado para sua busca." : "Nenhum candidato cadastrado ainda."}
                                    </p>
                                    <p className="text-sm mt-1">
                                        {searchPolitician
                                            ? "Tente outro termo."
                                            : "Cadastre candidatos em \"Gerenciar Políticos\" para acompanhar emendas e gastos."}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filteredPoliticians.map((politician) => (
                                        <Card
                                            key={politician.id}
                                            className="border-slate-200 hover:shadow-md hover:border-indigo-200 transition-all group"
                                        >
                                            <CardContent className="p-0">
                                                <div className="flex items-center gap-4 p-4">
                                                    {/* Avatar */}
                                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md shadow-indigo-100">
                                                        {getInitials(politician.name)}
                                                    </div>

                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-semibold text-slate-900 truncate">
                                                                {politician.name}
                                                            </span>
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-xs ${TIPO_COLOR[politician.tipo] || TIPO_COLOR.outro}`}
                                                            >
                                                                {TIPO_LABEL[politician.tipo] || politician.tipo}
                                                            </Badge>
                                                            {politician.partido && (
                                                                <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600">
                                                                    {politician.partido}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            {politician.city_name && !['deputado_estadual', 'deputado_federal', 'senador'].includes(politician.tipo?.toLowerCase()) && (
                                                                <span className="flex items-center gap-1 text-xs text-slate-500">
                                                                    <MapPin className="w-3 h-3" />
                                                                    {politician.city_name}
                                                                    {politician.city_state ? ` - ${politician.city_state}` : ""}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Ações rápidas */}
                                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Link
                                                            href={politician.campaign_id
                                                                ? `/campaign/${politician.campaign_id}/promises`
                                                                : `/admin/radar/${politician.slug}`}
                                                        >
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="gap-1.5 text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                                                            >
                                                                <Receipt className="w-3.5 h-3.5" />
                                                                Emendas
                                                            </Button>
                                                        </Link>
                                                        <Link
                                                            href={politician.campaign_id
                                                                ? `/campaign/${politician.campaign_id}/dashboard`
                                                                : `/admin/radar/${politician.slug}`}
                                                        >
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="gap-1.5 text-xs border-slate-200 text-slate-600 hover:bg-slate-50"
                                                            >
                                                                <FileText className="w-3.5 h-3.5" />
                                                                Gastos
                                                            </Button>
                                                        </Link>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="w-8 h-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                                                            onClick={() => handleDeletePolitician(politician.id, politician.name)}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>

                                                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </TabsContent>

                {/* --- Deputados ALBA (DADOS-PRISMA) --- */}
                <TabsContent value="radar_alba" className="bg-slate-50 border border-slate-200 rounded-2xl p-6 min-h-[600px]">
                    <div className="mb-6">
                        <h2 className="text-xl font-black text-slate-800 uppercase italic">Frota Parlamentar <span className="text-purple-600 underline">ALBA</span></h2>
                        <p className="text-sm text-slate-500 font-mono">Lendo exclusivamente da base de transparência (DADOS-PRISMA)</p>
                    </div>
                    <AlbaCandidateList />
                </TabsContent>
            </Tabs>
        </div>
    );
}
