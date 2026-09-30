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
  sliceByBraces('function getConsVelocityMap()'),
  sliceByBraces('function consVelocityTrend(partNo)'),
  sliceByBraces('function getConsNdpLookup()'),
  sliceByBraces('function consNdp(row)'),
  sliceByBraces('function consMonthYear(row)'),
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

  <table class="control-tower-table">
    <thead style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);">
      <tr>
        <th>Rank</th><th>Month/Year</th><th>Part No.</th><th>Description</th>
        <th>Cons. (Qty)</th><th>Value (₹)</th><th>NDP (₹)</th><th>Tax (₹)</th>
        <th>Billing Type</th><th>Order Type</th><th>Mode of Pmt</th><th>Velocity Trend</th>
      </tr>
    </thead>
    <tbody id="cons-table-body"></tbody>
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
window.rawInventoryData = { consumption: [] };
window.renderConsumptionTable = () => {};
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
const movCarets = doc.querySelectorAll('table:nth-of-type(1) .th-filter-caret').length;
check('movement carets injected', movCarets === 9, `${movCarets}/9`);

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

console.log('\n  ' + pass + ' passed, ' + fail + ' failed');

// --- Part Consumption: derived-column filters -----------------------------
// The table is transaction level (no aggregation), so the filter scope is the
// raw consumption rows. Lifetime sold qty drives the velocity bucket:
// >=20 Fast, >=5 Mid, >0 Slow, else '-'.
window.rawInventoryData.priceList = [
  { part_number: 'FAST1', ndp: 900, description: 'Oil' },
  { part_number: 'MID1', ndp: 700, description: 'Filter' },
  { part_number: 'SLOW1', ndp: 250, description: 'Belt' },
  { part_number: 'NOPRICE', ndp: 0, description: 'Ghost Item' },
];
window.rawInventoryData.consumption = [
  { part_no: 'FAST1', sold_qty: 12, part_desc: 'Oil', value: 1000, tax_amount: 180, date: '2026-09-05' },
  { part_no: 'FAST1', sold_qty: 15, part_desc: 'Oil', value: 2000, tax_amount: 360, date: '2026-08-05' },
  { part_no: 'MID1', sold_qty: 6, part_desc: 'Filter', value: 800, tax_amount: 126, date: '2026-09-06' },
  { part_no: 'SLOW1', sold_qty: 2, part_desc: 'Belt', value: 300, tax_amount: 45, date: '2026-07-06' },
  { part_no: 'DEAD1', sold_qty: 0, part_desc: 'Gasket', value: 0, tax_amount: 0, date: '' },
];
const scopeSize = window.rawInventoryData.consumption.length; // 5 transactions

const consThs = [...doc.querySelectorAll('table:nth-of-type(2) thead th')];
const openCons = (label) => {
  doc.querySelectorAll('.column-filter-dropdown').forEach((d) => d.remove());
  const th = consThs.find((t) => t.textContent.trim() === label);
  th.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return doc.querySelector('.column-filter-dropdown');
};
const consOptions = (label) => {
  const dd = openCons(label);
  return dd ? [...dd.querySelectorAll('.col-filter-options input')].map((i) => i.value) : [];
};
// Clear is per-column, so reset every column to make assertions independent.
// This also proves no column's Clear button throws.
const CONS_COLS = ['Month/Year', 'Part No.', 'Description', 'Cons. (Qty)', 'Value (\u20b9)',
  'NDP (\u20b9)', 'Tax (\u20b9)', 'Billing Type', 'Order Type', 'Mode of Pmt', 'Velocity Trend'];
const consResetAll = () => {
  for (const c of CONS_COLS) {
    const dd = openCons(c);
    dd.querySelector('.clear-btn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  }
  return window.tableFilterData['cons-table-body'].length;
};
// tick exactly the given values, untick everything else
const consNarrowTo = (label, keep) => {
  consResetAll();
  const dd = openCons(label);
  [...dd.querySelectorAll('.col-filter-options input')].forEach((b) => {
    const want = keep.includes(b.value);
    if (b.checked !== want) { b.checked = want; b.dispatchEvent(new window.Event('change', { bubbles: true })); }
  });
  dd.querySelector('.apply-btn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return window.tableFilterData['cons-table-body'].length;
};

console.log('\nPart Consumption - header carets:');
check('11 filterable headers (Rank is positional)',
  doc.querySelectorAll('table:nth-of-type(2) .th-filter-caret').length === 11,
  `${consThs.length} headers, ${doc.querySelectorAll('table:nth-of-type(2) .th-filter-caret').length} carets`);
check('Clear on all 11 columns is safe', consResetAll() === scopeSize, `${scopeSize} of ${scopeSize} rows, no errors`);

console.log('\nPart Consumption - Velocity Trend filter (new):');
const velVals = consOptions('Velocity Trend');
check('dropdown opens with 4 buckets', ['Fast', 'Mid', 'Slow', '-'].every((b) => velVals.includes(b)), velVals.join(' | '));
check('Fast narrows to its transactions', consNarrowTo('Velocity Trend', ['Fast']) === 2, '2 of 5 transactions');
check('survives re-render', (() => { window.renderConsumptionTable(); return window.tableFilterData['cons-table-body'].length === 2; })(), '2 rows kept');
check('Mid narrows to 1', consNarrowTo('Velocity Trend', ['Mid']) === 1, '1 of 5');
check('clear restores all', (() => {
  const dd = openCons('Velocity Trend');
  dd.querySelector('.clear-btn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return window.tableFilterData['cons-table-body'].length === scopeSize;
})(), `${scopeSize} of ${scopeSize} restored`);

console.log('\nPart Consumption - previously broken derived columns:');
const ndpVals = consOptions('NDP (\u20b9)');
check('NDP resolves (was "(Blank)")', ndpVals.includes('\u20b9900') && ndpVals.includes('\u20b9700') && ndpVals.includes('\u20b9250'),
  ndpVals.join(' | '));
const ndpNarrowed = consNarrowTo('NDP (\u20b9)', ['\u20b9900']);
check('NDP = \u20b9900 selects the FAST1 rows', ndpNarrowed === 2, ndpNarrowed + ' of 5');
const myVals = consOptions('Month/Year');
check('Month/Year resolves (was "(Blank)")', myVals.includes('Sep 2026') && myVals.includes('Aug 2026') && myVals.includes('-'),
  myVals.join(' | '));
const sepNarrowed = consNarrowTo('Month/Year', ['Sep 2026']);
check('Month/Year = Sep 2026', sepNarrowed === 2, sepNarrowed + ' of 5');
const blankNarrowed = consNarrowTo('Month/Year', ['-']);
check('blank-date row keeps the "-" bucket', blankNarrowed === 1, blankNarrowed + ' of 5');

const qtyVals = consOptions('Cons. (Qty)');
check('Cons. (Qty) matches raw cell text', qtyVals.includes('12') && qtyVals.includes('15') && !qtyVals.includes('1,234.5'),
  qtyVals.join(' | '));

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
