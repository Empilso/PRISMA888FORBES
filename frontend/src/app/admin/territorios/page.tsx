"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
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
    ExternalLink,
    Radar,
    Globe,
    Landmark,
    Sparkles
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
    const [activeTab, setActiveTab] = useState<"radar_saas" | "radar_alba">("radar_alba");
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
            } else { alert("Erro ao limpar cidade."); }
        } catch (e) { console.error(e); alert("Erro de conexão."); }
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
            } else { alert(`Erro: ${data.detail || "Falha na sincronização"}`); }
        } catch (e) { console.error(e); alert("Erro de conexão com a API."); }
        finally { setSyncingCities(false); }
    };

    const handleDeletePolitician = async (id: string, name: string) => {
        if (!confirm(`Excluir "${name}"? Esta ação também remove os dados vinculados.`)) return;
        try {
            const res = await fetch(`${API_URL}/api/politicians/${id}`, { method: "DELETE" });
            if (res.ok) { fetchPoliticians(); }
            else { alert("Erro ao excluir candidato."); }
        } catch (e) { console.error(e); alert("Erro de conexão."); }
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
        <div className="min-h-screen bg-[#f8f9fc]">

            {/* ── HERO HEADER ── */}
            <div className="bg-white border-b border-slate-100 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="relative">
                                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                                    <Radar className="h-7 w-7 text-white" />
                                </div>
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                                </span>
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">RADAR!</h1>
                                    <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase tracking-wider">PRISMA 888</span>
                                </div>
                                <p className="text-slate-500 font-medium mt-0.5">
                                    Central de Inteligência Política · <span className="text-indigo-600 font-semibold">Auditoria 3D em tempo real</span>
                                </p>
                            </div>
                        </div>

                        {/* Stats rápidos */}
                        <div className="flex items-center gap-3">
                            <div className="text-center px-5 py-3 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-2xl font-black text-slate-900">{cities.length}</p>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Cidades</p>
                            </div>
                            <div className="text-center px-5 py-3 bg-blue-50 rounded-2xl border border-blue-100">
                                <p className="text-2xl font-black text-blue-700">{politicians.length}</p>
                                <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide">Candidatos</p>
                            </div>
                            <div className="text-center px-5 py-3 bg-indigo-50 rounded-2xl border border-indigo-100">
                                <p className="text-2xl font-black text-indigo-700">2</p>
                                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">Casas Ativas</p>
                            </div>
                        </div>
                    </div>

                    {/* ── TABS LEGISLATURAS ── */}
                    <div className="flex gap-2 mt-8 flex-wrap">
                        <button
                            onClick={() => setActiveTab("radar_saas")}
                            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                                activeTab === "radar_saas"
                                    ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            }`}
                        >
                            <Globe className="w-4 h-4" />
                            Radar Global
                            {activeTab === "radar_saas" && (
                                <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                                    {politicians.length}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => setActiveTab("radar_alba")}
                            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                                activeTab === "radar_alba"
                                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            }`}
                        >
                            <Landmark className="w-4 h-4" />
                            Deputados ALBA
                            {activeTab === "radar_alba" && (
                                <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">63</span>
                            )}
                        </button>

                        <button className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 bg-slate-100 hover:bg-slate-200 transition-all">
                            <Sparkles className="w-4 h-4" />
                            + Nova Legislatura
                        </button>
                    </div>
                </div>
            </div>

            {/* ── CONTENT ── */}
            <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8">

                {/* ===== TAB: RADAR GLOBAL ===== */}
                {activeTab === "radar_saas" && (
                    <div className="space-y-8">

                        {/* Sub-tabs Cidades / Candidatos */}
                        <div className="flex gap-2">
                            {["cidades", "candidatos"].map(tab => (
                                <div key={tab} />
                            ))}
                        </div>

                        {/* Cidades */}
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-3">
                                    <Building2 className="w-5 h-5 text-blue-600" />
                                    <h2 className="text-lg font-black text-slate-900">Cidades Monitoradas</h2>
                                    <Badge className="bg-blue-100 text-blue-700 border-0">{cities.length}</Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost" size="sm"
                                        className="text-slate-400 hover:text-slate-600 font-normal text-xs"
                                        onClick={handleSyncCities}
                                        disabled={syncingCities}
                                    >
                                        <RefreshCcw className={`w-3 h-3 mr-1 ${syncingCities ? 'animate-spin' : ''}`} />
                                        {syncingCities ? "Sincronizando..." : "Sync Emendas pendentes"}
                                    </Button>
                                    <Link href="/admin/cities/new">
                                        <Button className="bg-slate-900 text-white shadow-lg gap-2 rounded-xl">
                                            <Plus className="w-4 h-4" /> Nova Cidade
                                        </Button>
                                    </Link>
                                </div>
                            </div>

                            {loadingCities ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {[1,2,3].map(i => <div key={i} className="h-48 bg-white animate-pulse rounded-2xl border border-slate-100" />)}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {cities.map((city) => (
                                        <Card key={city.id} className="hover:shadow-lg transition-all border-slate-100 rounded-2xl overflow-hidden hover:border-blue-200">
                                            <CardHeader className="pb-2 cursor-pointer" onClick={() => (window.location.href = `/admin/territorios/${city.slug}`)}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-xl flex items-center justify-center font-bold text-sm shadow">
                                                            {city.state}
                                                        </div>
                                                        <div>
                                                            <CardTitle className="text-lg hover:underline">{city.name}</CardTitle>
                                                            <CardDescription className="text-xs font-mono">{city.slug}</CardDescription>
                                                        </div>
                                                    </div>
                                                    <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">Ativo</Badge>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="py-4 space-y-3 cursor-pointer" onClick={() => (window.location.href = `/admin/territorios/${city.slug}`)}
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
                                                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                                                        <RefreshCcw className="w-4 h-4 mr-2" /> Sincronizar
                                                    </Button>
                                                </Link>
                                                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteCity(city.slug); }}
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
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Candidatos */}
                        <div>
                            <div className="flex items-center justify-between mb-6 gap-4">
                                <div className="flex items-center gap-3">
                                    <Users className="w-5 h-5 text-indigo-600" />
                                    <h2 className="text-lg font-black text-slate-900">Candidatos SAAS</h2>
                                    <Badge className="bg-indigo-100 text-indigo-700 border-0">{politicians.length}</Badge>
                                </div>
                                <div className="flex gap-2">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input
                                            placeholder="Buscar..."
                                            className="pl-10 bg-white border-slate-200 rounded-xl h-10 text-sm"
                                            value={searchPolitician}
                                            onChange={(e) => setSearchPolitician(e.target.value)}
                                        />
                                    </div>
                                    <Link href="/admin/politicos">
                                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-lg shadow-indigo-200 rounded-xl">
                                            <Plus className="w-4 h-4" /> Novo Candidato
                                        </Button>
                                    </Link>
                                </div>
                            </div>

                            {loadingPoliticians ? (
                                <div className="space-y-3">
                                    {[1,2,3,4].map(i => <div key={i} className="h-20 bg-white animate-pulse rounded-2xl border border-slate-100" />)}
                                </div>
                            ) : filteredPoliticians.length === 0 ? (
                                <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                                    <Users className="w-16 h-16 mx-auto mb-4 opacity-20 text-slate-400" />
                                    <p className="font-medium text-slate-500">{searchPolitician ? "Nenhum candidato encontrado." : "Nenhum candidato cadastrado ainda."}</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filteredPoliticians.map((politician) => (
                                        <Card key={politician.id} className="border-slate-100 hover:shadow-md hover:border-indigo-200 transition-all group rounded-2xl">
                                            <CardContent className="p-0">
                                                <div className="flex items-center gap-4 p-4">
                                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md shadow-indigo-100">
                                                        {getInitials(politician.name)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-semibold text-slate-900 truncate">{politician.name}</span>
                                                            <Badge variant="outline" className={`text-xs ${TIPO_COLOR[politician.tipo] || TIPO_COLOR.outro}`}>
                                                                {TIPO_LABEL[politician.tipo] || politician.tipo}
                                                            </Badge>
                                                            {politician.partido && (
                                                                <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600">{politician.partido}</Badge>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            {politician.city_name && !['deputado_estadual', 'deputado_federal', 'senador'].includes(politician.tipo?.toLowerCase()) && (
                                                                <span className="flex items-center gap-1 text-xs text-slate-500">
                                                                    <MapPin className="w-3 h-3" />{politician.city_name}{politician.city_state ? ` - ${politician.city_state}` : ""}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Link href={politician.campaign_id ? `/campaign/${politician.campaign_id}/promises` : `/admin/radar/${politician.slug}`}>
                                                            <Button size="sm" variant="outline" className="gap-1.5 text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-lg">
                                                                <Receipt className="w-3.5 h-3.5" /> Emendas
                                                            </Button>
                                                        </Link>
                                                        <Link href={politician.campaign_id ? `/campaign/${politician.campaign_id}/dashboard` : `/admin/radar/${politician.slug}`}>
                                                            <Button size="sm" variant="outline" className="gap-1.5 text-xs border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg">
                                                                <FileText className="w-3.5 h-3.5" /> Gastos
                                                            </Button>
                                                        </Link>
                                                        <Button size="sm" variant="ghost" className="w-8 h-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
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
                        </div>
                    </div>
                )}

                {/* ===== TAB: DEPUTADOS ALBA ===== */}
                {activeTab === "radar_alba" && (
                    <div>
                        {/* Label */}
                        <div className="flex items-center justify-between px-1 mb-5">
                            <div className="flex items-center gap-3">
                                <Landmark className="w-5 h-5 text-indigo-600" />
                                <h2 className="text-lg font-black text-slate-800 uppercase italic">
                                    Frota Parlamentar <span className="text-indigo-600 underline">ALBA</span>
                                </h2>
                                <span className="text-[11px] text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded-full">
                                    Base Transparência · DADOS-PRISMA
                                </span>
                            </div>
                        </div>
                        <AlbaCandidateList />
                    </div>
                )}

                {/* Footer */}
                <div className="text-center pt-10 border-t border-slate-100 mt-10">
                    <p className="text-xs text-slate-400 font-medium">
                        Dados sincronizados via <strong className="text-slate-600">Pipeline Zidane v4.0</strong> · PRISMA 888 Intelligence Platform
                    </p>
                </div>
            </div>
        </div>
    );
}
