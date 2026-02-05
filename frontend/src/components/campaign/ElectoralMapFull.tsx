"use client";

import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layers, Filter, MapIcon, Zap, Search, Loader2, StickyNote, Plus, Trash2, Users, Eye, EyeOff } from "lucide-react";
import dynamic from "next/dynamic";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { MapNotesLayer, MapNote } from "@/components/map/MapNotesLayer";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Importação dinâmica do mapa (SSR false)
const MapComponent = dynamic(() => import("@/components/dashboard/map-component"), {
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center bg-muted">Carregando mapa...</div>
});

// Interfaces
interface Location {
    id: string;
    name: string;
    address: string;
    position: [number, number];
    votes: number;
    meta: number;
    color: string;
    my_votes: number;
    my_share: number;
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

    // Notes State
    const [isNoteMode, setIsNoteMode] = useState(false);
    const [notes, setNotes] = useState<MapNote[]>([]);
    const [selectedNote, setSelectedNote] = useState<MapNote | null>(null);
    const [isNoteSheetOpen, setIsNoteSheetOpen] = useState(false);
    const [noteForm, setNoteForm] = useState<Partial<MapNote>>({});
    const [isSavingNote, setIsSavingNote] = useState(false);

    // Estado para resultados detalhados (Location Results)
    const [locationResults, setLocationResults] = useState<LocationResult[]>([]);
    const [loadingResults, setLoadingResults] = useState(false);
    const [campaignName, setCampaignName] = useState<string>("");
    const [ballotName, setBallotName] = useState<string>("");
    const [isGeneratingAction, setIsGeneratingAction] = useState(false);

    // Competitor Overlay State
    const [showCompetitorOverlay, setShowCompetitorOverlay] = useState(false);
    const [competitors, setCompetitors] = useState<{ id: string, name: string, color: string }[]>([]);
    const [selectedCompetitorId, setSelectedCompetitorId] = useState<string | null>(null);
    const [competitorLocations, setCompetitorLocations] = useState<Location[]>([]);
    const [loadingCompetitor, setLoadingCompetitor] = useState(false);

