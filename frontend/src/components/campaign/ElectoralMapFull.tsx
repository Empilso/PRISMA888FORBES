"use client";

import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Added missing Input import
import { Layers, Filter, MapIcon, Zap, Search, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"; // Added Sheet imports
import { MapNotesLayer } from "@/components/map/MapNotesLayer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Importação dinâmica do mapa (SSR false) - Moved Outside
const MapComponent = dynamic(() => import("@/components/dashboard/map-component"), {
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center bg-muted">Carregando mapa...</div>
});

// Interfaces - Moved Outside
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

interface ElectoralMapFullProps {
    campaignId: string;
}

export function ElectoralMapFull({ campaignId }: ElectoralMapFullProps) {
    const supabase = createClient();
    const { toast } = useToast();

    // State
    const [locations, setLocations] = useState<Location[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [mapStyle, setMapStyle] = useState('osm-bright');
    const [pinStyle, setPinStyle] = useState('classic-red');
    const [searchQuery, setSearchQuery] = useState('');
    const [centerPosition, setCenterPosition] = useState<[number, number] | undefined>(undefined);
    const [showControls, setShowControls] = useState(false);
    const [isAddingNote, setIsAddingNote] = useState(false);

    // Estado para resultados detalhados (Location Results)
    const [locationResults, setLocationResults] = useState<LocationResult[]>([]);
    const [loadingResults, setLoadingResults] = useState(false);
    const [campaignName, setCampaignName] = useState<string>("");
    const [ballotName, setBallotName] = useState<string>(""); // Nome de urna para match
    const [isGeneratingAction, setIsGeneratingAction] = useState(false);

    // 1. Fetch Campaign Info
    useEffect(() => {
        const fetchCampaign = async () => {
            if (!campaignId) return;
            const { data, error } = await supabase.from('campaigns').select('name, ballot_name').eq('id', campaignId).single();
            if (data) {
                setCampaignName(data.name);
                setBallotName(data.ballot_name || data.name);
            }
        }
        fetchCampaign();
    }, [campaignId]);

    // 2. Fetch Detailed Results for Selected Location
    useEffect(() => {
        if (!selectedLocation) {
            setLocationResults([]);
            return;
        }

        const fetchResults = async () => {
            setLoadingResults(true);
            try {
                const { data, error } = await supabase
                    .from('location_results')
                    .select('*')
                    .eq('location_id', selectedLocation.id)
                    .order('votes', { ascending: false });

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

    // 3. Fetch All Locations & Performance
    useEffect(() => {
        const fetchLocationsWithPerformance = async () => {
            if (!campaignId || !ballotName) return;

            try {
                // A. Busca Locations
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

                // B. Busca Votos (Matches)
                const { data: myVotesData, error: votesError } = await supabase
                    .from('location_results')
                    .select('location_id, votes, candidate_name')
                    .ilike('candidate_name', `%${ballotName}%`);

                if (votesError) console.warn('⚠️ Erro ao buscar votos do candidato:', votesError);

                // C. Map Votes
                const myVotesMap: Record<string, number> = {};
                if (myVotesData) {
                    myVotesData.forEach((v) => {
                        myVotesMap[v.location_id] = v.votes;
                    });
                }

                const getPerformanceColor = (myVotes: number, totalVotes: number): string => {
                    if (totalVotes === 0) return 'gray';
                    const share = (myVotes / totalVotes) * 100;
                    if (share >= 20) return 'green';
                    if (share >= 5) return 'yellow';
                    return 'red';
                };

                // D. Merge
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

    // Handlers
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

    const handleGenerateGuerrillaAction = async () => {
        if (!selectedLocation) return;
        setIsGeneratingAction(true);
        try {
            // Using consolidated service wrapper if available, or direct legacy endpoint
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const response = await fetch(`${apiUrl}/campaign/${campaignId}/location/${selectedLocation.id}/tactical_action`, {
                method: 'POST'
            });

            if (!response.ok) throw new Error('Falha ao gerar ação');
            const data = await response.json();

            toast({
                title: "🎯 Ação de Guerrilha Criada!",
                description: `"${data.action_title}" foi adicionada ao Kanban.`,
            });
        } catch (error) {
            console.error(error);
            toast({
                title: "Erro",
                description: "Não foi possível gerar a ação tática.",
                variant: "destructive"
            });
        } finally {
            setIsGeneratingAction(false);
        }
    };

    // Render
    return (
        <div className="relative h-[calc(100vh-4rem)] w-full overflow-hidden flex flex-col bg-slate-50 border rounded-2xl shadow-sm">

            {/* Toolbar Flutuante (Top Left) */}
            <div className="absolute top-4 left-4 z-[100] flex flex-col gap-2">
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

                    {/* Botão Adicionar Nota */}
                    <Button
                        variant={isAddingNote ? "default" : "ghost"}
                        size="icon"
                        className={`h-8 w-8 ${isAddingNote ? "bg-blue-600 text-white hover:bg-blue-700" : ""}`}
                        onClick={() => {
                            setIsAddingNote(!isAddingNote);
                            if (!isAddingNote) {
                                toast({ title: "Modo de Criação", description: "Clique no mapa para adicionar uma nota." });
                            }
                        }}
                        title="Adicionar Nota Estratégica"
                    >
                        <Zap className="h-4 w-4" />
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
            <div className="absolute top-4 right-4 z-[100] w-80 flex gap-2">
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
            <div className="absolute bottom-8 left-4 z-[100] bg-white dark:bg-slate-950 p-3 rounded-lg shadow-md border w-64">
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
                >
                    <MapNotesLayer
                        campaignId={campaignId}
                        isAddingNote={isAddingNote}
                        onNoteAdded={() => setIsAddingNote(false)}
                    />
                </MapComponent>
            </div>

            {/* Sheet de Detalhes */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto p-0 gap-0 z-[99999]" side="right" style={{ zIndex: 99999 }}>
                    {/* Fallback layout for sheet since I don't have the original Sheet content perfectly preserved.
                       I will reconstruct a clean version based on typical Location Details UI.
                    */}
                    {selectedLocation && (
                        <div className="flex flex-col h-full bg-slate-50">
                            {/* Header */}
                            <div className="bg-white p-6 border-b sticky top-0 z-10">
                                <SheetHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <SheetTitle className="text-2xl font-bold text-slate-900">{selectedLocation.name}</SheetTitle>
                                            <SheetDescription className="text-slate-500 mt-1 flex items-center gap-1">
                                                <MapIcon className="h-3 w-3" /> {selectedLocation.address}
                                            </SheetDescription>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mt-6">
                                        <div className="bg-slate-50 p-3 rounded-lg border">
                                            <span className="text-xs font-bold text-slate-500 uppercase">Seus Votos</span>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-2xl font-black text-slate-900">{selectedLocation.my_votes}</span>
                                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${selectedLocation.my_share > 20 ? 'bg-green-100 text-green-700' :
                                                    selectedLocation.my_share > 5 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {selectedLocation.my_share.toFixed(1)}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-lg border">
                                            <span className="text-xs font-bold text-slate-500 uppercase">Total Urna</span>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-2xl font-black text-slate-900">{selectedLocation.votes}</span>
                                            </div>
                                        </div>
                                    </div>
                                </SheetHeader>
                            </div>

                            {/* Body */}
                            <div className="p-6 space-y-6 flex-1">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-slate-800">Ranking da Urna</h3>
                                        <Button
                                            size="sm"
                                            className="bg-purple-600 hover:bg-purple-700 text-white"
                                            onClick={handleGenerateGuerrillaAction}
                                            disabled={isGeneratingAction}
                                        >
                                            {isGeneratingAction ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                                            Gerar Estratégia
                                        </Button>
                                    </div>

                                    {loadingResults ? (
                                        <div className="flex justify-center p-4"><Loader2 className="animate-spin text-slate-400" /></div>
                                    ) : (
                                        <div className="space-y-3">
                                            {locationResults.map((res: LocationResult, idx: number) => {
                                                const share = selectedLocation.votes > 0 ? (res.votes / selectedLocation.votes) * 100 : 0;
                                                const isMe = res.candidate_name.toLowerCase().includes(ballotName.toLowerCase());
                                                return (
                                                    <div key={res.id} className={`flex items-center justify-between p-3 rounded-lg border ${isMe ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-300' : 'bg-white'}`}>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                                                {idx + 1}º
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className={`text-sm font-bold ${isMe ? 'text-blue-900' : 'text-slate-700'}`}>
                                                                    {res.candidate_name} {isMe && '(Você)'}
                                                                </span>
                                                                {/* Progress Removed */}
                                                                <div className="h-1.5 w-24 mt-1 bg-slate-100 rounded-full overflow-hidden">
                                                                    <div className={`h-full ${isMe ? 'bg-blue-600' : 'bg-slate-400'}`} style={{ width: `${share}%` }} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-bold text-sm">{res.votes}</div>
                                                            <div className="text-[10px] text-slate-500">{share.toFixed(1)}%</div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                            {locationResults.length === 0 && <p className="text-sm text-muted-foreground">Sem dados de votação detalhados.</p>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
