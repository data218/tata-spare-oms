import 'dotenv/config';
import {readWorkerSecrets,secretDirectory} from './src/location-secrets.js';
import {workerSetupUrl} from './src/worker-pairing.js';
import {spawn} from 'node:child_process';
const openBrowser=process.argv.includes('--open');
try {
  let identity;
  for(let attempt=0;attempt<10;attempt++){
    try { identity=readWorkerSecrets();break; }
    catch(error){if(!/identity not found/.test(error.message)||attempt===9)throw error;await new Promise(resolve=>setTimeout(resolve,1000));}
  }
  if (openBrowser) {
    const url=workerSetupUrl(identity.setupCode);
    const windows=process.platform==='win32';
    // Pass the private fragment through stdin, not the Windows process command line.
    const [command,args]=windows?['powershell.exe',['-NoProfile','-NonInteractive','-WindowStyle','Hidden','-Command','$target=[Console]::In.ReadToEnd(); Start-Process -FilePath $target']]
      :process.platform==='darwin'?['open',[url]]:['xdg-open',[url]];
    await new Promise((resolve,reject)=>{
      const child=spawn(command,args,{stdio:windows?['pipe','ignore','ignore']:'ignore',windowsHide:true});
      child.once('error',reject);
      child.once('exit',code=>code===0?resolve():reject(new Error('Browser launch failed.')));
      if(windows){child.stdin.on('error',()=>{});child.stdin.end(url);}
    });
    console.log('Opening Tata OMS. Sign in as admin; Settings will open and the setup code will fill automatically.');
    console.log('The code stays only in that browser tab and is cleared on logout. Do not share the pairing link.');
  } else {
    console.log('\nWorker setup code (keep private; do not post it in chat or screenshots):\n');
    console.log(identity.setupCode);
    console.log('\nEnter this code in Settings > Dealership Locations when testing/saving credentials.');
    console.log('Worker identity folder: '+secretDirectory());
  }
} catch(error) {
  console.error(openBrowser?'Could not open worker setup. Confirm the updated worker is running, or use npm.cmd run worker:access to copy its code privately.':error.message);
  process.exitCode=1;
}
