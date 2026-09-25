const fs = require('fs');

let dash = fs.readFileSync('dashboard.html', 'utf8');

const analyticsStart = dash.indexOf('<!-- Analytics Section -->');
const nextViewStart = dash.indexOf('<!-- SETTINGS VIEW -->');

if (analyticsStart !== -1 && nextViewStart !== -1) {
  // We need to carefully extract the analytics section. It's inside `<div class="dashboard-content">` -> `<div id="view-movement" class="view-section">`
  // The analytics section div starts at `analyticsStart` and ends just before `</div>\n        </div>\n\n        <!-- SETTINGS VIEW -->`
  let analyticsStr = dash.substring(analyticsStart, dash.lastIndexOf('</div>', nextViewStart - 10)); // just getting the section

  // Wait, let's just find the exact div.
  // The structure is: 
  // <!-- Analytics Section -->
  // <div style="display: grid; ...">
  // ...
  // </div>
  // </div> (end of dashboard content)
  // </div> (end of view-movement)
  
  // It's safer to use simple string replacement.
  
  // Let's grab everything from <!-- Analytics Section --> up to the closing tags before <!-- SETTINGS VIEW -->
  const textBeforeSettings = dash.substring(0, nextViewStart);
  let divCloses = textBeforeSettings.lastIndexOf('</div>');
  divCloses = textBeforeSettings.lastIndexOf('</div>', divCloses - 1);
  // It's just before these two div closes.
  
  let extractedAnalytics = dash.substring(analyticsStart, divCloses);
  
  // Now remove it from original position
  dash = dash.substring(0, analyticsStart) + dash.substring(divCloses);
  
  // Reduce paddings
  extractedAnalytics = extractedAnalytics.replace(/padding:\s*10px\s*16px/g, 'padding: 4px 6px');
  extractedAnalytics = extractedAnalytics.replace(/padding:\s*12px\s*16px/g, 'padding: 4px 6px');
  extractedAnalytics = extractedAnalytics.replace(/padding:\s*16px/g, 'padding: 8px 12px');
  
  // Find where to insert it: ABOVE `<div class="table-container"` in `view-movement`
  const viewMovementStart = dash.indexOf('id="view-movement"');
  const tableContainerStart = dash.indexOf('<div class="table-container"', viewMovementStart);
  
  dash = dash.substring(0, tableContainerStart) + extractedAnalytics + '\n            ' + dash.substring(tableContainerStart);
  fs.writeFileSync('dashboard.html', dash);
  console.log("Analytics Section moved successfully!");
} else {
  console.log("Could not find boundaries.");
}
