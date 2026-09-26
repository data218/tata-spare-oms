const fs = require('fs');
let s = fs.readFileSync('movement_entry.js', 'utf8');

// The duplicate string we want to fix:
s = s.replace("const btnSubmitBulk = document.getElementById('btn-submit-bulk-inout');\\n  const btnSubmitBulk = document.getElementById('btn-submit-bulk-inout');", "const btnSubmitBulk = document.getElementById('btn-submit-bulk-inout');");

// Or just remove all lines matching btnSubmitBulk and add it once
const lines = s.split('\\n');
const newLines = [];
let foundBtnSubmitBulk = false;
for (const line of lines) {
  if (line.includes("const btnSubmitBulk = document.getElementById('btn-submit-bulk-inout');")) {
    if (!foundBtnSubmitBulk) {
      newLines.push(line);
      foundBtnSubmitBulk = true;
    }
  } else {
    newLines.push(line);
  }
}

fs.writeFileSync('movement_entry.js', newLines.join('\\n'));
