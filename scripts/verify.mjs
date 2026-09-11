import assert from 'node:assert/strict';
import {captureVerificationInputs,captureVerificationFingerprint,assertVerificationFingerprint} from './verification-fingerprint.mjs';
import {spawn,spawnSync} from 'node:child_process';
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
const keys=['launch','render','input','coreLoop','outcome','restart'];
const report={schemaVersion:3,status:'NOT_RUN',verify:{command:'npm run verify',exitCode:null,suites:[]},completeRun:{id:'ridge-return',cleanContext:true,terminal:'designed-outcome',restart:'initial-state',evidence:'qa/evidence/run.json'},checks:Object.fromEntries(keys.map(k=>[k,'NOT_RUN'])),limitations:[{scope:'target device',reason:'Automated evidence is Linux Chrome 150 at 1440×900. macOS Safari/Chrome and trackpad have not been tested.'},{scope:'experience',reason:'Natural play duration and subjective enjoyment require player feedback. Both ring styles, shared platform memory and the ridge ending have real browser input evidence; the main crossing outcome and guard/companion boundaries have model regression evidence.'}]};
report.runtimeEnvironment={platform:process.platform,browserExecutable:process.env.CHROME_PATH||'/usr/bin/google-chrome',temporaryDirectory:process.env.TMPDIR||null};
await mkdir('qa/evidence',{recursive:true});let server,serverExited=false;
async function publish(){await writeFile('qa/verification.json.tmp',JSON.stringify(report,null,2));await rename('qa/verification.json.tmp','qa/verification.json');}
await publish();
try{
 // These immutable UI exports live outside qa/fixtures and may be omitted by
 // a sparse checkout. Fail before launching a long browser matrix if missing.
 for(const path of ['qa/evidence/market-2026-09-11T15-13-29-584Z/market-west-entry.json','qa/evidence/market-2026-09-11T15-48-58-773Z/market-west-entry.json']){
  try{await readFile(path);}catch(error){throw Error(`Missing required historical UI export: ${path}. Restore its committed bytes in this checkout before verification.`,{cause:error});}
 }
 const inputsBefore=await captureVerificationInputs(process.cwd());
 for(const script of ['test','build']){const r=spawnSync('npm',['run',script],{stdio:'inherit'});report.verify.suites.push({command:`npm run ${script}`,exitCode:r.status});if(r.status!==0)throw Error(`${script} failed`);}
 report.fingerprint=await captureVerificationFingerprint(process.cwd());
 assert.deepEqual(report.fingerprint.inputs,inputsBefore,'Source or verification inputs changed during model tests/build');
 await publish();
 server=spawn('npm',['run','preview','--','--host','127.0.0.1','--port','4187','--strictPort'],{stdio:'ignore',detached:true});
 server.on('exit',()=>{serverExited=true;});server.on('error',()=>{serverExited=true;});
 let ready=false;for(let i=0;i<100;i++){if(serverExited)throw Error('Owned preview process exited before verification');try{const r=await fetch('http://127.0.0.1:4187/');if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}
 await new Promise(r=>setTimeout(r,400));if(serverExited)throw Error('Preview port is occupied or the owned server failed');
 if(!ready)throw Error('Preview server failed to start');
 // Every new-market browser runs serially on this exact frozen production build.
 for(const config of [
  {script:'market-threat-view-check.mjs',extra:{MARKET_START:'',MARKET_THREAT_OUTPUT:'qa/evidence/market-threat-verified.json'}},
  {script:'market-view-check.mjs',extra:{MARKET_VIEW_DEVICE:'all'}},
  {script:'market-consequences-check.mjs',extra:{MARKET_CONSEQUENCES_OUTPUT:'qa/evidence/market-consequences-verified.json'}},
  ...['desktop','phone'].map(device=>({script:'market-check.mjs',extra:{MARKET_DEVICE:device,MARKET_CASE:'',MARKET_START:'',MARKET_OUTPUT:`qa/evidence/market-${device}-verified.json`}}))
 ]){
  const child=spawn(process.execPath,[`scripts/${config.script}`],{stdio:'inherit',env:{...process.env,GAME_URL:'http://127.0.0.1:4187/',...config.extra}});
  const code=await new Promise(r=>child.on('exit',r));report.verify.suites.push({command:`node scripts/${config.script}`,environment:config.extra,exitCode:code});if(code!==0)throw Error(`${config.script} failed on ${config.extra.MARKET_DEVICE||'viewports'}`);
 }
 // Check the corrected continuous-input driver and new chapter before the
 // remaining regression matrix. Every required suite still runs once.
 for(const script of ['journey-check.mjs','journey-view-check.mjs','kiln-view-check.mjs','kiln-check.mjs','kiln-consequences-check.mjs']){
  const child=spawn(process.execPath,[`scripts/${script}`],{stdio:'inherit',env:{...process.env,GAME_URL:'http://127.0.0.1:4187/',KILN_ROUTE:'all',KILN_CONSEQUENCE_CASE:'all',KILN_OUTPUT:'qa/evidence/kiln-check.json'}});
  const code=await new Promise(r=>child.on('exit',r));report.verify.suites.push({command:`node scripts/${script}`,exitCode:code});if(code!==0)throw Error(`${script} failed`);
 }
 const regression=spawn(process.execPath,['scripts/ui-regression.mjs'],{stdio:'inherit',env:{...process.env,GAME_URL:'http://127.0.0.1:4187/'}});
 const regressionExit=await new Promise(r=>regression.on('exit',r));report.verify.suites.push({command:'node scripts/ui-regression.mjs',exitCode:regressionExit});if(regressionExit!==0)throw Error('UI save/input regression failed');
 for(const script of ['camera-drag-check.mjs','home-layout-check.mjs','interaction-check.mjs','mobile-render-check.mjs','combat-check.mjs','projectile-cover-check.mjs','region-art-check.mjs']){
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
 for(const script of ['life-check.mjs','life-hold-check.mjs','life-mobile-check.mjs','presentation-check.mjs','canal-check.mjs','canal-view-check.mjs','canal-revisit-check.mjs']){
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
 report.companion={route:'qa/evidence/journey-check.json',viewports:'qa/evidence/journey-view.json',source:'Fixed genuine content 3 canal completion; current content 7 migration and all main progression use real browser input.',limitations:'South-to-north changes, early departure and solo-then-shared completion have model coverage; browser proves the uninterrupted northern shared route and separate paused save.'};
 report.kiln={routes:'qa/evidence/kiln-check.json',consequences:'qa/evidence/kiln-consequences.json',viewports:'qa/evidence/kiln-view.json',source:'Unmodified actual 0.5 completion imported through settings; all new progression uses actual world/UI input.',scope:'Zero-mana two-ended travel, witnessed borrow/intact return, permission/rest, independent save restore, burned persistence, player recovery after dropping a screen at zero mana, restart and three viewports.',limitations:'Real-browser coverage is Linux Chrome and DPR/touch emulation; held-expiry recovery and other boundary combinations also have model coverage.'};
 report.market={threat:'qa/evidence/market-threat-verified.json',consequences:'qa/evidence/market-consequences-verified.json',viewports:'qa/evidence/market-view.json',desktop:'qa/evidence/market-desktop-verified.json',phone:'qa/evidence/market-phone-verified.json',source:'Fixed actual 0.6 two-ended kiln settings export, unchanged; formal travel and reporting use normal UI.',scope:'Actual private west-to-east crossing and canal connection, public east-to-west return to crossing, home report, three viewports and genuine single-finger camera control.',limitations:'Linux Chrome and touch/DPR emulation, not physical Mac/Safari/phone. Production waiting pose has a separate actual lure/withdrawal check at desktop DPR1; DPR2/DPR3 art views and model/whitebox boundaries are separate evidence. Visual framing uses ordinary pause; the phone full route frames each target while paused, then resumes actual walking. It does not establish uninterrupted phone combat.'};
 // New activity and its camera/art checks use this same frozen build. The
 // presentation input is this run's actual UI export, never a rewritten fixture.
 const sparOutput='qa/evidence/spar-production-verified.json';
 const sparEnv={SPAR_DEVICE:'desktop,phone',SPAR_CASE:'hit,ward',SPAR_STANCE:'front',SPAR_OUTPUT:sparOutput};
 const sparChild=spawn(process.execPath,['scripts/spar-production-check.mjs'],{stdio:'inherit',env:{...process.env,GAME_URL:'http://127.0.0.1:4187/',...sparEnv}});
 const sparCode=await new Promise(r=>sparChild.on('exit',r));report.verify.suites.push({command:'node scripts/spar-production-check.mjs',environment:sparEnv,exitCode:sparCode});if(sparCode!==0)throw Error('Spar production input/save/report matrix failed');
 const spar=JSON.parse(await readFile(sparOutput,'utf8'));assert.equal(spar.status,'PASS');assert.equal(spar.cases.length,4);assert.ok(spar.cases.every(c=>c.status==='PASS'));
 const staged=spar.cases[0].exports.find(e=>e.path.endsWith('positioning-paused.json')),reported=spar.cases[0].exports.find(e=>e.path.endsWith('reported-paused.json'));assert.ok(staged&&reported);
 const sparSides=[];
 for(const stance of ['left','right']){
  const output=`qa/evidence/spar-${stance}-verified.json`,environment={SPAR_DEVICE:'phone',SPAR_CASE:'ward',SPAR_STANCE:stance,SPAR_OUTPUT:output};
  const child=spawn(process.execPath,['scripts/spar-production-check.mjs'],{stdio:'inherit',env:{...process.env,GAME_URL:'http://127.0.0.1:4187/',...environment}});
  const code=await new Promise(r=>child.on('exit',r));report.verify.suites.push({command:'node scripts/spar-production-check.mjs',environment,exitCode:code});if(code!==0)throw Error(`Spar ${stance} phone route failed`);
  const result=JSON.parse(await readFile(output,'utf8'));assert.equal(result.status,'PASS');assert.equal(result.cases.length,1);assert.equal(result.cases[0].stance,stance);sparSides.push({stance,evidence:output});
 }
 const sparPresentationOutput='qa/evidence/spar-presentation-verified.json';
 const sparPresentationEnv={SPAR_START:staged.path,SPAR_REPORT_START:reported.path,SPAR_PRESENTATION_OUTPUT:sparPresentationOutput};
 const sparPresentationChild=spawn(process.execPath,['scripts/spar-presentation-check.mjs'],{stdio:'inherit',env:{...process.env,GAME_URL:'http://127.0.0.1:4187/',...sparPresentationEnv}});
 const sparPresentationCode=await new Promise(r=>sparPresentationChild.on('exit',r));report.verify.suites.push({command:'node scripts/spar-presentation-check.mjs',environment:sparPresentationEnv,exitCode:sparPresentationCode});if(sparPresentationCode!==0)throw Error('Spar camera/pause/presentation matrix failed');
 const sparPresentation=JSON.parse(await readFile(sparPresentationOutput,'utf8'));assert.equal(sparPresentation.status,'PASS');assert.equal(sparPresentation.cases.length,3);
 const sparFacingOutput='qa/evidence/spar-facing-verified.json';
 const sparFacingEnv={SPAR_START:staged.path,SPAR_FACING_OUTPUT:sparFacingOutput};
 const sparFacingChild=spawn(process.execPath,['scripts/spar-facing-check.mjs'],{stdio:'inherit',env:{...process.env,GAME_URL:'http://127.0.0.1:4187/',...sparFacingEnv}});
 const sparFacingCode=await new Promise(r=>sparFacingChild.on('exit',r));report.verify.suites.push({command:'node scripts/spar-facing-check.mjs',environment:sparFacingEnv,exitCode:sparFacingCode});if(sparFacingCode!==0)throw Error('Spar stationary ward facing regression failed');
 assert.equal(JSON.parse(await readFile(sparFacingOutput,'utf8')).status,'PASS');
 report.spar={production:sparOutput,sides:sparSides,presentation:sparPresentationOutput,facing:sparFacingOutput,source:'Fixed authentic v6 first-chapter UI export; all progression uses actual inputs. Presentation uses this run’s unchanged positioning and reported v7 exports.',scope:'Desktop/phone front hit and ward plus phone left/right ward, actual companion wait, positioning save/reimport, one emitted shot and real resources, return/report/reimport; three viewport camera and pause checks.',limitations:'Linux Chrome with DPR/touch emulation, not physical Mac/Safari/phone. Setup and captures use ordinary pause; emission through settlement is unpaused. Repeated rounds, residual stop and exceptional defeat have separate model/whitebox evidence, not these six production cases. Screenshots still require review.'};
 await assertVerificationFingerprint(process.cwd(),report.fingerprint);
 report.status='PASS';report.verify.exitCode=0;for(const k of keys)report.checks[k]='PASS';
}catch(e){report.status='FAIL';report.verify.exitCode=1;report.limitations.push({scope:'build',reason:String(e)});report.checks.coreLoop='FAIL';console.error(e);process.exitCode=1;}
finally{if(server?.pid)try{process.kill(-server.pid,'SIGTERM');}catch{}await publish();}
