const fs = require('fs');
let html = fs.readFileSync('main.js', 'utf8');
const lines = html.split('\n');
let pIndex = lines.findIndex(l => l.includes('price-prev-btn'));
if (pIndex !== -1) {
  console.log(lines.slice(pIndex - 2, pIndex + 10).join('\n'));
} else {
  console.log('No price-prev-btn listener found in main.js');
}
