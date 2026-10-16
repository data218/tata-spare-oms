-- Create bot_settings table to store runtime settings (NOT credentials).
CREATE TABLE bot_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credentials are NOT inserted here. Set them as environment variables on the
-- bot machine instead:
--   * Tata BI (consumption) -> TATA_BI_USERNAME / TATA_BI_PASSWORD
--   * Siebel (inventory)    -> TATA_LOCATIONS_JSON
-- Storing them in this table would expose them to anyone holding the public
-- anon key.

-- Set up Row Level Security (allow anon read/write for now since this is a local/demo app)
ALTER TABLE bot_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read access" ON bot_settings FOR SELECT USING (true);
CREATE POLICY "Allow anon update access" ON bot_settings FOR UPDATE USING (true);
CREATE POLICY "Allow anon insert access" ON bot_settings FOR INSERT WITH CHECK (true);
