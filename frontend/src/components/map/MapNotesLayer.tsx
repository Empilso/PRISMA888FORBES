
import React, { useState, useEffect } from 'react';
import { Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useMapNotes, CreateMapNotePayload, MapNote } from '@/hooks/useMapNotes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Trash2, Save, X, Loader2, Sparkles, AlertTriangle, Lightbulb, MapPin } from 'lucide-react';

interface MapNotesLayerProps {
    campaignId: string;
    isAddingNote: boolean;
    onNoteAdded: () => void; // Called when a note is successfully added (to exit add mode)
}

const createNoteIcon = (type: string, status: string) => {
    // Defines icon style based on type and status
    let colorClass = 'bg-blue-500';
    let iconContent = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>'; // default message icon

    if (type === 'alert') {
        colorClass = 'bg-red-500';
        iconContent = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
    } else if (type === 'opportunity') {
        colorClass = 'bg-yellow-500';
        iconContent = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-1 1.5-2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path><path d="M9 18h6"></path><path d="M10 22h4"></path></svg>';
    } else if (status === 'resolved') {
        colorClass = 'bg-slate-400';
    }

    const html = `
        <div class="relative flex items-center justify-center w-full h-full transform transition-transform hover:scale-110">
            <div class="${colorClass} w-8 h-8 rounded-full border-2 border-white shadow-md flex items-center justify-center">
                ${iconContent}
            </div>
            ${status === 'in_progress' ? '<span class="absolute -top-1 -right-1 flex h-3 w-3"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span></span>' : ''}
        </div>
    `;

    return L.divIcon({
        className: 'bg-transparent',
        html: html,
        iconSize: [32, 32],
        iconAnchor: [16, 30], // Anchor at bottom center approx
        popupAnchor: [0, -32]
    });
};

export function MapNotesLayer({ campaignId, isAddingNote, onNoteAdded }: MapNotesLayerProps) {
    const { notes, createNote, updateNote, deleteNote } = useMapNotes(campaignId);
    const [newNotePos, setNewNotePos] = useState<[number, number] | null>(null);

    // Map Events for Creation
    useMapEvents({
        click(e) {
            if (isAddingNote) {
                setNewNotePos([e.latlng.lat, e.latlng.lng]);
            }
        },
        locationfound(e) {
            // map.flyTo(e.latlng, map.getZoom())
        },
    });

    const handleCreate = async (data: any) => {
        if (!newNotePos) return;

        await createNote({
            title: data.title,
            body: data.body,
            type: data.type || 'note',
            status: 'open',
            priority: data.priority || 'medium',
            lat: newNotePos[0],
            lng: newNotePos[1]
        });

        setNewNotePos(null);
        onNoteAdded(); // Exit add mode
    };

    return (
        <>
            {/* Existing Notes */}
            {notes?.map((note) => (
                <Marker
                    key={note.id}
                    position={[note.lat, note.lng]}
                    icon={createNoteIcon(note.type, note.status)}
                >
                    <Popup minWidth={300} className="custom-popup">
                        <NotePopupContent
                            note={note}
                            onUpdate={(updates: Partial<MapNote>) => updateNote({ id: note.id, updates })}
                            onDelete={() => deleteNote(note.id)}
                            campaignId={campaignId}
                        />
                    </Popup>
                </Marker>
            ))}

            {/* New Note Marker (Draft) */}
            {newNotePos && (
                <Marker
                    position={newNotePos}
                    icon={createNoteIcon('note', 'open')}
                >
                    <Popup minWidth={300} closeButton={false} autoPan={true}>
                        <NoteForm
                            onSubmit={handleCreate}
                            onCancel={() => setNewNotePos(null)}
                        />
                    </Popup>
                </Marker>
            )}

            {/* Helper UI when Adding */}
            {isAddingNote && (
                <div className="leaflet-top leaflet-right" style={{ pointerEvents: 'none' }}>
                    <div className="leaflet-control bg-blue-600 text-white px-4 py-2 rounded-md shadow-lg font-bold m-4 flex items-center gap-2 animate-pulse">
                        <MapPin className="h-4 w-4" />
                        Clique no mapa para adicionar nota
                    </div>
                </div>
            )}
        </>
    );
}

