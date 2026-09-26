const fs = require('fs');
let s = fs.readFileSync('movement_entry.js', 'utf8');

// Replace all literal \n strings with real newlines globally
s = s.replace(/\\n/g, '\n');

fs.writeFileSync('movement_entry.js', s);
