import test from 'node:test';import assert from 'node:assert/strict';
import {processInventoryData,parseTataDate,parseNumber,quantityTotals,summarizeInventory,roundOrderQuantity,reorderMetrics} from '../src/inventory-math.js';
const now=new Date('2026-10-21T06:00:00Z');
const priceList=[{part_number:'OIL',description:'Engine Oil 5W30',uom:'L',ndp:544.9088870505,category:'Lubes Dealer'},{part_number:'GREASE',description:'Sunroof grease',uom:'KG',ndp:12000,category:'Lubes Dealer'},{part_number:'BOLT',description:'Hex bolt',uom:'EA',ndp:20,category:'Warehouse'}];
const row=(part,qty,extra={})=>({part_no:part,division:'NARWAL',qty,availability:'On Hand',inventory_indicator:'Workshop',fetched_at:'2026-10-20T06:00:00Z',...extra});
const data=(inventory,consumption=[],movementLogs=[])=>processInventoryData({inventory,consumption,movementLogs,priceList},now);
test('oil is converted to litres once and multiplied by per-litre NDP',()=>{const [p]=data([row('OIL',208000)]);assert.equal(p.currentStock,208);assert.ok(Math.abs(p.stockValue-113341.048506504)<1e-6);assert.equal(p.ndpPrice,544.9088870505);assert.equal(p.uom,'L');assert.equal(p.productCategory,'LUBRICANT');});
test('kilograms, pieces, reserves and transit retain consistent quantities and values',()=>{const parts=data([row('GREASE',500),row('BOLT',10),row('BOLT',2,{availability:'Reserved'}),row('OIL',1000,{availability:'In Transit'})]);const grease=parts.find(p=>p.partId==='GREASE'),bolt=parts.find(p=>p.partId==='BOLT');assert.equal(grease.currentStock,.5);assert.equal(grease.stockValue,6000);assert.equal(bolt.available,8);assert.equal(summarizeInventory(parts).reservedValue,40);assert.match(quantityTotals(parts),/0.5 KG/);assert.match(quantityTotals(parts),/10 pcs/);});
test('comma separated numbers, decimals and money are not truncated',()=>{assert.equal(parseNumber('208,000'),208000);assert.equal(parseNumber('₹1,23,456.75'),123456.75);assert.equal(parseNumber('3.5'),3.5);assert.equal(parseNumber(''),0);});
test('dates accept Tata DMY timestamps and Excel serials; invalid dates stay unknown',()=>{assert.equal(parseTataDate('27/07/2026 10:46:23 AM').getMonth(),6);assert.equal(parseTataDate('46244.50844907408').getUTCFullYear(),2026);assert.equal(parseTataDate('31/02/2026'),null);assert.equal(parseTataDate('garbage'),null);const [p]=data([row('BOLT',1,{last_receipt:'garbage'})]);assert.equal(p.ageingDays,null);assert.equal(p.nonMovingDays,null);});
test('30- and 180-day demand remain separate, including consumption without inventory',()=>{const parts=data([], [{part_no:'OIL',division:'NARWAL',sold_qty:3500,date:'2026-10-20'},{part_no:'OIL',division:'NARWAL',sold_qty:2500,date:'2026-08-01'},{part_no:'OIL',division:'NARWAL',sold_qty:1000,date:'2026-01-01'},{part_no:'OIL',division:'NARWAL',sold_qty:999999,date:'2026-12-01'}]);assert.equal(parts[0].consumption30d,3.5);assert.equal(parts[0].consumption6mRolling,6);assert.ok(Math.abs(parts[0].demand-6/180*7)<1e-12);});
test('missing price and unit remain explicit and excluded from known valuation',()=>{const [p]=data([row('UNKNOWN',10)]);assert.equal(p.stockValue,null);assert.equal(p.unitKnown,false);assert.equal(summarizeInventory([p]).missingPrices,1);assert.equal(summarizeInventory([p]).unknownUnits,1);});
test('exact part descriptions are used and conflicting source descriptions are flagged',()=>{const [p]=data([row('BOLT',1,{description:'Wrong item'})]);assert.equal(p.model,'Hex bolt');assert.equal(p.sourceDescription,'Wrong item');assert.equal(p.descriptionMismatch,true);});
test('movement history preceding snapshot is not silently added a second time',()=>{const parts=data([row('BOLT',10)],[],[{part_id:'BOLT',location:'NARWAL',movement_type:'IN',qty:1,date:'2026-10-19'},{part_id:'BOLT',location:'NARWAL',movement_type:'IN',qty:2,date:'2026-10-21T00:00:00Z'}]);assert.equal(parts[0].currentStock,12);assert.equal(parts[0].unreconciledMovements,1);assert.equal(parts[0].subStock.workshop,10);assert.equal(parts[0].subStock.unassigned,2);});
test('order quantities support millilitres/grams and round pieces up',()=>{assert.equal(roundOrderQuantity(.1234,'L'),.124);assert.equal(roundOrderQuantity(1.1,'EA'),2);assert.equal(roundOrderQuantity(-1,'L'),0);});

 test('reorder uses six-month daily average with seven days lead and seven days safety',()=>{const plan=reorderMetrics({consumption6mRolling:1800,currentStock:50,reserved:10,inTransit:20,uom:'EA',unitKnown:true});assert.equal(plan.averageDaily,10);assert.equal(plan.leadTime,7);assert.equal(plan.demand,70);assert.equal(plan.safetyStock,70);assert.equal(plan.reorderPoint,140);assert.equal(plan.available,40);assert.equal(plan.orderQty,80);});
 test('oil reorder quantities stay in litres and rounding happens only after netting stock',()=>{const plan=reorderMetrics({consumption6mRolling:180,currentStock:5,reserved:1,inTransit:2,uom:'L',unitKnown:true});assert.equal(plan.reorderPoint,14);assert.equal(plan.orderQty,8);const low=reorderMetrics({consumption6mRolling:1,currentStock:0,reserved:0,inTransit:0,uom:'EA',unitKnown:true});assert.equal(low.orderQty,1);});
