const fs = require('fs');

// 1. Move Analytics section above Data Table in dashboard.html and reduce its padding
let dash = fs.readFileSync('dashboard.html', 'utf8');

// Extract Analytics Section
const analyticsStart = dash.indexOf('<!-- Analytics Section -->');
const analyticsEnd = dash.indexOf('<!-- END MOVEMENT VIEW -->');
if (analyticsStart !== -1 && analyticsEnd !== -1) {
  let analyticsSection = dash.substring(analyticsStart, analyticsEnd);
  
  // Find where to insert it (before table-container in Movement View)
  // Let's find `<div class="table-container"` inside `id="view-movement"`
  const viewMovementStart = dash.indexOf('<div id="view-movement"');
  const tableContainerStart = dash.indexOf('<div class="table-container"', viewMovementStart);
  
  if (tableContainerStart !== -1 && tableContainerStart < analyticsStart) {
    // Remove analytics section from current position
    dash = dash.substring(0, analyticsStart) + dash.substring(analyticsEnd);
    
    // Reduce padding in Analytics section
    analyticsSection = analyticsSection.replace(/padding:\s*10px\s*16px/g, 'padding: 4px 6px');
    analyticsSection = analyticsSection.replace(/padding:\s*12px\s*16px/g, 'padding: 4px 6px');
    
    // Insert it above the table-container
    dash = dash.substring(0, tableContainerStart) + analyticsSection + '\n            ' + dash.substring(tableContainerStart);
  }
}
fs.writeFileSync('dashboard.html', dash);

// 2. Add markFilterHeaders to health table and recent activity in main.js
let mainJs = fs.readFileSync('main.js', 'utf8');

// renderHealthTable
if (!mainJs.includes('markFilterHeaders()', mainJs.indexOf('window.renderHealthTable ='))) {
  mainJs = mainJs.replace(
    /window\.renderHealthTable = function\(\) \{([\s\S]*?)tbody\.innerHTML = html;\s*\}/,
    "window.renderHealthTable = function() {$1tbody.innerHTML = html;\n    setTimeout(() => { if(typeof markFilterHeaders === 'function') markFilterHeaders(); }, 500);\n  }"
  );
}

// renderRecentActivity
if (!mainJs.includes('markFilterHeaders()', mainJs.indexOf('function renderRecentActivity()'))) {
  mainJs = mainJs.replace(
    /function renderRecentActivity\(\) \{([\s\S]*?)tbody\.innerHTML = html;\s*\}/,
    "function renderRecentActivity() {$1tbody.innerHTML = html;\n  setTimeout(() => { if(typeof markFilterHeaders === 'function') markFilterHeaders(); }, 500);\n}"
  );
}
// wait, renderRecentActivity doesn't build a single html string, it does `tr.innerHTML = ... tbody.appendChild(tr)`
// Let's just do a simpler replacement for renderRecentActivity
mainJs = mainJs.replace(
  /recentCons\.forEach\(c => \{[\s\S]*?tbody\.appendChild\(tr\);\s*\}\);/,
  "$& \n  setTimeout(() => { if(typeof markFilterHeaders === 'function') markFilterHeaders(); }, 500);"
);

fs.writeFileSync('main.js', mainJs);

console.log('Layout moved and filters patched!');
