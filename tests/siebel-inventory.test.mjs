import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {inventoryReportReady, clickInventoryViewLink, clickInventoryControl, startInventoryExport} from '../src/siebel-inventory.js';

const expected = 'TM Spares Parts Inventory Export View - MIS Spares';
function portal(html, active = expected) {
  const dom = new JSDOM(html, {runScripts:'outside-only'});
  dom.window.SiebelApp = {S_App:{GetActiveView:()=>({GetName:()=>active})}};
  Object.defineProperty(dom.window.document.body, 'innerText', {get(){return this.textContent;}});
  dom.window.HTMLElement.prototype.getClientRects = function(){return this.hidden ? [] : [{}];};
  return dom;
}
test('inventory readiness rejects the invoice and generic Part Browser views seen in failed runs',()=>{
  for(const active of ['TM FS Invoice Payments Export View - Division - MIS Spares','TM Spares Parts Inventory Export View - MIS Spares New']) {
    const dom=portal('<p>Part # Description Qty Inventory Location Spare Part Browser</p>',active);
    assert.equal(dom.window.eval(`(${inventoryReportReady})()`),false);dom.window.close();
  }
  const dom=portal('<p>Part # Description Qty Availability Inventory Location</p>');
  assert.equal(dom.window.eval(`(${inventoryReportReady})()`),true);dom.window.close();
});
test('inventory link selection uses the exact SWEView instead of duplicate link text',()=>{
  const dom=portal('<a id="wrong" onclick="void(0)">Spares Inventory</a><a id="right">Spare Part Browser</a>');
  const right=dom.window.document.getElementById('right');
  right.setAttribute('onclick','return false; // ?SWEView='+encodeURIComponent(expected).replace(/%20/g,'+')+'&SWEC=18');
  let clicked=false;right.addEventListener('click',()=>{clicked=true;});
  assert.equal(dom.window.eval(`(${clickInventoryViewLink})()`),true);assert.equal(clicked,true);dom.window.close();
});
test('inventory export ignores receipt/consumption controls, hidden buttons and disabled controls',()=>{
  const dom=portal('<button title="Parts Receipt Details:Download to Excel">Download to Excel</button><button title="Parts Consumption:Download to Excel">Download to Excel</button><button hidden title="Inventory Level:Download to Excel">Download to Excel</button><button disabled title="Inventory Level:Download to Excel">Download to Excel</button><button id="right" title="Inventory Level:Download to Excel">Download to Excel</button>');
  const clicked=[];for(const b of dom.window.document.querySelectorAll('button'))b.addEventListener('click',()=>clicked.push(b.id));
  assert.equal(dom.window.eval(`(${clickInventoryControl})('Download to Excel')`),true);assert.deepEqual(clicked,['right']);
  dom.window.document.getElementById('right').remove();
  assert.equal(dom.window.eval(`(${clickInventoryControl})('Download to Excel')`),false);dom.window.close();
});

test('export waits for its dialog and selects all rows/columns before starting once',()=>{
  const dom=portal('<button title="Next Record">Next</button>');
  assert.equal(dom.window.eval(`(${startInventoryExport})()`),false);
  const dialog=dom.window.document.createElement('div');dialog.setAttribute('role','dialog');
  dialog.innerHTML='<input type="radio" name="rows" value="Only Current Row" checked><input type="radio" name="rows" value="All Rows In Current Query"><input type="radio" name="columns" value="Visible Columns" checked><input type="radio" name="columns" value="All"><input type="radio" name="format" value="Tab Delimited Text File"><button title="Export:Next">Next</button>';
  dom.window.document.body.appendChild(dialog);let clicks=0;dialog.querySelector('button').addEventListener('click',()=>{clicks++;dialog.remove();});
  assert.equal(dom.window.eval(`(${startInventoryExport})()`),true);assert.equal(clicks,1);
  for(const value of ['All Rows In Current Query','All','Tab Delimited Text File'])assert.equal([...dialog.querySelectorAll('input')].find(x=>x.value===value).checked,true);
  assert.equal(dom.window.eval(`(${startInventoryExport})()`),false);assert.equal(clicks,1);dom.window.close();
});
