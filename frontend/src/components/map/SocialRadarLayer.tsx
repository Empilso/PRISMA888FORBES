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
 * Speech bubble pin colors by sentiment:
 * 🟢 Verde = Elogio ao rival / Nossa Oportunidade
 * 🔴 Vermelho = Crítica ao rival / Nossa Força
 * 🟡 Amarelo = Neutro
 */
const SENTIMENT_CONFIG: Record<string, { color: string; bg: string; emoji: string; label: string }> = {
    Positivo: { color: "#10B981", bg: "rgba(16,185,129,0.15)", emoji: "💬", label: "Oportunidade" },
    Negativo: { color: "#EF4444", bg: "rgba(239,68,68,0.15)", emoji: "🔥", label: "Nossa Força" },
    Neutro: { color: "#F59E0B", bg: "rgba(245,158,11,0.15)", emoji: "💭", label: "Neutro" },
};

// Generate a consistent color based on a string (rival handle)
function stringToColor(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Generate HSL colors that are vibrant but readable (avoiding too light or too dark)
    const h = Math.abs(hash) % 360;
    return {
        base: `hsl(${h}, 70%, 50%)`,
        light: `hsl(${h}, 70%, 95%)`,
        border: `hsl(${h}, 70%, 40%)`
    };
}

function getSpeechBubbleIcon(sentiment: string, handle: string) {
    const sentimentConfig = SENTIMENT_CONFIG[sentiment] || SENTIMENT_CONFIG.Neutro;
    const colors = stringToColor(handle);

    const html = `
        <div style="position: relative; cursor: pointer;">
            <div style="
                width: 38px;
                height: 38px;
                background: ${colors.light};
                border: 2px solid ${colors.border};
                border-radius: 12px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                backdrop-filter: blur(4px);
                transition: transform 0.2s;
                padding: 2px;
            ">
                <span style="font-size: 14px; line-height: 1;">${sentimentConfig.emoji}</span>
                <span style="font-size: 8px; font-weight: bold; color: ${colors.border}; margin-top: 2px; max-width: 32px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    @${handle.substring(0, 4)}
                </span>
            </div>
            <div style="
                position: absolute;
                bottom: -6px;
                left: 13px;
                width: 0;
                height: 0;
                border-left: 6px solid transparent;
                border-right: 6px solid transparent;
                border-top: 6px solid ${colors.border};
            "></div>
        </div>
    `;

    return divIcon({
        className: "bg-transparent",
        html,
        iconSize: [38, 44],
        iconAnchor: [19, 44],
    });
}

export function SocialRadarLayer({ mentions, onMentionClick }: SocialRadarLayerProps) {
    return (
        <MarkerClusterGroup chunkedLoading maxClusterRadius={50}>
            {mentions.map((mention) => {
                if (!mention.lat || !mention.lng) return null;

                const icon = getSpeechBubbleIcon(mention.sentiment_label, mention.rival_handle);
                const sentimentConfig = SENTIMENT_CONFIG[mention.sentiment_label] || SENTIMENT_CONFIG.Neutro;
                const colors = stringToColor(mention.rival_handle);

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
                                            color: colors.border,
                                            backgroundColor: colors.light,
                                            border: `1px solid ${colors.border}40`
                                        }}
                                    >
                                        <span className="text-xs">{sentimentConfig.emoji}</span>
                                        {sentimentConfig.label}
                                    </span>
                                    <span className="text-[10px] font-bold" style={{ color: colors.border }}>
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
