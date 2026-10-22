import test from 'node:test';
import assert from 'node:assert/strict';
import {readInventoryDepartment} from '../src/inventory-fields.js';
test('both Tata department column labels survive manual and scraper imports',()=>{assert.equal(readInventoryDepartment({'Inventory Location':'Bodyshop'}),'Bodyshop');assert.equal(readInventoryDepartment({'Inventory Indicator':'WPACS'}),'WPACS');});
test('department headers tolerate case, spacing, punctuation and export truncation',()=>{assert.equal(readInventoryDepartment({' INVENTORY LOCATION\r':' WPACS '}),'WPACS');assert.equal(readInventoryDepartment({'Inventory Indicat':'Workshop'}),'Workshop');assert.equal(readInventoryDepartment({'Inventory I':'Bodyshop'}),'Bodyshop');});
test('blank department fields do not pick an unrelated inventory or bin field',()=>{assert.equal(readInventoryDepartment({'Inventory Indicator':'','Inventory Item':'part','Location 1':'B/S'}),'');assert.equal(readInventoryDepartment({'Inventory Indicator':'','Inventory Location':'Bodyshop'}),'Bodyshop');});
