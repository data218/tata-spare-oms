
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
async function run() {
  const { data } = await supabase.from('tata_spare_inventory').select('last_receipt, part_no').not('last_receipt', 'is', null).limit(10000);
  for (let row of data) {
    if (row.last_receipt && row.last_receipt.includes('/12/2026')) {
      console.log('Dec:', row);
    }
    if (row.last_receipt && row.last_receipt.includes('/11/2026')) {
      console.log('Nov:', row);
    }
  }
}
run();

