import { createClient } from '@supabase/supabase-js';

const url = 'https://crreoeautoqzcgtlwlsd.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycmVvZWF1dG9xemNndGx3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzU1OTAsImV4cCI6MjA5NDA1MTU5MH0.AvHLX1piSZMGwb1qjgJ1xuBtL_F-nToQo4ClHmsHNG8';
const supabase = createClient(url, key);

async function count(table, filter = null) {
  let q = supabase.from(table).select('*', { count: 'exact', head: true });
  if (filter) q = q.eq(filter.col, filter.val);
  const r = await q;
  return { count: r.count, error: r.error ? r.error.message : null };
}

const inv = await count('tata_spare_inventory');
console.log('tata_spare_inventory', inv);
const cons = await count('tata_consumption_data');
console.log('tata_consumption_data', cons);
const price = await count('tata_price_list');
console.log('tata_price_list', price);

const pl = await supabase.from('tata_price_list').select('*').limit(3);
console.log('--- tata_price_list sample ---');
for (const r of pl.data || []) console.log(JSON.stringify(r).slice(0, 300), r.error ? r.error.message : '');
if (pl.error) console.log('price list error', pl.error.message);

const latest = await supabase.from('tata_price_list').select('*').order('updated_at', { ascending: false }).limit(2);
console.log('--- price list latest by updated_at ---');
for (const r of latest.data || []) console.log(JSON.stringify(r).slice(0, 300));

const invSample = await supabase.from('tata_spare_inventory').select('*').limit(2);
console.log('--- inventory sample ---');
for (const r of invSample.data || []) console.log(JSON.stringify(r).slice(0, 400));

const consSample = await supabase.from('tata_consumption_data').select('*').limit(2);
console.log('--- consumption sample ---');
for (const r of consSample.data || []) console.log(JSON.stringify(r).slice(0, 400));