    // 1. Fetch Campaign Info & Notes
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
        fetchNotes();
    }, [campaignId]);

    const fetchNotes = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/campaign/${campaignId}/map_notes`);
            if (res.ok) {
                const data = await res.json();
                setNotes(data || []);
            }
        } catch (e) {
            console.error("Failed to fetch map notes", e);
        }
    };

    // Fetch competitors list
    useEffect(() => {
        const fetchCompetitors = async () => {
            try {
                const { data, error } = await supabase
                    .from('competitors')
                    .select('id, name, color')
                    .eq('campaign_id', campaignId);
                if (data) setCompetitors(data);
            } catch (e) {
                console.error("Failed to fetch competitors", e);
            }
        };
        fetchCompetitors();
    }, [campaignId]);

    // Fetch competitor locations when selected
    const fetchCompetitorGeo = async (competitorId: string) => {
        setLoadingCompetitor(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/competitor/${competitorId}/votes/geo`);
            if (res.ok) {
                const data = await res.json();
                // Convert to Location format
                const locs: Location[] = data.locations.map((loc: any) => ({
                    id: loc.id,
                    name: loc.name,
                    address: '',
                    position: loc.position,
                    votes: loc.total_votes || 0,
                    meta: 0,
                    color: 'red',
                    my_votes: loc.votes,
                    my_share: loc.percentage
                }));
                setCompetitorLocations(locs);
                if (data.matched > 0) {
                    toast({
                        title: `📍 ${data.competitor_name}`,
                        description: `${data.matched} locais carregados no mapa`
                    });
                }
            }
        } catch (e) {
            console.error("Failed to fetch competitor geo", e);
        } finally {
            setLoadingCompetitor(false);
        }
    };

    // Toggle competitor overlay
    const handleToggleCompetitor = () => {
        if (showCompetitorOverlay) {
            // Desligando
            setShowCompetitorOverlay(false);
            setCompetitorLocations([]);
            setSelectedCompetitorId(null);
        } else {
            // Ligando - se tiver competidor selecionado, carrega
            setShowCompetitorOverlay(true);
            if (selectedCompetitorId) {
                fetchCompetitorGeo(selectedCompetitorId);
            }
        }
    };

    // When competitor selection changes
    const handleCompetitorChange = (competitorId: string) => {
        setSelectedCompetitorId(competitorId);
        if (showCompetitorOverlay && competitorId) {
            fetchCompetitorGeo(competitorId);
        }
    };

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
        if (isNoteMode) return;
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
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const response = await fetch(`${apiUrl}/api/campaign/${campaignId}/location/${selectedLocation.id}/tactical_action`, {
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

    // Note Handlers
    const handleMapClick = (lat: number, lng: number) => {
        if (!isNoteMode) return;
        setNoteForm({ lat, lng, type: 'alerta', status: 'aberta', priority: 3, title: '', body: '' });
        setSelectedNote(null);
        setIsNoteSheetOpen(true);
    };

    const handleNoteClick = (note: MapNote) => {
        setSelectedNote(note);
        setNoteForm(note);
        setIsNoteSheetOpen(true);
    };

    const saveNote = async () => {
        if (!noteForm.title) {
            toast({ title: "Erro", description: "Título é obrigatório", variant: "destructive" });
            return;
        }
        setIsSavingNote(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            let res;
            if (selectedNote) {
                // Update
                res = await fetch(`${apiUrl}/api/campaign/${campaignId}/map_notes/${selectedNote.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(noteForm)
                });
            } else {
                // Create
                res = await fetch(`${apiUrl}/api/campaign/${campaignId}/map_notes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(noteForm)
                });
            }

            if (!res.ok) throw new Error("Failed to save note");

            toast({ title: "Sucesso", description: "Nota salva com sucesso." });
            setIsNoteSheetOpen(false);
            fetchNotes();
        } catch (e) {
            console.error(e);
            toast({ title: "Erro", description: "Erro ao salvar nota.", variant: "destructive" });
        } finally {
            setIsSavingNote(false);
        }
    };

    const deleteNote = async () => {
        if (!selectedNote) return;
        if (!confirm("Tem certeza que deseja excluir esta nota?")) return;

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            await fetch(`${apiUrl}/api/campaign/${campaignId}/map_notes/${selectedNote.id}`, {
                method: 'DELETE'
            });
            toast({ title: "Sucesso", description: "Nota excluída." });
            setIsNoteSheetOpen(false);
            fetchNotes();
        } catch (e) {
            toast({ title: "Erro", description: "Erro ao excluir nota.", variant: "destructive" });
        }
    };

    return (
        <div className="relative h-[calc(100vh-4rem)] w-full overflow-hidden flex flex-col bg-slate-50 border rounded-2xl shadow-sm">

            {/* Toolbar e Top Left */}
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

                    <Button
                        variant={isNoteMode ? "default" : "ghost"}
                        size="icon"
                        className={`h-8 w-8 ${isNoteMode ? "bg-amber-500 text-white hover:bg-amber-600" : ""}`}
                        onClick={() => {
                            setIsNoteMode(!isNoteMode);
                            if (!isNoteMode) {
                                toast({ title: "Modo Nota Ativo", description: "Clique no mapa para adicionar uma nota." });
                            }
                        }}
                        title="Adicionar Nota / Alerta"
                    >
                        <StickyNote className="h-4 w-4" />
                    </Button>

                    {/* Competitor Overlay Toggle */}
                    {competitors.length > 0 && (
                        <div className="flex items-center gap-1 ml-2 pl-2 border-l">
                            <select
                                className="h-8 text-xs p-1 rounded border bg-white dark:bg-slate-800 w-28"
                                value={selectedCompetitorId || ''}
                                onChange={(e) => handleCompetitorChange(e.target.value)}
                                disabled={loadingCompetitor}
                            >
                                <option value="">Concorrente</option>
                                {competitors.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <Button
                                variant={showCompetitorOverlay ? "default" : "ghost"}
                                size="icon"
                                className={`h-8 w-8 ${showCompetitorOverlay ? "bg-red-500 text-white hover:bg-red-600" : ""}`}
                                onClick={handleToggleCompetitor}
                                disabled={!selectedCompetitorId || loadingCompetitor}
                                title={showCompetitorOverlay ? "Ocultar Concorrente" : "Mostrar Concorrente"}
                            >
                                {loadingCompetitor ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : showCompetitorOverlay ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    )}

                    <Button variant="ghost" size="icon" className="h-8 w-8"><Filter className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MapIcon className="h-4 w-4" /></Button>
                </div>

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

            {/* Search Bar */}
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

            {/* Hint Mode */}
            {isNoteMode && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] bg-amber-500 text-white px-4 py-2 rounded-full shadow-lg text-sm font-bold animate-in fade-in flex items-center gap-2">
                    <StickyNote className="h-4 w-4" />
                    Modo Criação de Notas Ativo
                </div>
            )}

            {/* Mapa */}
            <div className={`flex-1 w-full h-full relative ${isNoteMode ? 'cursor-crosshair' : ''}`}>
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
                    competitorLocations={showCompetitorOverlay ? competitorLocations : []}
                    onLocationClick={handleLocationClick}
                    mapStyle={mapStyle}
                    centerPosition={centerPosition}
                >
                    <MapNotesLayer
                        notes={notes}
                        isNoteMode={isNoteMode}
                        onMapClick={handleMapClick}
                        onNoteClick={handleNoteClick}
                    />
                </MapComponent>
            </div>

            {/* Sheet de Detalhes do Local */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto p-0 gap-0 z-[99999]" side="right" style={{ zIndex: 99999 }}>
                    {selectedLocation && (
                        <div className="flex flex-col h-full bg-slate-50">
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

            {/* Note Editor Sheet */}
            <Sheet open={isNoteSheetOpen} onOpenChange={setIsNoteSheetOpen}>
                <SheetContent className="w-[400px] sm:w-[540px] p-6 z-[99999]" side="right" style={{ zIndex: 99999 }}>
                    <SheetHeader>
                        <SheetTitle>{selectedNote ? 'Editar Nota' : 'Nova Nota'}</SheetTitle>
                        <SheetDescription>
                            Adicione informações táticas sobre este ponto do mapa.
                        </SheetDescription>
                    </SheetHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Título</Label>
                            <Input
                                value={noteForm.title || ''}
                                onChange={e => setNoteForm(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Ex: Buraco na rua, Oportunidade de comício..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tipo</Label>
                                <select
                                    className="w-full p-2 border rounded-md text-sm bg-background"
                                    value={noteForm.type || 'alerta'}
                                    onChange={e => setNoteForm(prev => ({ ...prev, type: e.target.value as any }))}
                                >
                                    <option value="alerta">Alerta</option>
                                    <option value="oportunidade">Oportunidade</option>
                                    <option value="risco">Risco</option>
                                    <option value="logistica">Logística</option>
                                    <option value="campo">Campo</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Prioridade (1-5)</Label>
                                <select
                                    className="w-full p-2 border rounded-md text-sm bg-background"
                                    value={noteForm.priority || 3}
                                    onChange={e => setNoteForm(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                                >
                                    <option value={1}>1 - Baixa</option>
                                    <option value={2}>2 - Normal</option>
                                    <option value={3}>3 - Média</option>
                                    <option value={4}>4 - Alta</option>
                                    <option value={5}>5 - Crítica</option>
                                </select>
                            </div>
                        </div>

                        {/* Style Selection */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Cor do Pin</Label>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { fill: '#EF4444', label: 'Vermelho' }, // Red
                                        { fill: '#F59E0B', label: 'Laranja' }, // Amber
                                        { fill: '#10B981', label: 'Verde' },   // Emerald
                                        { fill: '#3B82F6', label: 'Azul' },    // Blue
                                        { fill: '#8B5CF6', label: 'Roxo' },    // Violet
                                        { fill: '#EC4899', label: 'Rosa' },    // Pink
                                        { fill: '#64748B', label: 'Cinza' },   // Slate
                                    ].map((c) => (
                                        <button
                                            key={c.fill}
                                            className={`w-6 h-6 rounded-full border-2 transition-all ${noteForm.color === c.fill ? 'border-black scale-110 ring-2 ring-offset-1 ring-slate-400' : 'border-transparent hover:scale-105'}`}
                                            style={{ backgroundColor: c.fill }}
                                            onClick={() => setNoteForm(prev => ({ ...prev, color: c.fill }))}
                                            title={c.label}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Formato</Label>
                                <div className="flex gap-2">
                                    {[
                                        { id: 'circle', icon: <div className="w-4 h-4 rounded-full bg-slate-400" /> },
                                        { id: 'triangle', icon: <div className="w-0 h-0 border-l-[8px] border-l-transparent border-b-[14px] border-r-[8px] border-r-transparent border-b-slate-400" /> },
                                        { id: 'flag', icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-slate-400"><path fillRule="evenodd" d="M3 2.25a.75.75 0 01.75.75v.54l1.838-.46a9.75 9.75 0 016.725.738l.108.054a8.25 8.25 0 005.58.652l3.109-.732a.75.75 0 01.917.81 47.784 47.784 0 00.005 10.337.75.75 0 01-.574.812l-3.114.733a9.75 9.75 0 01-6.594-.158l-.106-.053a8.25 8.25 0 00-5.69-.717l-2.137.535v9.141a.75.75 0 01-1.5 0v-10.9V3a.75.75 0 01.75-.75z" clipRule="evenodd" /></svg> },
                                    ].map((s) => (
                                        <button
                                            key={s.id}
                                            className={`w-10 h-10 flex items-center justify-center border rounded-md transition-all ${noteForm.shape === s.id ? 'bg-slate-100 border-slate-500 ring-1 ring-slate-500' : 'bg-white hover:bg-slate-50 border-slate-200'}`}
                                            onClick={() => setNoteForm(prev => ({ ...prev, shape: s.id as any }))}
                                            title={s.id}
                                        >
                                            {s.icon}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Descrição</Label>
                            <Textarea
                                value={noteForm.body || ''}
                                onChange={e => setNoteForm(prev => ({ ...prev, body: e.target.value }))}
                                rows={5}
                                placeholder="Detalhes sobre a situação..."
                            />
                        </div>
                    </div>
                    <SheetFooter className="flex justify-between sm:justify-between items-center w-full">
                        {selectedNote ? (
                            <Button variant="destructive" size="icon" onClick={deleteNote} title="Excluir Nota">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        ) : <div />}

                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setIsNoteSheetOpen(false)}>Cancelar</Button>
                            <Button onClick={saveNote} disabled={isSavingNote}>
                                {isSavingNote && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar
                            </Button>
                        </div>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    );
}
