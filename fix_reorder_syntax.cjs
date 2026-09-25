const fs = require('fs');
let js = fs.readFileSync('reorder.js', 'utf8');
js = js.replace(/\\\`/g, '`');
js = js.replace(/\\\$\{/g, '${');
fs.writeFileSync('reorder.js', js, 'utf8');
console.log('Fixed syntax in reorder.js');
