import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://crreoeautoqzcgtlwlsd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycmVvZWF1dG9xemNndGx3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzU1OTAsImV4cCI6MjA5NDA1MTU5MH0.AvHLX1piSZMGwb1qjgJ1xuBtL_F-nToQo4ClHmsHNG8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    let allData = [];
    let start = 0;
    while (true) {
        const { data, error } = await supabase.from('tata_spare_inventory').select('product_category').range(start, start + 9999);
        if (error) { console.error(error); break; }
        if (!data || data.length === 0) break;
        allData = allData.concat(data);
        start += 10000;
    }
    
    const cats = {};
    for (let row of allData) {
        const c = String(row.product_category || '').trim().toUpperCase();
        cats[c] = (cats[c] || 0) + 1;
    }
    console.log("Inventory Categories:", cats);

    const { data: priceData } = await supabase.from('tata_price_list').select('category').limit(5000);
    const pcats = {};
    for (let row of priceData) {
        const c = String(row.category || '').trim().toUpperCase();
        pcats[c] = (pcats[c] || 0) + 1;
    }
    console.log("Price List Categories:", pcats);
}

run();
