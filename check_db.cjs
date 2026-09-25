const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://crreoeautoqzcgtlwlsd.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycmVvZWF1dG9xemNndGx3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzU1OTAsImV4cCI6MjA5NDA1MTU5MH0.AvHLX1piSZMGwb1qjgJ1xuBtL_F-nToQo4ClHmsHNG8'

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const tables = ['tata_fulfillment', 'tata_orders', 'tata_demand', 'tata_parts_fulfillment', 'tata_requirements'];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (error) {
      console.log(`Table ${t} check error:`, error.message);
    } else {
      console.log(`Table ${t} exists! Data:`, data);
    }
  }
}

check();
