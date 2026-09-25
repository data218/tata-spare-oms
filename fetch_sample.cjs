const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://crreoeautoqzcgtlwlsd.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycmVvZWF1dG9xemNndGx3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzU1OTAsImV4cCI6MjA5NDA1MTU5MH0.AvHLX1piSZMGwb1qjgJ1xuBtL_F-nToQo4ClHmsHNG8'
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: inv } = await supabase.from('tata_spare_inventory').select('*').limit(1);
  const { data: cons } = await supabase.from('tata_consumption_data').select('*').limit(1);
  const { data: claims } = await supabase.from('tata_part_claim_data').select('*').limit(1);
  console.log('Inventory fields:', inv ? Object.keys(inv[0]) : null);
  console.log('Consumption fields:', cons ? Object.keys(cons[0]) : null);
  console.log('Claims fields:', claims ? Object.keys(claims[0]) : null);
  
  if (cons && cons.length) console.log('Sample Cons:', cons[0]);
}

check();
