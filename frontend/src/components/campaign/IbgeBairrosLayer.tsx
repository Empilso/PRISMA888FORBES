import React from 'react';
import { GeoJSON, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface IbgeBairrosLayerProps {
    data: any; // O GeoJSON FeatureCollection retornado da API
}

export function IbgeBairrosLayer({ data }: IbgeBairrosLayerProps) {
    console.log("[IbgeBairrosLayer] Renderizando com", data?.features?.length, "features");
    if (!data || !data.features || data.features.length === 0) {
        console.warn("[IbgeBairrosLayer] Sem dados válidos para renderizar");
        return null;
    }

    return (
        <GeoJSON
            key={data?.features?.length || 'ibge-layer'} // Força re-render se o FeatureCollection mudar
            data={data}
            style={() => ({
                weight: 1, // Borda super fina, aspecto Apple
                color: "rgba(99, 102, 241, 0.5)", // Tema primário do dashboard (Indigo/Purple) translúcido
                fillColor: "rgba(226, 232, 240, 0.1)", // Preenchimento quase invisível (Slate 200 alpha)
                fillOpacity: 0.1,
                opacity: 0.8
            })}
            onEachFeature={(feature, layer) => {
                // Interatividade leve apenas de Hover para dar sensação "viva"
                layer.on({
                    mouseover: (e) => {
                        const target = e.target;
                        target.setStyle({
                            weight: 2,
                            color: "rgba(99, 102, 241, 0.9)",
                            fillOpacity: 0.3
                        });
                        target.bringToFront();
                    },
                    mouseout: (e) => {
                        const target = e.target;
                        target.setStyle({
                            weight: 1,
                            color: "rgba(99, 102, 241, 0.5)",
                            fillOpacity: 0.1
                        });
                    }
                });

                // Tooltip dinâmico baseado na propriedade devolvida pelo banco PostGIS
                if (feature.properties && feature.properties.nome_bairro) {
                    layer.bindTooltip(feature.properties.nome_bairro, {
                        direction: "center",
                        className: "bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-200/50 shadow-xl text-slate-900 dark:text-white font-bold px-3 py-1.5 text-xs tracking-wider uppercase",
                        sticky: true
                    });
                }
            }}
        />
    );
}
