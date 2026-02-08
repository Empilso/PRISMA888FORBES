-- ==============================================================================
-- ENTERPRISE AUDIT LOGS IMPLEMENTATION
-- ==============================================================================
-- Objective: Traceability of all critical changes (WHO, WHEN, WHAT, WHERE).
-- ==============================================================================

-- 1. Create Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID, -- Can be NULL if record ID is not UUID (but here mostly are)
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB, -- Previous state
    new_data JSONB, -- New state
    changed_by UUID REFERENCES auth.users(id), -- Nullable if system action
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Metadata basics
    ip_address TEXT,
    user_agent TEXT
);

-- 2. Security: Append-Only (Admin Read, System Write)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only Admins/Super Admins can VIEW logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
FOR SELECT
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role')::text IN ('admin', 'super_admin')
);

-- Policy: No one can UPDATE or DELETE logs (Immutability)
-- We strictly do NOT create policies for UPDATE/DELETE.

-- Policy: System can INSERT (via Triggers)
-- Triggers run with security definer usually, or we allow insert for authenticated users 
-- but only via the trigger mechanism. 
-- However, standard RLS blocks INSERT if no policy exists.
-- We need a policy to allow the trigger (executing as the user) to insert.
CREATE POLICY "System triggers can insert audit logs" ON public.audit_logs
FOR INSERT
WITH CHECK (true); -- Allow all authenticated users to trigger an insert via the database function

-- 3. Generic Audit Trigger Function
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
    user_id UUID;
    old_val JSONB;
    new_val JSONB;
    op_type TEXT;
    rec_id UUID;
BEGIN
    -- Get Current User ID from Supabase Auth
    user_id := auth.uid();
    op_type := TG_OP;

    -- Determine Data & Record ID based on Operation
    IF (op_type = 'DELETE') THEN
        old_val := to_jsonb(OLD);
        new_val := NULL;
        rec_id := OLD.id;
    ELSIF (op_type = 'UPDATE') THEN
        old_val := to_jsonb(OLD);
        new_val := to_jsonb(NEW);
        rec_id := NEW.id;
        
        -- Optimization: precise diff could be calculated here, 
        -- but storing full jsonb allows 'classic' verification.
        -- We can strip passwords if needed.
        old_val := old_val - 'password' - 'encrypted_password';
        new_val := new_val - 'password' - 'encrypted_password';
    ELSIF (op_type = 'INSERT') THEN
        old_val := NULL;
        new_val := to_jsonb(NEW);
        rec_id := NEW.id;
        
        new_val := new_val - 'password' - 'encrypted_password';
    END IF;

    -- Insert Log
    INSERT INTO public.audit_logs (
        table_name,
        record_id,
        operation,
        old_data,
        new_data,
        changed_by
    ) VALUES (
        TG_TABLE_NAME,
        rec_id,
        op_type,
        old_val,
        new_val,
        user_id
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- SECURITY DEFINER forces the function to run with privileges of the creator (likely postgres/admin)
-- bypassing the user's lack of explicit permission if needed, but RLS policy above covers it.

-- 4. Apply Triggers to Critical Tables

-- Profiles (Watch for Role Changes, PII updates)
DROP TRIGGER IF EXISTS audit_profiles_changes ON public.profiles;
CREATE TRIGGER audit_profiles_changes
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- Campaigns (Watch for Creation/Deletion)
DROP TRIGGER IF EXISTS audit_campaigns_changes ON public.campaigns;
CREATE TRIGGER audit_campaigns_changes
AFTER INSERT OR UPDATE OR DELETE ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- Tasks (Watch for Status Changes - Accountability)
-- Check if table exists first (it was mentioned in prompts)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
        DROP TRIGGER IF EXISTS audit_tasks_changes ON public.tasks;
        CREATE TRIGGER audit_tasks_changes
        AFTER INSERT OR UPDATE OR DELETE ON public.tasks
        FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
    END IF;
END $$;

