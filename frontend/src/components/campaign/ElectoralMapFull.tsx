"use client";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layers, Filter, MapIcon, Zap, Search, Loader2, StickyNote, Plus, Trash2, Users, Eye, EyeOff, Radar, MessageCircle, Sparkles, Instagram } from "lucide-react";
import dynamic from "next/dynamic";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { MapNotesLayer, MapNote } from "@/components/map/MapNotesLayer";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { SocialRadarLayer, SocialMention } from "@/components/map/SocialRadarLayer";
import { MapNavigationTools } from "@/components/map/MapNavigationTools";
import { SocialMentionSheet } from "@/components/map/SocialMentionSheet";

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
    campaignId?: string;
    campaigns?: any[]; // Prop para agregação Multi-tenant (Modo Partido)
}

export function ElectoralMapFull({ campaignId, campaigns }: ElectoralMapFullProps) {
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

    // Micro-Strategy State
    const [isGeneratingMicro, setIsGeneratingMicro] = useState(false);
    const [isDelegatingMicro, setIsDelegatingMicro] = useState(false);
    const [microStrategy, setMicroStrategy] = useState<any>(null);
    const [selectedNote, setSelectedNote] = useState<MapNote | null>(null);
    const [isNoteSheetOpen, setIsNoteSheetOpen] = useState(false);
    const [noteForm, setNoteForm] = useState<Partial<MapNote>>({});
    const [isSavingNote, setIsSavingNote] = useState(false);

    // Notes State
    const [isNoteMode, setIsNoteMode] = useState(false);
    const [notes, setNotes] = useState<MapNote[]>([]);

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

    // Social Radar State
    const [showSocialRadar, setShowSocialRadar] = useState(false);
    const [socialMentions, setSocialMentions] = useState<SocialMention[]>([]);
    const [loadingSocial, setLoadingSocial] = useState(false);
    const [socialStats, setSocialStats] = useState<{ positive: number; negative: number; neutral: number; monitored_targets?: string[] } | null>(null);
    const [selectedMention, setSelectedMention] = useState<SocialMention | null>(null);
    const [isMentionSheetOpen, setIsMentionSheetOpen] = useState(false);
    // REMOVIDO: isThermometerExpanded (movido para o header global)

    // Filters for Social Radar
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram', 'tiktok']);
    const [selectedRivals, setSelectedRivals] = useState<string[]>([]);

    // Derived unique rivals: Use backend targets first, fallback to mentions
    const uniqueRivals = useMemo(() => {
        const targets = socialStats?.monitored_targets || [];
        if (targets.length > 0) {
            return targets
                .filter(Boolean)
                .map(t => String(t).startsWith('@') ? String(t).substring(1) : String(t));
        }

        // EXTRACTION QI 190: Extract from ALL mentions, regardless of current filter
        return Array.from(new Set(socialMentions.map(m => {
            const h = m.rival_handle || '';
            return h.startsWith('@') ? h.substring(1) : h;
        }))).filter(Boolean).sort();
    }, [socialMentions, socialStats]);

    // Update selected rivals when uniqueRivals change (e.g. initial load)
    useEffect(() => {
        if (uniqueRivals.length > 0 && selectedRivals.length === 0) {
            setSelectedRivals(uniqueRivals);
        } else if (uniqueRivals.length > 0 && selectedRivals.length > 0) {
            // Estabilização QI 190: Evitar que re-cálculos de uniqueRivals forcem re-renders inúteis
            // se o conteúdo for idêntico
            const isIdentical = uniqueRivals.length === selectedRivals.length &&
                uniqueRivals.every((v, i) => v === selectedRivals[i]);
            if (!isIdentical && selectedRivals.length === 0) {
                setSelectedRivals(uniqueRivals);
            }
        }
    }, [uniqueRivals]); // Removido selectedRivals do array para evitar loop

    // Computed filtered mentions
    const filteredMentions = useMemo(() => {
        return socialMentions.filter(m => {
            const rawHandle = m.rival_handle || '';
            const handle = rawHandle.startsWith('@') ? rawHandle.substring(1) : rawHandle;
            return selectedRivals.includes(handle) &&
                selectedPlatforms.includes((m.platform || '').toLowerCase());
        });
    }, [socialMentions, selectedRivals, selectedPlatforms]);

    // Otimização QI 190: Memoizar locations para evitar re-calculo caro no Leaflet
    const memoizedLocations = useMemo(() => locations, [locations]);

    // Filter toggles
    const togglePlatform = (p: string) => {
        setSelectedPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
    };

    const toggleRival = (r: string) => {
        setSelectedRivals(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
    };




    const displayedStrategy = microStrategy;
    const isTyping = isGeneratingMicro;

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
        if (campaignId) {
            fetchCampaign();
            fetchNotes();
        }
    }, [campaignId]);

    const fetchNotes = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/campaign/${campaignId}/map_notes`, {
                headers: {
                    'ngrok-skip-browser-warning': 'true',
                    'Content-Type': 'application/json',
                }
            });
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
            const res = await fetch(`${apiUrl}/api/competitor/${competitorId}/votes/geo`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
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
            const hasSingleCampaign = !!campaignId && !!ballotName;
            const hasMultiCampaigns = !!campaigns && campaigns.length > 0;

            if (!hasSingleCampaign && !hasMultiCampaigns) return;

            try {
                let campaignIds = [];
                let ballotNames: string[] = [];

                if (hasSingleCampaign) {
                    campaignIds = [campaignId!];
                    ballotNames = [ballotName];
                } else if (hasMultiCampaigns) {
                    campaignIds = campaigns!.map(c => c.id);
                    ballotNames = campaigns!.map(c => (c.ballot_name || c.name || "").toLowerCase());
                }

                // A. Busca Locations
                const { data: locData, error: locError } = await supabase
                    .from("locations")
                    .select("*")
                    .in("campaign_id", campaignIds);

                if (locError) throw locError;
                if (!locData || locData.length === 0) {
                    setLocations([]);
                    setIsLoading(false);
                    return;
                }

                // Extrair IDs dos locais para buscar os resultados apenas deles
                const locationIds = locData.map((l: any) => l.id);

                // B. Busca Votos (Matches) para os locais encontrados
                const { data: myVotesData, error: votesError } = await supabase
                    .from('location_results')
                    .select('location_id, votes, candidate_name')
                    .in('location_id', locationIds);

                if (votesError) console.warn('⚠️ Erro ao buscar votos:', votesError);

                // C. Map Votes
                const myVotesMap: Record<string, number> = {};
                if (myVotesData) {
                    myVotesData.forEach((v) => {
                        const cName = v.candidate_name.toLowerCase();
                        // Verifica se o candidato é um dos nossos
                        const isOurs = hasSingleCampaign
                            ? cName.includes(ballotName.toLowerCase())
                            : ballotNames.some(b => cName.includes(b));

                        if (isOurs) {
                            myVotesMap[v.location_id] = (myVotesMap[v.location_id] || 0) + (v.votes || 0);
                        }
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
    }, [campaignId, ballotName, campaigns]);

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
                method: 'POST',
                headers: {
                    'ngrok-skip-browser-warning': 'true',
                    'Content-Type': 'application/json',
                },
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

    // 📡 Social Radar Handlers
    const fetchSocialData = async () => {
        setLoadingSocial(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/campaign/${campaignId}/map/tactical`, {
                signal: controller.signal,
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                setSocialMentions(data.mentions || []);
                // Combine stats with monitored_targets from top level
                setSocialStats({
                    ...(data.sentiment_breakdown || { positive: 0, negative: 0, neutral: 0 }),
                    monitored_targets: data.monitored_targets || []
                });

                if (data.has_mock) {
                    toast({
                        title: "⚠️ API Excedida",
                        description: "Utilizando simulação de dados (Mock Mode)",
                        duration: 8000,
                    });
                } else {
                    toast({
                        title: "📡 Radar Social Ativado",
                        description: `${data.total_mentions} menções carregadas no mapa`,
                    });
                }
            } else {
                throw new Error("API return error state");
            }
        } catch (e: any) {
            console.error("Failed to fetch social data", e);
            if (e.name === 'AbortError' || String(e).includes('timeout')) {
                toast({
                    title: "⚠️ API Excedida",
                    description: "Utilizando simulação de dados (Mock Mode - Cache Local).",
                });
            } else {
                toast({ title: "Erro de Conexão", description: "Falha ao consultar Radar Social.", variant: "destructive" });
            }
        } finally {
            clearTimeout(timeoutId);
            setLoadingSocial(false);
        }
    };

    const handleToggleSocialRadar = () => {
        if (showSocialRadar) {
            setShowSocialRadar(false);
            setSocialMentions([]);
            setSocialStats(null);
        } else {
            setShowSocialRadar(true);
            fetchSocialData();
        }
    };

    // ✨ Micro-Strategy IA (Isolada via TypingText)
    const handleGenerateMicroStrategy = async () => {
        if (!selectedLocation) return;
        setIsGeneratingMicro(true);
        setMicroStrategy("");

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const body = {
                neighborhood: selectedLocation.address || 'Geral', // Usando endereço como proxy de bairro se necessário
                location_id: selectedLocation.id,
                location_name: selectedLocation.name
            };

            const res = await fetch(`${apiUrl}/api/campaign/${campaignId}/social/micro-strategy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify(body)
            });

            if (!res.ok) throw new Error('Falha ao gerar micro-estratégia');
            const data = await res.json();
            // Guardando o objeto inteiro 
            setMicroStrategy(data as any);
        } catch (error) {
            console.error(error);
            toast({ title: "Erro", description: "Falha ao gerar micro-estratégia.", variant: "destructive" });
        } finally {
            setIsGeneratingMicro(false);
        }
    };

    const handleGenerateMentionStrategy = async () => {
        if (!selectedMention) return;
        setIsGeneratingMicro(true);
        setMicroStrategy("");

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const body = {
                neighborhood: selectedMention.inferred_neighborhood || 'Geral',
                location_id: selectedLocation?.id,
                location_name: selectedLocation?.name
            };

            const res = await fetch(`${apiUrl}/api/campaign/${campaignId}/social/micro-strategy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify(body)
            });

            if (!res.ok) throw new Error('Falha ao gerar micro-estratégia social');
            const data = await res.json();
            // Data contém: estrategia_tato, diagnostico, conteudo_sugerido, tarefa_delega
            setMicroStrategy(data as any);
        } catch (error) {
            console.error(error);
            toast({ title: "Erro", description: "Falha ao consultar a AIOS.", variant: "destructive" });
        } finally {
            setIsGeneratingMicro(false);
        }
    };

    const handleDelegateTask = async () => {
        if (!selectedMention || !microStrategy) return;
        setIsDelegatingMicro(true);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const body = {
                mention_id: selectedMention.id,
                diagnostico: microStrategy.diagnostico,
                estrategia_tato: microStrategy.estrategia_tato,
                conteudo_sugerido: microStrategy.conteudo_sugerido,
                tarefa_delega: microStrategy.tarefa_delega
            };

            const res = await fetch(`${apiUrl}/api/campaign/${campaignId}/social/delegate-task`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify(body)
            });

            if (!res.ok) throw new Error('Falha ao delegar tarefa');

            toast({
                title: "Sucesso!",
                description: "Estratégia enviada para o Kanban da equipe.",
                variant: "default"
            });

            // Opcional: fechar o sheet após delegar
            // setIsMentionSheetOpen(false);

        } catch (error) {
            console.error(error);
            toast({
                title: "Erro",
                description: "Não foi possível delegar a tarefa.",
                variant: "destructive"
            });
        } finally {
            setIsDelegatingMicro(false);
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
        <div className="relative h-full w-full overflow-hidden flex flex-col bg-slate-50">
            {/* REMOVIDO: Cabeçalho Tático & Termômetro Social (unificado no Header Global) */}

            {/* Tool Palette (Photoshop Style) — Componentizado QI 190 */}
            <MapNavigationTools
                showControls={showControls}
                setShowControls={setShowControls}
                isNoteMode={isNoteMode}
                setIsNoteMode={setIsNoteMode}
                showSocialRadar={showSocialRadar}
                onToggleSocialRadar={handleToggleSocialRadar}
                loadingSocial={loadingSocial}
            />

            {/* Float Social Stats e Filtros se o Radar estiver Activo */}
            {showSocialRadar && (
                <div className="hidden lg:flex absolute top-1/2 -translate-y-1/2 left-24 z-[50] bg-white/95 backdrop-blur-xl dark:bg-slate-950/95 p-5 w-72 rounded-3xl shadow-2xl border border-slate-200/50 animate-in fade-in slide-in-from-left-4 max-h-[80vh] flex flex-col gap-4 overflow-hidden">
                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/50 pb-3">
                        <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-xl text-purple-600">
                            <Radar className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white leading-none">Radar Social</h3>
                            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{filteredMentions.length} Menções Ativas</span>
                        </div>
                    </div>

                    {socialStats && (
                        <div className="flex flex-row justify-between gap-2 text-center">
                            <div className="flex-1 bg-gradient-to-br from-green-50 to-emerald-50/50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-2xl p-2 shadow-sm border border-green-100/20">
                                <div className="text-xl font-black text-green-600 leading-none">{socialStats.positive}</div>
                                <div className="text-[9px] text-green-600 uppercase font-bold tracking-wider mt-1">Elogios</div>
                            </div>
                            <div className="flex-1 bg-gradient-to-br from-amber-50 to-yellow-50/50 dark:from-amber-900/10 dark:to-yellow-900/10 rounded-2xl p-2 shadow-sm border border-amber-100/20">
                                <div className="text-xl font-black text-amber-600 leading-none">{socialStats.neutral}</div>
                                <div className="text-[9px] text-amber-600 uppercase font-bold tracking-wider mt-1">Neutro</div>
                            </div>
                            <div className="flex-1 bg-gradient-to-br from-red-50 to-rose-50/50 dark:from-rose-900/10 dark:to-rose-900/10 rounded-2xl p-2 shadow-sm border border-red-100/20">
                                <div className="text-xl font-black text-red-600 leading-none">{socialStats.negative}</div>
                                <div className="text-[9px] text-red-600 uppercase font-bold tracking-wider mt-1">Críticas</div>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto pr-1 space-y-5 custom-scrollbar">
                        <div className="space-y-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Plataformas</span>
                            <div className="flex gap-2">
                                <button onClick={() => togglePlatform('instagram')} className={cn("flex-1 py-2 px-3 flex justify-center items-center gap-2 rounded-xl border text-sm transition-all", selectedPlatforms.includes('instagram') ? 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800 text-pink-700' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-400')}><Instagram className="h-4 w-4" /> IG</button>
                                <button onClick={() => togglePlatform('tiktok')} className={cn("flex-1 py-2 px-3 flex justify-center items-center gap-2 rounded-xl border text-sm transition-all", selectedPlatforms.includes('tiktok') ? 'bg-slate-900 dark:bg-white dark:text-slate-900 text-white' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-400')}>🎵 TK</button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex justify-between">Alvos Monitorados</span>
                            <div className="flex flex-col gap-2">
                                {uniqueRivals.map(rival => {
                                    const isSelected = selectedRivals.includes(rival);
                                    const hash = rival.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
                                    const h = Math.abs(hash) % 360;
                                    const colorAccent = `hsl(${h}, 70%, 50%)`;
                                    return (
                                        <button key={rival} onClick={() => toggleRival(rival)} className={cn("flex items-center justify-between p-2 rounded-xl border transition-all", isSelected ? 'bg-white dark:bg-slate-900 shadow-sm border-slate-200 dark:border-slate-700' : 'bg-slate-50 dark:bg-slate-800/50 border-transparent opacity-60')}>
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: isSelected ? colorAccent : '#cbd5e1' }}>{rival.charAt(0).toUpperCase()}</div>
                                                <span className={cn("text-xs font-medium", isSelected ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400')}>@{rival}</span>
                                            </div>
                                            <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center", isSelected ? 'border-purple-500 bg-purple-500 text-white' : 'border-slate-300')}>{isSelected && <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3 stroke-current stroke-[3]"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toolbar Controles Dropdown (agora posicionado ao lado da Tool Palette) */}

            {showControls && (
                <div className="absolute top-1/2 -translate-y-1/2 left-24 z-[50] bg-white/95 backdrop-blur-xl dark:bg-slate-950/95 p-5 rounded-2xl shadow-2xl border border-slate-200/50 w-80 space-y-6 animate-in fade-in slide-in-from-left-4">
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                            <MapIcon className="h-3 w-3" /> Estilo do Mapa
                        </h4>
                        <select
                            className="w-full text-sm p-2 rounded border bg-background hover:bg-slate-50 transition-colors"
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

                    <div className="space-y-3 pt-4 border-t border-slate-100">
                        <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                            <Users className="h-3 w-3" /> Radar de Concorrentes
                        </h4>

                        {competitors.length === 0 ? (
                            <p className="text-xs text-muted-foreground">Nenhum concorrente cadastrado.</p>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="competitor-mode" className="text-sm font-medium text-slate-700">
                                        Exibir Camada
                                    </Label>
                                    <Switch
                                        id="competitor-mode"
                                        checked={showCompetitorOverlay}
                                        onCheckedChange={handleToggleCompetitor}
                                        disabled={loadingCompetitor}
                                    />
                                </div>

                                {showCompetitorOverlay && (
                                    <div className="animate-in fade-in slide-in-from-top-1">
                                        <select
                                            className="w-full text-sm p-2 rounded border bg-background hover:bg-slate-50 transition-colors"
                                            value={selectedCompetitorId || ''}
                                            onChange={(e) => handleCompetitorChange(e.target.value)}
                                            disabled={loadingCompetitor}
                                        >
                                            <option value="" disabled>Selecione um alvo...</option>
                                            {competitors.map(c => (
                                                <option key={c.id} value={c.id}>🔴 {c.name}</option>
                                            ))}
                                        </select>
                                        {loadingCompetitor && <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Carregando pontos...</p>}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>



                </div>
            )}

            {/* Search Bar - Otimizada QI 190 */}
            <div className="absolute top-4 left-4 right-4 md:left-auto md:right-4 z-40 md:w-80 flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Buscar cidade, endereço..."
                        className="h-10 pl-9 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl border-slate-200/50 dark:border-slate-800/50 rounded-2xl text-sm"
                        defaultValue={searchQuery}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                setSearchQuery(e.currentTarget.value);
                                handleSearch();
                            }
                        }}
                        onBlur={(e) => setSearchQuery(e.currentTarget.value)}
                    />
                </div>
                <Button onClick={handleSearch} className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-lg border-0 hidden xs:flex">Buscar</Button>
            </div>

            {/* Hint Mode */}
            {
                isNoteMode && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-amber-500 text-white px-4 py-2 rounded-full shadow-lg text-sm font-bold animate-in fade-in flex items-center gap-2">
                        <StickyNote className="h-4 w-4" />
                        Modo Criação de Notas Ativo
                    </div>
                )
            }

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
                    {showSocialRadar && (
                        <SocialRadarLayer
                            mentions={filteredMentions}
                            onMentionClick={(mention) => {
                                setSelectedMention(mention);
                                setIsMentionSheetOpen(true);
                            }}
                        />
                    )}
                </MapComponent>
            </div>

            {/* Sheet de Detalhes do Local */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="w-full sm:max-w-md overflow-y-auto p-0 gap-0 z-[99999] rounded-t-[2.5rem] sm:rounded-t-none" side="right">
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
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                className="bg-purple-600 hover:bg-purple-700 text-white"
                                                onClick={handleGenerateGuerrillaAction}
                                                disabled={isGeneratingAction}
                                            >
                                                {isGeneratingAction ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                                                Guerrilha
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="border-cyan-300 text-cyan-700 hover:bg-cyan-50"
                                                onClick={handleGenerateMicroStrategy}
                                                disabled={isGeneratingMicro}
                                            >
                                                {isGeneratingMicro ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                                                ✨ Micro-Estratégia
                                            </Button>
                                        </div>
                                    </div>

                                    {/* ✨ Micro-Strategy Output with Typing Effect */}
                                    {(displayedStrategy || isGeneratingMicro) && (
                                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-4 mt-3 shadow-lg border border-slate-700">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Sparkles className="h-4 w-4 text-cyan-400" />
                                                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Micro-Estratégia Tática</span>
                                                {isTyping && (
                                                    <span className="text-cyan-400 animate-pulse text-xs">gerando...</span>
                                                )}
                                            </div>
                                            <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed font-mono">
                                                {displayedStrategy}
                                                {isTyping && (
                                                    <span className="inline-block w-2 h-4 bg-cyan-400 ml-0.5 animate-pulse" />
                                                )}
                                            </div>
                                            {!isTyping && displayedStrategy && (
                                                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-700">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                    <span className="text-[10px] text-slate-400">Estratégia gerada por IA • PRISMA 888</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

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

            {/* Sheet de Detalhes da Menção Social */}
            <SocialMentionSheet
                isOpen={isMentionSheetOpen}
                onOpenChange={setIsMentionSheetOpen}
                mention={selectedMention}
                onGenerateStrategy={handleGenerateMentionStrategy}
                onDelegateTask={handleDelegateTask}
                isGenerating={isGeneratingMicro}
                isDelegating={isDelegatingMicro}
                fullStrategy={microStrategy}
            />
        </div>
    );
}
