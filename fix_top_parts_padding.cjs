const fs = require('fs');

let movement = fs.readFileSync('movement.js', 'utf8');

// The HTML for renderTopParts starts at line 359:
// <td style="padding: 10px 16px;">
// We need to replace all `padding: 10px 16px;` in movement.js with `padding: 2px 4px;`
// AND we can reduce font size to 0.7rem for these tds as well.
movement = movement.replace(/padding:\s*10px\s*16px;/g, 'padding: 2px 4px; font-size: 0.7rem;');

// Also let's check if the first cell (Part details) has explicit font-weight: 600. It does.
// Let's make sure it doesn't take too much vertical space by setting line-height
movement = movement.replace(/<div style="font-weight: 600;">/g, '<div style="font-weight: 600; line-height: 1.1;">');
movement = movement.replace(/<div style="font-size: 0\.65rem;/g, '<div style="font-size: 0.65rem; line-height: 1.1;');

fs.writeFileSync('movement.js', movement);
console.log("Top parts padding fixed!");