test('oil filters and seals keep their EA unit and are not lubricant',()=>{const p=processInventoryData({priceList:[{part_number:'FILTER',description:'Engine Oil Filter',uom:'EA',ndp:200,category:'Warehouse'}],inventory:[row('FILTER',3,{description:'Engine Oil Filter',product_category:'Spare Part'})]},now)[0];assert.equal(p.productCategory,'SPARE PART');assert.equal(p.uom,'EA');assert.equal(p.currentStock,3);assert.equal(p.stockValue,600);});
test('new manual receipt applies to a consumption-only part after its location snapshot',()=>{const parts=data([row('BOLT',1)],[{part_no:'OIL',division:'NARWAL',sold_qty:1000,date:'2026-10-19'}],[{part_id:'OIL',location:'NARWAL',movement_type:'IN',qty:2,date:'2026-10-21T00:00:00Z'}]);const oil=parts.find(p=>p.partId==='OIL');assert.equal(oil.currentStock,2);assert.equal(oil.stockValue,2*oil.ndpPrice);});

test('manual receipts and issues form recorded stock for a location with no inventory export',()=>{
  const logs=[{part_id:'BOLT',location:'REASI',movement_type:'IN',qty:3,date:'2026-10-20T08:00:00Z'},{part_id:'BOLT',location:'REASI',movement_type:'OUT',qty:1,date:'2026-10-20T09:00:00Z'}];
  const parts=data([row('BOLT',10)],[],logs),reasi=parts.find(p=>p.location==='REASI');
  assert.equal(reasi.currentStock,2);assert.equal(reasi.available,2);assert.equal(reasi.stockValue,40);assert.equal(reasi.snapshotAt,null);
  assert.equal(parts.find(p=>p.location==='NARWAL').currentStock,10);
  const uploaded=data([row('BOLT',2,{division:'REASI',fetched_at:'2026-10-20T10:00:00Z'})],[],logs)[0];
  assert.equal(uploaded.currentStock,2);assert.equal(uploaded.stockValue,40);
});

test('manual litres without an export retain canonical quantities and future entries are excluded',()=>{
  const [part]=data([],[],[{part_id:'OIL',location:'REASI',movement_type:'IN',qty:2,date:'2026-10-20'},{part_id:'OIL',location:'REASI',movement_type:'IN',qty:100,date:'2026-12-01'}]);
  assert.equal(part.currentStock,2);assert.equal(part.stockValue,2*priceList[0].ndp);
});

test('department values distinguish Workshop, Bodyshop and WPACS store paths',()=>{
  const [p]=data([row('BOLT',3,{inventory_indicator:'TMPC-PARTS-N2-JK-3008420-SwaPvt-Jammu'}),row('BOLT',2,{inventory_indicator:'TMPC-PARTS-N2-JK-3008420-SwaPvt-Bodyshop'}),row('BOLT',1,{inventory_indicator:'TMPC-PARTS-N2-JK-3008420-SwaPvt-WPACS-Jammu'})]);
  assert.equal(p.currentStock,6);assert.deepEqual(p.subStock,{workshop:3,bodyshop:2,wpacs:1,unassigned:0});assert.equal(summarizeInventory([p]).missingDepartments,0);
});
test('missing department is unassigned rather than silently counted as Workshop',()=>{
  const [p]=data([row('BOLT',10,{inventory_indicator:''})]);assert.equal(p.stockValue,200);assert.equal(p.subStock.workshop,0);assert.equal(p.subStock.unassigned,10);assert.equal(summarizeInventory([p]).missingDepartments,1);
});
