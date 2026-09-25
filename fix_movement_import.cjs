const fs = require('fs');
let mainjs = fs.readFileSync('main.js', 'utf8');

if (!mainjs.includes("import './movement_entry.js'")) {
  mainjs = "import './movement_entry.js';\n" + mainjs;
  fs.writeFileSync('main.js', mainjs);
  console.log('Added import to main.js');
}

let html = fs.readFileSync('dashboard.html', 'utf8');
if (html.includes('<script src="movement_entry.js"></script>')) {
  html = html.replace('<script src="movement_entry.js"></script>', '');
  fs.writeFileSync('dashboard.html', html);
  console.log('Removed script tag from dashboard.html');
}
