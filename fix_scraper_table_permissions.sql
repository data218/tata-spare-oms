-- Fix: "permission denied for table tata_consumption_data" / "tata_spare_inventory"
--
-- The scrapers download the CSV successfully but every database write fails:
--   Failed to clear old consumption rows: permission denied for table tata_consumption_data
--
-- Cause: the serverless scrapers run with the anon key (no SUPABASE_SERVICE_ROLE_KEY
-- is configured in Vercel), and these two tables were never granted table privileges
-- or given an RLS policy. The scrapers replace rows wholesale - DELETE then INSERT -
-- so they need full access. This matches the treatment already given to
-- tata_movement_logs in fix_movement_logs_permissions.sql.
--
-- Run this once in the Supabase SQL Editor. It is idempotent.

-- 1. Table-level privileges for the anon key the lambda ships with
GRANT ALL ON TABLE "tata_consumption_data" TO anon, authenticated;
GRANT ALL ON TABLE "tata_spare_inventory"  TO anon, authenticated;

-- 2. RLS with a permissive policy, matching update_schema.sql.
--    Without this, step 1 alone still fails once RLS is enabled.
ALTER TABLE "tata_consumption_data" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tata_spare_inventory"  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access" ON "tata_consumption_data";
CREATE POLICY "Enable all access" ON "tata_consumption_data"
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access" ON "tata_spare_inventory";
CREATE POLICY "Enable all access" ON "tata_spare_inventory"
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. Needed only if the tables have a serial/identity column to draw a default from.
--    Uncomment if inserts fail with "permission denied for sequence".
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Verify afterwards:
--   SELECT tablename, relrowsecurity FROM pg_class c
--     JOIN pg_namespace n ON n.oid = c.relnamespace
--     WHERE relname IN ('tata_consumption_data','tata_spare_inventory');
--   SELECT tablename, policyname, cmd FROM pg_policies
--     WHERE tablename IN ('tata_consumption_data','tata_spare_inventory');
