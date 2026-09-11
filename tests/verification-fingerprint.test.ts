import { afterEach, beforeEach, describe, expect, it } from 'vitest';
// Node-only tests use dynamic imports without adding Node typings to the browser project.
const fs = await import('node:fs/promises' as string);
const { tmpdir } = await import('node:os' as string);
const { join } = await import('node:path' as string);
const { captureVerificationInputs, captureVerificationFingerprint, compareVerificationFingerprints, assertVerificationFingerprint } = await import('../scripts/verification-fingerprint.mjs' as string);
let root:string;
const write=async(path:string,contents:string)=>{await fs.mkdir(join(root,path,'..'),{recursive:true});await fs.writeFile(join(root,path),contents);};
beforeEach(async()=>{
 root=await fs.mkdtemp(join(tmpdir(),'xian-ni-fingerprint-'));
 for(const [path,contents] of Object.entries({
  'index.html':'<script type="module" src="/src/main.ts"></script>',
  'package.json':'{"scripts":{"build":"tsc --noEmit && vite build"}}',
  'package-lock.json':'{"lockfileVersion":3}',
  'vite.config.ts':'export default {base:"./"}',
  'tsconfig.json':'{"include":["src/**/*.ts","tests/**/*.ts"]}',
  'src/main.ts':'import "./style.css";', 'src/style.css':'body{margin:0}',
  'src/game/model.ts':'export const version=1;', 'src/whitebox/demo.ts':'export {};',
  'public/art/a.png':'synthetic asset bytes', 'tests/model.test.ts':'export {};',
  'qa/fixtures/old-save.json':'{"version":3}',
  'scripts/verify.mjs':'console.log("verify")', 'scripts/deploy-pages.mjs':'console.log("deploy")',
  'dist/index.html':'<script src="./assets/app.js"></script>', 'dist/assets/app.js':'console.log(1)',
 }))await write(path,contents);
});
afterEach(async()=>{await fs.rm(root,{recursive:true,force:true});});

describe('production verification fingerprint',()=>{
 it('is deterministic, sorted, relative, and hashes actual bytes without Git identity',async()=>{
  const a=await captureVerificationFingerprint(root),b=await captureVerificationFingerprint(root);
  expect(a).toEqual(b);expect(a.schemaVersion).toBe(1);expect(a.policy).toBe('xian-ni-production-v1');
  const paths=a.inputs.files.map((f:{path:string})=>f.path);expect(paths).toEqual([...paths].sort());
  expect(paths).toContain('src/game/model.ts');expect(paths).toContain('public/art/a.png');expect(paths).toContain('tests/model.test.ts');expect(paths).toContain('scripts/verify.mjs');expect(paths).toContain('src/whitebox/demo.ts');
  expect(a.dist.files.map((f:{path:string})=>f.path)).toEqual(['assets/app.js','index.html']);
  for(const group of [a.inputs,a.dist]){expect(group.sha256).toMatch(/^[a-f0-9]{64}$/);for(const f of group.files){expect(f.sha256).toMatch(/^[a-f0-9]{64}$/);expect(f.bytes).toBeGreaterThan(0);expect(f.path.startsWith('/')).toBe(false);}}
  expect(JSON.stringify(a)).not.toContain(root);
 });
 it.each(['src/game/model.ts','src/style.css','src/whitebox/demo.ts','public/art/a.png','tests/model.test.ts','scripts/verify.mjs','scripts/deploy-pages.mjs','package.json','package-lock.json','vite.config.ts','tsconfig.json'])('rejects a changed build or verification input: %s',async(path)=>{
  const before=await captureVerificationFingerprint(root);await write(path,'changed bytes');
  const result=compareVerificationFingerprints(before,await captureVerificationFingerprint(root));
  expect(result.ok).toBe(false);expect(result.inputs.changed).toEqual([path]);expect(result.dist.changed).toEqual([]);
  await expect(assertVerificationFingerprint(root,before)).rejects.toThrow(path);
 });
 it.each(['src/added.ts','public/art/new.png','scripts/new-check.mjs','tsconfig.build.json','postcss.config.cjs','vitest.config.ts','npm-shrinkwrap.json','.env.production.local','.npmrc'])('rejects a newly introduced in-scope input: %s',async(path)=>{
  const before=await captureVerificationFingerprint(root);await write(path,'new file');
  expect(compareVerificationFingerprints(before,await captureVerificationFingerprint(root))).toMatchObject({ok:false,inputs:{added:[path]}});
 });
 it('rejects deleted input paths even when remaining file bytes are unchanged',async()=>{
  const before=await captureVerificationFingerprint(root);await fs.unlink(join(root,'public/art/a.png'));
  expect(compareVerificationFingerprints(before,await captureVerificationFingerprint(root))).toMatchObject({ok:false,inputs:{removed:['public/art/a.png']}});
 });
 it.each(['change','add','remove'])('rejects distribution %s independently from source',async(kind)=>{
  const before=await captureVerificationFingerprint(root);
  if(kind==='remove')await fs.unlink(join(root,'dist/assets/app.js'));else await write(kind==='add'?'dist/assets/extra.png':'dist/assets/app.js','changed dist');
  const result=compareVerificationFingerprints(before,await captureVerificationFingerprint(root));expect(result.ok).toBe(false);
  expect(result.inputs).toEqual({added:[],removed:[],changed:[]});
  expect(result.dist[kind==='change'?'changed':kind==='add'?'added':'removed']).toEqual([kind==='add'?'assets/extra.png':'assets/app.js']);
 });
 it('permits docs, delegated QA inputs/evidence, commit metadata and independent whitebox entry/config updates',async()=>{
  const before=await captureVerificationFingerprint(root);
  for(const path of ['docs/PROGRESS.md','design/REVIEW.md','HANDOFF.md','AGENTS.md','qa/verification.json','qa/evidence/latest.png','qa/fixtures/old-save.json','.git/HEAD','market-whitebox.html','vite.market-whitebox.config.ts','novel.txt','.worktrees/other/src/main.ts','node_modules/fake/index.js'])await write(path,'not a production input');
  await fs.utimes(join(root,'src/main.ts'),new Date(),new Date());
  expect(await captureVerificationFingerprint(root)).toEqual(before);await expect(assertVerificationFingerprint(root,before)).resolves.toEqual(before);
 });
 it('hashes config secrets without writing their contents into the manifest',async()=>{
  await write('.env.production','VITE_EXAMPLE=private-value');await write('.npmrc','//example.invalid/:_authToken=private-token');
  const manifest=await captureVerificationFingerprint(root);expect(JSON.stringify(manifest)).not.toMatch(/private-value|private-token/);
  expect(manifest.inputs.files.map((f:{path:string})=>f.path)).toContain('.npmrc');
 });
 it('fails closed for missing build inputs, missing or empty dist, and symlinked included files',async()=>{
  await fs.unlink(join(root,'index.html'));await expect(captureVerificationFingerprint(root)).rejects.toThrow('index.html');await write('index.html','restored');
  await fs.rm(join(root,'dist'),{recursive:true});await expect(captureVerificationFingerprint(root)).rejects.toThrow('dist');await fs.mkdir(join(root,'dist'));await expect(captureVerificationFingerprint(root)).rejects.toThrow('dist');
  await write('dist/index.html','okay');await fs.symlink(join(root,'index.html'),join(root,'src/linked.ts'));
  await expect(captureVerificationFingerprint(root)).rejects.toThrow(/symbolic|symlink/i);
 });
 it('rejects corrupt, unsupported or self-inconsistent saved manifests instead of trusting a digest alone',async()=>{
  const before=await captureVerificationFingerprint(root);
  for(const broken of [{...before,schemaVersion:999},{...before,policy:'another-project'},{...before,inputs:{...before.inputs,sha256:'0'.repeat(64)}},{...before,dist:{...before.dist,files:[]}}])await expect(assertVerificationFingerprint(root,broken)).rejects.toThrow();
 });
});

