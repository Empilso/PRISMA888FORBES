"use client";

import { useMemo } from "react";
import Supercluster from "supercluster";
import useSupercluster from "use-supercluster";

// Tipos para o cluster
export interface LocationPoint {
    id: string;
    name: string;
    address: string;
    position: [number, number]; // [lat, lng]
    votes: number;
    meta: number;
    color: string;
    my_votes: number;
    my_share: number;
}

export interface ClusterProperties {
    cluster: boolean;
    cluster_id?: number;
    point_count?: number;
    point_count_abbreviated?: string;
    // Para pontos individuais:
    locationId?: string;
    name?: string;
    votes?: number;
    my_votes?: number;
    my_share?: number;
    color?: string;
}

export interface MapCluster {
    type: "Feature";
    id: number | string;
    geometry: {
        type: "Point";
        coordinates: [number, number]; // [lng, lat] - GeoJSON format
    };
    properties: ClusterProperties;
}

interface UseMapClustersOptions {
    locations: LocationPoint[];
    bounds: [number, number, number, number] | null; // [west, south, east, north]
    zoom: number;
    options?: Supercluster.Options<ClusterProperties, ClusterProperties>;
}

interface UseMapClustersResult {
    clusters: MapCluster[];
    supercluster: Supercluster<ClusterProperties, ClusterProperties> | undefined;
    isReady: boolean;
}

/**
 * Hook para gerenciar clustering de locais de votação.
 * Converte LocationPoint[] para GeoJSON e retorna clusters baseados no zoom/bounds.
 */
export function useMapClusters({
    locations,
    bounds,
    zoom,
    options = {}
}: UseMapClustersOptions): UseMapClustersResult {
    // Converte locations para GeoJSON FeatureCollection
    const points = useMemo(() => {
        return locations.map((loc): GeoJSON.Feature<GeoJSON.Point, ClusterProperties> => ({
            type: "Feature",
            properties: {
                cluster: false,
                locationId: loc.id,
                name: loc.name,
                votes: loc.votes,
                my_votes: loc.my_votes,
                my_share: loc.my_share,
                color: loc.color
            },
            geometry: {
                type: "Point",
                coordinates: [loc.position[1], loc.position[0]] // GeoJSON: [lng, lat]
            }
        }));
    }, [locations]);

    // Configurações do Supercluster
    const clusterOptions = useMemo((): Supercluster.Options<ClusterProperties, ClusterProperties> => ({
        radius: 75, // Raio de clustering em pixels (ajustar conforme necessário)
        maxZoom: 16, // Zoom máximo onde clustering ainda acontece
        minZoom: 3,
        map: (props: ClusterProperties) => ({
            cluster: false,
            votes: props.votes || 0,
            my_votes: props.my_votes || 0,
            my_share: props.my_share || 0,
            color: props.color || 'gray'
        }),
        reduce: (accumulated: ClusterProperties, props: ClusterProperties) => {
            // Soma votos dentro do cluster
            accumulated.votes = (accumulated.votes || 0) + (props.votes || 0);
            accumulated.my_votes = (accumulated.my_votes || 0) + (props.my_votes || 0);
            // Calcula média ponderada do share
            const totalVotes = accumulated.votes || 1;
            accumulated.my_share = (accumulated.my_votes / totalVotes) * 100;
            // Cor baseada no share médio
            if (accumulated.my_share >= 20) accumulated.color = 'green';
            else if (accumulated.my_share >= 5) accumulated.color = 'yellow';
            else accumulated.color = 'red';
        },
        ...options
    }), [JSON.stringify(options)]); // Estabiliza as opções para evitar recriação a cada render

    // Usa o hook do use-supercluster
    const { clusters, supercluster } = useSupercluster({
        points,
        bounds: bounds || undefined,
        zoom,
        options: clusterOptions
    });

    return {
        clusters: clusters as MapCluster[],
        supercluster,
        isReady: !!supercluster
    };
}

/**
 * Formata número grande para exibição compacta
 * Ex: 1500 -> "1.5k", 12000 -> "12k"
 */
export function formatClusterCount(count: number): string {
    if (count < 1000) return count.toString();
    if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
    return `${Math.round(count / 1000)}k`;
}

/**
 * Retorna classe de cor Tailwind baseada no share médio
 */
export function getClusterColorClass(color: string): string {
    switch (color) {
        case 'green': return 'bg-emerald-500 border-emerald-600';
        case 'yellow': return 'bg-amber-400 border-amber-500';
        case 'red': return 'bg-rose-500 border-rose-600';
        default: return 'bg-slate-400 border-slate-500';
    }
}
