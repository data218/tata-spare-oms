const fs = require('fs');

let mainJs = fs.readFileSync('main.js', 'utf8');

// Replace category check
mainJs = mainJs.replace(
    "if (p.productCategory === 'LUBRICANT') {",
    "if (['LUBRICANT', 'LUBRICANTS', 'LUBE', 'LUBES', 'OIL'].includes(p.productCategory)) {"
);

// Replace text formatting
mainJs = mainJs.replace(
    "if (kpiLube) kpiLube.textContent = stats.lubeQty.toLocaleString('en-IN');",
    "if (kpiLube) kpiLube.textContent = (stats.lubeQty / 1000).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' L';"
);

fs.writeFileSync('main.js', mainJs, 'utf8');
console.log("Updated lube calculations in main.js");
