const encoder = new TextEncoder();
const b64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const unb64 = text => Uint8Array.from(atob(text), c => c.charCodeAt(0));

// The setup code authenticates the worker's public key before any password is
// encrypted. An anonymously writable database cannot substitute its own key.
export async function encryptLocationSetup(authority, setupCode, credentials, id, now = Date.now()) {
  const signed = JSON.stringify({keyId:authority.keyId, publicKey:authority.publicKey});
  const macKey = await crypto.subtle.importKey('raw', encoder.encode(setupCode), {name:'HMAC',hash:'SHA-256'}, false, ['verify']);
  if (!await crypto.subtle.verify('HMAC', macKey, unb64(authority.signature || ''), encoder.encode(signed))) {
    throw new Error('Worker setup code is incorrect, or the worker identity could not be verified.');
  }
  const rsa = await crypto.subtle.importKey('jwk', authority.publicKey, {name:'RSA-OAEP',hash:'SHA-256'}, false, ['encrypt']);
  const aes = await crypto.subtle.generateKey({name:'AES-GCM',length:256}, true, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const content = JSON.stringify({...credentials,id,createdAt:now,setupCode});
  const ciphertext = await crypto.subtle.encrypt({name:'AES-GCM',iv}, aes, encoder.encode(content));
  const key = await crypto.subtle.encrypt({name:'RSA-OAEP'}, rsa, await crypto.subtle.exportKey('raw', aes));
  return {version:1,keyId:authority.keyId,key:b64(key),iv:b64(iv),ciphertext:b64(ciphertext)};
}

export async function submitLocationSetup(client, credentials, setupCode, onProgress = () => {}, {
  wait = ms => new Promise(resolve => setTimeout(resolve, ms)), now = Date.now,
  timeout = 5 * 60 * 1000,
} = {}) {
  if (!/^[A-Z0-9][A-Z0-9 &()._-]{0,79}$/.test(credentials.location || '') || ['ALL','UNKNOWN'].includes(credentials.location)) throw new Error('Enter a valid location name.');
  if (!credentials.username?.trim() || !credentials.password) throw new Error('Enter the Tata username and password.');
  if (!setupCode?.trim()) throw new Error('Enter the private worker setup code.');
  const {data,error} = await client.from('tata_bot_settings').select('value').eq('key','location_setup_authority').maybeSingle();
  if (error) throw new Error('Could not read the worker setup status.');
  if (!data) throw new Error('Update and restart the background worker once to enable location setup.');
  const id = crypto.randomUUID(), started = now();
  const envelope = await encryptLocationSetup(JSON.parse(data.value), setupCode.trim(), credentials, id, started);
  const requestKey = 'location_setup:' + id;
  const {error:writeError} = await client.from('tata_bot_settings').insert({key:requestKey,value:JSON.stringify({status:'pending',id,envelope,createdAt:started})});
  if (writeError) throw new Error('Could not submit the connection test. Nothing was saved.');
  onProgress('Waiting for the background worker. Existing fetch tasks may finish first.');
  while (now() - started < timeout) {
    await wait(3000);
    const {data:row,error:readError} = await client.from('tata_bot_settings').select('value').eq('key',requestKey).maybeSingle();
    if (readError) throw new Error('Could not read the connection test result. Check its status before retrying.');
    if (!row) throw new Error('The connection test is no longer available.');
    const result = JSON.parse(row.value);
    if (result.status === 'connected') return result;
    if (result.status === 'failed') throw new Error(result.message || 'Connection test failed. Nothing was saved.');
    if (result.status === 'processing') onProgress('Testing the Tata login and inventory report access. Please wait...');
  }
  throw new Error('The connection test is still pending. Keep the worker PC awake; do not submit the same test again yet.');
}
