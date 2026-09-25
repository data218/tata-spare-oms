const fs = require('fs');
const lines = fs.readFileSync('dashboard.html', 'utf8').split('\n');
const idx = lines.findIndex(l => l.includes('id="view-movement"'));
console.log(lines.slice(idx, idx + 40).join('\n'));
