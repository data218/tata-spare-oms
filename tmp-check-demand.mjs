import { createClient } from '@supabase/supabase-js';

const url = 'https://crreoeautoqzcgtlwlsd.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycmVvZWF1dG9xemNndGx3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzU1OTAsImV4cCI6MjA5NDA1MTU5MH0.AvHLX1piSZMGwb1qjgJ1xuBtL_F-nToQo4ClHmsHNG8';
const supabase = createClient(url, key);

// Distinct sold_qty distribution in consumption
const { data, error } = await supabase.from('tata_consumption_data').select('sold_qty');
if (error) console.log('ERR', error.message);
else {
  const dist = {};
  for (const r of data) {
    const s = Math.min(Number(r.sold_qty) || 0, 20);
    dist[s] = (dist[s] || 0) + 1;
  }
  console.log('--- sold_qty distribution (cap 20+) ---');
  console.log(Object.entries(dist).sort((a,b)=>a[0]-b[0]));
}

// check how many inventory parts have consumption demand>0
const inv = await supabase.from('tata_spare_inventory').select('part_no').limit(1000);
const parts = [...new Set((inv.data||[]).map(r=>r.part_no))];
console.log('sample inventory parts:', parts.length);
const cons = await supabase.from('tata_consumption_data').select('part_no, sold_qty');
const consByPart = new Map();
for (const r of cons.data||[]) {
  const pn = r.part_no;
  consByPart.set(pn, (consByPart.get(pn)||0) + (Number(r.sold_qty)||0));
}
const withCons = parts.filter(p => consByPart.has(p));
console.log('inventory parts WITH consumption:', withCons.length, '/', parts.length);