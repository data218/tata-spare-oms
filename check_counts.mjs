import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://crreoeautoqzcgtlwlsd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycmVvZWF1dG9xemNndGx3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzU1OTAsImV4cCI6MjA5NDA1MTU5MH0.AvHLX1piSZMGwb1qjgJ1xuBtL_F-nToQo4ClHmsHNG8';
const supabase = createClient(supabaseUrl, supabaseKey);
async function run() {
    const { data, error } = await supabase.from('inventory_items').select('Location_Name');
    const counts = {};
    if (data) {
        for (let row of data) {
            counts[row.Location_Name] = (counts[row.Location_Name] || 0) + 1;
        }
    }
    console.log("Counts:", counts);
    console.log("Error:", error);
}
run();
