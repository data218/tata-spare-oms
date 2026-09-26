const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const supabaseCode = fs.readFileSync('supabase.js', 'utf8');
const urlMatch = supabaseCode.match(/supabaseUrl\s*=\s*['"`](.*?)['"`]/);
const keyMatch = supabaseCode.match(/supabaseKey\s*=\s*['"`](.*?)['"`]/);
const supabase = createClient(urlMatch[1], keyMatch[1]);

async function run() {
  const { data: inv } = await supabase.from('tata_spare_inventory').select('*').eq('part_no', '288954409901');
  const { data: cons } = await supabase.from('tata_consumption_data').select('*').eq('part_no', '288954409901');
  const { data: price } = await supabase.from('tata_price_list').select('*').eq('part_number', '288954409901');
  const { data: mov } = await supabase.from('tata_movement_logs').select('*').eq('part_id', '288954409901');

  // Load the processRawData from main_debug.js
  let code = fs.readFileSync('main_debug.js', 'utf8');
  
  // mock mapLocation
  const mapLocation = (dealerName) => {
    if (!dealerName) return 'Narwal';
    const d = dealerName.toLowerCase();
    if (d.includes('channirama') || d.includes('chhanirama')) return 'Channi Rama';
    if (d.includes('smamsamba') || d.includes('supwal')) return 'Supwal';
    if (d.includes('smamkathua') || d.includes('kathua')) return 'Kathua';
    if (d.includes('jammu') || d.includes('narwal') || d.includes('narval')) return 'Narwal';
    return 'Narwal';
  };

  const startProc = code.indexOf('function processRawData');
  const endProc = code.indexOf('return Array.from(grouped.values());', startProc) + 36;
  const procFn = code.substring(startProc, endProc) + '\n}';
  
  eval(procFn); // defines processRawData
  
  const result = processRawData({
    inventory: inv,
    consumption: cons || [],
    priceList: price || [],
    movementLogs: mov
  });
  
  console.log('Result for part:', result.find(r => r.partId === '288954409901'));
}

run();
