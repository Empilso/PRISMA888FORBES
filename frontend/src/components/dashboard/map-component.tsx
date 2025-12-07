"use client";

import { MapContainer, TileLayer, Marker, ZoomControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

// Estilos de Mapa
const mapStyles: Record<string, { url: string; attribution: string }> = {
    osm: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '© OpenStreetMap' },
    'osm-bright': { url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', attribution: 'Carto' },
    'osm-hot': { url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', attribution: 'OpenStreetMap FR' },
    satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: 'Esri' },
    'carto-dark': { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attribution: 'Carto' },
};

// Lógica de Cor por Performance
const getPerformanceStyles = (votes: number) => {
    if (votes > 2000) return 'bg-emerald-500 shadow-emerald-500/40'; // Alta
    if (votes >= 1000) return 'bg-amber-400 shadow-amber-400/40';   // Média
    return 'bg-rose-500 shadow-rose-500/40';                        // Baixa
};

const createPerformanceIcon = (votes: number) => {
    const colorClasses = getPerformanceStyles(votes);

    // HTML do Marcador (Puro CSS/Tailwind)
    // Círculo colorido com borda branca grossa e sombra colorida (Glow)
    const html = `
        <div class="relative flex items-center justify-center w-full h-full group">
            <div class="${colorClasses} w-4 h-4 rounded-full border-[2.5px] border-white shadow-lg ring-1 ring-black/5 transition-transform duration-300 group-hover:scale-125"></div>
        </div>
    `;

    return L.divIcon({
        className: 'bg-transparent', // Remove container default do leaflet
        html: html,
        iconSize: [24, 24],   // Tamanho do container
        iconAnchor: [12, 12], // Âncora no centro exato (agora são bolinhas)
        popupAnchor: [0, -12]
    });
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

export default function MapComponent({
    locations,
    onLocationClick,
    mapStyle = 'osm-bright',
    centerPosition
}: any) {
    // Fix para o mapa renderizar corretamente (invalidar size ao montar)
    useEffect(() => {
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 100);
    }, []);

    const currentMapStyle = mapStyles[mapStyle] || mapStyles['osm-bright'];

    return (
        <MapContainer
            center={[-23.550520, -46.633308]} // Centro de SP (fallback)
            zoom={13}
            style={{ height: '100%', width: '100%', background: '#f8fafc', zIndex: 0 }} // zIndex 0 para garantir que fique atrás do Sheet
            zoomControl={false}
        >
            <ZoomControl position="bottomright" />
            <MapController center={centerPosition} />

            <TileLayer
                attribution={currentMapStyle.attribution}
                url={currentMapStyle.url}
            />

            {locations.map((loc: any) => (
                <Marker
                    key={loc.id}
                    position={loc.position}
                    icon={createPerformanceIcon(loc.votes || 0)}
                    eventHandlers={{
                        click: () => onLocationClick(loc),
                    }}
                />
            ))}
        </MapContainer>
    );
}
