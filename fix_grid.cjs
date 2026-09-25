const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');

// The Executive KPI Strip
html = html.replace('grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))', 'grid-template-columns: repeat(auto-fit, minmax(180px, 1fr))');

// The 2-column sections (Position & Risk, Reorder & Location, Ageing & Critical)
html = html.replace(/grid-template-columns: repeat\(auto-fit, minmax\(400px, 1fr\)\)/g, 'grid-template-columns: repeat(auto-fit, minmax(320px, 1fr))');

// The 4-column sections (Demand, Fulfillment, Procurement, Receiving)
html = html.replace(/grid-template-columns: repeat\(auto-fit, minmax\(200px, 1fr\)\)/g, 'grid-template-columns: repeat(auto-fit, minmax(150px, 1fr))');

fs.writeFileSync('dashboard.html', html);
console.log('Fixed grid sizes in dashboard.html');
