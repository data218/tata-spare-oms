const fs = require('fs');
let css = fs.readFileSync('style.css', 'utf8');

if (!css.includes('.mgmt-kpi-card')) {
  css += `
/* Management Dashboard Styles */
.mgmt-kpi-card {
  transition: all 0.2s ease-in-out;
}
.mgmt-kpi-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 12px rgba(0,0,0,0.1) !important;
}
`;
  fs.writeFileSync('style.css', css);
  console.log("Added Management Dashboard CSS");
} else {
  console.log("Management Dashboard CSS already exists");
}
