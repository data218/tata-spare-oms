const fs = require('fs');
let content = fs.readFileSync('dashboard.html', 'utf8');
const lines = content.split('\n');
lines.forEach((line) => {
  if (line.includes('placeholder="Search') || line.includes('placeholder="Global Search')) console.log(line.trim());
});
