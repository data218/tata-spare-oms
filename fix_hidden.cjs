const fs = require('fs');
let content = fs.readFileSync('dashboard.html', 'utf8');
content = content.replace(
    '<div id="view-price-list" class="view-section hidden fade-in">', 
    '<div id="view-price-list" class="view-section fade-in" style="display: none;">'
);
fs.writeFileSync('dashboard.html', content);
