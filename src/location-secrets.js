import {generateKeyPairSync, createPublicKey, createHmac, privateDecrypt, publicEncrypt, randomBytes, randomUUID, createCipheriv, createDecipheriv, timingSafeEqual, constants} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const SECRET_PREFIX = 'worker-sealed-v1:';
export const secretDirectory = () => process.env.TATA_WORKER_SECRET_DIR || path.join(os.homedir(), '.tata-oms-worker');
export function readWorkerSecrets(directory = secretDirectory(), create = false) {
  const file = path.join(directory,'identity.json');
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file,'utf8'));
  if (!create) throw new Error('Worker identity not found. Start the updated background worker first.');
  fs.mkdirSync(directory,{recursive:true,mode:0o700});
  const {privateKey,publicKey} = generateKeyPairSync('rsa',{modulusLength:3072,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});
  const identity = {keyId:randomUUID(),privateKey,publicKey,setupCode:randomBytes(32).toString('base64url')};
  fs.writeFileSync(file,JSON.stringify(identity),{flag:'wx',mode:0o600});
  return identity;
}
export function workerAuthority(identity) {
  const record = {keyId:identity.keyId,publicKey:createPublicKey(identity.publicKey).export({format:'jwk'})};
  return {...record,signature:createHmac('sha256',identity.setupCode).update(JSON.stringify(record)).digest('base64')};
}
export function decryptEnvelope(envelope, identity) {
  if (envelope?.version !== 1 || envelope.keyId !== identity.keyId) throw new Error('Credentials belong to a different worker. Use the original worker identity.');
  const key = privateDecrypt({key:identity.privateKey,padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},Buffer.from(envelope.key,'base64'));
  const data = Buffer.from(envelope.ciphertext,'base64');
  const decipher = createDecipheriv('aes-256-gcm',key,Buffer.from(envelope.iv,'base64'));
  decipher.setAuthTag(data.subarray(-16));
  return JSON.parse(Buffer.concat([decipher.update(data.subarray(0,-16)),decipher.final()]).toString('utf8'));
}
export function sealPassword(credentials, identity) {
  const key = randomBytes(32), iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm',key,iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(credentials),'utf8'),cipher.final(),cipher.getAuthTag()]);
  return SECRET_PREFIX + JSON.stringify({version:1,keyId:identity.keyId,key:publicEncrypt({key:identity.publicKey,padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},key).toString('base64'),iv:iv.toString('base64'),ciphertext:data.toString('base64')});
}
export function resolveLocationPassword(location, identity) {
  if (!String(location.password || '').startsWith(SECRET_PREFIX)) return location.password;
  const value = decryptEnvelope(JSON.parse(location.password.slice(SECRET_PREFIX.length)),identity || readWorkerSecrets());
  if (value.location !== location.location_name || value.username !== location.username) throw new Error('Stored credentials do not match this location. Test and save the location again.');
  return value.password;
}
export function verifySetupCode(candidate, expected) {
  const a=Buffer.from(String(candidate || '')),b=Buffer.from(expected);
  return a.length===b.length && timingSafeEqual(a,b);
}
