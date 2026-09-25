const fs = require('fs');
let mainJs = fs.readFileSync('main.js', 'utf8');

mainJs = mainJs.replace(/if\s*\(view\.id\s*===\s*targetId\)\s*\{\s*view\.style\.display\s*=\s*'flex';\s*\}/g, 
`if (view.id === targetId) {
          view.style.display = 'block'; // Or flex depending on view, block works for most
          if (targetId === 'view-orders' && typeof window.initReorderModule === 'function') window.initReorderModule();
          if (targetId === 'view-movement' && typeof window.initMovementModule === 'function') window.initMovementModule();
        }`);

if (!mainJs.includes("if(typeof window.initReorderModule === 'function') window.initReorderModule();")) {
  mainJs = mainJs.replace(
    "if(typeof window.renderPPNI === 'function') window.renderPPNI();",
    "if(typeof window.renderPPNI === 'function') window.renderPPNI();\n  if(typeof window.initMovementModule === 'function') window.initMovementModule();\n  if(typeof window.initReorderModule === 'function') window.initReorderModule();"
  );
}

fs.writeFileSync('main.js', mainJs, 'utf8');
console.log('Fixed main.js hooks successfully.');
