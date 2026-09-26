const fs = require('fs');
let s = fs.readFileSync('main.js', 'utf8');

// Use regex to catch the literal backslash-n
s = s.replace(/\\n\\s*await supabase\\.from\\('tata_movement_logs'\\)\\.delete\\(\\)\\.eq\\('location', locationInput\\);\\n/g, "\\n          await supabase.from('tata_movement_logs').delete().eq('location', locationInput);\\n");

fs.writeFileSync('main.js', s);
