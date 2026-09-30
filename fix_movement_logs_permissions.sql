-- Fix: "permission denied for table tata_movement_logs"
--
-- The In/Out page could READ movement logs but every write failed with:
--   Failed to save to database: permission denied for table tata_movement_logs
--
-- Cause: tata_movement_logs was never given table grants or an RLS policy.
-- The sibling tables were, in update_schema.sql (RLS + "Enable all access")
-- and fix_permissions.sql (GRANT ALL to anon, authenticated), so the browser
-- can insert into tata_spare_inventory but not into the movement log.
--
-- Run this once in the Supabase SQL Editor. It is idempotent.

-- 1. Table-level privileges for the anon key the browser ships with
GRANT ALL ON TABLE "tata_movement_logs" TO anon, authenticated;

-- 2. RLS with a permissive policy, matching update_schema.sql.
--    Without this, step 1 alone still fails once RLS is enabled.
ALTER TABLE "tata_movement_logs" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access" ON "tata_movement_logs";
CREATE POLICY "Enable all access" ON "tata_movement_logs"
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. Only needed if the table has a serial/identity column. The current
--    `id` is a uuid, so this is normally a no-op - uncomment if inserts
--    ever fail with "permission denied for sequence".
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Verify afterwards:
--   SELECT relrowsecurity FROM pg_class WHERE relname = 'tata_movement_logs';
--   SELECT policyname, cmd FROM pg_policies WHERE tablename = 'tata_movement_logs';
