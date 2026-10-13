import { supabase } from './src/server-config.js';

async function bifurcateNarwal() {
  try {
    const { data: invData, error: invError } = await supabase
      .from('tata_spare_inventory')
      .select('part_no, qty, availability, division')
      .ilike('division', '%NARWAL%');

    if (invError) throw invError;
    
    let onHand = 0;
    let inTransit = 0;
    let reserved = 0;
    let other = 0;
    
    for (let row of invData) {
      const avail = String(row.availability || '').toLowerCase();
      const q = Number(row.qty) || 0;
      
      if (avail.includes('on hand') || avail.includes('onhand')) {
        onHand += q;
      } else if (avail.includes('transit')) {
        inTransit += q;
      } else if (avail.includes('reserv')) {
        reserved += q;
      } else {
        onHand += q; // Fallback to on hand, just like main.js logic
        other += q;
      }
    }
    
    console.log(`NARWAL Inventory Bifurcation:`);
    console.log(`On Hand: ${onHand} (Includes ${other} unmarked/other)`);
    console.log(`In Transit: ${inTransit}`);
    console.log(`Reserved: ${reserved}`);
    console.log(`Total: ${onHand + inTransit + reserved}`);

  } catch (err) {
    console.error('Error:', err);
  }
}

bifurcateNarwal();
