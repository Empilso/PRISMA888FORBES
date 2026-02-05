"use client";

import { Marker } from "react-leaflet";
import L from "leaflet";
import { formatClusterCount, getClusterColorClass, MapCluster } from "@/hooks/useMapClusters";

interface ClusterMarkerProps {
    cluster: MapCluster;
    onClick: () => void;
    isCompetitor?: boolean;  // Se true, usa cores de adversário (vermelho)
}

/**
 * Cria ícone para cluster de pontos.
 * Tamanho e cor variam baseado na quantidade e performance.
 */
function createClusterIcon(pointCount: number, color: string, isCompetitor: boolean = false): L.DivIcon {
    // Tamanho baseado na quantidade de pontos
    let size = 32;
    if (pointCount >= 10) size = 40;
    if (pointCount >= 50) size = 48;
    if (pointCount >= 100) size = 56;
    if (pointCount >= 500) size = 64;
    if (pointCount >= 1000) size = 72;

    // Classes de cor - se for competidor, usa vermelho
    const colorClasses = isCompetitor
        ? 'bg-red-600 shadow-red-500/50'
        : getClusterColorClass(color);
    const formattedCount = formatClusterCount(pointCount);

    // HTML do cluster
    const html = `
        <div class="flex items-center justify-center w-full h-full">
            <div class="${colorClasses} w-full h-full rounded-full border-[3px] border-white shadow-lg flex items-center justify-center
                        transition-transform duration-200 hover:scale-110 cursor-pointer
                        ring-2 ring-black/10">
                <span class="text-white font-bold text-xs drop-shadow-sm">${formattedCount}</span>
            </div>
        </div>
    `;

    return L.divIcon({
        className: "bg-transparent",
        html: html,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2]
    });
}

/**
 * Componente de marcador para clusters.
 * Exibe bolha com contagem de pontos e cor baseada na performance agregada.
 */
export function ClusterMarker({ cluster, onClick, isCompetitor = false }: ClusterMarkerProps) {
    const { properties, geometry } = cluster;
    const pointCount = properties.point_count || 1;
    const color = isCompetitor ? 'red' : (properties.color || 'gray');

    // GeoJSON usa [lng, lat], Leaflet usa [lat, lng]
    const position: [number, number] = [
        geometry.coordinates[1],
        geometry.coordinates[0]
    ];

    return (
        <Marker
            position={position}
            icon={createClusterIcon(pointCount, color, isCompetitor)}
            eventHandlers={{
                click: onClick
            }}
        />
    );
}

/**
 * Cria ícone para ponto individual (não clusterizado).
 */
function createPointIcon(color: string): L.DivIcon {
    const colorMap: Record<string, string> = {
        green: 'bg-emerald-500 shadow-emerald-500/40',
        yellow: 'bg-amber-400 shadow-amber-400/40',
        red: 'bg-rose-500 shadow-rose-500/40',
        gray: 'bg-slate-400 shadow-slate-400/40'
    };

    const colorClasses = colorMap[color] || colorMap.gray;

    const html = `
        <div class="relative flex items-center justify-center w-full h-full group">
            <div class="${colorClasses} w-4 h-4 rounded-full border-[2.5px] border-white shadow-lg ring-1 ring-black/5 transition-transform duration-300 group-hover:scale-125"></div>
        </div>
    `;

    return L.divIcon({
        className: 'bg-transparent',
        html: html,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
    });
}

interface PointMarkerProps {
    cluster: MapCluster;
    onClick: () => void;
    isCompetitor?: boolean;
}

/**
 * Componente de marcador para pontos individuais (não clusterizados).
 */
export function PointMarker({ cluster, onClick, isCompetitor = false }: PointMarkerProps) {
    const { properties, geometry } = cluster;
    const color = isCompetitor ? 'red' : (properties.color || 'gray');

    // GeoJSON usa [lng, lat], Leaflet usa [lat, lng]
    const position: [number, number] = [
        geometry.coordinates[1],
        geometry.coordinates[0]
    ];

    return (
        <Marker
            position={position}
            icon={createPointIcon(color)}
            eventHandlers={{
                click: onClick
            }}
        />
    );
}
