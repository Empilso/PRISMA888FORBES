// ========================================
// LIB: Profile Operations
// ========================================
// Funções helper para gerenciar perfis de usuários

import React from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile, ProfileUpdate } from '@/types/profile';

/**
 * Busca o perfil do usuário logado
 */
export async function getCurrentProfile(): Promise<Profile | null> {
    const supabase = createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('Erro ao buscar perfil:', error);
        return null;
    }

    return data as Profile;
}

/**
 * Verifica se o usuário já aceitou os termos
 */
export async function hasAcceptedTerms(): Promise<boolean> {
    const profile = await getCurrentProfile();
    return profile?.terms_accepted_at !== null;
}

/**
 * Registra o aceite dos termos
 */
export async function acceptTerms(): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: 'Usuário não autenticado' };
    }

    const { error } = await supabase
        .from('profiles')
        .update({ terms_accepted_at: new Date().toISOString() })
        .eq('id', user.id);

    if (error) {
        console.error('Erro ao aceitar termos:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

/**
 * Atualiza o perfil do usuário
 */
export async function updateProfile(
    updates: ProfileUpdate
): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: 'Usuário não autenticado' };
    }

    const { error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id);

    if (error) {
        console.error('Erro ao atualizar perfil:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

/**
 * Verifica se o usuário tem uma role específica
 */
export async function hasRole(requiredRole: 'super_admin' | 'candidate' | 'staff'): Promise<boolean> {
    const profile = await getCurrentProfile();
    return profile?.role === requiredRole;
}

/**
 * Verifica se o usuário é super admin
 */
export async function isSuperAdmin(): Promise<boolean> {
    return hasRole('super_admin');
}

/**
 * Verifica se o usuário é candidato
 */
export async function isCandidate(): Promise<boolean> {
    return hasRole('candidate');
}

/**
 * Hook React para perfil (use em componentes client)
 */
export function useProfile() {
    const [profile, setProfile] = React.useState<Profile | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        getCurrentProfile().then((data) => {
            setProfile(data);
            setLoading(false);
        });
    }, []);

    return { profile, loading, refetch: () => getCurrentProfile().then(setProfile) };
}
