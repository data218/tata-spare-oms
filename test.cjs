const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('dashboard.html', 'utf8');
const script = fs.readFileSync('main.js', 'utf8');

const dom = new JSDOM(html, { runScripts: "outside-only", url: "http://localhost:5173" });
const window = dom.window;
global.window = window;
global.document = window.document;
global.navigator = window.navigator;
global.localStorage = window.localStorage;
global.sessionStorage = window.sessionStorage;
window.lucide = { createIcons: () => {} };

// Mock import statements by removing them
let modifiedScript = script.replace(/import .*? from .*?;/g, '');

try {
  window.eval(modifiedScript);
  console.log("Script evaluated successfully! No top-level errors.");
} catch (e) {
  console.error("Top-level error caught:");
  console.error(e);
}
