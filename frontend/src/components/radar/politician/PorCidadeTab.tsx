"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MapPin, Building2, ExternalLink } from "lucide-react";
import { formatCurrency } from "@/lib/fiscal-analytics";
import Link from "next/link";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

// Fix Leaflet SSR Window Issue
const MapContainer = dynamic(
    () => import("react-leaflet").then((mod) => mod.MapContainer),
    { ssr: false }
);
const TileLayer = dynamic(
    () => import("react-leaflet").then((mod) => mod.TileLayer),
    { ssr: false }
);
const CircleMarker = dynamic(
    () => import("react-leaflet").then((mod) => mod.CircleMarker),
    { ssr: false }
);
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
    ssr: false,
});

interface PorCidadeTabProps {
    politicianId: string;
}

export default function PorCidadeTab({ politicianId }: PorCidadeTabProps) {
    const { data: rankingCidades = [], isLoading } = useQuery({
        queryKey: ["politicianAmendmentsByCity", politicianId],
        queryFn: async () => {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const res = await fetch(`${API_URL}/api/politicians/${politicianId}/by_city?limit=100`);
            if (!res.ok) throw new Error("Erro ao carregar impacto territorial");
            return res.json();
        },
        staleTime: 1000 * 60 * 30,
    });

    // Dados já vem ordenados do backend

    if (isLoading) {
        return <div className="p-20 text-center text-slate-400">Desenhando mapa de influência...</div>;
    }

    if (!rankingCidades.length) return null;

    // Calcular centro do mapa baseado nas cidades
    const centerLat = rankingCidades.length > 0 && rankingCidades[0].lat ? rankingCidades[0].lat : -12.9714;
    const centerLng = rankingCidades.length > 0 && rankingCidades[0].lng ? rankingCidades[0].lng : -38.5014;

    const maxOrcado = rankingCidades[0]?.total_orcado || 1;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Mapa */}
                <Card className="col-span-1 border-0 shadow-sm ring-1 ring-slate-100 bg-white overflow-hidden flex flex-col">
                    <CardHeader className="p-6 pb-4">
                        <CardTitle className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-indigo-500" />
                            Mapa de Destinações
                        </CardTitle>
                        <CardDescription className="text-sm font-medium text-slate-500">
                            Geolocalização das cidades beneficiadas pelas emendas.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 min-h-[500px] relative z-0">
                        <MapContainer
                            center={[centerLat, centerLng]}
                            zoom={7}
                            style={{ height: "100%", width: "100%", zIndex: 0 }}
                            className="z-0"
                        >
                            <TileLayer
                                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                            />
                            {rankingCidades.map((cid: any) => {
                                if (!cid.lat || !cid.lng) return null;
                                // Tamanho do circulo proporcional
                                const radius = Math.max(8, (cid.total_orcado / maxOrcado) * 25);

                                return (
                                    <CircleMarker
                                        key={cid.cidade}
                                        center={[cid.lat, cid.lng]}
                                        radius={radius}
                                        pathOptions={{
                                            fillColor: "#F59E0B", // Amber
                                            color: "#FFFFFF",
                                            weight: 2,
                                            fillOpacity: 0.7
                                        }}
                                    >
                                        <Popup>
                                            <div className="p-3 min-w-[180px]">
                                                <p className="font-black text-sm text-slate-900 mb-2 border-b border-slate-100 pb-1">{cid.municipio_nome}</p>
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between text-[11px]">
                                                        <span className="text-slate-500 font-bold uppercase">Orçado</span>
                                                        <span className="text-slate-900 font-black">{formatCurrency(cid.valor_orcado_total)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-[11px]">
                                                        <span className="text-slate-500 font-bold uppercase">Pago</span>
                                                        <span className="text-emerald-600 font-black">{formatCurrency(cid.valor_pago_total)}</span>
                                                    </div>
                                                    <div className="pt-1 mt-1 border-t border-slate-50 flex justify-between items-center">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">{cid.qtd_emendas} EMENDAS</span>
                                                        <Badge className="bg-emerald-100 text-emerald-700 text-[10px] py-0 h-4 border-0">
                                                            {((cid.valor_pago_total / cid.valor_orcado_total) * 100).toFixed(1)}%
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </Popup>
                                    </CircleMarker>
                                );
                            })}
                        </MapContainer>
                    </CardContent>
                </Card>

                {/* Tabela de Ranking (Idêntico ao CredoresTab) */}
                <Card className="col-span-1 border-0 shadow-sm ring-1 ring-slate-100 bg-white">
                    <CardHeader className="p-6 pb-4">
                        <CardTitle className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-emerald-500" />
                            Ranking de Municípios ({rankingCidades.length})
                        </CardTitle>
                        <CardDescription className="text-sm font-medium text-slate-500">
                            Cidades que mais receberam recursos (Orçado).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 overflow-y-auto max-h-[500px] fancy-scrollbar">
                        <div className="w-full">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                                    <tr>
                                        <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cidade</th>
                                        <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Orçado Total</th>
                                        <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Executado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {rankingCidades.map((cid: any, index: number) => {
                                        const rankNumber = index + 1;
                                        return (
                                            <tr key={index} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${rankNumber <= 3 ? "bg-amber-100 text-amber-700 ring-1 ring-amber-200" : "bg-slate-100 text-slate-500"}`}>
                                                            {rankNumber}º
                                                        </div>
                                                        <div>
                                                            <p className="font-extrabold text-slate-800">{cid.municipio_nome}</p>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                                                {cid.qtd_emendas} EMENDAS | {cid.qtd_pagamentos} PGTOS
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <p className="font-bold text-slate-900">{formatCurrency(cid.valor_orcado_total)}</p>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <p className="font-bold text-emerald-600">{formatCurrency(cid.valor_pago_total)}</p>
                                                        <span className="text-[10px] font-black text-slate-400">
                                                            {((cid.valor_pago_total / cid.valor_orcado_total) * 100).toFixed(1)}%
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
