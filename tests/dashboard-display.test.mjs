import test from 'node:test';
import assert from 'node:assert/strict';
import { renderDepartmentValue } from '../src/dashboard-display.js';

test('unassigned manual stock does not hide mapped department subtotals', () => {
  const parts = [
    {subStock:{workshop:10,bodyshop:2,wpacs:1,unassigned:0}},
    {subStock:{workshop:0,bodyshop:0,wpacs:0,unassigned:1}},
  ];
  for (const value of [1000,200,100,0]) {
    const element = {};
    renderDepartmentValue(element,value,parts);
    assert.equal(element.textContent,'₹'+value.toLocaleString('en-IN'));
    assert.match(element.title,/excluded/);
  }
});

test('complete department data clears the partial-subtotal explanation', () => {
  const element = {title:'old warning'};
  renderDepartmentValue(element,0,[{subStock:{unassigned:0}}]);
  assert.equal(element.textContent,'₹0');
  assert.equal(element.title,'');
});
