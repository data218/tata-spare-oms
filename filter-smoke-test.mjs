// Smoke test for the column-filter dropdown.
// Extracts only the filter machinery from main.js and runs it in jsdom,
// then simulates clicking each header of the In/Out table.
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';

const src = readFileSync('main.js', 'utf8');
const lines = src.split(/\r?\n/);

// Slice from the line matching `start` to the first following line that is
// exactly `end` (column 0). Lets us lift whole declarations out of main.js.
function slice(start, end) {
  const i = lines.findIndex((l) => l.includes(start));
  if (i === -1) throw new Error(`start marker not found: ${start}`);
  for (let j = i; j < lines.length; j++) {
    if (lines[j] === end) return lines.slice(i, j + 1).join('\n');
  }
  throw new Error(`end marker not found after ${start}`);
}

const pieces = [
  slice('const MAX_FILTER_VALUES = 300;', ''),                       // const decl
  slice('const tableFilterConfigs = {', '};'),
  slice('function getPriceMapCache()', '}'),
  slice('function getFieldValue(obj, key, tableId) {', '}'),
  slice('window.getFilterFieldValue = function', '};'),
  slice('function placeFilterDropdown(div, th) {', '}'),
  slice('function trackFilterDropdown(div, th) {', '}'),
  slice('function markFilterHeaders() {', '}'),
  slice("document.addEventListener('click', (e) => {", '});'),
].filter((s) => s.trim() && !s.includes('\n\n\n'));

// getFilterFieldValue / placeFilterDropdown / trackFilterDropdown bodies end
// with a nested `}`, so grab them by brace depth instead.
function sliceByBraces(start) {
  const i = lines.findIndex((l) => l.includes(start));
  if (i === -1) throw new Error(`marker not found: ${start}`);
  let depth = 0, started = false;
  for (let j = i; j < lines.length; j++) {
    for (const ch of lines[j]) {
      if (ch === '{') { depth++; started = true; }
      else if (ch === '}') depth--;
    }
    if (started && depth === 0) return lines.slice(i, j + 1).join('\n');
  }
  throw new Error(`unbalanced braces after ${start}`);
}

const code = [
  'const MAX_FILTER_VALUES = 300;',
  sliceByBraces('const tableFilterConfigs = {'),
  sliceByBraces('function getPriceMapCache()'),
  sliceByBraces('function getFieldValue(obj, key, tableId)'),
  sliceByBraces('window.getFilterFieldValue = function'),
  sliceByBraces('function placeFilterDropdown(div, th)'),
  sliceByBraces('function trackFilterDropdown(div, th)'),
  sliceByBraces('function markFilterHeaders()'),
  sliceByBraces("document.addEventListener('click', (e) => {"),
].join('\n\n');

const html = `<!DOCTYPE html><html><body>
  <select id="location-select"><option value="ALL" selected>All</option></select>
  <table class="control-tower-table">
    <thead style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);">
      <tr>
        <th>Date</th><th>Direction</th><th>Type</th><th>Part No</th>
        <th>Description</th><th>Location</th><th>Qty</th><th>Value</th><th>Reference</th>
      </tr>
    </thead>
    <tbody id="movement-table-body"></tbody>
  </table>
</body></html>`;

const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom;
window.requestAnimationFrame = (cb) => setTimeout(cb, 0);
window.MutationObserver = class { observe() {} disconnect() {} };
window.getComputedStyle = () => ({});
window.lucide = { createIcons: () => {} };
window.alert = () => {};
window.console = console;

const D = (s) => new window.Date(s);
window.movementData = [
  { direction: 'OUT', type: 'ISSUE', partNo: 'P1', description: 'Oil', location: 'NARWAL', qty: 5.5, value: 117603.78525000002, reference: 'INV-1', date: D('2026-09-01') },
  { direction: 'OUT', type: 'ISSUE', partNo: 'P2', description: 'Filter', location: 'KATHUA', qty: 7, value: 900, reference: 'INV-2', date: D('2026-09-02') },
  { direction: 'IN', type: 'RECEIPT', partNo: 'P1', description: 'Oil', location: 'NARWAL', qty: 203.175, value: 2500, reference: 'SYS-REC-001', date: D('2026-06-01') },
];
window.movCurrentType = 'ALL';
window.movSearchQuery = '';
window.movDateFilter = 'all';
window.activeFilters = new window.Map();
window.activeSort = new window.Map();
window.tableFilterData = {};
// stand-in for the real movement.js scope resolver
window.getScopedMovementRows = () => window.movementData;

