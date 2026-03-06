"use client";

import { Marker } from "react-leaflet";
import L from "leaflet";
import { formatClusterCount, getClusterColorClass, MapCluster } from "@/hooks/useMapClusters";

interface ClusterMarkerProps {
    cluster: MapCluster;
    onClick: () => void;
}

interface PointMarkerProps {
    cluster: MapCluster;
    onClick: () => void;
}

/**
 * Cria ícone de TRIÂNGULO (Prisma) para cluster de pontos.
 */
function createClusterIcon(pointCount: number, color: string): L.DivIcon {
    const size = pointCount >= 50 ? 52 : (pointCount >= 10 ? 44 : 38);

    const configs: Record<string, { bg: string, ring: string }> = {
        green: { bg: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', ring: 'rgba(16, 185, 129, 0.4)' },
        yellow: { bg: 'linear-gradient(135deg, #FBBF24 0%, #D97706 100%)', ring: 'rgba(251, 191, 36, 0.4)' },
        red: { bg: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', ring: 'rgba(239, 68, 68, 0.4)' },
        gray: { bg: 'linear-gradient(135deg, #991B1B 0%, #7F1D1D 100%)', ring: 'rgba(153, 27, 27, 0.4)' } // Vermelho Escuro (Clube Saudade)
    };

    const config = configs[color] || configs.gray;
    const formattedCount = formatClusterCount(pointCount);

    const html = `
        <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));">
            <svg width="${size}" height="${size}" viewBox="0 0 100 100" style="position: absolute;">
                <defs>
                    <linearGradient id="grad-${color}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:${(color === 'green' ? '#10B981' : (color === 'yellow' ? '#FBBF24' : '#991B1B'))};stop-opacity:1" />
                        <stop offset="100%" style="stop-color:${(color === 'green' ? '#059669' : (color === 'yellow' ? '#D97706' : '#7F1D1D'))};stop-opacity:1" />
                    </linearGradient>
                </defs>
                <path d="M50 5 L95 85 L5 85 Z" fill="url(#grad-${color})" stroke="white" stroke-width="4" stroke-linejoin="round" />
            </svg>
            <span style="position: relative; color: white; font-weight: 950; font-size: ${size > 40 ? '16px' : '13px'}; margin-top: 18%; text-shadow: 0 1px 2px rgba(0,0,0,0.4);">${formattedCount}</span>
        </div>
    `;

    return L.divIcon({
        className: "bg-transparent",
        html: html,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    });
}

/**
 * Cria ícone de TRIÂNGULO (Prisma) para ponto individual.
 */
function createPointIcon(color: string): L.DivIcon {
    const size = 32; // Dobro do tamanho anterior (estava ~16-20)
    const colorMap: Record<string, string> = {
        green: '#10B981',
        yellow: '#F59E0B',
        red: '#EF4444',
        gray: '#64748B'
    };
    const fillColor = colorMap[color] || colorMap.gray;

    const html = `
        <div style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));">
            <svg width="${size}" height="${size}" viewBox="0 0 100 100">
                <path d="M50 5 L95 85 L5 85 Z" fill="${fillColor}" stroke="white" stroke-width="6" stroke-linejoin="round" />
            </svg>
        </div>
    `;

    return L.divIcon({
        className: 'bg-transparent',
        html: html,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    });
}

/**
 * Componente de marcador para clusters (Triângulos Prisma).
 */
export function ClusterMarker({ cluster, onClick }: ClusterMarkerProps) {
    const { properties, geometry } = cluster;
    const pointCount = properties.point_count || 1;
    const color = properties.color || 'gray';

    // GeoJSON usa [lng, lat], Leaflet usa [lat, lng]
    const position: [number, number] = [
        geometry.coordinates[1],
        geometry.coordinates[0]
    ];

    return (
        <Marker
            position={position}
            icon={createClusterIcon(pointCount, color)}
            eventHandlers={{
                click: onClick
            }}
        />
    );
}

/**
 * Componente de marcador para pontos individuais (não clusterizados).
 */
export function PointMarker({ cluster, onClick }: PointMarkerProps) {
    const { properties, geometry } = cluster;
    const color = properties.color || 'gray';

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
