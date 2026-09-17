-- Run these in the Supabase SQL Editor to rename existing tables
ALTER TABLE IF EXISTS "bot_settings" RENAME TO "tata_bot_settings";
ALTER TABLE IF EXISTS "consumption_data" RENAME TO "tata_consumption_data";

-- (Note: tata_spare_inventory is already named with the prefix)

-- Create the new tata_price_list table
CREATE TABLE IF NOT EXISTS "tata_price_list" (
    "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "s_no" TEXT,
    "part_number" TEXT UNIQUE NOT NULL,
    "description" TEXT,
    "uom" TEXT,
    "pf_code" TEXT,
    "ndp" NUMERIC,
    "lp" NUMERIC,
    "dealer_discount" NUMERIC,
    "mrp" NUMERIC,
    "hsn_code" TEXT,
    "gst_rates" TEXT,
    "category" TEXT,
    "orderability_status" TEXT,
    "valid_from" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
