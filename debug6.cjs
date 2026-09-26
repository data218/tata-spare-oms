const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const supabaseCode = fs.readFileSync('supabase.js', 'utf8');
const urlMatch = supabaseCode.match(/supabaseUrl\s*=\s*['"`](.*?)['"`]/);
const keyMatch = supabaseCode.match(/supabaseKey\s*=\s*['"`](.*?)['"`]/);
const supabase = createClient(urlMatch[1], keyMatch[1]);

async function run() {
  const { data: mov } = await supabase.from('tata_movement_logs').select('*').eq('part_id', '288954409901');

  let code = fs.readFileSync('main.js', 'utf8');
  
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
  let procFn = code.substring(startProc, endProc) + '\n}';
  
  procFn = procFn.replace('movementLogs.forEach(log => {', 'movementLogs.forEach(log => { console.log("log.location:", log.location, "mapped:", mapLocation(log.location), "key:", log.part_id + "_" + mapLocation(log.location));');
  
  eval(procFn); 
  
  const result = processRawData({
    inventory: [],
    consumption: [],
    priceList: [],
    movementLogs: mov
  });
  
}
run();
