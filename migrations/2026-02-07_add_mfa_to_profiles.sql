-- ==============================================================================
-- MFA (Multi-Factor Authentication) Support
-- ==============================================================================
-- Objective: Add mfa_enabled flag to public.profiles and ensure RLS compatibility.
-- ==============================================================================

-- 1. Add mfa_enabled to profiles
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='mfa_enabled') THEN 
        ALTER TABLE public.profiles ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

COMMENT ON COLUMN public.profiles.mfa_enabled IS 'Indica se o usuário possui MFA ativo (TOTP)';

-- 2. Trigger to sync MFA status (Advanced)
-- This function will update mfa_enabled in public.profiles whenever a factor is added in auth.mfa_factors
-- Note: auth.mfa_factors is an internal Supabase table.
-- For simplicity, we can also update it via the application, but a trigger is more robust.

CREATE OR REPLACE FUNCTION public.handle_mfa_update()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.profiles SET mfa_enabled = TRUE WHERE id = NEW.user_id;
  ELSIF (TG_OP = 'DELETE') THEN
    -- Check if there are other factors left
    IF NOT EXISTS (SELECT 1 FROM auth.mfa_factors WHERE user_id = OLD.user_id AND status = 'verified') THEN
        UPDATE public.profiles SET mfa_enabled = FALSE WHERE id = OLD.user_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to auth.mfa_factors (requires superuser or bypass)
-- In standard Supabase, we might not have direct trigger access to auth schema easily via migrations if restricted.
-- However, we can use the app-level flag for now if trigger fails.

-- We'll try to apply it, but wrap in a block.
DO $$
BEGIN
    DROP TRIGGER IF EXISTS on_mfa_factor_change ON auth.mfa_factors;
    CREATE TRIGGER on_mfa_factor_change
    AFTER INSERT OR DELETE ON auth.mfa_factors
    FOR EACH ROW EXECUTE FUNCTION public.handle_mfa_update();
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not apply trigger to auth.mfa_factors. Handled via application logic.';
END $$;
