
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://crreoeautoqzcgtlwlsd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycmVvZWF1dG9xemNndGx3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzU1OTAsImV4cCI6MjA5NDA1MTU5MH0.AvHLX1piSZMGwb1qjgJ1xuBtL_F-nToQo4ClHmsHNG8');
async function run() {
  const { data: countData, error: countError, count } = await supabase.from('tata_spare_inventory').select('id', { count: 'exact', head: true });
  console.log({countData, countError, count});
}
run();

