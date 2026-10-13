import { supabase } from './src/server-config.js';

async function checkNarwal() {
  try {
    const { data: invData, error: invError } = await supabase
      .from('tata_spare_inventory')
      .select('part_no, qty, division')
      .ilike('division', '%NARWAL%');

    if (invError) throw invError;
    
    let uniqueParts = new Set();
    let totalStock = 0;
    
    for (let row of invData) {
      if (row.part_no) uniqueParts.add(row.part_no);
      totalStock += (row.qty || 0);
    }
    
    console.log(`NARWAL Inventory Data:`);
    console.log(`Total Rows in DB: ${invData.length}`);
    console.log(`Unique SKUs (Part Nos): ${uniqueParts.size}`);
    console.log(`Available Quantity (Total Stock): ${totalStock}`);

  } catch (err) {
    console.error('Error:', err);
  }
}

checkNarwal();
