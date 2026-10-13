const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');
const lines = html.split('\n');
let funcIndex = lines.findIndex(l => l.includes('id="price-page-info"'));
console.log(lines.slice(funcIndex - 5, funcIndex + 10).join('\n'));
