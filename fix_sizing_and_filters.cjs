const fs = require('fs');

let reorder = fs.readFileSync('reorder.js', 'utf8');

// The replacement was failing due to syntax error in the script.
// Let's use simple string replacements instead of complex escaping.

// Just find the modal id assignment if it's missing
if (!reorder.includes("modal.id = 'reorder-reason-modal';")) {
  reorder = reorder.replace(
    "const modal = document.createElement('div');",
    "const modal = document.createElement('div');\n  modal.id = 'reorder-reason-modal';"
  );
  // Replace the button close logic entirely.
  // We look for: <button onclick="this.closest('div[style*=\\'position:fixed\\']').remove()"
  reorder = reorder.replace(
    /<button onclick="this\.closest\('div\[style\*=\\'position:fixed\\'\]'\)\.remove\(\)"/g,
    '<button onclick="document.getElementById(\\'reorder-reason-modal\\').remove()"'
  );
}

// Add markFilterHeaders to initReorderModule
if (!reorder.includes('markFilterHeaders')) {
  reorder = reorder.replace(
    /window\.initReorderModule = function\(\) \{([\s\S]*?)filterReorderData\(\);\s*\};/,
    "window.initReorderModule = function() {$1filterReorderData();\n  setTimeout(() => { if(typeof markFilterHeaders === 'function') markFilterHeaders(); }, 500);\n};"
  );
}
// Reduce table padding more in reorder.js
reorder = reorder.replace(/padding:\s*8px\s*4px/g, 'padding: 4px 4px');
fs.writeFileSync('reorder.js', reorder);

let movement = fs.readFileSync('movement.js', 'utf8');
if (movement.includes("};\n  setTimeout(() => { if(typeof markFilterHeaders === 'function') markFilterHeaders(); }, 500);")) {
  movement = movement.replace(
    /window\.initMovementModule = async function\(\) \{([\s\S]*?)filterMovementData\(\);\s*\};\s*setTimeout\(\(\) => \{ if\(typeof markFilterHeaders === 'function'\) markFilterHeaders\(\); \}, 500\);/,
    "window.initMovementModule = async function() {$1filterMovementData();\n  setTimeout(() => { if(typeof markFilterHeaders === 'function') markFilterHeaders(); }, 500);\n};"
  );
} else if (!movement.includes('markFilterHeaders')) {
  movement = movement.replace(
    /window\.initMovementModule = async function\(\) \{([\s\S]*?)filterMovementData\(\);\s*\};/,
    "window.initMovementModule = async function() {$1filterMovementData();\n  setTimeout(() => { if(typeof markFilterHeaders === 'function') markFilterHeaders(); }, 500);\n};"
  );
}
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

console.log("Fixes applied successfully.");