it('detects equal-length byte changes and uses the known SHA-256 for actual output bytes',async()=>{
 const before=await captureVerificationFingerprint(root);
 const original=before.dist.files.find((f:{path:string})=>f.path==='assets/app.js');
 expect(original.sha256).toBe('0a286891c11c056e1ab5bfc25bf5d6b2f5b06d38eac10944f678fd8a2e70c393');
 await write('dist/assets/app.js','console.log(2)');const current=await captureVerificationFingerprint(root);
 expect(current.dist.files.find((f:{path:string})=>f.path==='assets/app.js').bytes).toBe(original.bytes);
 expect(compareVerificationFingerprints(before,current)).toMatchObject({ok:false,dist:{changed:['assets/app.js']}});
});

it('captures production inputs before any dist exists and matches the full manifest input group',async()=>{
 expect(typeof captureVerificationInputs).toBe('function');
 const complete=await captureVerificationFingerprint(root);await fs.rm(join(root,'dist'),{recursive:true});
 expect(await captureVerificationInputs(root)).toEqual(complete.inputs);
 await expect(captureVerificationFingerprint(root)).rejects.toThrow('dist');
});
it('input-only capture detects changes made after pre-test capture before a later build',async()=>{
 expect(typeof captureVerificationInputs).toBe('function');
 await fs.rm(join(root,'dist'),{recursive:true});const before=await captureVerificationInputs(root);
 await write('src/main.ts','export const changedDuringTests=true;');const after=await captureVerificationInputs(root);
 expect(after.sha256).not.toBe(before.sha256);
 await write('dist/index.html','rebuilt output');expect((await captureVerificationFingerprint(root)).inputs).toEqual(after);
});
it('input-only capture still rejects missing required sources and ignores generated evidence',async()=>{
 expect(typeof captureVerificationInputs).toBe('function');
 const before=await captureVerificationInputs(root);await write('qa/evidence/fresh.json','{"result":"new evidence"}');
 expect(await captureVerificationInputs(root)).toEqual(before);
 await fs.unlink(join(root,'package-lock.json'));await expect(captureVerificationInputs(root)).rejects.toThrow('package-lock.json');
});
