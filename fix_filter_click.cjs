const fs = require('fs');

let mainJs = fs.readFileSync('main.js', 'utf8');

// Replace the strict check
mainJs = mainJs.replace(
  /if \(!table \|\| !table\.classList\.contains\('control-tower-table'\)\) return;/g,
  'if (!table) return;'
);

fs.writeFileSync('main.js', mainJs);
console.log("Fixed filter click listener!");
