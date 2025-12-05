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

// URLs de Pins
const pinUrls: Record<string, string> = {
    'classic-red': 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
    'classic-blue': 'https://cdn-icons-png.flaticon.com/512/684/684909.png',
    'classic-green': 'https://cdn-icons-png.flaticon.com/512/684/684907.png',
    'modern-red': 'https://cdn-icons-png.flaticon.com/512/2776/2776067.png',
    'modern-blue': 'https://cdn-icons-png.flaticon.com/512/2776/2776071.png',
    'modern-purple': 'https://cdn-icons-png.flaticon.com/512/2776/2776073.png',
    'location-red': 'https://cdn-icons-png.flaticon.com/512/447/447031.png',
    'location-blue': 'https://cdn-icons-png.flaticon.com/512/447/447032.png',
    'marker-orange': 'https://cdn-icons-png.flaticon.com/512/1483/1483336.png',
    'marker-pink': 'https://cdn-icons-png.flaticon.com/512/1483/1483285.png',
    'pin-shadow': 'https://cdn-icons-png.flaticon.com/512/3177/3177361.png',
    'pin-glow': 'https://cdn-icons-png.flaticon.com/512/3177/3177370.png',
    'custom-home': 'https://cdn-icons-png.flaticon.com/512/1946/1946436.png',
    'custom-star': 'https://cdn-icons-png.flaticon.com/512/1828/1828884.png',
    'custom-heart': 'https://cdn-icons-png.flaticon.com/512/833/833472.png',
};

// Configuração de ícones
const createIcon = (style: string, colorOverride?: string) => {
    // Tenta usar o estilo selecionado, ou fallback para classic-red
    // Se houver colorOverride (do objeto location), tenta achar um estilo correspondente (ex: classic-green)

    let iconUrl = pinUrls[style] || pinUrls['classic-red'];

    // Lógica simples para override de cor se o estilo for "classic" ou "modern"
    if (colorOverride && (style.includes('classic') || style.includes('modern'))) {
        const baseStyle = style.split('-')[0]; // classic ou modern
        const specificUrl = pinUrls[`${baseStyle}-${colorOverride}`];
        if (specificUrl) iconUrl = specificUrl;
    }

    return L.icon({
        iconUrl: iconUrl,
        iconSize: [38, 38], // Aumentado levemente para melhor UX
        iconAnchor: [19, 38],
        popupAnchor: [0, -38],
        // Sombra removida para evitar artefatos visuais e sobreposição
    });
};

// Componente para controlar a câmera do mapa
function MapController({ center }: { center?: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, 14, { duration: 1.5 });
        }
    }, [center, map]);
    return null;
}

export default function MapComponent({
    locations,
    onLocationClick,
    mapStyle = 'osm-bright',
    pinStyle = 'classic-red',
    centerPosition
}: any) {
    // Fix para o mapa renderizar corretamente
    useEffect(() => {
        window.dispatchEvent(new Event('resize'));
    }, []);

    const currentMapStyle = mapStyles[mapStyle] || mapStyles['osm-bright'];

    return (
        <MapContainer
            center={[-23.550520, -46.633308]} // Centro de SP (exemplo)
            zoom={13}
            style={{ height: '100%', width: '100%', background: '#f0f0f0' }}
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
                    // Key composta força a recriação do marcador quando o estilo muda,
                    // evitando que o ícone antigo permaneça visível (bug visual comum)
                    key={`${loc.id}-${pinStyle}-${loc.color}`}
                    position={loc.position}
                    icon={createIcon(pinStyle, loc.color)}
                    eventHandlers={{
                        click: () => onLocationClick(loc),
                    }}
                />
            ))}
        </MapContainer>
    );
}
