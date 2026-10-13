const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');
const lines = html.split('\n');
let claimsIndex = lines.findIndex(l => l.includes('id="view-claims"'));
console.log(lines.slice(claimsIndex, claimsIndex + 15).join('\n'));