try {
  window.eval(code);
  window.markFilterHeaders();
} catch (e) {
  console.error('EVAL FAILED:', e.message, '\n', e.stack);
  process.exit(1);
}

const doc = window.document;
const ths = [...doc.querySelectorAll('thead th')];
let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  if (ok) { pass++; console.log(`  PASS  ${name}${detail ? ' -> ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ' -> ' + detail : ''}`); }
};

console.log('Carets added to headers:');
check('caret injected', doc.querySelectorAll('.th-filter-caret').length === 9,
  `${doc.querySelectorAll('.th-filter-caret').length}/9`);

function openDropdown(label) {
  doc.querySelectorAll('.column-filter-dropdown').forEach((d) => d.remove());
  const th = ths.find((t) => t.textContent.trim() === label);
  th.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return doc.querySelector('.column-filter-dropdown');
}

console.log('\nDropdown renders per column:');
for (const label of ['Date', 'Direction', 'Type', 'Part No', 'Location', 'Qty', 'Value', 'Reference']) {
  const dd = openDropdown(label);
  const opts = dd ? dd.querySelectorAll('.col-filter-options input[type=checkbox]') : [];
  check(label.padEnd(10), !!dd && opts.length > 0,
    dd ? `${opts.length} option(s): ${[...opts].map((o) => o.value).join(' | ')}` : 'NO DROPDOWN');
}

console.log('\nValues are display-formatted:');
let dd = openDropdown('Qty');
let vals = dd ? [...dd.querySelectorAll('.col-filter-options input')].map((i) => i.value) : [];
check('Qty grouped', vals.includes('5.5') && vals.includes('203.175'), vals.join(' | '));

dd = openDropdown('Value');
vals = dd ? [...dd.querySelectorAll('.col-filter-options input')].map((i) => i.value) : [];
check('Value rupee-formatted', vals.includes('₹1,17,604') && !vals.some((v) => /0000002/.test(v)), vals.join(' | '));

dd = openDropdown('Date');
vals = dd ? [...dd.querySelectorAll('.col-filter-options input')].map((i) => i.value) : [];
// en-IN renders September as "Sept" - must match the table cell exactly
check('Date human-readable', vals.includes('01 Sept 2026') && !vals.some((v) => v.includes('GMT')), vals.join(' | '));

console.log(`\n  ${pass} passed, ${fail} failed`);

// --- Clear / restore regression guard -------------------------------------
// The original bug: applying a column filter permanently narrowed the base
// dataset, so Clear and page-level filters could never restore the full list.
console.log('\nClear restores the full row set:');
const before = window.movementData.length;
const locTh = ths.find((t) => t.textContent.trim() === 'Location');
const renderedCount = () => window.tableFilterData['movement-table-body'].length;

// apply Location = NARWAL  (with no active filter all boxes start ticked,
// so narrowing means unticking the ones you don't want)
locTh.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
let dd2 = doc.querySelector('.column-filter-dropdown');
const kathuaBox = [...dd2.querySelectorAll('.col-filter-options input')].find((i) => i.value === 'KATHUA');
kathuaBox.checked = false;
// the handler is delegated on 'change', so the event must actually fire
kathuaBox.dispatchEvent(new window.Event('change', { bubbles: true }));
dd2.querySelector('.apply-btn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
check('after narrowing to NARWAL', renderedCount() === 2, `${renderedCount()} of ${before} rows`);

// now Clear it
locTh.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
dd2 = doc.querySelector('.column-filter-dropdown');
dd2.querySelector('.clear-btn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
check('after Clear', renderedCount() === before, `${renderedCount()} of ${before} rows restored`);

// page-level filter must still be able to broaden
window.movDateFilter = 'all';
check('scope still full', window.getScopedMovementRows().length === before,
  `${window.getScopedMovementRows().length} rows in scope`);

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
