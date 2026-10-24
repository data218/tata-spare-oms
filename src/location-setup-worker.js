import fs from 'node:fs';
import path from 'node:path';
import {readWorkerSecrets,workerAuthority,decryptEnvelope,sealPassword,verifySetupCode,secretDirectory} from './location-secrets.js';

export function createLocationSetupWorker(client, testConnection, {directory = secretDirectory(), now = Date.now} = {}) {
  let identity, published = false;
  const checked = async promise => {const result=await promise;if(result.error)throw result.error;return result.data;};
  async function publish() {
    identity ||= readWorkerSecrets(directory,true);
    if (!published) {
      await checked(client.from('tata_bot_settings').upsert({key:'location_setup_authority',value:JSON.stringify(workerAuthority(identity))},{onConflict:'key'}));
      published=true;
    }
  }
  async function processRequest(row) {
    const request=JSON.parse(row.value);
    if (request.status !== 'pending' || request.envelope?.keyId !== identity.keyId) return false;
    let payload;
    try {
      payload=decryptEnvelope(request.envelope,identity);
      if (!verifySetupCode(payload.setupCode,identity.setupCode)) throw new Error('Worker setup code is incorrect. Nothing was saved.');
      if (payload.id !== request.id || row.key !== 'location_setup:'+payload.id) throw new Error('Connection test identity is invalid.');
      if (!Number.isFinite(payload.createdAt) || payload.createdAt > now()+30000 || now()-payload.createdAt > 10*60*1000) throw new Error('Connection test expired. Submit a new test.');
      if (typeof payload.location !== 'string' || !/^[A-Z0-9][A-Z0-9 &()._-]{0,79}$/.test(payload.location) || ['ALL','UNKNOWN'].includes(payload.location)) throw new Error('Enter a valid location name.');
      if (typeof payload.username !== 'string' || !payload.username.trim() || payload.username.length>120 || typeof payload.password !== 'string' || !payload.password || payload.password.length>512) throw new Error('Enter a valid Tata username and password.');
    } catch {
      // Invalid ciphertext must never expose cryptographic details or its data.
      await checked(client.from('tata_bot_settings').update({value:JSON.stringify({status:'failed',message:'Connection test could not be authorized or has expired. Nothing was saved.'})}).eq('key',row.key).eq('value',row.value));
      return true;
    }
    const claimed=await checked(client.from('tata_bot_settings').update({value:JSON.stringify({...request,status:'processing'})}).eq('key',row.key).eq('value',row.value).select('key'));
    if (!claimed?.length) return false;
    let result;
    try {
      // Keep completed nonces locally as well: resetting a public queue row
      // cannot replay a password test or repeat Tata logins.
      const receiptFile=path.join(directory,'setup-receipts.json');
      const receipts=fs.existsSync(receiptFile)?JSON.parse(fs.readFileSync(receiptFile,'utf8')):{};
      if (receipts[payload.id]) throw new Error('This connection test was already processed. Submit a new test.');
      for(const [id,time] of Object.entries(receipts)) if(now()-time>15*60*1000)delete receipts[id];
      receipts[payload.id]=now();
      fs.writeFileSync(receiptFile,JSON.stringify(receipts),{mode:0o600});
      const locations=await checked(client.from('tata_locations').select('id,location_name'));
      const compact=value=>String(value || '').toUpperCase().replace(/\s+/g,'');
      const matches=(locations || []).filter(row=>compact(row.location_name)===compact(payload.location));
      if(matches.length>1)throw new Error('Duplicate location names need review.');
      const existing=matches[0],location=existing?.location_name || payload.location;
      try {
        await testConnection({location_name:location,username:payload.username.trim(),password:payload.password});
      } catch {
        throw new Error('Tata login or inventory report access failed. Check the credentials and ensure no other Tata session is active. Nothing was saved.');
      }
      const username=payload.username.trim();
      const password=sealPassword({location,username,password:payload.password},identity);
      if (existing) await checked(client.from('tata_locations').update({username,password}).eq('id',existing.id));
      else await checked(client.from('tata_locations').insert({location_name:location,username,password}));
      result={status:'connected',location,checkedAt:new Date(now()).toISOString(),message:'Connected to Tata. Location saved.'};
    } catch(error) {
      result={status:'failed',message:/^(This connection|Tata login)/.test(error.message||'')?error.message:'The worker could not save the location. Check worker access and try again.'};
    }
    await checked(client.from('tata_bot_settings').update({value:JSON.stringify(result)}).eq('key',row.key));
    return true;
  }
  return {publish,processRequest,async poll(){
    await publish();
    const rows=await checked(client.from('tata_bot_settings').select('key,value').like('key','location_setup:%').like('value','%"status":"pending"%').limit(10));
    for(const row of rows||[])if(await processRequest(row))break;
  }};
}
