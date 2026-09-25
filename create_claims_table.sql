-- Create the table
CREATE TABLE tata_part_claim_data (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    dealer_name TEXT,
    submitted_by TEXT,
    designation TEXT,
    invoice_number TEXT,
    part_number TEXT,
    part_description TEXT,
    quantity INTEGER,
    amount NUMERIC,
    type_of_issue TEXT,
    other_issue_details TEXT,
    detailed_description TEXT,
    part_received_date DATE,
    claim_request_date DATE,
    claim_number TEXT,
    requested_action TEXT,
    remarks TEXT,
    additional_comments TEXT
);

-- Set up Row Level Security (RLS)
ALTER TABLE tata_part_claim_data ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (for development/dashboard purposes)
-- You can restrict this later if needed
CREATE POLICY "Allow all operations on tata_part_claim_data" ON tata_part_claim_data
    FOR ALL
    USING (true)
    WITH CHECK (true);
