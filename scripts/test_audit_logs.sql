-- ==============================================================================
-- TEST SCRIPT: AUDIT LOGS VERIFICATION
-- ==============================================================================
-- Run this in SQL Editor to verify the triggers are working.
-- ==============================================================================

DO $$
DECLARE
    test_profile_id UUID := '00000000-0000-0000-0000-000000000000'; -- Mock ID or use a real one
    log_count_before INT;
    log_count_after INT;
    test_campaign_id UUID;
BEGIN
    -- 1. Setup Mock User (if needed, usually we test with current auth.uid())
    -- Assuming we are running as a user who can edit profiles (self)
    
    -- Count Logs Before
    SELECT count(*) INTO log_count_before FROM public.audit_logs;
    RAISE NOTICE 'Logs Count Before: %', log_count_before;

    -- 2. TEST INSERT (Campaigns)
    INSERT INTO public.campaigns (name, candidate_name, slug, role, city) 
    VALUES ('Campanha Teste Audit', 'Candidato Teste', 'campanha-teste-audit', 'prefeito', 'Test City')
    RETURNING id INTO test_campaign_id;
    
    -- 3. TEST UPDATE (Campaigns)
    UPDATE public.campaigns 
    SET name = 'Campanha Teste Audit (Updated)' 
    WHERE id = test_campaign_id;
    
    -- 4. TEST DELETE (Campaigns)
    DELETE FROM public.campaigns 
    WHERE id = test_campaign_id;

    -- 5. Measure Logs
    SELECT count(*) INTO log_count_after FROM public.audit_logs;
    RAISE NOTICE 'Logs Count After: %', log_count_after;
    
    IF (log_count_after >= log_count_before + 3) THEN
        RAISE NOTICE '✅ TEST PASSED: 3 Audit Logs created (Insert/Update/Delete).';
    ELSE
        RAISE NOTICE '❌ TEST FAILED: Expected 3 new logs, found %', (log_count_after - log_count_before);
    END IF;

    -- 6. Cleanup (Optional because we deleted the campaign, but logs remain)
    -- Logs are immutable by design, so they stay.
END $$;
