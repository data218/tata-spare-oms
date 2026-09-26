const fs = require('fs');
let s = fs.readFileSync('main.js', 'utf8');

s = s.replace(/if \(locationFilter\) countQuery = countQuery\.eq\('division', locationFilter\);/, '');
s = s.replace(/if \(locationFilter\) query = query\.eq\('division', locationFilter\);/, '');

fs.writeFileSync('main.js', s);
console.log('main.js patched');
