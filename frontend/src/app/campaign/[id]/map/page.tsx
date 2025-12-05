"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Layers, X, Map as MapIcon, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useParams } from "next/navigation";

// Importação dinâmica do mapa (SSR false)
const MapComponent = dynamic(() => import("@/components/dashboard/map-component"), {
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center bg-muted">Carregando mapa...</div>
});

interface Location {
    id: string;
    name: string;
    address: string;
    position: [number, number];
    votes: number;
    meta: number;
    color: string;
}

export default function MapaInterativoPage() {
    const params = useParams();
    const campaignId = params.id as string;
    const supabase = createClient();

    const [locations, setLocations] = useState<Location[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [mapStyle, setMapStyle] = useState('osm-bright');
    const [pinStyle, setPinStyle] = useState('classic-red');
    const [searchQuery, setSearchQuery] = useState('');
    const [centerPosition, setCenterPosition] = useState<[number, number] | undefined>(undefined);
    const [showControls, setShowControls] = useState(false);

    useEffect(() => {
        const fetchLocations = async () => {
            if (!campaignId) return;

            try {
                // TODO: Implementar Clustering no futuro se houver > 1000 pontos
                const { data, error } = await supabase
                    .from("locations")
                    .select("*")
                    .eq("campaign_id", campaignId);

                if (error) throw error;

                if (data) {
                    const mappedLocations: Location[] = data.map((loc: any) => ({
                        id: loc.id,
                        name: loc.name,
                        address: loc.address || "",
                        position: [Number(loc.lat), Number(loc.lng)],
                        votes: loc.votes_count || 0,
                        meta: loc.vote_goal || 0,
                        color: loc.color || "blue"
                    }));
                    setLocations(mappedLocations);
                    console.log("📍 Dados do Mapa:", mappedLocations);

                    // Se houver locais, centralizar no primeiro
                    if (mappedLocations.length > 0) {
                        setCenterPosition(mappedLocations[0].position);
                    }
                }
            } catch (error) {
                console.error("Erro ao buscar locais:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLocations();
    }, [campaignId]);

    const handleLocationClick = (location: any) => {
        setSelectedLocation(location);
        setIsSheetOpen(true);
    };

    const handleSearch = async () => {
        if (!searchQuery) return;
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
            const data = await response.json();
            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                setCenterPosition([parseFloat(lat), parseFloat(lon)]);
            }
        } catch (error) {
            console.error("Erro na busca:", error);
        }
    };

    return (
        <div className="relative h-[calc(100vh-4rem)] w-full overflow-hidden flex flex-col">
            {/* Toolbar Flutuante (Top Left) */}
            <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
                <div className="bg-white dark:bg-slate-950 p-1 rounded-md shadow-md border flex flex-col gap-1">
                    <Button
                        variant={showControls ? "secondary" : "ghost"}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setShowControls(!showControls)}
                        title="Configurações do Mapa"
                    >
                        <Layers className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Filter className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MapIcon className="h-4 w-4" /></Button>
                </div>

                {/* Painel de Controles Expandido */}
                {showControls && (
                    <div className="bg-white dark:bg-slate-950 p-4 rounded-md shadow-lg border w-64 space-y-4 animate-in slide-in-from-left-2">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Estilo do Mapa</label>
                            <select
                                className="w-full text-sm p-2 rounded border bg-background"
                                value={mapStyle}
                                onChange={(e) => setMapStyle(e.target.value)}
                            >
                                <option value="osm">OpenStreetMap</option>
                                <option value="osm-bright">OSM Bright (Clean)</option>
                                <option value="osm-hot">OSM Hot</option>
                                <option value="satellite">Satélite</option>
                                <option value="carto-dark">Carto Dark</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Estilo dos Pins</label>
                            <select
                                className="w-full text-sm p-2 rounded border bg-background"
                                value={pinStyle}
                                onChange={(e) => setPinStyle(e.target.value)}
                            >
                                <option value="classic-red">Clássico Vermelho</option>
                                <option value="classic-blue">Clássico Azul</option>
                                <option value="classic-green">Clássico Verde</option>
                                <option value="modern-red">Moderno Vermelho</option>
                                <option value="modern-blue">Moderno Azul</option>
                                <option value="modern-purple">Moderno Roxo</option>
                                <option value="location-red">Localização Vermelha</option>
                                <option value="location-blue">Localização Azul</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Search Bar (Top Center/Right) */}
            <div className="absolute top-4 right-4 z-[1000] w-80 flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar cidade, endereço..."
                        className="pl-8 bg-white dark:bg-slate-950 shadow-md border-0"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                </div>
                <Button onClick={handleSearch} className="shadow-md">Buscar</Button>
            </div>

            {/* Legenda (Bottom Left) */}
            <div className="absolute bottom-8 left-4 z-[1000] bg-white dark:bg-slate-950 p-3 rounded-lg shadow-md border w-64">
                <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Performance por Região</h4>
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span>Alta Performance (&gt; 2000 votos)</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <span>Média Performance (1000-2000)</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span>Baixa Performance (&lt; 1000)</span>
                    </div>
                </div>
            </div>

            {/* Mapa */}
            <div className="flex-1 w-full h-full relative">
                {isLoading && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            <span className="text-sm font-medium text-gray-600">Carregando locais...</span>
                        </div>
                    </div>
                )}
                <MapComponent
                    locations={locations}
                    onLocationClick={handleLocationClick}
                    mapStyle={mapStyle}
                    pinStyle={pinStyle}
                    centerPosition={centerPosition}
                />
            </div>

            {/* Sheet de Detalhes */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto p-0 gap-0">
                    {selectedLocation && (
                        <div className="flex flex-col h-full">
                            {/* Header com imagem/mapa estático */}
                            <div className="h-32 bg-slate-100 relative border-b">
                                <div className="absolute top-4 left-4 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">
                                    EE
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2 h-8 w-8 bg-white/50 hover:bg-white"
                                    onClick={() => setIsSheetOpen(false)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Título e Endereço */}
                                <div>
                                    <h2 className="text-xl font-bold">{selectedLocation.name}</h2>
                                    <p className="text-sm text-muted-foreground mt-1">{selectedLocation.address}</p>
                                    <div className="flex gap-2 mt-3">
                                        <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded border">ID: {selectedLocation.id.substring(0, 8)}</span>
                                        <span className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded border border-blue-100 font-medium">
                                            {selectedLocation.votes.toLocaleString()} VOTOS
                                        </span>
                                    </div>
                                </div>

                                {/* Tabs de Navegação Interna */}
                                <div className="flex border-b">
                                    <button className="px-4 py-2 text-sm font-medium text-blue-600 border-b-2 border-blue-600">Visão Geral</button>
                                    <button className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">Candidatos</button>
                                    <button className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">Demografia</button>
                                </div>

                                {/* Cards de Métricas */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold uppercase text-muted-foreground">Desempenho Local</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Card className="bg-slate-50 border-slate-100">
                                            <CardContent className="p-4">
                                                <p className="text-xs text-muted-foreground">Total Votos</p>
                                                <p className="text-2xl font-bold text-slate-900">{selectedLocation.votes.toLocaleString()}</p>
                                            </CardContent>
                                        </Card>
                                        <Card className="bg-slate-50 border-slate-100">
                                            <CardContent className="p-4">
                                                <p className="text-xs text-muted-foreground">Meta</p>
                                                <p className="text-2xl font-bold text-blue-600">{selectedLocation.meta.toLocaleString()}</p>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>

                                {/* Top Candidatos (Placeholder por enquanto) */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold uppercase text-muted-foreground">Top 3 Candidatos no Local</h3>
                                    <div className="space-y-3">
                                        {[
                                            { name: "CANDIDATO A", percent: 45.1, color: "bg-orange-500" },
                                            { name: "CANDIDATO B", percent: 30.2, color: "bg-slate-400" },
                                            { name: "CANDIDATO C", percent: 15.5, color: "bg-red-500" }
                                        ].map((cand, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full ${cand.color} flex items-center justify-center text-white text-xs font-bold`}>
                                                        {idx + 1}º
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold">{cand.name}</p>
                                                        <p className="text-xs text-muted-foreground">-- votos</p>
                                                    </div>
                                                </div>
                                                <span className="text-sm font-bold">{cand.percent}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
