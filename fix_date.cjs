const fs = require('fs');

let code = fs.readFileSync('main.js', 'utf8');

// Fix dayQty
code = code.replace(
  /const day = \(r\.date \|\| ''\)\.slice\(0, 10\);\s*if \(day\) dayQty\[day\] = \(dayQty\[day\] \|\| 0\) \+ val;/g,
  `let day = '';
      if (r.date) {
        const d = window.parseTataDate(r.date);
        if (d && !isNaN(d.getTime())) {
          day = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        }
      }
      if (day) dayQty[day] = (dayQty[day] || 0) + val;`
);

// Fix monthAgg
code = code.replace(
  /const d = new Date\(dStr\);\s*if \(!isNaN\(d\)\) \{/g,
  `const d = window.parseTataDate(dStr);
      if (d && !isNaN(d.getTime())) {`
);

// Format total consumed
code = code.replace(
  /if \(tEl\) tEl\.textContent = totalConsumed;/g, 
  "if (tEl) tEl.textContent = totalConsumed.toLocaleString('en-IN');"
);

fs.writeFileSync('main.js', code);

// Same for main_debug.js
let code2 = fs.readFileSync('main_debug.js', 'utf8');

// Fix dayQty
code2 = code2.replace(
  /const day = \(r\.date \|\| ''\)\.slice\(0, 10\);\s*if \(day\) dayQty\[day\] = \(dayQty\[day\] \|\| 0\) \+ val;/g,
  `let day = '';
      if (r.date) {
        const d = window.parseTataDate(r.date);
        if (d && !isNaN(d.getTime())) {
          day = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        }
      }
      if (day) dayQty[day] = (dayQty[day] || 0) + val;`
);

// Fix monthAgg
code2 = code2.replace(
  /const d = new Date\(dStr\);\s*if \(!isNaN\(d\)\) \{/g,
  `const d = window.parseTataDate(dStr);
      if (d && !isNaN(d.getTime())) {`
);

// Format total consumed
code2 = code2.replace(
  /if \(tEl\) tEl\.textContent = totalConsumed;/g, 
  "if (tEl) tEl.textContent = totalConsumed.toLocaleString('en-IN');"
);

fs.writeFileSync('main_debug.js', code2);