"use client";

import { Marker, Tooltip } from "react-leaflet";
import { cn } from "@/lib/utils";
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
 * Cria ícone de TRIÂNGULO (Prisma) para cluster de pontos com dados duplos (Locais + Votos).
 */
function createClusterIcon(pointCount: number, totalVotes: number, color: string): L.DivIcon {
    const size = pointCount >= 50 ? 64 : (pointCount >= 10 ? 56 : 48);

    const configs: Record<string, { bg: string, ring: string }> = {
        green: { bg: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', ring: 'rgba(16, 185, 129, 0.4)' },
        yellow: { bg: 'linear-gradient(135deg, #FBBF24 0%, #D97706 100%)', ring: 'rgba(251, 191, 36, 0.4)' },
        red: { bg: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', ring: 'rgba(239, 68, 68, 0.4)' },
        gray: { bg: 'linear-gradient(135deg, #991B1B 0%, #7F1D1D 100%)', ring: 'rgba(153, 27, 27, 0.4)' }
    };

    const config = configs[color] || configs.gray;
    const formattedPoints = formatClusterCount(pointCount);
    const formattedVotes = formatClusterCount(totalVotes);

    const html = `
        <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; flex-direction: column; align-items: center; justify-content: center; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));">
            <svg width="${size}" height="${size}" viewBox="0 0 100 100" style="position: absolute; top:0; left:0; z-index: 1;">
                <defs>
                    <linearGradient id="grad-${color}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:${(color === 'green' ? '#10B981' : (color === 'yellow' ? '#FBBF24' : '#991B1B'))};stop-opacity:1" />
                        <stop offset="100%" style="stop-color:${(color === 'green' ? '#059669' : (color === 'yellow' ? '#D97706' : '#7F1D1D'))};stop-opacity:1" />
                    </linearGradient>
                </defs>
                <path d="M50 5 L95 85 L5 85 Z" fill="url(#grad-${color})" stroke="white" stroke-width="4" stroke-linejoin="round" />
            </svg>
            <div style="position: relative; z-index: 10; display: flex; flex-direction: column; align-items: center; justify-content: center; margin-top: 22%; width: 100%; pointer-events: none;">
                <span style="color: white; font-weight: 950; font-size: ${size > 50 ? '16px' : '14px'}; line-height: 1; text-shadow: 0 1px 3px rgba(0,0,0,0.8);">${formattedPoints}</span>
                <div style="height: 1px; width: 35%; background: rgba(255,255,255,0.4); margin: 2px 0;"></div>
                <span style="color: rgba(255,255,255,1); font-weight: 800; font-size: ${size > 50 ? '11px' : '9px'}; line-height: 1; text-shadow: 0 1px 2px rgba(0,0,0,0.6); font-family: sans-serif;">${formattedVotes}<small style="font-size: 0.8em; margin-left:1px; font-weight: 900;">V</small></span>
            </div>
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
    const votes = properties.votes || 0;
    const color = properties.color || 'gray';

    // GeoJSON usa [lng, lat], Leaflet usa [lat, lng]
    const position: [number, number] = [
        geometry.coordinates[1],
        geometry.coordinates[0]
    ];

    const { my_votes, my_share } = properties;

    return (
        <Marker
            position={position}
            icon={createClusterIcon(pointCount, votes, color)}
            eventHandlers={{
                click: onClick
            }}
        >
            <Tooltip direction="top" offset={[0, -20]} opacity={1} className="custom-map-tooltip">
                <div className="p-1 min-w-[140px]">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Agrupamento</div>
                    <div className="text-sm font-black text-slate-800 dark:text-white mb-2">{pointCount} locais de votação</div>

                    <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-2">
                        <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-500">Total de Votos:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{votes?.toLocaleString() || 0}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-500">Nossos Votos:</span>
                            <span className="font-bold text-emerald-600">{my_votes?.toLocaleString() || 0}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-500">Nosso Share:</span>
                            <span className={cn(
                                "font-bold px-1.5 py-0.5 rounded-md",
                                color === 'green' ? 'bg-emerald-100 text-emerald-700' :
                                    color === 'yellow' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                            )}>
                                {my_share?.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                </div>
            </Tooltip>
        </Marker>
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

    const { name, votes, my_votes, my_share } = properties;

    return (
        <Marker
            position={position}
            icon={createPointIcon(color)}
            eventHandlers={{
                click: onClick
            }}
        >
            <Tooltip direction="top" offset={[0, -15]} opacity={1} className="custom-map-tooltip">
                <div className="p-1 min-w-[160px]">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Local de Votação</div>
                    <div className="text-sm font-black text-slate-800 dark:text-white leading-tight mb-2 truncate max-w-[180px]" title={name}>
                        {name}
                    </div>

                    <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-2">
                        <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-500">Total do Local:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{votes?.toLocaleString() || 0}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-500">Nossos Votos:</span>
                            <span className="font-bold text-emerald-600">{my_votes?.toLocaleString() || 0}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-500">Nosso Share:</span>
                            <span className={cn(
                                "font-bold px-1.5 py-0.5 rounded-md",
                                color === 'green' ? 'bg-emerald-100 text-emerald-700' :
                                    color === 'yellow' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                            )}>
                                {my_share?.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                    <div className="mt-2 text-[9px] text-center text-slate-400 font-medium italic">Clique para detalhes táticos</div>
                </div>
            </Tooltip>
        </Marker>
    );
}
