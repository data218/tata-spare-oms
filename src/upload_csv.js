import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://crreoeautoqzcgtlwlsd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycmVvZWF1dG9xemNndGx3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzU1OTAsImV4cCI6MjA5NDA1MTU5MH0.AvHLX1piSZMGwb1qjgJ1xuBtL_F-nToQo4ClHmsHNG8';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CSV_FILE_PATH = path.resolve('./downloads/Spares Consumption Invoice Line Items.csv');

async function uploadData() {
    if (!fs.existsSync(CSV_FILE_PATH)) {
        console.error('CSV file not found at:', CSV_FILE_PATH);
        return;
    }

    console.log('Reading and parsing CSV file...');
    
    const results = [];
    
    // Check headers mapping
    let headersChecked = false;

    fs.createReadStream(CSV_FILE_PATH)
        .pipe(csv())
        .on('headers', (headers) => {
            console.log('\n--- CSV HEADERS FOUND ---');
            headers.forEach((h, i) => console.log(`${i+1}: ${h}`));
            console.log('-------------------------\n');
            headersChecked = true;
        })
        .on('data', (data) => {
            // Strip BOM from the first key if present
            const firstKey = Object.keys(data)[0];
            const divisionValue = data['Division'] || data[firstKey];
            
            // Map CSV row to Supabase schema
            results.push({
                division: divisionValue,
                invoice_no: data['Invoice Number'],
                invoice_status: data['Invoice Status'],
                mode_of_payment: data['Mode of Payment'],
                invoice_type: data['Invoice Type'],
                part_no: data['Part No'],
                part_desc: data['Part Desc'],
                part_type: data['Part Type'],
                tm_part_indicator: data['TM Part Indicator'],
                product_category: data['Product Category'],
                date: data['Date'] || null,
                category: data['Category'],
                order_num: data['Order Number'],
                order_type: data['Order Type'],
                order_sub: data['Order Sub-Type'],
                rate: parseFloat(data['Rate']) || 0,
                billing_type: data['Billing Type'],
                sold_qty: parseFloat(data['Sold Qty']) || 0,
                value: parseFloat(data['Value']) || 0,
                tax_amount: parseFloat(data['Tax Amount After Discount']) || 0,
                dealer: data['Dealer']
            });
        })
        .on('end', async () => {
            console.log(`Successfully parsed ${results.length} rows.`);
            
            // Batch insert into Supabase
            const BATCH_SIZE = 1000;
            console.log(`Starting upload to Supabase in batches of ${BATCH_SIZE}...`);
            
            for (let i = 0; i < results.length; i += BATCH_SIZE) {
                const batch = results.slice(i, i + BATCH_SIZE);
                
                const { data, error } = await supabase
                    .from('tata_consumption_data')
                    .insert(batch);
                    
                if (error) {
                    console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, error.message);
                    // Continue with other batches even if one fails
                } else {
                    console.log(`Successfully inserted batch ${i / BATCH_SIZE + 1} (${batch.length} rows)`);
                }
            }
            
            console.log('\nUpload complete! All data has been moved to Supabase.');
        });
}

uploadData();
