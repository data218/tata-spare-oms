-- Grant permissions to anon and authenticated roles to fix "permission denied" error
GRANT ALL ON TABLE "tata_price_list" TO anon;
GRANT ALL ON TABLE "tata_price_list" TO authenticated;
GRANT ALL ON TABLE "tata_price_list" TO service_role;
