import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {encryptLocationSetup,submitLocationSetup} from '../src/location-setup-client.js';
import {readWorkerSecrets,workerAuthority,sealPassword,resolveLocationPassword,SECRET_PREFIX} from '../src/location-secrets.js';
import {createLocationSetupWorker} from '../src/location-setup-worker.js';

function database({denyLocationWrites=false}={}) {
  const tables={tata_bot_settings:[],tata_locations:[]},writes=[];
  return {tables,writes,from(table){
    assert.ok(table in tables,'connection tests must not touch inventory or consumption');
    let op='read',payload,filters=[],single=false,count=Infinity;
    const query={
      select(){return query;},maybeSingle(){single=true;return query;},
      eq(key,value){filters.push(row=>row[key]===value);return query;},
      like(key,value){const regex=new RegExp('^'+value.split('%').map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*')+'$');filters.push(row=>regex.test(row[key]));return query;},
      limit(n){count=n;return query;},
      insert(data){op='insert';payload=data;return query;},
      upsert(data){op='upsert';payload=data;return query;},
      update(data){op='update';payload=data;return query;},
      then(resolve,reject){
        if(op!=='read')writes.push({table,op,payload:structuredClone(payload)});
        if(table==='tata_locations'&&denyLocationWrites&&op!=='read')return Promise.resolve({error:{message:'denied'},data:null}).then(resolve,reject);
        let rows=tables[table].filter(row=>filters.every(filter=>filter(row))).slice(0,count);
        if(op==='insert'){const row={...payload};if(table==='tata_locations')row.id=randomUUID();tables[table].push(row);rows=[row];}
        if(op==='upsert'){let row=tables[table].find(row=>row.key===payload.key);if(row)Object.assign(row,payload);else{row={...payload};tables[table].push(row);}rows=[row];}
        if(op==='update')for(const row of rows)Object.assign(row,payload);
        return Promise.resolve({error:null,data:structuredClone(single?(rows[0]||null):rows)}).then(resolve,reject);
      },
    };return query;
  }};
}
const credentials={location:'UDHAMPUR',username:'fixture-user',password:'fixture-p@ss-<&-₹'};
function fixture(t,{fails=false,denyLocationWrites=false}={}) {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'tata-location-test-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const client=database({denyLocationWrites});let tests=0,clock=Date.now();
  const worker=createLocationSetupWorker(client,async value=>{tests++;assert.deepEqual(value,{location_name:credentials.location,username:credentials.username,password:credentials.password});if(fails)throw Error('simulated rejection');},{directory,now:()=>clock});
  const identity=readWorkerSecrets(directory,true);
  return {client,worker,identity,directory,tests:()=>tests,options:{now:()=>clock,wait:async()=>{await worker.poll();clock+=3000;}}};
}

test('browser encrypts a test, worker verifies it, and only then saves a decryptable password',async t=>{
  const f=fixture(t);await f.worker.publish();const progress=[];
  const result=await submitLocationSetup(f.client,credentials,f.identity.setupCode,message=>progress.push(message),f.options);
  assert.equal(result.status,'connected');assert.equal(f.tests(),1);
  const row=f.client.tables.tata_locations[0];assert.equal(row.location_name,'UDHAMPUR');assert.ok(row.password.startsWith(SECRET_PREFIX));assert.equal(resolveLocationPassword(row,f.identity),credentials.password);
  const writes=JSON.stringify(f.client.writes);assert.ok(!writes.includes(credentials.password));assert.ok(!writes.includes(f.identity.setupCode));
  assert.ok(progress.some(message=>message.includes('Waiting')));
  const updated=await submitLocationSetup(f.client,credentials,f.identity.setupCode,()=>{},f.options);
  assert.equal(updated.status,'connected');assert.equal(f.client.tables.tata_locations.length,1,'updating credentials must not duplicate the location');
});

test('wrong setup code or substituted public key is rejected before any request/password is written',async t=>{
  const f=fixture(t);await f.worker.publish();const initial=f.client.writes.length;
  await assert.rejects(submitLocationSetup(f.client,credentials,'incorrect',()=>{},f.options),/setup code/);
  assert.equal(f.client.writes.length,initial);assert.equal(f.tests(),0);
  const otherDirectory=fs.mkdtempSync(path.join(os.tmpdir(),'tata-other-worker-'));t.after(()=>fs.rmSync(otherDirectory,{recursive:true,force:true}));
  const attacker=readWorkerSecrets(otherDirectory,true);
  const authority=f.client.tables.tata_bot_settings.find(row=>row.key==='location_setup_authority');authority.value=JSON.stringify(workerAuthority(attacker));
  await assert.rejects(submitLocationSetup(f.client,credentials,f.identity.setupCode,()=>{},f.options),/identity could not be verified/);
  assert.equal(f.client.writes.length,initial);assert.equal(f.tests(),0);
});

test('failed Tata login and database write failure never activate a new location',async t=>{
  for(const options of [{fails:true},{denyLocationWrites:true}]){
    const f=fixture(t,options);await f.worker.publish();
    await assert.rejects(submitLocationSetup(f.client,credentials,f.identity.setupCode,()=>{},f.options),/failed|could not save/);
    assert.equal(f.client.tables.tata_locations.length,0);assert.equal(f.tests(),1);
  }
});

test('encrypted credentials are bound to the location and username and keep the same worker identity',t=>{
  const f=fixture(t);const identity=readWorkerSecrets(f.directory);assert.equal(identity.keyId,f.identity.keyId);assert.equal(identity.setupCode,f.identity.setupCode);
  assert.equal(resolveLocationPassword({password:'legacy'}),'legacy');
  const row={location_name:credentials.location,username:credentials.username,password:sealPassword(credentials,f.identity)};
  assert.equal(resolveLocationPassword(row,f.identity),credentials.password);
  assert.throws(()=>resolveLocationPassword({...row,location_name:'OTHER'},f.identity),/do not match/);
  assert.throws(()=>resolveLocationPassword({...row,username:'other'},f.identity),/do not match/);
});

test('replaying an already completed encrypted request cannot start another Tata login',async t=>{
  const f=fixture(t);await f.worker.publish();await submitLocationSetup(f.client,credentials,f.identity.setupCode,()=>{},f.options);
  const original=f.client.writes.find(write=>write.table==='tata_bot_settings'&&write.op==='insert').payload;
  Object.assign(f.client.tables.tata_bot_settings.find(row=>row.key===original.key),structuredClone(original));
  await f.worker.poll();assert.equal(f.tests(),1);assert.equal(f.client.tables.tata_locations.length,1);
  assert.equal(JSON.parse(f.client.tables.tata_bot_settings.find(row=>row.key===original.key).value).status,'failed');
});

test('tampered and expired requests are rejected without a Tata login',async t=>{
  const f=fixture(t);await f.worker.publish();
  for(const expired of [true,false]){
    const id=randomUUID(),createdAt=Date.now()-(expired?11*60*1000:0);
    const envelope=await encryptLocationSetup(workerAuthority(f.identity),f.identity.setupCode,credentials,id,createdAt);
    if(!expired)envelope.ciphertext='AAAA';
    const row={key:'location_setup:'+id,value:JSON.stringify({status:'pending',id,envelope,createdAt})};f.client.tables.tata_bot_settings.push(row);
    await f.worker.poll();assert.equal(JSON.parse(row.value).status,'failed');
  }
  assert.equal(f.tests(),0);assert.equal(f.client.tables.tata_locations.length,0);
});
