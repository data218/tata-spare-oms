import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {workerSetupUrl,captureWorkerSetupLink,workerSetupCode,rememberWorkerSetup,clearWorkerSetup,shouldOpenWorkerSetup,finishOpeningWorkerSetup} from '../src/worker-pairing.js';
const code='A'.repeat(43),admin={username:'admin',role:'Super Admin'};
function tab(){return new JSDOM('',{url:workerSetupUrl(code)});}

test('local pairing uses a fragment and strips it from address/history before remembering it',()=>{
  const dom=tab(),w=dom.window;
  const url=new URL(w.location.href);assert.equal(url.search,'');assert.ok(url.hash.includes(code));
  assert.equal(captureWorkerSetupLink({location:w.location,history:w.history,storage:w.sessionStorage}),true);
  assert.equal(w.location.hash,'');assert.ok(!w.location.href.includes(code));assert.equal(shouldOpenWorkerSetup(w.sessionStorage),true);
  assert.equal(workerSetupCode(null,w.sessionStorage),'','pending pairing must not authorize a login');
  assert.equal(workerSetupCode(admin,w.sessionStorage),code);
  finishOpeningWorkerSetup(w.sessionStorage);assert.equal(shouldOpenWorkerSetup(w.sessionStorage),false);
  assert.equal(workerSetupCode(admin,w.sessionStorage),code,'same admin tab can restore code after reload');dom.window.close();
});
test('manager, a different admin and logout clear the remembered worker capability',()=>{
  for(const user of [{username:'manager',role:'Manager'},{username:'other-admin',role:'Admin'}]){
    const dom=tab(),storage=dom.window.sessionStorage;rememberWorkerSetup(admin,code,storage);
    assert.equal(workerSetupCode(user,storage),'');assert.equal(storage.length,0);dom.window.close();
  }
  const dom=tab(),storage=dom.window.sessionStorage;rememberWorkerSetup(admin,code,storage);clearWorkerSetup(storage);assert.equal(workerSetupCode(admin,storage),'');dom.window.close();
});
test('invalid link codes are removed without creating a stored capability',()=>{
  const dom=new JSDOM('',{url:'https://tata-spare-oms.vercel.app/index.html#workerSetup=invalid'}),w=dom.window;
  assert.equal(captureWorkerSetupLink({location:w.location,history:w.history,storage:w.sessionStorage}),false);assert.equal(w.location.hash,'');assert.equal(w.sessionStorage.length,0);
  assert.throws(()=>workerSetupUrl('bad code'),/Invalid/);dom.window.close();
});
