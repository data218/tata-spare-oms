const fs = require('fs');

function fix(filename) {
    let code = fs.readFileSync(filename, 'utf8');

    // Add window.isLubePart at the top near window.parseTataDate
    if (!code.includes('window.isLubePart = function')) {
        const insertPoint = code.indexOf('window.parseTataDate = function');
        if (insertPoint !== -1) {
            const lubeFunc = `window.isLubePart = function(category, description) {
  const cat = (category || '').toUpperCase();
  if (['LUBRICANT', 'LUBRICANTS', 'LUBE', 'LUBES', 'OIL'].includes(cat)) return true;
  const desc = (description || '').toUpperCase();
  if (desc.includes('15W40') || desc.includes('MOBIL') || desc.includes('LUBE') || desc.includes('OIL') || desc.includes('GREASE') || desc.includes('DEF ')) return true;
  return false;
};\n\n`;
            code = code.slice(0, insertPoint) + lubeFunc + code.slice(insertPoint);
        }
    }

    // Replace the conditions
    const oldCondition = `if (['LUBRICANT', 'LUBRICANTS', 'LUBE', 'LUBES', 'OIL'].includes((p.productCategory || '').toUpperCase())) {`;
    const newCondition = `if (window.isLubePart(p.productCategory, p.description || p.part_desc)) {`;
    
    code = code.split(oldCondition).join(newCondition);
    
    fs.writeFileSync(filename, code);
}

fix('main.js');
fix('main_debug.js');
