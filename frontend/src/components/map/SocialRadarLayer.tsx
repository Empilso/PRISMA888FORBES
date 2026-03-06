"use client";

import { Marker, Tooltip } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { divIcon } from "leaflet";

export interface SocialMention {
    id: string;
    lat: number;
    lng: number;
    text: string;
    author: string;
    sentiment_label: "Positivo" | "Negativo" | "Neutro";
    sentiment: number;
    inferred_neighborhood: string;
    rival_handle: string;
    platform: string;
    is_mock: boolean;
    likes?: number;
    comments?: number;
}

interface SocialRadarLayerProps {
    mentions: SocialMention[];
    onMentionClick?: (mention: SocialMention) => void;
}

/**
 * Configuração de Sentiment com Ícones Premium.
 */
const SENTIMENT_CONFIG: Record<string, { color: string; bg: string; icon: string; label: string }> = {
    Positivo: { color: "#10B981", bg: "rgba(16,185,129,0.15)", icon: "💎", label: "Oportunidade" },
    Negativo: { color: "#EF4444", bg: "rgba(239,68,68,0.15)", icon: "🚨", label: "Nossa Força" },
    Neutro: { color: "#F59E0B", bg: "rgba(245,158,11,0.15)", icon: "💬", label: "Neutro" },
};

/**
 * Cores por plataforma (Ultra Premium - Modo Clean).
 */
const PLATFORM_THEME: Record<string, { gradient: string; border: string; glow: string }> = {
    instagram: {
        gradient: 'linear-gradient(135deg, #FF0080 0%, #7928CA 100%)', // Rosa choque para Roxo profundo
        border: '#FF0080',
        glow: 'rgba(255, 0, 128, 0.5)'
    },
    tiktok: {
        gradient: 'linear-gradient(135deg, #00F2EA 0%, #000000 100%)', // Ciano vibrante para Preto (Contraste Total)
        border: '#00F2EA',
        glow: 'rgba(0, 242, 234, 0.5)'
    },
    default: {
        gradient: 'linear-gradient(135deg, #64748B 0%, #475569 100%)',
        border: '#64748B',
        glow: 'rgba(100, 116, 139, 0.4)'
    }
};

/**
 * Configuração de Ícones SVG de Elite.
 */
const PLATFORM_SVG: Record<string, string> = {
    instagram: `
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.058-1.28.072-1.689.072-4.948 0-3.259-.014-3.668-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
        </svg>
    `,
    tiktok: `
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.08.33-.74.42-1.33 1.16-1.54 1.97-.28 1.14.02 2.38.76 3.25.75.91 1.96 1.38 3.12 1.25 1.05-.05 2.06-.57 2.71-1.39.52-.64.79-1.44.82-2.25.03-3.09.03-6.18.03-9.27z"/>
        </svg>
    `,
    default: `
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 11H7V9h2v2zm4 0h-2V9h2v2zm4 0h-2V9h2v2z"/>
        </svg>
    `
};

function getSpeechBubbleIcon(sentiment: string, handle: string, platform: string) {
    const sentimentConfig = SENTIMENT_CONFIG[sentiment] || SENTIMENT_CONFIG.Neutro;
    const theme = PLATFORM_THEME[platform.toLowerCase()] || PLATFORM_THEME.default;
    const svgIcon = PLATFORM_SVG[platform.toLowerCase()] || PLATFORM_SVG.default;

    // Configurações de Formato por Plataforma
    const isTikTok = platform.toLowerCase() === 'tiktok';
    const borderRadius = isTikTok ? '18px 4px 18px 18px' : '15px';

    const html = `
        <div style="position: relative; cursor: pointer; filter: drop-shadow(0 8px 16px ${theme.glow});">
            <!-- Camada de Luminescência (Lume) -->
            <div style="
                position: absolute;
                inset: -2px;
                background: ${theme.gradient};
                border-radius: ${borderRadius};
                opacity: 0.4;
                filter: blur(4px);
            "></div>

            <!-- Balão Clean Enterprise -->
            <div style="
                position: relative;
                width: 46px;
                height: 46px;
                background: rgba(255, 255, 255, 0.9);
                border: 2px solid transparent;
                background-clip: padding-box;
                border-radius: ${borderRadius};
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(12px);
                box-shadow: inset 0 0 0 2px ${theme.border}40, 0 4px 12px rgba(0,0,0,0.15);
                transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                padding: 4px;
                overflow: visible;
            " class="hover:scale-110 hover:shadow-2xl">
                
                <!-- Badge de Sentimento (Mini Gema) -->
                <div style="
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    width: 20px;
                    height: 20px;
                    background: white;
                    border: 1.5px solid ${sentimentConfig.color};
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 11px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    z-index: 10;
                ">
                    ${sentimentConfig.icon}
                </div>

                <!-- Logo da Plataforma SVG -->
                <div style="color: ${theme.border}; margin-bottom: 2px; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.1));">
                    ${svgIcon}
                </div>

                <!-- Handle do Alvo -->
                <div style="
                    background: ${theme.border};
                    color: white;
                    font-size: 7px;
                    font-weight: 950;
                    padding: 1px 4px;
                    border-radius: 4px;
                    max-width: 38px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    text-transform: uppercase;
                    letter-spacing: 0.2px;
                ">
                    ${handle.replace('@', '').substring(0, 5)}
                </div>
            </div>

            <!-- Rabicho do Balão (Sincronizado) -->
            <div style="
                position: absolute;
                bottom: -8px;
                left: 50%;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 6px solid transparent;
                border-right: 6px solid transparent;
                border-top: 8px solid ${theme.border};
                filter: drop-shadow(0 2px 2px rgba(0,0,0,0.1));
            "></div>
        </div>
    `;

    return divIcon({
        className: "bg-transparent",
        html,
        iconSize: [46, 54],
        iconAnchor: [23, 54],
    });
}

