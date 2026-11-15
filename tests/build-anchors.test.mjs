import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {replaceExactly,replaceRegion} from '../scripts/build-anchors.mjs';
const root=new URL('../',import.meta.url);
async function fixture(run) {
  const dir=await mkdtemp(join(tmpdir(),'nikki-build-'));
  try {
    for(const name of ['scripts','concept','demo','app','package.json'])await cp(new URL(name,root),join(dir,name),{recursive:true});
    await run(dir);
  }finally{await rm(dir,{recursive:true,force:true});}
}
const build=(dir,script='build-cloud.mjs')=>spawnSync(process.execPath,['scripts/'+script],{cwd:dir,encoding:'utf8',timeout:20000});
test('exact anchors reject ambiguity and insert code literally',()=>{
  assert.equal(replaceExactly('one MARK two','MARK','$& $$',{file:'fixture'}),'one $& $$ two');
  assert.throws(()=>replaceExactly('absent','MARK','x',{file:'fixture'}),/fixture.*expected 1.*found 0/);
  assert.throws(()=>replaceExactly('MARK MARK','MARK','x',{file:'fixture'}),/expected 1.*found 2/);
  assert.throws(()=>replaceRegion('/* NIKKI:X:END */ /* NIKKI:X:START */','X','x','fixture'),/reversed region/);
});
// The older prototypes are only used by the connected demo; the cloud build has its own sources.
const demo='build-connected-demo.mjs';
const cases=[
 ['missing store hook','concept/site-skeleton.html','/* NIKKI:STORE_EXTENSION */','',/site-skeleton.html.*STORE_EXTENSION.*found 0/,demo],
 ['duplicate store hook','concept/site-skeleton.html','/* NIKKI:STORE_EXTENSION */','/* NIKKI:STORE_EXTENSION */ /* NIKKI:STORE_EXTENSION */',/site-skeleton.html.*STORE_EXTENSION.*found 2/,demo],
 ['missing escaping anchor','concept/site-skeleton.html','+ p.title +','+ String(p.title) +',/site-skeleton.html.*p.title.*expected 6.*found 5/,demo],
 ['duplicated escaping anchor','concept/site-skeleton.html','+ t.key +','+ t.key + 0 + t.key +',/site-skeleton.html.*t.key.*expected 1.*found 2/,demo],
 ['missing Claude region','concept/intake-prototype.html','/* NIKKI:CLAUDE_SETUP:END */','',/intake-prototype.html.*CLAUDE_SETUP:END.*found 0/,demo],
 ['duplicate option B script','concept/ontdekken-optie-b.html','<script>','<script></script><script>',/ontdekken-optie-b.html.*expected one store script/],
 ['missing intake script slot','app/intake/intake.html','/*INTAKE_SCRIPT*/','',/app\/intake\/intake.html.*expected one.*INTAKE_SCRIPT/],
 ['duplicated intake style slot','app/intake/intake.html','/*INTAKE_STYLE*/','/*INTAKE_STYLE*/ /*INTAKE_STYLE*/',/app\/intake\/intake.html.*expected one.*INTAKE_STYLE/],
 ['closing script tag inside the intake code','app/intake/steps.js','// Nieuw stuk als gesprek','// </script> Nieuw stuk als gesprek',/app\/intake.*closing script tag/]
];
for(const [name,file,from,to,error,script] of cases)test('build fails loudly: '+name,()=>fixture(async dir=>{
  const p=join(dir,file);await writeFile(p,(await readFile(p,'utf8')).replace(from,to));
  const result=build(dir,script);assert.notEqual(result.status,0);assert.match(result.stderr,error);
}));
// The cloud build no longer reads the older intake prototype at all.
test('the cloud build does not depend on the older intake prototype',()=>fixture(async dir=>{
  await rm(join(dir,'concept/intake-prototype.html'));await rm(join(dir,'demo/intake-bridge.js'));
  const result=build(dir);assert.equal(result.status,0,result.stderr);
}));
test('hook regions tolerate whitespace and photo-block formatting changes',()=>fixture(async dir=>{
  for(const file of ['concept/site-skeleton.html','concept/intake-prototype.html','demo/intake-bridge.js']){
    const p=join(dir,file);let s=await readFile(p,'utf8');
    s=s.replaceAll('/* NIKKI:','\n    /* NIKKI:');
    if(file==='demo/intake-bridge.js')s=s.replace('const images =','const   images =');
    await writeFile(p,s);
  }
  for(const script of ['build-cloud.mjs',demo]){const result=build(dir,script);assert.equal(result.status,0,result.stderr);}
}));
