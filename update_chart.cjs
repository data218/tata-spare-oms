const fs = require('fs');
let code = fs.readFileSync('main.js', 'utf8');

const regex = /const now = new Date\(\);\s+const currentMonthPrefix = now\.getFullYear\(\) \+ '-' \+ String\(now\.getMonth\(\) \+ 1\)\.padStart\(2, '0'\);\s+if \(window\.consTrendCurrentMonth === undefined\) window\.consTrendCurrentMonth = true;\s+const isCurrentMonthOnly = window\.consTrendCurrentMonth === true;\s+const sortedDays = isCurrentMonthOnly\s+\? Object\.keys\(dayQty\)\.filter\(d => d\.startsWith\(currentMonthPrefix\)\)\.sort\(\)\s+: Object\.keys\(dayQty\)\.sort\(\);\s+const trendLabels = sortedDays;\s+const trendData = sortedDays\.map\(d => Number\(dayQty\[d\]\) \|\| 0\);/;

const replacement = `    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthNum = now.getMonth() + 1;
    const currentMonthPrefix = currentYear + '-' + String(currentMonthNum).padStart(2, '0');
    
    if (window.consTrendCurrentMonth === undefined) window.consTrendCurrentMonth = true;
    const isCurrentMonthOnly = window.consTrendCurrentMonth === true;
    
    let trendLabels = [];
    let trendData = [];
    
    if (isCurrentMonthOnly) {
      const today = now.getDate();
      for (let i = 1; i <= today; i++) {
        const dStr = currentMonthPrefix + '-' + String(i).padStart(2, '0');
        trendLabels.push(dStr);
        trendData.push(Number(dayQty[dStr]) || 0);
      }
    } else {
      trendLabels = Object.keys(dayQty).sort();
      trendData = trendLabels.map(d => Number(dayQty[d]) || 0);
    }`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('main.js', code);
    console.log('Successfully replaced chart logic');
} else {
    console.log('Regex did not match');
}
