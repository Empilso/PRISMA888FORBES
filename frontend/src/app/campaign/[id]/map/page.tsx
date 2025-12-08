"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
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
    my_votes: number;  // Votos específicos do candidato da campanha
    my_share: number;  // Porcentagem de votos do candidato
}

interface LocationResult {
    id: string;
    candidate_name: string;
    votes: number;
    location_id: string;
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

    // Estado para resultados detalhados (Location Results)
    const [locationResults, setLocationResults] = useState<LocationResult[]>([]);
    const [loadingResults, setLoadingResults] = useState(false);
    const [campaignName, setCampaignName] = useState<string>("");
    const [ballotName, setBallotName] = useState<string>(""); // Nome de urna para match

    // Buscar nome da campanha e nome de urna para destaque
    useEffect(() => {
        async function fetchCampaignData() {
            if (!campaignId) return;
            const { data } = await supabase
                .from('campaigns')
                .select('candidate_name, ballot_name')
                .eq('id', campaignId)
                .single();
            if (data) {
                setCampaignName(data.candidate_name);
                setBallotName(data.ballot_name || data.candidate_name); // Fallback para candidate_name
                console.log('🎯 [MAPA] Candidato:', data.candidate_name, '| Urna:', data.ballot_name);
            }
        }
        fetchCampaignData();
    }, [campaignId]);

    // Buscar resultados quando um local é selecionado
    useEffect(() => {
        async function fetchResults() {
            if (!selectedLocation) {
                setLocationResults([]); // Limpa resultados anteriores ao fechar ou mudar
                return;
            }

            setLoadingResults(true);

            try {
                const { data, error } = await supabase
                    .from('location_results')
                    .select('*')
                    .eq('location_id', selectedLocation.id)
                    .order('votes', { ascending: false }); // Ranking do 1º ao último

                if (error) throw error;
                setLocationResults(data || []);
            } catch (err) {
                console.error("Erro ao buscar resultados do local:", err);
                setLocationResults([]);
            } finally {
                setLoadingResults(false);
            }
        }
        fetchResults();
    }, [selectedLocation]);

