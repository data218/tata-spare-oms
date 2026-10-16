-- Create the table for storing multiple dealership locations
CREATE TABLE IF NOT EXISTS "tata_locations" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "location_name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable Row Level Security so the frontend can read/write without complex policies
ALTER TABLE "tata_locations" DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON TABLE "tata_locations" TO anon;
GRANT ALL ON TABLE "tata_locations" TO authenticated;
GRANT ALL ON TABLE "tata_locations" TO service_role;

-- Example row only. Real Siebel usernames/passwords should be provided to the bot
-- through the TATA_LOCATIONS_JSON environment variable, NOT stored here (this
-- table is readable by anyone with the public anon key).
-- INSERT INTO "tata_locations" ("location_name", "username", "password")
-- VALUES ('NARWAL', '', '');

-- Add last_sync to bot_settings if it doesn't exist
INSERT INTO "tata_bot_settings" ("key", "value") 
VALUES ('last_sync', 'Never') 
ON CONFLICT ("key") DO NOTHING;
