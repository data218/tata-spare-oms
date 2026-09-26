
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://crreoeautoqzcgtlwlsd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycmVvZWF1dG9xemNndGx3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzU1OTAsImV4cCI6MjA5NDA1MTU5MH0.AvHLX1piSZMGwb1qjgJ1xuBtL_F-nToQo4ClHmsHNG8');

async function fetchTableData(tableName, locationFilter = null, columns = '*') {
  let countQuery = supabase.from(tableName).select('id', { count: 'exact', head: true });
  if (locationFilter) { countQuery = countQuery.eq('location', locationFilter); }
  const { data: countData, error: countError, count } = await countQuery;
  console.log('Count error for', tableName, ':', countError);
  console.log('Count for', tableName, ':', count);
}

async function run() {
  await fetchTableData('tata_price_list');
  await fetchTableData('tata_spare_inventory');
}
run();

