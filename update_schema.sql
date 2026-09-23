-- Drop and recreate tata_spare_inventory to match new columns
DROP TABLE IF EXISTS "tata_spare_inventory";

CREATE TABLE "tata_spare_inventory" (
    "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "division" TEXT,
    "part_no" TEXT,
    "description" TEXT,
    "qty" NUMERIC,
    "total_price" NUMERIC,
    "last_issue" TEXT,
    "last_receipt" TEXT,
    "availability" TEXT,
    "status" TEXT,
    "product_category" TEXT,
    "dealer_name" TEXT,
    "hsn" TEXT,
    "location_3" TEXT,
    "location_2" TEXT,
    "location_1" TEXT,
    "min" NUMERIC,
    "max" NUMERIC,
    "inventory_indicator" TEXT,
    "xyz_class" TEXT,
    "abc_class" TEXT,
    "vendor" TEXT,
    "weighted_average" TEXT,
    "safety_stock" TEXT,
    "tm_part_indicator" TEXT,
    "product_line" TEXT,
    "fetched_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Drop and recreate tata_consumption_data to ensure date and other text fields don't cause errors
DROP TABLE IF EXISTS "tata_consumption_data";

CREATE TABLE "tata_consumption_data" (
    "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "division" TEXT,
    "invoice_no" TEXT,
    "invoice_status" TEXT,
    "mode_of_payment" TEXT,
    "invoice_type" TEXT,
    "part_no" TEXT,
    "part_desc" TEXT,
    "part_type" TEXT,
    "tm_part_indicator" TEXT,
    "product_category" TEXT,
    "date" TEXT,
    "category" TEXT,
    "order_num" TEXT,
    "order_type" TEXT,
    "order_sub" TEXT,
    "rate" NUMERIC,
    "billing_type" TEXT,
    "sold_qty" NUMERIC,
    "value" NUMERIC,
    "tax_amount" NUMERIC,
    "dealer" TEXT,
    "fetched_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Make sure we fix permissions for both
ALTER TABLE "tata_spare_inventory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tata_consumption_data" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access" ON "tata_spare_inventory";
CREATE POLICY "Enable all access" ON "tata_spare_inventory" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access" ON "tata_consumption_data";
CREATE POLICY "Enable all access" ON "tata_consumption_data" FOR ALL USING (true) WITH CHECK (true);
