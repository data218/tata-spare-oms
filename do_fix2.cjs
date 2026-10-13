const fs = require('fs');

function doFix(filename) {
    let code = fs.readFileSync(filename, 'utf8');
    const start = code.indexOf('window.parseTataDate = function(dateStr) {');
    const endStr = 'return new Date(dateStr);\r\n};';
    const endStrAlt = 'return new Date(dateStr);\n};';
    let end = code.indexOf(endStr, start);
    let shift = endStr.length;
    if (end === -1) {
        end = code.indexOf(endStrAlt, start);
        shift = endStrAlt.length;
    }
    
    if (start !== -1 && end !== -1) {
        const before = code.substring(0, start);
        const after = code.substring(end + shift);
        const newFunc = `window.parseTataDate = function(dateStr) {
  if (!dateStr) return null;
  if (typeof dateStr === 'number') return new Date(Math.round((dateStr - 25569) * 86400 * 1000));
  if (typeof dateStr !== 'string') return new Date(dateStr);
  if (dateStr.match(/^\\d{4}-\\d{2}-\\d{2}/)) return new Date(dateStr);
  
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
    if (m > 12 && d <= 12) { 
      return new Date(y, d - 1, m);
    }
    return new Date(y, m - 1, d);
  }
  return new Date(dateStr);
};`;
        fs.writeFileSync(filename, before + newFunc + after);
    }
}

doFix('main.js');
doFix('main_debug.js');
