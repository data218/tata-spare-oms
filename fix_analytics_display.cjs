const fs = require('fs');

let dash = fs.readFileSync('dashboard.html', 'utf8');

// The Analytics Section starts around here:
const analyticsStart = dash.indexOf('<!-- Analytics Section -->');
if (analyticsStart !== -1) {
  let before = dash.substring(0, analyticsStart);
  let after = dash.substring(analyticsStart);
  
  // Fix grid-template-columns
  after = after.replace(/grid-template-columns:\s*55%\s*44%;/g, 'grid-template-columns: 1fr 1fr;');
  
  // Fix widget-card display issue (it was defaulting to flex row)
  after = after.replace(/class="widget-card"\s+style="padding:\s*0;"/g, 'class="widget-card" style="padding: 0; display: block;"');
  
  dash = before + after;
}

fs.writeFileSync('dashboard.html', dash);
console.log("Fixed display: block for analytics cards!");
