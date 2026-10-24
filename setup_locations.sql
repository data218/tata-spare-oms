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

-- New dashboard setup writes worker-sealed-v1 encrypted credentials here only
-- after a worker-authorized Tata connection test. The private key stays on the
-- worker PC. Never insert plaintext passwords from the browser into this table;
-- it is readable with the public anon key. Environment credentials remain supported.
-- INSERT INTO "tata_locations" ("location_name", "username", "password")
-- VALUES ('NARWAL', '', '');

-- Add last_sync to bot_settings if it doesn't exist
INSERT INTO "tata_bot_settings" ("key", "value") 
VALUES ('last_sync', 'Never') 
ON CONFLICT ("key") DO NOTHING;
