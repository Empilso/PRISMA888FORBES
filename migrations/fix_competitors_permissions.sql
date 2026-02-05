-- Allow authenticated users to manage competitors
DROP POLICY IF EXISTS "Authenticated Manage Competitors" ON competitors;

CREATE POLICY "Authenticated Manage Competitors" ON competitors
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);
