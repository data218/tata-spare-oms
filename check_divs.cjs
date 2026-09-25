const fs = require('fs');
const content = fs.readFileSync('dashboard.html', 'utf8');

const lines = content.split('\n');
let depth = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const openMatches = line.match(/<div\b[^>]*>/g) || [];
  const closeMatches = line.match(/<\/div>/g) || [];
  
  if (line.includes('id="view-')) {
    console.log(`\nView starts at line ${i+1}: ${line.trim()} (Depth: ${depth})`);
  }
  
  depth += openMatches.length;
  depth -= closeMatches.length;
}

console.log(`\nFinal depth: ${depth}`);
