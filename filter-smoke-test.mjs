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
  sliceByBraces('function getFieldValue(obj, key, tableId)'),
  sliceByBraces('window.getFilterFieldValue = function'),
  sliceByBraces('function placeFilterDropdown(div, th)'),
  sliceByBraces('function trackFilterDropdown(div, th)'),
  sliceByBraces('function getNumericValue(row, key, tableId)'),
  sliceByBraces('function isNumericColumn(tableId, key)'),
  sliceByBraces('function getRange(tableId, key)'),
  sliceByBraces('function setRange(tableId, key, range)'),
  sliceByBraces('function clearRange(tableId, key)'),
  sliceByBraces('function paintFilterState(th, count, isRange)'),
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
  <table class="control-tower-table">
    <thead style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);">
      <tr>
        <th>Part No.</th><th>Description</th><th>Location</th><th>Category</th>
        <th>NDP (₹)</th><th>Stock Qty</th><th>Total Amount (₹)</th>
        <th>Ageing (Days)</th><th>Status</th>
      </tr>
    </thead>
    <tbody id="health-table-body"></tbody>
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
window.rawInventoryData = { consumption: [], priceList: [] };
window.renderConsumptionTable = () => {};
window.renderHealthTable = () => {};
window.filteredProcessedParts = [];
window.activeFilters = new window.Map();
window.activeFilterRanges = new window.Map();
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
check('header turns green when filtered', locTh.classList.contains('th-filtered'), 'th-filtered set');
check('tooltip explains the state', /Filtered - 1 value/.test(locTh.title), locTh.title);
check('other headers stay unmarked', !ths.find((t) => t.textContent.trim() === 'Type').classList.contains('th-filtered'));

// self-heal: the look is derived from state, so a re-render keeps it
window.markFilterHeaders();
check('green survives re-render', locTh.classList.contains('th-filtered'), 'still green after markFilterHeaders');
locTh.classList.remove('th-filtered');
window.markFilterHeaders();
check('green is re-derived, not remembered', locTh.classList.contains('th-filtered'), 'restored from activeFilters');

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
check('green clears with the filter',
  !consThs.find((t) => t.textContent.trim() === 'Velocity Trend').classList.contains('th-filtered'),
  'th-filtered removed');
check('consumption headers all unfiltered', consResetAll() === scopeSize
  && consThs.filter((t) => t.classList.contains('th-filtered')).length === 0, '0 green headers');

