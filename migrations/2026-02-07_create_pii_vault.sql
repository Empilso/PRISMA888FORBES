-- ==============================================================================
-- ENTERPRISE PII VAULT (ENCRYPTION) IMPLEMENTATION
-- ==============================================================================
-- Objective: Secure sensitive data (CPF, Phone) using PGP Symmetric Encryption.
-- ==============================================================================

-- 1. Enable pgcrypto Extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Create PII Vault Table
CREATE TABLE IF NOT EXISTS public.user_pii_vault (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    encrypted_cpf BYTEA,
    encrypted_phone BYTEA,
    cpf_blind_index TEXT, -- HMAC hash for searching without decryption
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Security: RLS (Strict Isolation)
ALTER TABLE public.user_pii_vault ENABLE ROW LEVEL SECURITY;

-- Policy: Only Service Role or Database Functions (Security Definer) can access this table directly.
-- Standard users should NEVER see the BYTEA data.
CREATE POLICY "Vault access restricted" ON public.user_pii_vault
FOR ALL
USING ( (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('super_admin') );

-- 4. Encryption/Decryption Functions
-- We use a Master Key that must be available via current_setting('app.settings.master_key')
-- Set at session level or via Supabase UI secrets.

CREATE OR REPLACE FUNCTION public.upsert_user_pii(
    p_user_id UUID,
    p_cpf TEXT,
    p_phone TEXT
) RETURNS VOID AS $$
DECLARE
    v_master_key TEXT;
    v_blind_index TEXT;
BEGIN
    -- Get Master Key from settings
    v_master_key := current_setting('app.settings.master_key', true);
    IF v_master_key IS NULL OR v_master_key = '' THEN
        RAISE EXCEPTION 'Vault Master Key is not configured (app.settings.master_key)';
    END IF;

    -- Generate Blind Index (HMAC-SHA256) for searchability
    v_blind_index := encode(hmac(p_cpf, v_master_key, 'sha256'), 'hex');

    INSERT INTO public.user_pii_vault (
        user_id,
        encrypted_cpf,
        encrypted_phone,
        cpf_blind_index,
        updated_at
    ) VALUES (
        p_user_id,
        pgp_sym_encrypt(p_cpf, v_master_key),
        pgp_sym_encrypt(p_phone, v_master_key),
        v_blind_index,
        now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        encrypted_cpf = EXCLUDED.encrypted_cpf,
        encrypted_phone = EXCLUDED.encrypted_phone,
        cpf_blind_index = EXCLUDED.cpf_blind_index,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_pii(p_user_id UUID)
RETURNS TABLE (
    cpf TEXT,
    phone TEXT
) AS $$
DECLARE
    v_master_key TEXT;
BEGIN
    -- Authorization check: User can only see their own PII or Super Admin
    IF auth.uid() <> p_user_id AND (auth.jwt() -> 'user_metadata' ->> 'role')::text NOT IN ('super_admin') THEN
        RETURN;
    END IF;

    v_master_key := current_setting('app.settings.master_key', true);
    IF v_master_key IS NULL OR v_master_key = '' THEN
        RAISE EXCEPTION 'Vault Master Key is not configured (app.settings.master_key)';
    END IF;

    RETURN QUERY
    SELECT 
        pgp_sym_decrypt(encrypted_cpf, v_master_key) as cpf,
        pgp_sym_decrypt(encrypted_phone, v_master_key) as phone
    FROM public.user_pii_vault
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Migration Logic (profiles -> vault)
-- We need to call this manually after setting the master_key in the session.
/*
SELECT upsert_user_pii(id, cpf, phone) FROM public.profiles WHERE cpf IS NOT NULL OR phone IS NOT NULL;
*/
