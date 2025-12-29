
import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface MapNote {
    id: string;
    campaign_id: string;
    location_id?: number | null; // BigInt from DB comes as number/string
    lat: number;
    lng: number;
    title: string;
    body: string;
    type: 'note' | 'alert' | 'opportunity' | 'risk' | 'logistics' | 'clipping';
    status: 'open' | 'in_progress' | 'resolved';
    priority: 'low' | 'medium' | 'high';
    author_id?: string;
    assignee_id?: string;
    created_at: string;
    updated_at: string;
}

export type CreateMapNotePayload = Omit<MapNote, 'id' | 'created_at' | 'updated_at' | 'campaign_id'>;
export type UpdateMapNotePayload = Partial<CreateMapNotePayload>;

export function useMapNotes(campaignId: string) {
    const supabase = createClient();
    const queryClient = useQueryClient();

    const fetchNotes = async () => {
        const { data, error } = await supabase
            .from('map_notes')
            .select('*')
            .eq('campaign_id', campaignId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as MapNote[];
    };

    const { data: notes, isLoading, error } = useQuery({
        queryKey: ['map_notes', campaignId],
        queryFn: fetchNotes,
        enabled: !!campaignId
    });

    const createNote = useMutation({
        mutationFn: async (payload: CreateMapNotePayload) => {
            // We can use the API endpoint OR Supabase client directly.
            // Using API endpoint ensures backend logic (validation, etc) if complex.
            // But existing code seems to mix patterns.
            // User instructions: "Create hooks... accessing API REST".
            // Step 3 created REST API. So we should use fetch/axios to call the API.
            // Not Supabase client directly, although simple.
            // "Backend: Map Notes API... Frontend: Layer de Notas... use hooks... same client/API pattern".
            // If I use supabase-js here, I bypass the API I just wrote.
            // But the API I wrote just wraps Supabase. 
            // However, to follow "Enterprise" and "API REST" instructions, I should call the API.
            // URL: /api/campaigns/{id}/map-notes (Proxied by Nextjs? No, Nextjs is the backend? No, FastAPI is backend).
            // NextJS actions usually call FastAPI.
            // If I use `createClient` (Supabase Client), I am talking to Supabase DB.
            // If I use fetch, I talk to FastAPI.
            // The task asked for "Backend Endpoints".
            // So I should use fetch.

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/campaigns/${campaignId}/map-notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error('Failed to create note');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['map_notes', campaignId] });
        }
    });

    const updateNote = useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: UpdateMapNotePayload }) => {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/campaigns/${campaignId}/map-notes/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (!response.ok) throw new Error('Failed to update note');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['map_notes', campaignId] });
        }
    });

    const deleteNote = useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/campaigns/${campaignId}/map-notes/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to delete note');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['map_notes', campaignId] });
        }
    });

    return {
        notes,
        isLoading,
        error,
        createNote: createNote.mutate,
        updateNote: updateNote.mutate,
        deleteNote: deleteNote.mutate
    };
}
