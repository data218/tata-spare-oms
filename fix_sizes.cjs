const fs = require('fs');

let movement = fs.readFileSync('movement.js', 'utf8');
if (!movement.includes('markFilterHeaders(); }, 500);')) {
  movement = movement.replace(
    /window\.initMovementModule = async function\(\) \{([\s\S]*?)filterMovementData\(\);\s*\};/,
    "window.initMovementModule = async function() {$1filterMovementData();\n  setTimeout(() => { if(typeof markFilterHeaders === 'function') markFilterHeaders(); }, 500);\n};"
  );
}
// Clean up any rogue setTimeouts outside the function if they exist
movement = movement.replace(/\n\s*setTimeout\(\(\) => \{ if\(typeof markFilterHeaders === 'function'\) markFilterHeaders\(\); \}, 500\);/g, '');
movement = movement.replace(/padding:\s*8px\s*4px/g, 'padding: 4px 4px');
fs.writeFileSync('movement.js', movement);

let dash = fs.readFileSync('dashboard.html', 'utf8');
dash = dash.replace(/padding:\s*8px\s*4px/g, 'padding: 4px 4px');
fs.writeFileSync('dashboard.html', dash);

let style = fs.readFileSync('style.css', 'utf8');
style = style.replace(/\.widget-card \{\s*display: flex;\s*align-items: center;\s*padding: 10px 14px;/g, 
  '.widget-card {\n  display: flex;\n  align-items: center;\n  padding: 6px 10px;');
style = style.replace(/\.widget-value \{\s*font-size: 1\.5rem;/g, '.widget-value {\n  font-size: 1.1rem;');
style = style.replace(/\.widget-label \{\s*font-size: 0\.85rem;/g, '.widget-label {\n  font-size: 0.75rem;');
fs.writeFileSync('style.css', style);

console.log("Sizes and movement.js filters fixed.");