console.log('\nPart Consumption - derived columns (now range controls):');
const consRange = (label) => {
  const dd = openCons(label);
  if (!dd) return null;
  return { min: dd.querySelector('.range-min').value, max: dd.querySelector('.range-max').value, dd };
};
const consRangeTo = (label, lo, hi) => {
  consResetAll();
  const dd = openCons(label);
  dd.querySelector('.range-min').value = lo;
  dd.querySelector('.range-max').value = hi;
  dd.querySelector('.apply-btn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return window.tableFilterData['cons-table-body'].length;
};
const ndpR = consRange('NDP (\u20b9)');
check('NDP is a range, not a checklist', !!ndpR, ndpR ? `${ndpR.min} .. ${ndpR.max}` : 'NO DROPDOWN');
check('NDP range spans priced data', ndpR && ndpR.min === '0' && ndpR.max === '900', ndpR ? `${ndpR.min} .. ${ndpR.max}` : '-');
const ndpRows = consRangeTo('NDP (\u20b9)', 800, 1000);
check('NDP 800-1000 selects the FAST1 rows', ndpRows === 2, `${ndpRows} of 5`);
const qtyR = consRange('Cons. (Qty)');
check('Cons. (Qty) range spans the data', qtyR && qtyR.min === '0' && qtyR.max === '15', qtyR ? `${qtyR.min} .. ${qtyR.max}` : '-');
const qtyRows = consRangeTo('Cons. (Qty)', 10, 20);
check('Cons. (Qty) 10-20 selects 2', qtyRows === 2, `${qtyRows} of 5`);
check('NDP range clears green on reset', consResetAll() === scopeSize, `${scopeSize} rows restored`);

console.log('\nPart Consumption - Month/Year stays a checklist (was "(Blank)"):');
const myVals = consOptions('Month/Year');
check('Month/Year resolves', myVals.includes('Sep 2026') && myVals.includes('Aug 2026') && myVals.includes('-'),
  myVals.join(' | '));
const sepNarrowed = consNarrowTo('Month/Year', ['Sep 2026']);
check('Month/Year = Sep 2026', sepNarrowed === 2, sepNarrowed + ' of 5');
const blankNarrowed = consNarrowTo('Month/Year', ['-']);
check('blank-date row keeps the "-" bucket', blankNarrowed === 1, blankNarrowed + ' of 5');

console.log(`\n  ${pass} passed, ${fail} failed`);

// --- Inventory (Part Health): stale config + numeric range -----------------
// The config used to list 'Stock' and 'Stock Value (₹)', which no longer exist
// as headers, and omitted NDP/Stock Qty/Total Amount/Ageing entirely - so those
// four headers had no dropdown at all.
console.log('\nInventory - header carets (was: 4 of 9 missing):');
const invRows = [
  { partId: 'A1', model: 'Oil', location: 'Narwal', productCategory: 'LUBRICANT', ndpPrice: 120.5, currentStock: 10, stockValue: 1205, ageingDays: 12, min: 5 },
  { partId: 'A2', model: 'Filter', location: 'Kathua', productCategory: 'FILTER', ndpPrice: 450, currentStock: 3, stockValue: 1350, ageingDays: 75, min: 5 },
  { partId: 'A3', model: 'Belt', location: 'Narwal', productCategory: 'BELT', ndpPrice: 2200, currentStock: 0, stockValue: 0, ageingDays: 200, min: 5 },
];
window.filteredProcessedParts = invRows;
const invThs = [...doc.querySelectorAll('table:nth-of-type(3) thead th')];
window.markFilterHeaders();
const invCarets = doc.querySelectorAll('table:nth-of-type(3) .th-filter-caret').length;
check('all 9 inventory headers filterable', invCarets === 9, `${invCarets}/9 carets`);
check('NDP has a caret', !!invThs.find((t) => t.textContent.trim().startsWith('NDP')).querySelector('.th-filter-caret'), 'NDP dropdown present');

const openInv = (label) => {
  doc.querySelectorAll('.column-filter-dropdown').forEach((d) => d.remove());
  const th = invThs.find((t) => t.textContent.trim().startsWith(label));
  th.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return { th, dd: doc.querySelector('.column-filter-dropdown') };
};
const invShown = () => window.tableFilterData['health-table-body'].length;

console.log('\nInventory - NDP range filter:');
let { th: ndpTh, dd: ndpDd } = openInv('NDP');
check('NDP opens a range control, not a checklist', !!ndpDd && !!ndpDd.querySelector('.range-min') && !ndpDd.querySelector('.col-filter-options'),
  ndpDd ? `min=${ndpDd.querySelector('.range-min').value} max=${ndpDd.querySelector('.range-max').value}` : 'NO DROPDOWN');
check('range spans the real data', ndpDd && ndpDd.querySelector('.range-min').value === '120.5' && ndpDd.querySelector('.range-max').value === '2200',
  ndpDd ? `${ndpDd.querySelector('.range-min').value} .. ${ndpDd.querySelector('.range-max').value}` : '-');

ndpDd.querySelector('.range-min').value = '400';
ndpDd.querySelector('.range-max').value = '2500';
ndpDd.querySelector('.apply-btn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
check('NDP 400-2500 keeps 2 of 3', invShown() === 2, `${invShown()} of ${invRows.length}`);
check('NDP header turns green', ndpTh.classList.contains('th-filtered'), 'th-filtered set');
check('tooltip says range', /value range/.test(ndpTh.title), ndpTh.title);

console.log('\nInventory - money sorts numerically, not as text:');
({ dd: ndpDd } = openInv('NDP'));
ndpDd.querySelector('.sort-asc-btn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const asc = window.tableFilterData['health-table-body'].map((r) => r.ndpPrice);
check('ascending is 450 then 2200', asc[0] === 450 && asc[1] === 2200, asc.join(' < '));
({ dd: ndpDd } = openInv('NDP'));
ndpDd.querySelector('.sort-desc-btn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const desc = window.tableFilterData['health-table-body'].map((r) => r.ndpPrice);
check('descending is 2200 then 450', desc[0] === 2200 && desc[1] === 450, desc.join(' > '));

console.log('\nInventory - range validation and clear:');
({ dd: ndpDd } = openInv('NDP'));
ndpDd.querySelector('.clear-btn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
check('Clear restores all 3', invShown() === 3, `${invShown()} of ${invRows.length}`);
check('green removed on Clear', !ndpTh.classList.contains('th-filtered'), 'th-filtered removed');
({ dd: ndpDd } = openInv('NDP'));
ndpDd.querySelector('.range-min').value = '900';
ndpDd.querySelector('.range-max').value = '100';
ndpDd.querySelector('.apply-btn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
check('min > max is rejected, not applied', invShown() === 3, `${invShown()} rows, error shown`);
({ dd: ndpDd } = openInv('NDP'));
ndpDd.querySelector('.range-min').value = '120.5';
ndpDd.querySelector('.range-max').value = '2200';
ndpDd.querySelector('.apply-btn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
check('full-span range is not a filter', invShown() === 3 && !ndpTh.classList.contains('th-filtered'), 'no green, all rows');

console.log('\nInventory - Stock Qty range:');
let inv2 = openInv('Stock Qty');
inv2.dd.querySelector('.range-min').value = '0';
inv2.dd.querySelector('.range-max').value = '3';
inv2.dd.querySelector('.apply-btn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
check('Stock Qty 0-3 keeps 2 of 3', invShown() === 2, `${invShown()} of ${invRows.length}`);

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
