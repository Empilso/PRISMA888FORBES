"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, BarChart3 } from "lucide-react";

interface MapData {
    location: string;
    votes: number;
    percentage: number;
    status: "strong" | "moderate" | "weak";
}

export function ElectoralMapCard() {
    // Placeholder - em produção virá de API
    const professor = {
        name: "PROF. WALTER ROCHA CAMARGO",
        municipality: "Área Oeste dos Municípios, Bessa, Tambauzinho",
    };

    const tabs = [
        { id: "local", label: "LOCAL", icon: MapPin },
        { id: "demographic", label: "DEMOGRAFIA", icon: Users },
        { id: "stats", label: "METAS", icon: BarChart3 },
    ];

    return (
        <Card className="col-span-full lg:col-span-2">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="text-base">
                            Mapa Eleitoral - Locais de Votação
                        </CardTitle>
                        <div className="mt-2 space-y-1">
                            <p className="text-sm font-semibold text-primary">
                                EMEF. {'PROF. ' + professor.name.split('PROF. ')[1]}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {professor.municipality}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium hover:bg-muted transition-colors"
                                >
                                    <Icon className="h-3.5 w-3.5" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="relative w-full h-[400px] bg-muted/30 rounded-lg overflow-hidden">
                    {/* Placeholder para mapa interativo */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center space-y-2">
                            <MapPin className="h-12 w-12 mx-auto text-muted-foreground/50" />
                            <p className="text-sm text-muted-foreground">
                                Mapa interativo será carregado aqui
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Integração com Leaflet/MapBox
                            </p>
                        </div>
                    </div>

                    {/* Pontos de votação simulados */}
                    <div className="absolute top-1/4 left-1/3 w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg" />
                    <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-yellow-500 rounded-full animate-pulse shadow-lg" />
                    <div className="absolute bottom-1/3 right-1/3 w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-lg" />
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full" />
                            <span>Forte presença</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                            <span>Moderado</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full" />
                            <span>Precisa atenção</span>
                        </div>
                    </div>
                    <p className="text-xs">
                        Atualização em Tempo Real
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
