import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeInventoryLocations} from '../src/inventory_scraper.js';
import {normalizeLocation,setConfiguredLocations,stockDepartment} from '../src/inventory-math.js';

test('new database locations remain fetchable alongside existing environment credentials',()=>{
  const rows=mergeInventoryLocations([{location_name:'NARWAL',password:'legacy-db'},{location_name:'UDHAMPUR',password:'worker-sealed-v1:fixture'}],[{location_name:'NARWAL',password:'environment'}]);
  assert.equal(rows.length,2);assert.equal(rows.find(row=>row.location_name==='NARWAL').password,'environment');assert.ok(rows.some(row=>row.location_name==='UDHAMPUR'));
  const updated=mergeInventoryLocations([{location_name:'NARWAL',password:'worker-sealed-v1:updated'}],[{location_name:'NARWAL',password:'old-environment'}]);
  assert.equal(updated[0].password,'worker-sealed-v1:updated');
});
test('configured names are preserved rather than merged with an older branch alias',()=>{
  try{setConfiguredLocations(['NARWAL','JAMMU WEST','UDHAMPUR']);assert.equal(normalizeLocation('Jammu West'),'JAMMU WEST');assert.equal(normalizeLocation('Udhampur'),'UDHAMPUR');assert.equal(normalizeLocation('Channi Rama'),'CHANNIRAMA');}
  finally{setConfiguredLocations();}
});
test('the same Tata store format classifies Workshop, WPACS and Bodyshop at a new branch',()=>{
  assert.equal(stockDepartment('TMPC-PARTS-N2-JK-3008420-SwaPvt-Udhampur'),'workshop');
  assert.equal(stockDepartment('TMPC-PARTS-N2-JK-3008420-SwaPvt-WPACS-Udhampur'),'wpacs');
  assert.equal(stockDepartment('TMPC-PARTS-N2-JK-3008420-SwaPvt-Bodyshop-Udhampur'),'bodyshop');
  assert.equal(stockDepartment(''),'unassigned');
});
