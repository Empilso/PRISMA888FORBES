import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type PersonaStatus = 'idle' | 'running' | 'paused' | 'error';

interface UsePersonaStatusReturn {
    status: PersonaStatus;
    isLoading: boolean;
    error: Error | null;
}

/**
 * Hook to subscribe to a Persona's status in Realtime.
 * Used for showing loading spinners or status badges in the UI.
 */
export function usePersonaStatus(personaId: string): UsePersonaStatusReturn {
    const [status, setStatus] = useState<PersonaStatus>('idle');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const supabase = createClient();

    useEffect(() => {
        if (!personaId) return;

        let isMounted = true;

        // 1. Initial Fetch
        const fetchInitialStatus = async () => {
            try {
                setIsLoading(true);
                const { data, error } = await supabase
                    .from('personas')
                    .select('status')
                    .eq('id', personaId)
                    .single();

                if (error) throw error;

                if (isMounted && data) {
                    setStatus(data.status as PersonaStatus);
                }
            } catch (err) {
                console.error('Error fetching persona status:', err);
                if (isMounted) setError(err as Error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchInitialStatus();

        // 2. Realtime Subscription
        const channel = supabase
            .channel(`persona-status-${personaId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'personas',
                    filter: `id=eq.${personaId}`,
                },
                (payload) => {
                    console.log('[Realtime] Persona status update:', payload);
                    if (payload.new && 'status' in payload.new) {
                        setStatus(payload.new.status as PersonaStatus);
                    }
                }
            )
            .subscribe();

        // Cleanup
        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, [personaId]);

    return { status, isLoading, error };
}
