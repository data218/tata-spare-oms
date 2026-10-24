const CODE_KEY = 'tata_worker_setup';
const OPEN_KEY = 'tata_worker_setup_open';
const validCode = code => /^[A-Za-z0-9_-]{43}$/.test(code || '');
const isAdmin = user => ['Admin','Super Admin'].includes(user?.role) && Boolean(user.username);

export function workerSetupUrl(code) {
  if (!validCode(code)) throw new Error('Invalid worker setup code.');
  const url = new URL('https://tata-spare-oms.vercel.app/index.html');
  url.hash = new URLSearchParams({workerSetup:code}).toString();
  return url.href;
}

// URL fragments are not sent to the web server. Remove the code from the
// address/history immediately and retain it only in this tab's session.
export function captureWorkerSetupLink({location=window.location,history=window.history,storage=sessionStorage}={}) {
  const hash = new URLSearchParams(location.hash.slice(1));
  const code = hash.get('workerSetup');
  if (code === null) return false;
  hash.delete('workerSetup');
  history.replaceState(null,'',location.pathname+location.search+(hash.toString()?'#'+hash.toString():''));
  if (!validCode(code)) return false;
  storage.setItem(CODE_KEY,JSON.stringify({code,owner:null}));
  storage.setItem(OPEN_KEY,'true');
  return true;
}

export function clearWorkerSetup(storage=sessionStorage) {
  storage.removeItem(CODE_KEY);
  storage.removeItem(OPEN_KEY);
}

export function workerSetupCode(user,storage=sessionStorage) {
  if (!user) return ''; // Preserve a pending local pairing across admin login.
  if (!isAdmin(user)) {clearWorkerSetup(storage);return '';}
  let value;
  try {value=JSON.parse(storage.getItem(CODE_KEY));}catch{clearWorkerSetup(storage);return '';}
  if (!value) return '';
  if (!validCode(value.code) || (value.owner && value.owner!==user.username)) {clearWorkerSetup(storage);return '';}
  storage.setItem(CODE_KEY,JSON.stringify({...value,owner:user.username}));
  return value.code;
}

export function rememberWorkerSetup(user,code,storage=sessionStorage) {
  if (!isAdmin(user) || !validCode(code)) return;
  storage.setItem(CODE_KEY,JSON.stringify({code,owner:user.username}));
}

export function shouldOpenWorkerSetup(storage=sessionStorage) {
  return storage.getItem(OPEN_KEY)==='true';
}
export function finishOpeningWorkerSetup(storage=sessionStorage) {
  storage.removeItem(OPEN_KEY);
}
