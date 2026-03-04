"use client";

import { MapContainer, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
// NOTE: leaflet.css is imported in globals.css to avoid Next.js build issues
import { useEffect, useState, useCallback } from 'react';
import { useMapClusters, LocationPoint, MapCluster } from '@/hooks/useMapClusters';
import { ClusterMarker, PointMarker } from '@/components/map/ClusterMarker';

// Estilos de Mapa
const mapStyles: Record<string, { url: string; attribution: string }> = {
    osm: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '© OpenStreetMap' },
    'osm-bright': { url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', attribution: 'Carto' },
    'osm-hot': { url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', attribution: 'OpenStreetMap FR' },
    satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: 'Esri' },
    'carto-dark': { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attribution: 'Carto' },
};

// Componente para controlar a câmera do mapa
function MapController({ center }: { center?: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, 15, { duration: 1.2, easeLinearity: 0.25 });
        }
    }, [center, map]);
    return null;
}

// Subcomponente para renderizar controles apenas quando o mapa estiver 100% pronto
function SafeControls() {
    const map = useMap();
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (map) {
            const timer = setTimeout(() => setShow(true), 100);
            return () => clearTimeout(timer);
        }
    }, [map]);

    if (!show) return null;

    return (
        <div className="absolute bottom-6 right-6 z-[1000] flex flex-col gap-2 pointer-events-auto">
            <button
                onClick={() => map.zoomIn()}
                className="w-10 h-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-xl shadow-lg flex items-center justify-center text-slate-600 dark:text-slate-300 active:scale-90 transition-all font-bold text-xl"
                title="Aumentar Zoom"
            >
                +
            </button>
            <button
                onClick={() => map.zoomOut()}
                className="w-10 h-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 rounded-xl shadow-lg flex items-center justify-center text-slate-600 dark:text-slate-300 active:scale-90 transition-all font-bold text-xl"
                title="Diminuir Zoom"
            >
                −
            </button>
        </div>
    );
}

// Componente interno que captura bounds e zoom
interface ClusteredMarkersProps {
    locations: LocationPoint[];
    onLocationClick: (location: LocationPoint) => void;
    isCompetitor?: boolean;
}

function ClusteredMarkers({ locations, onLocationClick, isCompetitor = false }: ClusteredMarkersProps) {
    const map = useMap();
    const [bounds, setBounds] = useState<[number, number, number, number] | null>(null);
    const [zoom, setZoom] = useState(map.getZoom());

    // Atualiza bounds e zoom quando o mapa muda (com check de igualdade para evitar loop)
    const updateBounds = useCallback(() => {
        const b = map.getBounds();
        const newBounds: [number, number, number, number] = [
            b.getWest(),
            b.getSouth(),
            b.getEast(),
            b.getNorth()
        ];

        // Verifica se houve mudança real nos valores (evita setState loop)
        const hasBoundsChanged = !bounds ||
            newBounds[0] !== bounds[0] ||
            newBounds[1] !== bounds[1] ||
            newBounds[2] !== bounds[2] ||
            newBounds[3] !== bounds[3];

        if (hasBoundsChanged) {
            setBounds(newBounds);
        }

        const newZoom = map.getZoom();
        if (newZoom !== zoom) {
            setZoom(newZoom);
        }
    }, [map, bounds, zoom]);

    // Subscreve eventos do mapa
    useMapEvents({
        moveend: updateBounds,
        zoomend: updateBounds
    });

    // Inicializa bounds na montagem
    useEffect(() => {
        updateBounds();
    }, [updateBounds]);

    // Usa o hook de clustering
    const { clusters, supercluster } = useMapClusters({
        locations,
        bounds,
        zoom
    });

    // Handler para click em cluster (zoom in)
    const handleClusterClick = (cluster: MapCluster) => {
        if (!supercluster || !cluster.properties.cluster_id) return;

        const expansionZoom = Math.min(
            supercluster.getClusterExpansionZoom(cluster.properties.cluster_id),
            18
        );

        map.flyTo(
            [cluster.geometry.coordinates[1], cluster.geometry.coordinates[0]],
            expansionZoom,
            { duration: 0.5 }
        );
    };

    // Handler para click em ponto individual
    const handlePointClick = (cluster: MapCluster) => {
        const locationId = cluster.properties.locationId;
        const originalLocation = locations.find(l => l.id === locationId);
        if (originalLocation) {
            onLocationClick(originalLocation);
        }
    };

    return (
        <>
            {clusters.map((cluster) => {
                const isCluster = cluster.properties.cluster;
                const key = isCluster
                    ? `cluster-${cluster.properties.cluster_id}`
                    : `point-${cluster.properties.locationId}`;

                if (isCluster) {
                    return (
                        <ClusterMarker
                            key={key}
                            cluster={cluster}
                            onClick={() => handleClusterClick(cluster)}
                            isCompetitor={isCompetitor}
                        />
                    );
                }

                return (
                    <PointMarker
                        key={key}
                        cluster={cluster}
                        onClick={() => handlePointClick(cluster)}
                        isCompetitor={isCompetitor}
                    />
                );
            })}
        </>
    );
}

// Props do componente principal
interface MapComponentProps {
    locations: LocationPoint[];
    competitorLocations?: LocationPoint[]; // Para overlay de concorrente
    onLocationClick: (location: LocationPoint) => void;
    mapStyle?: string;
    centerPosition?: [number, number];
    children?: React.ReactNode;
}

import { memo } from 'react';

// ... (existing code)

const MapComponent = memo(function MapComponent({
    locations,
    competitorLocations = [],
    onLocationClick,
    mapStyle = 'osm-bright',
    centerPosition,
    children
}: MapComponentProps) {
    const [isMapReady, setIsMapReady] = useState(false);

    // Fix para o mapa renderizar corretamente (invalidar size ao montar)
    useEffect(() => {
        setIsMapReady(true);
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 100);
    }, []);

    const currentMapStyle = mapStyles[mapStyle] || mapStyles['osm-bright'];

    return (
        <MapContainer
            key={`map-${centerPosition?.[0] || 'default'}`} // Força remount se o centro mudar significativamente (opcional) ou use campaignId
            center={[-23.550520, -46.633308]} // Centro de SP (fallback)
            zoom={13}
            style={{ height: '100%', width: '100%', background: '#f8fafc', zIndex: 0 }}
            zoomControl={false}
        >
            <SafeControls />
            <MapController center={centerPosition} />

            <TileLayer
                attribution={currentMapStyle.attribution}
                url={currentMapStyle.url}
            />

            {/* Renderização clusterizada - SEUS DADOS */}
            <ClusteredMarkers
                locations={locations}
                onLocationClick={onLocationClick}
            />

            {/* Renderização clusterizada - CONCORRENTE (overlay vermelho) */}
            {competitorLocations.length > 0 && (
                <ClusteredMarkers
                    locations={competitorLocations}
                    onLocationClick={() => { }}  // Clique desabilitado para concorrente
                    isCompetitor
                />
            )}

            {children}
        </MapContainer>
    );
});

export default MapComponent;
