const fs = require('fs');

let dash = fs.readFileSync('dashboard.html', 'utf8');

// The gap is currently 24px, we need to change it.
dash = dash.replace(
  /grid-template-columns:\s*1fr\s+1fr;\s*gap:\s*24px;/g,
  'grid-template-columns: 55% 44%; gap: 1%;'
);

// We need to find the Analytics section headers and make them smaller
// I'll just change the font sizes in the th's of these two tables.
// Let's replace 'font-size: 0.8rem;' with 'font-size: 0.65rem;' inside the Analytics section
const analyticsStart = dash.indexOf('<!-- Analytics Section -->');
if (analyticsStart !== -1) {
  let before = dash.substring(0, analyticsStart);
  let after = dash.substring(analyticsStart);
  
  after = after.replace(/font-size:\s*0\.8rem;/g, 'font-size: 0.65rem;');
  after = after.replace(/padding:\s*4px\s*6px;/g, 'padding: 2px 4px;');
  after = after.replace(/padding:\s*8px\s*12px;/g, 'padding: 4px 6px;');
  
  dash = before + after;
}

fs.writeFileSync('dashboard.html', dash);

let movement = fs.readFileSync('movement.js', 'utf8');

// Replace padding and font size in movement.js for renderLocationMovement
movement = movement.replace(
  /<td style="padding:\s*4px\s*4px;/g,
  '<td style="padding: 2px 4px; font-size: 0.7rem;'
);
// Also reduce the font size of the part number/description in top parts
movement = movement.replace(
  /font-size:\s*0\.8rem;/g,
  'font-size: 0.7rem;'
);
movement = movement.replace(
  /font-size:\s*0\.7rem;/g,
  'font-size: 0.65rem;'
);

fs.writeFileSync('movement.js', movement);
console.log("Analytics tables resized!");
