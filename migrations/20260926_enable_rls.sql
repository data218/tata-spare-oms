-- Re-enable Row Level Security on all tata_* tables and define explicit policies.
--
-- WHY: disable_rls.sql turned RLS off for tata_price_list, and fix_permissions.sql
-- granted ALL to anon. With RLS disabled, the public anon key (which ships in the
-- browser bundle) could read/modify every row. This migration puts RLS back on and
-- makes the access surface explicit.
--
-- BEFORE RUNNING: set the Vercel env var SUPABASE_SERVICE_ROLE_KEY. Service-role
-- bypasses RLS, so the scrapers and the upload endpoints keep working unchanged.

-- 1. Turn RLS back on everywhere ---------------------------------------------
ALTER TABLE "tata_price_list"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tata_spare_inventory"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tata_consumption_data" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tata_movement_logs"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tata_locations"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tata_bot_settings"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tata_part_claim_data"  ENABLE ROW LEVEL SECURITY;

-- 2. Drop the blanket grants -----------------------------------------------
-- Policies below are what actually gate access; these grants only matter for
-- tables that end up with RLS disabled again later.
REVOKE ALL ON TABLE "tata_price_list"       FROM anon, authenticated;
REVOKE ALL ON TABLE "tata_spare_inventory"  FROM anon, authenticated;
REVOKE ALL ON TABLE "tata_consumption_data" FROM anon, authenticated;
REVOKE ALL ON TABLE "tata_movement_logs"    FROM anon, authenticated;
REVOKE ALL ON TABLE "tata_locations"        FROM anon, authenticated;
REVOKE ALL ON TABLE "tata_bot_settings"     FROM anon, authenticated;
REVOKE ALL ON TABLE "tata_part_claim_data"  FROM anon, authenticated;

-- 3. Grant only what the browser actually needs ----------------------------
-- The dashboard reads inventory/consumption/price list directly with the anon key.
GRANT SELECT ON TABLE "tata_price_list"       TO anon, authenticated;
GRANT SELECT ON TABLE "tata_spare_inventory"  TO anon, authenticated;
GRANT SELECT ON TABLE "tata_consumption_data" TO anon, authenticated;
GRANT SELECT ON TABLE "tata_part_claim_data"  TO anon, authenticated;

-- Writes (price list upload, CSV imports, movement entry, location admin) are
-- meant to go through the service-role server. Uncomment these blocks ONLY if
-- you are not moving those writes server-side yet - they keep the current
-- behaviour of the browser talking directly to the database.
--
-- GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "tata_spare_inventory"  TO anon, authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "tata_consumption_data" TO anon, authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "tata_movement_logs"    TO anon, authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "tata_locations"        TO anon, authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "tata_bot_settings"     TO anon, authenticated;

-- 4. Policies: anon + authenticated get full access, matching today's behaviour.
-- Replace these with role-scoped policies once real auth is in place.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'tata_price_list', 'tata_spare_inventory', 'tata_consumption_data',
    'tata_movement_logs', 'tata_locations', 'tata_bot_settings',
    'tata_part_claim_data'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_anon_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)',
      t || '_anon_all', t
    );
  END LOOP;
END $$;

-- 5. Sanity check ------------------------------------------------------------
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename LIKE 'tata_%'
ORDER BY tablename;
