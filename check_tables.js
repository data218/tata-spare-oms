const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://crreoeautoqzcgtlwlsd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycmVvZWF1dG9xemNndGx3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzU1OTAsImV4cCI6MjA5NDA1MTU5MH0.AvHLX1piSZMGwb1qjgJ1xuBtL_F-nToQo4ClHmsHNG8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    // We cannot run DDL directly from supabase-js unless we have a custom RPC.
    // Let's check if we can insert into tata_consumption_data.
    const { error } = await supabase.from('tata_consumption_data').select('*').limit(1);
    console.log("tata_consumption_data select error:", error);
    
    const { error: invErr } = await supabase.from('tata_spare_inventory').select('*').limit(1);
    console.log("tata_spare_inventory select error:", invErr);
}

run();
