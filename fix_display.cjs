const fs = require('fs');
let mainJs = fs.readFileSync('main.js', 'utf8');

mainJs = mainJs.replace("view.style.display = 'block'; // Or flex depending on view, block works for most", "view.style.display = 'flex';");

fs.writeFileSync('main.js', mainJs, 'utf8');
console.log('Fixed main.js display to flex');