/**
 * Cria ícone para agrupamento de menções sociais (Ultra Enterprise - Modo Clean).
 */
function createSocialClusterIcon(cluster: any): L.DivIcon {
    const childCount = cluster.getChildCount();

    // Tamanho dinâmico e elegante
    let size = 44;
    if (childCount >= 10) size = 52;
    if (childCount >= 50) size = 64;

    const html = `
        <div style="position: relative; filter: drop-shadow(0 12px 24px rgba(124, 58, 237, 0.3));">
            <!-- Balão de Agrupamento Clean -->
            <div style="
                width: ${size}px; 
                height: ${size}px; 
                background: rgba(255, 255, 255, 0.95);
                border: 4px solid transparent;
                border-image: linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%);
                border-image-slice: 1;
                border-radius: 18px;
                display: flex; 
                align-items: center; 
                justify-content: center;
                backdrop-filter: blur(16px);
                box-shadow: inset 0 0 15px rgba(124, 58, 237, 0.1);
                transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                cursor: pointer;
                overflow: hidden;
                border-style: solid;
            " class="hover:scale-110">
                <span style="
                    color: #4F46E5;
                    font-size: ${size > 50 ? '20px' : '16px'};
                    font-weight: 950;
                    letter-spacing: -0.05em;
                    text-shadow: 0 1px 2px rgba(255,255,255,0.8);
                ">
                    ${childCount}
                </span>
            </div>
            <!-- Rabicho do Balão de Agrupamento -->
            <div style="
                position: absolute;
                bottom: -10px;
                left: 50%;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 10px solid transparent;
                border-right: 10px solid transparent;
                border-top: 12px solid #4F46E5;
            "></div>
        </div>
    `;

    return divIcon({
        className: "bg-transparent",
        html: html,
        iconSize: [size, size + 12],
        iconAnchor: [size / 2, size + 12],
    });
}

export function SocialRadarLayer({ mentions, onMentionClick }: SocialRadarLayerProps) {
    console.log(`[SocialRadarLayer] Rendering ${mentions.length} mentions`);

    return (
        <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={50}
            iconCreateFunction={createSocialClusterIcon}
        >
            {mentions.map((mention) => {
                if (!mention.lat || !mention.lng) return null;

                const icon = getSpeechBubbleIcon(mention.sentiment_label, mention.rival_handle, mention.platform);
                const sentimentConfig = SENTIMENT_CONFIG[mention.sentiment_label] || SENTIMENT_CONFIG.Neutro;
                const theme = PLATFORM_THEME[mention.platform.toLowerCase()] || PLATFORM_THEME.default;

                return (
                    <Marker
                        key={mention.id}
                        position={[mention.lat, mention.lng]}
                        icon={icon}
                        eventHandlers={{
                            click: () => onMentionClick?.(mention),
                        }}
                    >
                        <Tooltip
                            direction="top"
                            offset={[12, -30]}
                            opacity={1}
                        >
                            <div className="min-w-[240px] max-w-[300px] p-2">
                                {/* Header com sentiment badge */}
                                <div className="flex items-center justify-between mb-1.5 pb-1.5 border-b border-slate-100">
                                    <span
                                        className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md flex items-center gap-1"
                                        style={{
                                            color: 'white',
                                            background: theme.gradient,
                                            boxShadow: `0 2px 4px ${theme.glow}`
                                        }}
                                    >
                                        <span className="text-xs">{sentimentConfig.icon}</span>
                                        {sentimentConfig.label}
                                    </span>
                                    <span className="text-[10px] font-bold" style={{ color: theme.border }}>
                                        {mention.platform === "instagram" ? "📸" : "🎵"} @{mention.rival_handle}
                                    </span>
                                </div>

                                {/* Comentário */}
                                <p className="text-xs text-slate-700 leading-relaxed max-h-[80px] overflow-y-auto mb-1.5 pr-1">
                                    &ldquo;{mention.text}&rdquo;
                                </p>

                                {/* Footer */}
                                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                                    <span>@{mention.author}</span>
                                    <span className="flex items-center gap-1">
                                        📍 {mention.inferred_neighborhood}
                                        {mention.is_mock && (
                                            <span className="text-amber-500 ml-1" title="Dado simulado">(mock)</span>
                                        )}
                                    </span>
                                </div>
                            </div>
                        </Tooltip>
                    </Marker>
                );
            })}
        </MarkerClusterGroup>
    );
}
