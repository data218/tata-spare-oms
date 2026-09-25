const fs = require('fs');

let dash = fs.readFileSync('dashboard.html', 'utf8');

// For movement table
let movementRegex = /<!-- MOVEMENT VIEW -->[\s\S]*?id="movement-table-body"/;
let match = dash.match(movementRegex);
if (match) {
  let section = match[0];
  section = section.replace(/padding:\s*12px\s*16px/g, 'padding: 8px 4px; font-size: 0.75rem');
  dash = dash.replace(match[0], section);
  fs.writeFileSync('dashboard.html', dash);
  console.log('dashboard.html updated for movement');
}
