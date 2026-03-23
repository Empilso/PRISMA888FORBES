"use client";

import React, { useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip } from "react-leaflet";
import { useRouter } from "next/navigation";
import "leaflet/dist/leaflet.css";

// Fix Leaflet icons in Next.js
import L from "leaflet";
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

interface CityStat {
    city_id: string | null;
    city_name: string;
    city_slug: string | null;
    lat?: number;
    lng?: number;
    qtd_emendas: number;
    total_orcado: number;
    total_pago: number;
}

interface EmendasMapProps {
    data: CityStat[];
}

export default function EmendasMap({ data }: EmendasMapProps) {
    const router = useRouter();

    const BRL = (v: number) =>
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

    // Filtrar apenas cidades com coordenadas válidas
    const validCities = useMemo(() => {
        return data.filter(c => c.lat !== undefined && c.lng !== undefined && c.lat !== null && c.lng !== null);
    }, [data]);

    // Calcular o valor máximo para escala do raio (mínimo de 10M para não estourar em cidades com pouca emenda)
    const maxOrcado = useMemo(() => {
        if (validCities.length === 0) return 1_000_000;
        return Math.max(10_000_000, ...validCities.map(c => c.total_orcado));
    }, [validCities]);

    // Centro padrão da Bahia
    const center: [number, number] = [-12.5, -41.5];
    const zoom = 6;

    if (validCities.length === 0) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-slate-50 text-slate-400 text-sm border border-slate-200 rounded-2xl">
                Nenhuma cidade com coordenadas encontradas.
            </div>
        );
    }

    return (
        <div className="h-full w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm z-0 relative">
            <MapContainer
                center={center}
                zoom={zoom}
                style={{ height: "100%", width: "100%", zIndex: 0 }}
                zoomControl={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://carto.com/">Carto</a>'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />

                {validCities.map((city, idx) => {
                    // Raio proporcional entre 6 e 30
                    const radius = Math.max(6, Math.min(30, (city.total_orcado / maxOrcado) * 30));

                    return (
                        <CircleMarker
                            key={city.city_id || `pendente_${idx}`}
                            center={[city.lat!, city.lng!]}
                            radius={radius}
                            color="#4f46e5" // Indigo 600
                            fillColor="#6366f1" // Indigo 500
                            fillOpacity={0.6}
                            weight={1.5}
                            eventHandlers={{
                                click: () => {
                                    if (city.city_slug) {
                                        router.push(`/admin/territorios/${city.city_slug}`);
                                    }
                                }
                            }}
                            pathOptions={{
                                className: city.city_slug ? "cursor-pointer hover:fillOpacity-80 transition-all outline-none" : "outline-none"
                            }}
                        >
                            <LeafletTooltip direction="top" className="bg-white/95 backdrop-blur-sm border-0 shadow-xl rounded-xl p-3 text-slate-800">
                                <div className="space-y-1 w-48">
                                    <h4 className="font-bold text-sm tracking-tight text-slate-900 leading-none mb-2">
                                        {city.city_name}
                                    </h4>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500">Orçado:</span>
                                        <span className="font-medium text-slate-700">{BRL(city.total_orcado)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500">Pago:</span>
                                        <span className="font-bold text-emerald-600">{BRL(city.total_pago)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500">Volume:</span>
                                        <span className="font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{city.qtd_emendas} unid.</span>
                                    </div>

                                    {city.city_slug ? (
                                        <div className="mt-3 text-[10px] text-center text-indigo-500 font-medium uppercase tracking-wider bg-indigo-50/50 py-1 rounded-md">
                                            Clique para ver o Radar
                                        </div>
                                    ) : (
                                        <div className="mt-3 text-[10px] text-center text-amber-600 font-medium uppercase tracking-wider bg-amber-50 py-1 rounded-md">
                                            Cidade Pendente (Sincronize)
                                        </div>
                                    )}
                                </div>
                            </LeafletTooltip>
                        </CircleMarker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
