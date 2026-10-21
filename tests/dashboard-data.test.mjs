import test from 'node:test';
import assert from 'node:assert/strict';
import { readDashboardTable } from '../src/dashboard-data.js';

function database(rows, { cap = Infinity, failure = () => null } = {}) {
  const calls = [];
  return { calls, from(table) {
    const call = { table }; calls.push(call);
    const query = {
      select(columns) { call.columns = columns; return query; },
      order(field) { call.order = field; return query; },
      limit(limit) { call.limit = limit; return query; },
      eq(field, value) { call.filter = [field, value]; return query; },
      gt(field, value) { call.cursor = value; return query; },
      then(resolve, reject) {
        const error = failure(call, calls.length);
        const data = rows.filter(row => (call.cursor == null || row.id > call.cursor)
          && (!call.filter || row[call.filter[0]] === call.filter[1]))
          .sort((a, b) => a.id - b.id).slice(0, Math.min(call.limit, cap));
        return Promise.resolve(error ? { error } : { data }).then(resolve, reject);
      }
    };
    return query;
  } };
}
const rows = Array.from({ length: 11 }, (_, i) => ({ id: i + 1, division: i % 2 ? 'KATHUA' : 'NARWAL', qty: i }));
const immediate = { wait: async () => {} };

test('cursor loading reads every row even when Supabase caps responses below the requested page size', async () => {
  const db = database(rows, { cap: 2 });
  const progress = [];
  const result = await readDashboardTable(db, 'inventory', { columns: 'qty', onProgress: n => progress.push(n) });
  assert.deepEqual(result, rows);
  assert.deepEqual(progress, [2, 4, 6, 8, 10, 11]);
  assert.ok(db.calls.every(c => c.columns === 'id,qty' && c.order === 'id' && c.limit === 1000));
  assert.deepEqual(db.calls.map(c => c.cursor), [undefined, 2, 4, 6, 8, 10, 11]);
});

test('location restrictions apply to every page', async () => {
  const db = database(rows, { cap: 2 });
  const result = await readDashboardTable(db, 'inventory', { location: 'KATHUA' });
  assert.deepEqual(result, rows.filter(r => r.division === 'KATHUA'));
  assert.ok(db.calls.every(c => c.filter[0] === 'division' && c.filter[1] === 'KATHUA'));
});

test('a timed out page retries the same cursor at a smaller size without losing or duplicating rows', async () => {
  const db = database(rows, { cap: 2, failure: (_, n) => n === 2 ? { code: '57014', message: 'canceling statement due to statement timeout' } : null });
  const result = await readDashboardTable(db, 'inventory', immediate);
  assert.deepEqual(result, rows);
  assert.equal(db.calls[1].cursor, db.calls[2].cursor);
  assert.equal(db.calls[1].limit, 1000);
  assert.equal(db.calls[2].limit, 500);
});

test('exhausted timeouts reject the refresh instead of returning a partial table', async () => {
  const db = database(rows, { cap: 2, failure: (_, n) => n > 1 ? { code: '57014', message: 'statement timeout' } : null });
  await assert.rejects(readDashboardTable(db, 'inventory', immediate), /Unable to load inventory: statement timeout/);
  assert.equal(db.calls.length, 4);
  assert.deepEqual(db.calls.slice(1).map(c => c.cursor), [2, 2, 2]);
});

test('permission and schema errors are reported without retries', async () => {
  const db = database(rows, { failure: () => ({ code: '42501', message: 'permission denied' }) });
  await assert.rejects(readDashboardTable(db, 'inventory', immediate), /permission denied/);
  assert.equal(db.calls.length, 1);
});

test('a missing cursor fails rather than looping or silently dropping pages', async () => {
  const db = database([{ qty: 1 }]);
  await assert.rejects(readDashboardTable(db, 'inventory'), /invalid page cursor/);
});