function NoteForm({ onSubmit, onCancel, initialData }: any) {
    const [title, setTitle] = useState(initialData?.title || '');
    const [body, setBody] = useState(initialData?.body || '');
    const [type, setType] = useState(initialData?.type || 'note');
    const [priority, setPriority] = useState(initialData?.priority || 'medium');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSubmit({ title, body, type, priority });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-3 p-1">
            <h4 className="font-bold text-sm text-slate-800">{initialData ? 'Editar Nota' : 'Nova Nota Estartégica'}</h4>
            <Input
                placeholder="Título da nota"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-8 text-sm"
                autoFocus
            />
            <Textarea
                placeholder="Detalhes..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="h-20 text-sm resize-none"
            />
            <div className="flex gap-2">
                <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="h-7 text-xs flex-1">
                        <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="note">Nota</SelectItem>
                        <SelectItem value="alert">Alerta 🚨</SelectItem>
                        <SelectItem value="opportunity">Oportunidade 💡</SelectItem>
                        <SelectItem value="risk">Risco ⚠️</SelectItem>
                        <SelectItem value="logistics">Logística 🚚</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="h-7 text-xs w-24">
                        <SelectValue placeholder="Prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={onCancel} type="button" className="h-7 text-xs">Cancelar</Button>
                <Button onClick={handleSubmit} size="sm" className="h-7 text-xs" disabled={!title || isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                    Salvar
                </Button>
            </div>
        </div>
    )
}

function NotePopupContent({ note, onUpdate, onDelete, campaignId }: any) {
    const [isEditing, setIsEditing] = useState(false);

    // AI Suggestion State
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

    const handleGenerateAI = async () => {
        setIsGeneratingAI(true);
        try {
            // Chamada ao novo endpoint consolidado
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/campaigns/${campaignId}/map-notes/${note.id}/ai-action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) throw new Error('Falha ao gerar ação com IA');

            const data = await response.json();
            setAiSuggestion(data.action_description);

            // Opcional: Atualizar a nota com a sugestão ou apenas mostrar
            // Por enquanto apenas mostra.

        } catch (e) {
            console.error(e);
            setAiSuggestion("Erro ao conectar com o Estrategista Virtual.");
        } finally {
            setIsGeneratingAI(false);
        }
    };

    if (isEditing) {
        return <NoteForm
            initialData={note}
            onSubmit={(data: any) => { onUpdate(data); setIsEditing(false); }}
            onCancel={() => setIsEditing(false)}
        />
    }

    return (
        <div className="space-y-4 p-1 min-w-[280px]">
            <div className="flex justify-between items-start border-b pb-2">
                <div>
                    <h4 className="font-bold text-sm">{note.title}</h4>
                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${note.type === 'alert' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-100 text-slate-500'}`}>
                        {note.type}
                    </span>
                </div>
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsEditing(true)}> <EditIcon className="h-3 w-3" /> </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-600" onClick={onDelete}> <Trash2 className="h-3 w-3" /> </Button>
                </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                {note.body}
            </p>

            {/* AI Section */}
            <div className="bg-indigo-50/50 rounded-lg p-3 border border-indigo-100">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-1.5 text-indigo-700">
                        <Sparkles className="h-3 w-3" />
                        <span className="text-xs font-bold">Inteligência Tática</span>
                    </div>
                    {!aiSuggestion && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                            onClick={handleGenerateAI}
                            disabled={isGeneratingAI}
                        >
                            {isGeneratingAI ? <Loader2 className="h-3 w-3 animate-spin" /> : "Gerar Ação"}
                        </Button>
                    )}
                </div>

                {aiSuggestion && (
                    <div className="animate-in fade-in zoom-in duration-300">
                        <p className="text-xs text-indigo-800 bg-white p-2 rounded border border-indigo-100 shadow-sm">
                            {aiSuggestion}
                        </p>
                        <div className="flex justify-end mt-2">
                            <Button size="sm" className="h-6 text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white">
                                Transformar em Tarefa
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex gap-2 justify-between text-[10px] text-muted-foreground pt-2 border-t mt-2">
                <span>Status: {note.status}</span>
                <span>Prioridade: {note.priority}</span>
            </div>
        </div>
    )
}

// Simple Edit Icon component if lucide 'Edit' is ambiguous or missing
function EditIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    )
}
