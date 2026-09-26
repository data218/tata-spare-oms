const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const supabaseCode = fs.readFileSync('supabase.js', 'utf8');
const urlMatch = supabaseCode.match(/supabaseUrl\s*=\s*['"`](.*?)['"`]/);
const keyMatch = supabaseCode.match(/supabaseKey\s*=\s*['"`](.*?)['"`]/);
const supabase = createClient(urlMatch[1], keyMatch[1]);

async function run() {
  const { data: inv } = await supabase.from('tata_spare_inventory').select('*').eq('part_no', '288954409901');
  const { data: mov } = await supabase.from('tata_movement_logs').select('*').eq('part_id', '288954409901');

  let code = fs.readFileSync('main.js', 'utf8');
  
  const startProc = code.indexOf('function processRawData');
  const endProc = code.indexOf('return Array.from(grouped.values());', startProc) + 36;
  let procFn = code.substring(startProc, endProc) + '\n}';
  
  eval(procFn); 
  
  const result = processRawData({
    inventory: inv,
    consumption: [],
    priceList: [],
    movementLogs: mov
  });
  
  console.log('Result for part (Channi Rama):', result.find(r => r.partId === '288954409901' && r.location === 'Channi Rama'));
  console.log('Result for part (Narwal):', result.find(r => r.partId === '288954409901' && r.location === 'Narwal'));
}
run();
