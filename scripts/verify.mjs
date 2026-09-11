import {spawn,spawnSync} from 'node:child_process';
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
const keys=['launch','render','input','coreLoop','outcome','restart'];
const report={schemaVersion:3,status:'NOT_RUN',verify:{command:'npm run verify',exitCode:null,suites:[]},completeRun:{id:'ridge-return',cleanContext:true,terminal:'designed-outcome',restart:'initial-state',evidence:'qa/evidence/run.json'},checks:Object.fromEntries(keys.map(k=>[k,'NOT_RUN'])),limitations:[{scope:'target device',reason:'Automated evidence is Linux Chrome 150 at 1440×900. macOS Safari/Chrome and trackpad have not been tested.'},{scope:'experience',reason:'Natural play duration and subjective enjoyment require player feedback. Both ring styles, shared platform memory and the ridge ending have real browser input evidence; the main crossing outcome and guard/companion boundaries have model regression evidence.'}]};
await mkdir('qa/evidence',{recursive:true});let server,serverExited=false;
async function publish(){await writeFile('qa/verification.json.tmp',JSON.stringify(report,null,2));await rename('qa/verification.json.tmp','qa/verification.json');}
await publish();
try{
 for(const script of ['test','build']){const r=spawnSync('npm',['run',script],{stdio:'inherit'});report.verify.suites.push({command:`npm run ${script}`,exitCode:r.status});if(r.status!==0)throw Error(`${script} failed`);}
 server=spawn('npm',['run','preview','--','--host','127.0.0.1','--port','4187','--strictPort'],{stdio:'ignore',detached:true});
 server.on('exit',()=>{serverExited=true;});server.on('error',()=>{serverExited=true;});
 let ready=false;for(let i=0;i<100;i++){if(serverExited)throw Error('Owned preview process exited before verification');try{const r=await fetch('http://127.0.0.1:4187/');if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}
 await new Promise(r=>setTimeout(r,400));if(serverExited)throw Error('Preview port is occupied or the owned server failed');
 if(!ready)throw Error('Preview server failed to start');
 const regression=spawn(process.execPath,['scripts/ui-regression.mjs'],{stdio:'inherit',env:{...process.env,GAME_URL:'http://127.0.0.1:4187/'}});
 const regressionExit=await new Promise(r=>regression.on('exit',r));report.verify.suites.push({command:'node scripts/ui-regression.mjs',exitCode:regressionExit});if(regressionExit!==0)throw Error('UI save/input regression failed');
 for(const script of ['camera-drag-check.mjs','home-layout-check.mjs','interaction-check.mjs','mobile-render-check.mjs','combat-check.mjs','region-art-check.mjs']){
  const check=spawn(process.execPath,[`scripts/${script}`],{stdio:'inherit',env:{...process.env,GAME_URL:'http://127.0.0.1:4187/'}});
  const code=await new Promise(r=>check.on('exit',r));report.verify.suites.push({command:`node scripts/${script}`,exitCode:code});if(code!==0)throw Error(`${script} failed`);
 }
 // Serial browsers avoid contention in software rendering on this QA machine.
 const routes=[];for(const script of ['playthrough.mjs','main-route-check.mjs']){
  const child=spawn(process.execPath,[`scripts/${script}`],{stdio:'inherit',env:{...process.env,GAME_URL:'http://127.0.0.1:4187/'}});
  const code=await new Promise(r=>child.on('exit',r));routes.push({command:`node scripts/${script}`,exitCode:code});
 }
 report.verify.suites.push(...routes);
 if(routes.some(r=>r.exitCode!==0))throw Error('A complete browser route failed; see corresponding qa/evidence failure trace');
 // The desktop continuation exports real intermediate saves for touch replay.
 for(const script of ['life-check.mjs','life-hold-check.mjs','life-mobile-check.mjs','presentation-check.mjs','canal-check.mjs','canal-view-check.mjs','canal-revisit-check.mjs','journey-check.mjs','journey-view-check.mjs']){
  const child=spawn(process.execPath,[`scripts/${script}`],{stdio:'inherit',env:{...process.env,GAME_URL:'http://127.0.0.1:4187/'}});
  const code=await new Promise(r=>child.on('exit',r));report.verify.suites.push({command:`node scripts/${script}`,exitCode:code});if(code!==0)throw Error(`${script} failed`);
 }
 const evidence=JSON.parse(await readFile('qa/evidence/playthrough-draft.json','utf8'));
 if(!keys.every(k=>evidence.observations[k]))throw Error('Incomplete browser evidence');
 await writeFile('qa/evidence/run.json',JSON.stringify(evidence,null,2));
 const main=JSON.parse(await readFile('qa/evidence/main-route.json','utf8'));if(main.status!=='PASS'||!main.observations.outcome||!main.observations.restart)throw Error('Incomplete main crossing evidence');
 report.additionalCompleteRuns=[{id:'main-return',cleanContext:true,terminal:'designed-outcome',restart:'initial-state',evidence:'qa/evidence/main-route.json'}];
 report.continuation={desktop:'qa/evidence/life-check.json',hold:'qa/evidence/life-hold-check.json',mobile:'qa/evidence/life-mobile.json',source:'Real 0.2.2 chapter-ending UI exports; continuation uses browser inputs only.'};
 report.limitations[1].reason='Natural play duration and subjective enjoyment require player feedback. Both ring styles, shared platform memory, protected-basket bridge, main crossing and ridge endings have real browser input evidence; guard/companion failure boundaries also have model regression evidence.';
 report.presentation='qa/evidence/presentation.json';
 report.adventure={canal:'qa/evidence/canal-check.json',viewports:'qa/evidence/canal-view.json',methods:['zero-resource diversion','uninterrupted phone hold'],limitations:'Optional clamp, scent ownership, companion absence and surge boundary variants have model tests; the two principal methods and restart have real browser input coverage. Phone evidence is touch/DPR emulation, not physical device testing.',source:'Real 0.3.0 chapter-ending UI export; all adventure progression uses browser inputs.'};
 report.companion={route:'qa/evidence/journey-check.json',viewports:'qa/evidence/journey-view.json',source:'Fixed genuine content 3 canal completion; content 4 migration and all main progression use real browser input.',limitations:'South-to-north changes, early departure and solo-then-shared completion have model coverage; browser proves the uninterrupted northern shared route and separate paused save.'};
 report.status='PASS';report.verify.exitCode=0;for(const k of keys)report.checks[k]='PASS';
}catch(e){report.status='FAIL';report.verify.exitCode=1;report.limitations.push({scope:'build',reason:String(e)});report.checks.coreLoop='FAIL';console.error(e);process.exitCode=1;}
finally{if(server?.pid)try{process.kill(-server.pid,'SIGTERM');}catch{}await publish();}
