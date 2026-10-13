const fs = require('fs');

function fix(filename) {
  let code = fs.readFileSync(filename, 'utf8');

  const regex = /window\.parseTataDate = function\(dateStr\) \{[\s\S]*?return new Date\(dateStr\);\n\};/;

  const newFunc = `window.parseTataDate = function(dateStr) {
  if (!dateStr) return null;
  if (typeof dateStr === 'number') return new Date(Math.round((dateStr - 25569) * 86400 * 1000));
  if (typeof dateStr !== 'string') return new Date(dateStr);
  if (dateStr.match(/^\\d{4}-\\d{2}-\\d{2}/)) return new Date(dateStr);
  
  // Excel numeric date as string (e.g., "46024.0001")
  if (/^\\d{5}(\\.\\d+)?$/.test(dateStr.trim())) {
      return new Date(Math.round((Number(dateStr.trim()) - 25569) * 86400 * 1000));
  }
  
  const datePart = dateStr.split(' ')[0];
  const parts = datePart.split(/[-/]/);
  if (parts.length === 3) {
    let d = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10);
    let y = parseInt(parts[2], 10);
    if (y < 100) y += 2000;
    if (m > 12 && d <= 12) { // It's actually MM/DD/YYYY
      return new Date(y, d - 1, m);
    }
    return new Date(y, m - 1, d);
  }
  return new Date(dateStr);
};`;

  code = code.replace(regex, newFunc);
  fs.writeFileSync(filename, code);
}

fix('main.js');
fix('main_debug.js');
