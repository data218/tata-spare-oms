const fs = require('fs');
let js = fs.readFileSync('movement.js', 'utf8');
js = js.replace(/\\\$\{/g, '${');
fs.writeFileSync('movement.js', js, 'utf8');
console.log('Fixed template literals in movement.js');
