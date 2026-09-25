import { createClient } from '@supabase/supabase-js';

const url = 'https://crreoeautoqzcgtlwlsd.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycmVvZWF1dG9xemNndGx3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzU1OTAsImV4cCI6MjA5NDA1MTU5MH0.AvHLX1piSZMGwb1qjgJ1xuBtL_F-nToQo4ClHmsHNG8';
const supabase = createClient(url, key);

// Check overlap across ALL inventory parts efficiently by fetching distinct part_no
const inv = await supabase.from('tata_spare_inventory').select('part_no, currentStock, division');
const invParts = new Set();
for (const r of inv.data||[]) invParts.add(r.part_no);
console.log('total inventory rows:', inv.data.length, 'distinct part_no:', invParts.size);

const cons = await supabase.from('tata_consumption_data').select('part_no, sold_qty');
const consByPart = new Map();
for (const r of cons.data||[]) {
  consByPart.set(r.part_no, (consByPart.get(r.part_no)||0) + (Number(r.sold_qty)||0));
}
console.log('consumption rows:', cons.data.length, 'distinct part_no:', consByPart.size);

let overlap = 0;
let overlapWithQty = 0;
for (const pn of invParts) {
  if (consByPart.has(pn)) {
    overlap++;
    if ((consByPart.get(pn)||0) > 0) overlapWithQty++;
  }
}
console.log('inventory parts that appear in consumption:', overlap);
console.log('  ...with sold qty > 0:', overlapWithQty);

// sample: top consumed inventory parts
const ranked = [...invParts].filter(pn => consByPart.has(pn))
  .map(pn => ({ pn, sold: consByPart.get(pn) }))
  .sort((a,b)=>b.sold-a.sold).slice(0,5);
console.log('top consumed inventory parts:', ranked);