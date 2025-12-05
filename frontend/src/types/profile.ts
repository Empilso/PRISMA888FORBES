// ========================================
// TYPES: Profiles
// ========================================
// Tipagem TypeScript para a tabela public.profiles

export type UserRole = 'super_admin' | 'candidate' | 'staff';

export interface Profile {
    id: string; // UUID do auth.users
    email: string | null;
    full_name: string | null;
    role: UserRole;
    campaign_id: string | null; // UUID da campanha vinculada
    terms_accepted_at: string | null; // ISO timestamp
    avatar_url: string | null;
    created_at: string; // ISO timestamp
    updated_at: string; // ISO timestamp
}

export interface ProfileUpdate {
    full_name?: string;
    avatar_url?: string;
    terms_accepted_at?: string;
}

export interface TermsAcceptancePayload {
    accepted: boolean;
    timestamp: string; // ISO timestamp
}
