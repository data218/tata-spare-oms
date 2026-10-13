const fs = require('fs');
let js = fs.readFileSync('main.js', 'utf8');

js = js.replace(/if \(lowerD\.includes\('jammu'\) \|\| lowerD\.includes\('narwal'\) \|\| lowerD\.includes\('narval'\)\) return 'NARWAL';/g, 
  "if (lowerD.includes('jammu') || lowerD.includes('narwal') || lowerD.includes('narval')) return 'NARWAL';\n      if (lowerD.includes('lambheri')) return 'LAMBHERI';\n      if (lowerD.includes('poonch')) return 'POONCH';");

js = js.replace(/if \(lowerD\.includes\('jammu'\) \|\| lowerD\.includes\('narwal'\) \|\| lowerD\.includes\('narval'\)\) return 'Narwal';/g, 
  "if (lowerD.includes('jammu') || lowerD.includes('narwal') || lowerD.includes('narval')) return 'Narwal';\n        if (lowerD.includes('lambheri')) return 'Lambheri';\n        if (lowerD.includes('poonch')) return 'Poonch';");

js = js.replace(/if \(d\.includes\('smamkathua'\) \|\| d\.includes\('kathua'\)\) return 'Kathua';\r?\n\s*return 'Narwal';/g,
  "if (d.includes('smamkathua') || d.includes('kathua')) return 'Kathua';\n        if (d.includes('lambheri')) return 'Lambheri';\n        if (d.includes('poonch')) return 'Poonch';\n        return 'Narwal';");

fs.writeFileSync('main.js', js);
console.log('Updated mapLocation');