    useEffect(() => {
        const fetchLocationsWithPerformance = async () => {
            if (!campaignId || !ballotName) return;

            try {
                // 1. Buscar todas as locations da campanha
                const { data: locData, error: locError } = await supabase
                    .from("locations")
                    .select("*")
                    .eq("campaign_id", campaignId);

                if (locError) throw locError;
                if (!locData || locData.length === 0) {
                    setLocations([]);
                    setIsLoading(false);
                    return;
                }

                // 2. Buscar votos do candidato em todas as locations (usando ILIKE para match flexível)
                const { data: myVotesData, error: votesError } = await supabase
                    .from('location_results')
                    .select('location_id, votes, candidate_name')
                    .ilike('candidate_name', `%${ballotName}%`);

                if (votesError) {
                    console.warn('⚠️ Erro ao buscar votos do candidato:', votesError);
                }

                // 3. Criar mapa de votos do candidato por location_id
                const myVotesMap: Record<string, number> = {};
                if (myVotesData) {
                    myVotesData.forEach((v) => {
                        myVotesMap[v.location_id] = v.votes;
                    });
                    console.log('🗳️ [MAPA] Votos do candidato encontrados em', Object.keys(myVotesMap).length, 'locais');
                }

                // 4. Calcular cor baseada na % de votos do candidato
                const getPerformanceColor = (myVotes: number, totalVotes: number): string => {
                    if (totalVotes === 0) return 'gray'; // Sem dados
                    const share = (myVotes / totalVotes) * 100;

                    if (share >= 20) return 'green';   // 🟢 Dominante (> 20%)
                    if (share >= 5) return 'yellow';   // 🟡 Competitivo (5-20%)
                    return 'red';                       // 🔴 Irrelevante (< 5%)
                };

                // 5. Montar locations com my_votes, my_share e cor correta
                const mappedLocations: Location[] = locData.map((loc: any) => {
                    const totalVotes = loc.votes_count || 0;
                    const myVotes = myVotesMap[loc.id] || 0;
                    const myShare = totalVotes > 0 ? (myVotes / totalVotes) * 100 : 0;
                    const color = getPerformanceColor(myVotes, totalVotes);

                    return {
                        id: loc.id,
                        name: loc.name,
                        address: loc.address || "",
                        position: [Number(loc.lat), Number(loc.lng)],
                        votes: totalVotes,
                        meta: loc.vote_goal || 0,
                        color: color,
                        my_votes: myVotes,
                        my_share: myShare
                    };
                });

                setLocations(mappedLocations);
                console.log('📍 [MAPA] Dados com performance:', mappedLocations.slice(0, 3));

                // Se houver locais, centralizar no primeiro
                if (mappedLocations.length > 0) {
                    setCenterPosition(mappedLocations[0].position);
                }
            } catch (error) {
                console.error("Erro ao buscar locais:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLocationsWithPerformance();
    }, [campaignId, ballotName]);

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
                <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Sua Performance por Local</h4>
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 border border-white shadow-sm" />
                        <span>🟢 Dominante (&gt; 20% dos votos)</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <div className="w-3 h-3 rounded-full bg-amber-400 border border-white shadow-sm" />
                        <span>🟡 Competitivo (5% - 20%)</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <div className="w-3 h-3 rounded-full bg-rose-500 border border-white shadow-sm" />
                        <span>🔴 Fraco (&lt; 5% dos votos)</span>
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

            {/* Sheet de Detalhes - Z-Index Fix */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto p-0 gap-0 z-[9999]">
                    <SheetTitle className="hidden">Detalhes do Local</SheetTitle>
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
                                        <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded border">ID: #{selectedLocation.id}</span>
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
                                    <h3 className="text-xs font-bold uppercase text-muted-foreground flex justify-between items-center">
                                        <span>Ranking de Candidatos</span>
                                        {loadingResults && <Loader2 className="h-3 w-3 animate-spin" />}
                                    </h3>

                                    <div className="space-y-3">
                                        {!loadingResults && locationResults.length === 0 && (
                                            <p className="text-sm text-muted-foreground italic">Nenhum resultado registrado para este local.</p>
                                        )}

                                        {locationResults.map((cand, idx) => {
                                            const totalVotes = selectedLocation.votes || 1; // Evita divisão por zero
                                            const percent = ((cand.votes / totalVotes) * 100).toFixed(1);
                                            const isMyCampaign = campaignName && cand.candidate_name.toLowerCase().includes(campaignName.toLowerCase());

                                            // Cores dinâmicas para o ranking
                                            let rankColor = "bg-slate-200 text-slate-700";
                                            if (idx === 0) rankColor = "bg-yellow-100 text-yellow-700 border-yellow-200 border";
                                            if (idx === 1) rankColor = "bg-slate-100 text-slate-700 border-slate-200 border";
                                            if (idx === 2) rankColor = "bg-orange-50 text-orange-800 border-orange-100 border";

                                            // Cor da barra de progresso
                                            const progressColor = isMyCampaign ? "bg-blue-600" : (idx === 0 ? "bg-emerald-500" : "bg-slate-300");

                                            return (
                                                <div key={cand.id} className={`flex flex-col gap-1 p-2 rounded-lg transition-colors ${isMyCampaign ? 'bg-blue-50/50 border border-blue-100' : 'hover:bg-slate-50'}`}>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${rankColor}`}>
                                                                {idx + 1}º
                                                            </div>
                                                            <div>
                                                                <p className={`text-sm font-bold ${isMyCampaign ? 'text-blue-700' : 'text-slate-800'}`}>
                                                                    {cand.candidate_name}
                                                                    {isMyCampaign && <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded">VOCÊ</span>}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-sm font-bold block">{cand.votes.toLocaleString()}</span>
                                                            <span className="text-[10px] text-muted-foreground">{percent}%</span>
                                                        </div>
                                                    </div>

                                                    {/* Barra de Progresso */}
                                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-1">
                                                        <div
                                                            className={`h-full rounded-full ${progressColor}`}
                                                            style={{ width: `${percent}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
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
