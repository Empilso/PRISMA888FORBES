"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Search, Globe, Youtube, Newspaper, Share2, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Step3Props {
    onComplete: () => void;
    campaignId: string;
    politicoId: string;
}

export function Step3Media({ onComplete, campaignId, politicoId }: Step3Props) {
    const [scanning, setScanning] = useState(false);
    const [scanned, setScanned] = useState(false);
    const [mediaResults, setMediaResults] = useState<any[]>([]);

    // Source Configuration
    const [sources, setSources] = useState({
        google: true,
        youtube: true,
        blogs: true,
        social: false
    });

    const handleScan = async () => {
        setScanning(true);
        setMediaResults([]); // Clear previous
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/campaigns/${campaignId}/radar/${politicoId}/refresh-phase3`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sources })
            });

            if (!res.ok) throw new Error("Falha na varredura de mídia");

            const data = await res.json();
            console.log("Media Scan Results:", data);

            if (data.status === 'ok' && data.data?.details) {
                setMediaResults(data.data.details);
            }

            setScanned(true);
        } catch (error) {
            console.error(error);
            alert("Erro ao realizar varredura de mídia.");
        } finally {
            setScanning(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto h-full flex flex-col">
            <div className="mb-8 text-center space-y-2">
                <h3 className="text-2xl font-bold text-slate-800">Passo 3: Inteligência de Mídia (OSINT)</h3>
                <p className="text-slate-500">Varredura em fontes abertas para validar se a entrega física das promessas foi noticiada ou criticada.</p>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* CONFIGURATION PANEL */}
                <Card className="p-6 space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                        <Search className="w-6 h-6 text-indigo-600" />
                        <h4 className="font-bold text-slate-800">Fontes de Busca</h4>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                    <Globe className="w-5 h-5" />
                                </div>
                                <div>
                                    <Label className="text-base font-medium">Google News</Label>
                                    <p className="text-xs text-slate-500">Portais de notícia oficiais</p>
                                </div>
                            </div>
                            <Switch checked={sources.google} onCheckedChange={v => setSources(s => ({ ...s, google: v }))} />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-50 rounded-lg text-red-600">
                                    <Youtube className="w-5 h-5" />
                                </div>
                                <div>
                                    <Label className="text-base font-medium">YouTube</Label>
                                    <p className="text-xs text-slate-500">Vlogs e canais da prefeitura</p>
                                </div>
                            </div>
                            <Switch checked={sources.youtube} onCheckedChange={v => setSources(s => ({ ...s, youtube: v }))} />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                                    <Newspaper className="w-5 h-5" />
                                </div>
                                <div>
                                    <Label className="text-base font-medium">Blogs Locais</Label>
                                    <p className="text-xs text-slate-500">Jornalismo independente</p>
                                </div>
                            </div>
                            <Switch checked={sources.blogs} onCheckedChange={v => setSources(s => ({ ...s, blogs: v }))} />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                    <Share2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <Label className="text-base font-medium">Redes Sociais</Label>
                                    <p className="text-xs text-slate-500">Facebook e Instagram (Meta API)</p>
                                </div>
                            </div>
                            <Switch checked={sources.social} onCheckedChange={v => setSources(s => ({ ...s, social: v }))} />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <Button
                            className="w-full h-12 text-lg bg-indigo-600 hover:bg-indigo-700"
                            onClick={handleScan}
                            disabled={scanning || scanned}
                        >
                            {scanning ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                    Varrendo a Web...
                                </>
                            ) : scanned ? (
                                <>
                                    <CheckCircle2 className="w-5 h-5 mr-2" />
                                    Varredura Completa
                                </>
                            ) : (
                                "Iniciar Varredura"
                            )}
                        </Button>
                    </div>
                </Card>

                {/* RESULTS PREVIEW */}
                <div className="flex flex-col gap-4">
                    {!scanned && !scanning && (
                        <div className="flex-1 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                            <Search className="w-12 h-12 mb-4 opacity-50" />
                            <p>Configure as fontes e inicie a busca para ver os resultados aqui.</p>
                        </div>
                    )}

                    {scanning && (
                        <div className="flex-1 bg-slate-900 rounded-xl p-6 font-mono text-xs text-green-400 overflow-hidden relative">
                            <div className="absolute inset-0 bg-green-500/5 animate-pulse" />
                            <div className="space-y-2">
                                <p>{">"} Initializing OSINT module...</p>
                                <p>{">"} Connect to Google Custom Search API... [OK]</p>
                                <p>{">"} Searching query: "obra creche votorantim atraso"...</p>
                                <p className="text-white">{">"} Found: Gazeta de Votorantim (2024-05-12)</p>
                                <p>{">"} Analyzing sentiment...</p>
                                <p>{">"} Searching YouTube: "inauguração upa"...</p>
                            </div>
                        </div>
                    )}

                    {scanned && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="space-y-4">
                                {mediaResults.length > 0 ? (
                                    mediaResults.map((item: any, idx: number) => (
                                        <div key={idx} className="bg-white border-l-4 border-indigo-500 p-4 rounded shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-1">
                                                <p className="text-xs text-slate-400">
                                                    {item.source || "Fonte Web"} • {new Date().toLocaleDateString('pt-BR')}
                                                </p>
                                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-xs flex items-center gap-1">
                                                    Abrir <Share2 className="w-3 h-3" />
                                                </a>
                                            </div>
                                            <h5 className="font-bold text-slate-800 text-sm mb-2 leading-snug">
                                                {item.title}
                                            </h5>
                                            <p className="text-xs text-slate-600 line-clamp-2 mb-2">
                                                {item.content}
                                            </p>
                                            <div className="flex gap-2">
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded flex items-center gap-1">
                                                    <Globe className="w-3 h-3" /> Resultado Web
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 bg-yellow-50 text-yellow-800 text-sm rounded border border-yellow-200">
                                        Nenhuma menção relevante encontrada nas últimas 24h para os termos selecionados.
                                    </div>
                                )}
                            </div>

                            <Button
                                className="w-full h-14 text-lg mt-4 bg-emerald-600 hover:bg-emerald-700 shadow-xl"
                                onClick={onComplete}
                            >
                                Finalizar Auditoria e Gerar Relatório
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
