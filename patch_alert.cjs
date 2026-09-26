const fs = require('fs');
let s = fs.readFileSync('main.js', 'utf8');

s = s.replace(
  "alert('Database connection failed. Please check your internet or Supabase configuration.');",
  "alert('Database connection failed: ' + (err.message || err.toString() || JSON.stringify(err)));"
);

fs.writeFileSync('main.js', s);
console.log('main.js patched with error alert.');
