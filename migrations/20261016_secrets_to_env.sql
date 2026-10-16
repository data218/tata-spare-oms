-- Move scraper credentials out of the anon-readable tables.
--
-- Context: the browser ships the public anon key, so any password stored in a
-- table the anon role can SELECT is effectively public. The scrapers now read
-- their credentials from environment variables first:
--   * consumption scraper -> TATA_BI_USERNAME / TATA_BI_PASSWORD
--   * inventory scraper   -> TATA_LOCATIONS_JSON
-- The database columns are only a legacy fallback for installs that have not
-- migrated yet.

-- 1. Allow a location to exist without a stored password (credential now lives
--    in TATA_LOCATIONS_JSON). Run this first so the dashboard can keep adding
--    location names once the password field is gone from the form.
ALTER TABLE "tata_locations" ALTER COLUMN "password" DROP NOT NULL;

-- 2. Run the blocks below ONLY AFTER the bot machine has TATA_BI_USERNAME,
--    TATA_BI_PASSWORD and TATA_LOCATIONS_JSON set in its `.env` (restart the
--    worker afterwards). They permanently remove the stored secrets so they can
--    no longer be read with the public anon key.
--
-- DELETE FROM "tata_bot_settings"
--   WHERE key IN ('master_password', 'tata_bi_password');
--
-- UPDATE "tata_locations"
--   SET "password" = ''
--   WHERE "password" IS NOT NULL;
--
-- -- Optional, once nothing reads the columns anymore:
-- ALTER TABLE "tata_locations" DROP COLUMN "password";

-- 3. Verify no plaintext secrets remain:
-- SELECT key FROM "tata_bot_settings" WHERE value = 'Amsmam@2027';
-- SELECT location_name FROM "tata_locations" WHERE password <> '';
