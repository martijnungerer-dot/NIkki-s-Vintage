import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
// Photos "Alleen voor controle": staff only, never reachable for visitors (docs/BEHEER-PLAN.md).
const staff='11111111-1111-4111-8111-111111111111', outsider='22222222-2222-4222-8222-222222222222', id='33333333-3333-4333-8333-333333333333';
const path=c=>id+'/'+c.repeat(64)+'.jpg';
const front=path('a'), label=path('b'), seam=path('c');
const product={title:'Testjas',description:'Test',priceMinor:12550,material:'Leer',species:null,model:'Autojas',colour:'Zwart',length:'Lang',fit:'',era:'',details:['Geen'],measurements:[56,null,null,100],furClass:'Nee',images:[{path:front,role:'Voorkant',main:true}]};
const internal=[{path:label,role:'Label'},{path:seam,role:'Detail'}];
const ai={titel:'Jas',kleur:{waarde:'Zwart',zekerheid:'hoog',waarom:''}};

test('internal photos and the AI proposal are staff only; visitors never see them',async()=>{
  const db=new PGlite();
  try{
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema public,auth to anon,authenticated,service_role;
      create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,primary key(bucket_id,name));alter table storage.objects enable row level security;
      grant usage on schema storage to anon,authenticated;grant select,insert on storage.objects to anon,authenticated;
      alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;
      alter default privileges in schema public grant all on tables to anon,authenticated,service_role;`);
    const migrations=new URL('../supabase/migrations/',import.meta.url);
    for(const file of (await readdir(migrations)).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(new URL(file,migrations),'utf8'));
    await db.query('insert into auth.users values($1),($2)',[staff,outsider]);await db.query('insert into public.staff values($1)',[staff]);
    async function as(role,user,fn){await db.exec('set role '+role);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user||'']);try{return await fn();}finally{await db.exec('reset role');}}
    const save=(data=product,version=0,priv=internal,proposal=ai)=>db.query('select public.save_garment_with_private($1,$2,$3,$4,$5) as item',[id,data,version,JSON.stringify(priv),proposal===null?null:JSON.stringify(proposal)]);

    assert.equal((await db.query("select has_function_privilege('anon','public.save_garment_with_private(uuid,jsonb,integer,jsonb,jsonb)','EXECUTE') as a")).rows[0].a,false);
    assert.equal((await db.query("select has_function_privilege('authenticated','public.valid_internal_images(uuid,jsonb,jsonb)','EXECUTE') as a")).rows[0].a,false);
    await as('anon',null,async()=>{await assert.rejects(save,/permission denied/);await assert.rejects(()=>db.query('select * from public.garment_private'),/permission denied/);});
    await as('authenticated',outsider,async()=>{await assert.rejects(save,/STAFF_REQUIRED/);});
    // The older function is closed: internal photos can never be skipped by calling it directly.
    await as('authenticated',staff,async()=>{await assert.rejects(()=>db.query('select public.save_garment($1,$2,0)',[id,product]),/permission denied/);});
    await as('authenticated',staff,async()=>{
      await db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['garment-photos',front]);
      await assert.rejects(save,/PHOTO_NOT_UPLOADED/,'internal photos must be uploaded too');
      for(const p of [label,seam])await db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['garment-photos',p]);
      // Rejected shapes: also public, duplicate, main flag, foreign path, more than sixteen photos in total (eight before 22 November 2026).
      await assert.rejects(()=>save(product,0,[{path:front,role:'Voorkant'}]),/INVALID_PRODUCT/);
      await assert.rejects(()=>save(product,0,[internal[0],internal[0]]),/INVALID_PRODUCT/);
      await assert.rejects(()=>save(product,0,[{...internal[0],main:true}]),/INVALID_PRODUCT/);
      await assert.rejects(()=>save(product,0,[{path:'44444444-4444-4444-8444-444444444444/'+'d'.repeat(64)+'.jpg',role:'Label'}]),/INVALID_PRODUCT/);
      const many=n=>Array.from({length:n},(_,i)=>({path:id+'/'+i.toString(16).padStart(2,'0').repeat(32)+'.jpg',role:'Detail'}));
      await assert.rejects(()=>save(product,0,many(16)),/INVALID_PRODUCT/,'1 public + 16 internal is more than sixteen');
      await assert.rejects(()=>save(product,0,internal,['not an object']),/INVALID_PRODUCT/);
      assert.equal((await save()).rows[0].item.version,1);
      await db.exec('reset role');
      const fits=async(pub,priv)=>(await db.query('select public.valid_internal_images($1,$2,$3) as ok',[id,JSON.stringify(pub),JSON.stringify(priv)])).rows[0].ok;
      assert.equal(await fits([{path:front}],many(15)),true,'1 public + 15 internal fits');
      assert.equal(await fits([{path:front},{path:label}],many(15)),false,'17 in total does not');
      const sixteen=Array.from({length:16},(_,i)=>({path:id+'/'+i.toString(16).padStart(2,'0').repeat(32)+'.jpg',role:'Detail',main:i===0}));
      const valid=async d=>(await db.query('select public.valid_garment($1,$2) as ok',[id,JSON.stringify(d)])).rows[0].ok;
      assert.equal(await valid({...product,images:sixteen}),true,'sixteen boutique photos');
      assert.equal(await valid({...product,images:[...sixteen,{path:label,role:'Detail',main:false}]}),false,'seventeen is too many');
      assert.equal(await valid({...product,brand:'Dior'}),true,'brand is optional text');
      assert.equal(await valid({...product,brand:null}),true);
      assert.equal(await valid({...product,brand:42}),false);
      assert.equal(await valid({...product,brand:'x'.repeat(201)}),false);
      assert.equal(await valid({...product,merk:'Dior'}),false,'other new keys stay forbidden');
      await db.exec('set role authenticated');
      const row=(await db.query('select internal_images,ai_suggestion from public.garment_private')).rows[0];
      assert.deepEqual(row.internal_images,internal);assert.equal(row.ai_suggestion.titel,'Jas');
      // An edit without a new analysis keeps the earlier proposal; internal photos follow the edit.
      await save({...product,title:'Gewijzigd'},1,[internal[0]],null);
      const after=(await db.query('select internal_images,ai_suggestion from public.garment_private')).rows[0];
      assert.deepEqual(after.internal_images,[internal[0]]);assert.equal(after.ai_suggestion.titel,'Jas');
      // Staff can still read every photo of the piece.
      assert.equal((await db.query('select * from storage.objects')).rows.length,3);
    });
    await as('anon',null,async()=>{
      assert.equal((await db.query('select * from public.garments')).rows.length,1,'the piece itself is public');
      assert.doesNotMatch(JSON.stringify((await db.query('select data from public.garments')).rows),/bbbb|cccc/,'no internal path in public data');
      assert.deepEqual((await db.query('select name from storage.objects')).rows.map(r=>r.name),[front],'only the public photo is readable');
    });
    await as('authenticated',outsider,async()=>{
      assert.equal((await db.query('select * from public.garment_private')).rows.length,0);
      assert.deepEqual((await db.query('select name from storage.objects')).rows.map(r=>r.name),[front]);
    });
    // Making a public photo internal also hides it from visitors.
    await as('authenticated',staff,async()=>{
      await db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['garment-photos',path('e')]);
      await save({...product,images:[{path:path('e'),role:'Voorkant',main:true}]},2,[{path:front,role:'Voorkant'}],null);
    });
    await as('anon',null,async()=>{assert.deepEqual((await db.query('select name from storage.objects')).rows.map(r=>r.name),[path('e')]);});
    // Sold keeps working and keeps the private row.
    await as('authenticated',staff,async()=>{
      await db.query('select public.mark_garment_sold($1,3)',[id]);
      assert.equal((await db.query('select count(*)::int as n from public.garment_private')).rows[0].n,1);
      const kept=(await save(product,4,internal,null)).rows[0].item;assert.equal(kept.status,'sold');
    });
  }finally{await db.close();}
});
