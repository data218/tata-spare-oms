const fs = require('fs');

let html = fs.readFileSync('dashboard.html', 'utf8');
if (!html.includes('movement.js')) {
  html = html.replace(
    '<script type="module" src="/tables.js"></script>',
    '<script src="/movement.js"></script>\n  <script type="module" src="/tables.js"></script>'
  );
  fs.writeFileSync('dashboard.html', html, 'utf8');
  console.log("Hooked movement.js in dashboard.html");
}

let mainJs = fs.readFileSync('main.js', 'utf8');
if (!mainJs.includes('initMovementModule()')) {
  // Find a good place to call it, like after filteredProcessedParts is ready.
  // There is a function renderAllViews() usually or similar, or just after inventory and consumption load.
  // Let's hook it inside fetchInventoryData's success callback or global init.
  // Wait, I can just add it inside `renderHealthTable()` or `processInventoryData()`.
  
  mainJs = mainJs.replace(
    'window.filteredProcessedParts = processedParts;',
    'window.filteredProcessedParts = processedParts;\n    if(typeof window.initMovementModule === "function") window.initMovementModule();'
  );
  fs.writeFileSync('main.js', mainJs, 'utf8');
  console.log("Hooked initMovementModule in main.js");
}
