-- Create bot_settings table to store credentials
CREATE TABLE bot_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default credentials
INSERT INTO bot_settings (key, value) VALUES ('tata_bi_username', 'JS_3008420');
INSERT INTO bot_settings (key, value) VALUES ('tata_bi_password', 'Amsmam@2027');

-- Set up Row Level Security (allow anon read/write for now since this is a local/demo app)
ALTER TABLE bot_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read access" ON bot_settings FOR SELECT USING (true);
CREATE POLICY "Allow anon update access" ON bot_settings FOR UPDATE USING (true);
CREATE POLICY "Allow anon insert access" ON bot_settings FOR INSERT WITH CHECK (true);
