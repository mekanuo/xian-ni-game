import {execFileSync} from 'node:child_process';
import {mkdtemp,cp,writeFile,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const run=(cmd,args,cwd=process.cwd())=>execFileSync(cmd,args,{cwd,encoding:'utf8',stdio:['pipe','pipe','inherit']}).trim();
const repo='mekanuo/xian-ni-game',remote=`https://github.com/${repo}.git`;
const verification=JSON.parse(await readFile('qa/verification.json','utf8'));
if(verification.status!=='PASS')throw Error('The complete production candidate must pass npm run verify before publishing');
if(run('git',['status','--porcelain']))throw Error('Commit the reviewed source and QA milestone before deploying');
const sourceCommit=run('git',['rev-parse','HEAD']);
const root=await mkdtemp(join(tmpdir(),'xian-ni-pages-'));
const branchExists=Boolean(run('git',['ls-remote','--heads',remote,'gh-pages']));
if(branchExists)run('git',['clone','--quiet','--single-branch','--branch','gh-pages',remote,root]);
else{run('git',['init','--quiet','--initial-branch=gh-pages'],root);run('git',['remote','add','origin',remote],root);}
for(const entry of await readdir(root))if(entry!=='.git')await rm(join(root,entry),{recursive:true,force:true});
await cp(resolve('dist'),root,{recursive:true});await writeFile(join(root,'.nojekyll'),'');
const release={game:'山门之外',version:'0.1.0',sourceCommit,builtAt:new Date().toISOString()};
await writeFile(join(root,'release.json'),JSON.stringify(release,null,2));
run('git',['add','.'],root);run('git',['commit','-m',`Publish first playable ${sourceCommit.slice(0,7)}`],root);
console.log(run('git',['-c','credential.helper=!gh auth git-credential','push','-u','origin','gh-pages'],root));
let pages;try{pages=JSON.parse(run('gh',['api',`repos/${repo}/pages`]));}catch{
 const config=join(root,'pages-config.json');await writeFile(config,JSON.stringify({source:{branch:'gh-pages',path:'/'},build_type:'legacy'}));
 // GitHub may create the site despite an empty creation response. Reconcile with GET.
 try{run('gh',['api',`repos/${repo}/pages`,'--method','POST','--input',config]);}catch{}
 pages=JSON.parse(run('gh',['api',`repos/${repo}/pages`]));
}
console.log(JSON.stringify({url:pages.html_url||'https://mekanuo.github.io/xian-ni-game/',sourceCommit,distributionCommit:run('git',['rev-parse','HEAD'],root)},null,2));
