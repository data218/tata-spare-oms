const fs = require('fs');
let mainjs = fs.readFileSync('main.js', 'utf8');

if (!mainjs.includes("import './management_dashboard.js'")) {
  mainjs = "import './management_dashboard.js';\n" + mainjs;
  fs.writeFileSync('main.js', mainjs);
  console.log('Added import to main.js');
}

let html = fs.readFileSync('dashboard.html', 'utf8');
if (html.includes('<script src="management_dashboard.js"></script>')) {
  html = html.replace('<script src="management_dashboard.js"></script>', '');
  fs.writeFileSync('dashboard.html', html);
  console.log('Removed script tag from dashboard.html');
}
