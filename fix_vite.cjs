const fs = require('fs');

let html = fs.readFileSync('dashboard.html', 'utf8');
html = html.replace('<script src="/movement.js"></script>', '<script type="module" src="/movement.js"></script>');
fs.writeFileSync('dashboard.html', html, 'utf8');
console.log('Fixed movement.js script tag');
