import { Marker, Popup, Tooltip, useMapEvents } from "react-leaflet";
import { divIcon } from "leaflet";
import { useMemo } from "react";

// Inline Type Definition if not exists centrally yet
export interface MapNote {
    id: string;
    lat: number;
    lng: number;
    title: string;
    body: string;
    type: 'alerta' | 'oportunidade' | 'risco' | 'logistica' | 'campo';
    status: 'aberta' | 'andamento' | 'resolvida';
    priority: number;
    color?: string;
    shape?: 'circle' | 'triangle' | 'flag';
}

interface MapNotesLayerProps {
    notes: MapNote[];
    isNoteMode: boolean;
    onMapClick: (lat: number, lng: number) => void;
    onNoteClick: (note: MapNote) => void;
}

export function MapNotesLayer({ notes, isNoteMode, onMapClick, onNoteClick }: MapNotesLayerProps) {

    // Handle Map Clicks
    useMapEvents({
        click(e) {
            if (isNoteMode) {
                onMapClick(e.latlng.lat, e.latlng.lng);
            }
        },
    });

    const getIconHtml = (color: string, shape: string) => {
        // Default color and style attributes
        const bgStyle = color.startsWith("#") ? `style="background-color: ${color}"` : `class="${color}"`;
        const textStyle = color.startsWith("#") ? `style="color: ${color}"` : `class="${color.replace('bg-', 'text-')}"`;

        if (shape === 'flag') {
            // SVG Flag Icon (Heroicons/Lucide style filled)
            // Using currentColor via textStyle for the flag fill
            return `<div class="w-8 h-8 flex items-end justify-center drop-shadow-md" ${textStyle}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-8 h-8 relative top-[-4px]">
                          <path fill-rule="evenodd" d="M3 2.25a.75.75 0 01.75.75v.54l1.838-.46a9.75 9.75 0 016.725.738l.108.054a8.25 8.25 0 005.58.652l3.109-.732a.75.75 0 01.917.81 47.784 47.784 0 00.005 10.337.75.75 0 01-.574.812l-3.114.733a9.75 9.75 0 01-6.594-.158l-.106-.053a8.25 8.25 0 00-5.69-.717l-2.137.535v9.141a.75.75 0 01-1.5 0v-10.9V3a.75.75 0 01.75-.75z" clip-rule="evenodd" />
                        </svg>
                    </div>`;
        }

        if (shape === 'triangle') {
            // Triangle using borders
            const borderStyle = color.startsWith("#") ? `style="border-bottom-color: ${color}"` : `class="border-b-[${color}]"`; // Tailwind dynamic class might not work if not safe-listed, better use style if hex or inline style
            // For tailwind class colors, we simply rely on text-current if we can, but borders are tricky.
            // Let's stick to style for border-bottom-color to be safe with hex, and handle class if needed.
            // Actually, the previous implementation used `border-b-[current]` and `text-color`.

            return `<div ${textStyle} class="w-0 h-0 border-l-[12px] border-l-transparent border-b-[24px] border-r-[12px] border-r-transparent border-b-current drop-shadow-md flex items-center justify-center text-white text-xs font-bold relative">
                        <span class="absolute top-[10px] left-[-3px]">!</span>
                    </div>`;
        }

        // Default Circle
        const styleAttr = color.startsWith("#") ? `background-color: ${color};` : "";
        const classAttr = color.startsWith("#") ? "" : color;

        return `<div class="${classAttr} rounded-full w-6 h-6 border-2 border-white shadow-md flex items-center justify-center text-white text-xs font-bold" style="${styleAttr}">
                    <div>!</div>
                </div>`;
    };

    return (
        <>
            {notes.map((note) => {
                // Fallback logic
                const finalColor = note.color || "#F59E0B";
                const finalShape = note.shape || "circle";

                const iconHtml = getIconHtml(finalColor, finalShape);

                const customIcon = divIcon({
                    className: "bg-transparent",
                    html: iconHtml,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12],
                });

                return (
                    <Marker
                        key={note.id}
                        position={[note.lat, note.lng]}
                        icon={customIcon}
                        eventHandlers={{
                            click: () => onNoteClick(note),
                        }}
                    >
                        <Tooltip direction="top" offset={[0, -20]} opacity={1}>
                            <div className="flex flex-col gap-1 min-w-[200px] p-1">
                                <span className="font-bold text-sm text-slate-900">{note.title || "Sem título"}</span>
                                {note.body && (
                                    <span className="text-xs text-slate-500 line-clamp-2">
                                        {note.body}
                                    </span>
                                )}
                                <div className="flex gap-2 mt-1">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 border px-1.5 py-0.5 rounded bg-slate-50">
                                        {note.type}
                                    </span>
                                    {note.priority >= 4 && (
                                        <span className="text-[10px] uppercase font-bold text-red-600 border border-red-200 px-1.5 py-0.5 rounded bg-red-50">
                                            Alta Prioridade
                                        </span>
                                    )}
                                </div>
                            </div>
                        </Tooltip>
                    </Marker>
                );
            })}
        </>
    );
}
