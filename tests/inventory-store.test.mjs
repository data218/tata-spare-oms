import test from 'node:test';
import assert from 'node:assert/strict';
import {replaceInventorySnapshot} from '../src/inventory-store.js';
import {validateInventoryDepartments} from '../src/inventory-fields.js';
function database(initial,{failInsert=0,failReplace=false}={}) {
  let rows=structuredClone(initial),inserts=0;const calls=[];
  return {calls,rows:()=>rows,from(table){assert.equal(table,'tata_spare_inventory','stock uploads must not delete movement history');let op,payload;const filters=[];
    const q={insert(batch){op='insert';payload=batch;return q;},delete(){op='delete';return q;},eq(k,v){filters.push(r=>r[k]===v);return q;},neq(k,v){filters.push(r=>r[k]!==v);return q;},then(resolve,reject){calls.push({op,rowsBefore:rows.length});let error=null;if(op==='insert'){inserts++;if(inserts===failInsert)error={message:'Insert failed'};else rows.push(...payload);}else if(failReplace){failReplace=false;error={message:'Replace failed'};}else rows=rows.filter(r=>!filters.every(f=>f(r)));return Promise.resolve({error}).then(resolve,reject);}};return q;
  }};
}
const original=[{division:'KATHUA',part_no:'OLD',qty:2,fetched_at:'2026-10-01T00:00:00Z'},{division:'NARWAL',part_no:'KEEP',qty:3,fetched_at:'2026-10-01T00:00:00Z'}];
const next=[{division:'KATHUA',part_no:'NEW',qty:5,inventory_indicator:'Workshop'}];
test('stock upload inserts the full snapshot before removing superseded location rows',async()=>{const db=database(original);await replaceInventorySnapshot(db,next,'KATHUA');assert.deepEqual(db.calls.map(c=>c.op),['insert','delete']);assert.equal(db.calls[1].rowsBefore,3);assert.deepEqual(db.rows().map(r=>r.part_no),['KEEP','NEW']);});
test('partial batch failure rolls back staging and keeps the original snapshot',async()=>{const db=database(original,{failInsert:2});const rows=Array.from({length:1001},(_,i)=>({...next[0],part_no:String(i)}));await assert.rejects(replaceInventorySnapshot(db,rows,'KATHUA'),/Insert failed/);assert.deepEqual(db.rows(),original);});
test('failed replacement cleans the staged version and preserves old records',async()=>{const db=database(original,{failReplace:true});await assert.rejects(replaceInventorySnapshot(db,next,'KATHUA'),/Replace failed/);assert.deepEqual(db.rows(),original);});
test('repeated complete uploads replace rather than duplicate location stock',async()=>{const db=database(original);await replaceInventorySnapshot(db,next,'KATHUA');await replaceInventorySnapshot(db,next,'KATHUA');assert.equal(db.rows().filter(r=>r.division==='KATHUA').length,1);});
test('empty or mixed-location uploads fail before any write',async()=>{const db=database(original);await assert.rejects(replaceInventorySnapshot(db,[],'KATHUA'));await assert.rejects(replaceInventorySnapshot(db,next,'NARWAL'));assert.equal(db.calls.length,0);});
test('a missing department column cannot silently replace classified stocked rows',()=>{assert.throws(()=>validateInventoryDepartments([{qty:3,availability:'On Hand',inventory_indicator:''}]),/Inventory Location/);assert.doesNotThrow(()=>validateInventoryDepartments(next));});
