-- ==============================================================================
-- TEST SCRIPT: PII VAULT VERIFICATION
-- ==============================================================================

-- 1. SET MASTER KEY (Simulating ENV)
SET app.settings.master_key = 'super-secret-enterprise-key-888';

DO $$
DECLARE
    test_user_id UUID := 'c933ffc9-722a-41f6-8d00-12adac7461e3';
    v_decrypted_cpf TEXT;
BEGIN
    -- Ensure user exists in auth.users or mock it
    -- For test purposes, we assume auth.users doesn't have FK constraint during this block 
    -- or we use a valid ID.
    
    RAISE NOTICE '--- Testing PII Vault ---';
    
    -- 2. INSERT (Encrypted)
    PERFORM public.upsert_user_pii(
        test_user_id,
        '123.456.789-00',
        '(11) 98888-8888'
    );
    
    RAISE NOTICE 'Data inserted in Vault.';

    -- 3. VERIFY BINARY STORAGE (DIRECT READ)
    -- This should show unreadable binary data
    SELECT encode(encrypted_cpf, 'hex') INTO v_decrypted_cpf FROM public.user_pii_vault WHERE user_id = test_user_id;
    RAISE NOTICE 'Raw Encrypted CPF (Hex): %', v_decrypted_cpf;

    -- 4. VERIFY DECRYPTION (VIA FUNCTION)
    SELECT cpf INTO v_decrypted_cpf FROM public.get_user_pii(test_user_id);
    RAISE NOTICE 'Decrypted CPF: %', v_decrypted_cpf;

    IF v_decrypted_cpf = '123.456.789-00' THEN
        RAISE NOTICE '✅ VAULT TEST PASSED.';
    ELSE
        RAISE NOTICE '❌ VAULT TEST FAILED: Decryption mismatch.';
    END IF;

END $$;
