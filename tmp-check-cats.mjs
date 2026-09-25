import { createClient } from '@supabase/supabase-js';

const url = 'https://crreoeautoqzcgtlwlsd.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycmVvZWF1dG9xemNndGx3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzU1OTAsImV4cCI6MjA5NDA1MTU5MH0.AvHLX1piSZMGwb1qjgJ1xuBtL_F-nToQo4ClHmsHNG8';
const supabase = createClient(url, key);

// distinct product_category in inventory
{
  const { data, error } = await supabase.from('tata_spare_inventory').select('product_category');
  if (error) console.log('inv cat error', error.message);
  else {
    const counts = {};
    for (const r of data) { const c = r.product_category || 'NULL'; counts[c] = (counts[c] || 0) + 1; }
    console.log('--- tata_spare_inventory product_category counts ---');
    console.log(counts);
  }
}

// distinct availability
{
  const { data, error } = await supabase.from('tata_spare_inventory').select('availability');
  if (error) console.log('avail error', error.message);
  else {
    const counts = {};
    for (const r of data) { const c = r.availability || 'NULL'; counts[c] = (counts[c] || 0) + 1; }
    console.log('--- availability counts ---');
    console.log(counts);
  }
}

// lubricant-like descriptions in inventory
{
  const { data, error } = await supabase.from('tata_spare_inventory')
    .select('division, part_no, description, qty, product_category')
    .or('description.ilike.%LUBRICANT%,description.ilike.%OIL%,description.ilike.%GREASE%')
    .limit(20);
  if (error) console.log('lube inv error', error.message);
  else {
    console.log('--- lube-ish inventory rows ---', data.length);
    for (const r of data) console.log(r.division, r.part_no, (r.description||'').slice(0,50), r.qty, '|', r.product_category);
  }
}

// distinct price list category
{
  const { data, error } = await supabase.from('tata_price_list').select('category');
  if (error) console.log('price cat error', error.message);
  else {
    const counts = {};
    for (const r of data) { const c = r.category || 'NULL'; counts[c] = (counts[c] || 0) + 1; }
    console.log('--- tata_price_list category counts ---');
    console.log(counts);
  }
}