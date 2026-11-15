import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const staff='11111111-1111-4111-8111-111111111111', outsider='22222222-2222-4222-8222-222222222222', id='33333333-3333-4333-8333-333333333333';
const photo=id+'/'+ 'a'.repeat(64)+'.jpg';
const product={title:'Testjas',description:'Test',priceMinor:12550,material:'Leer',species:null,model:'Autojas',colour:'Zwart',length:'Lang',fit:'',era:'',details:['Geen'],measurements:[56,null,null,100],furClass:'Nee',images:[{path:photo,role:'Voorkant',main:true}]};
test('actual PostgreSQL migration: RLS, photos, conflicts, sold preservation, allowlists and rate limits',async()=>{
  const db=new PGlite();
  try{
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema public,auth to anon,authenticated,service_role;
      create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,primary key(bucket_id,name));alter table storage.objects enable row level security;
      grant usage on schema storage to anon,authenticated;grant select,insert on storage.objects to anon,authenticated;
      -- Existing hosted projects grant privileges directly as well as through PUBLIC.
      alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;
      alter default privileges in schema public grant all on tables to anon,authenticated,service_role;`);
    const migrations=new URL('../supabase/migrations/',import.meta.url);
    for(const file of (await readdir(migrations)).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(new URL(file,migrations),'utf8'));
    // The older save_garment is closed for everyone; only save_garment_with_private (its owner) calls it.
    for(const role of ['anon','authenticated'])assert.equal((await db.query("select has_function_privilege($1,'public.save_garment(uuid,jsonb,integer)','EXECUTE') as allowed",[role])).rows[0].allowed,false);
    for(const fn of ['require_staff()','save_garment_with_private(uuid,jsonb,integer,jsonb,jsonb)','mark_garment_sold(uuid,integer)']) {
      assert.equal((await db.query("select has_function_privilege('anon',$1,'EXECUTE') as allowed",['public.'+fn])).rows[0].allowed,false);
      assert.equal((await db.query("select has_function_privilege('authenticated',$1,'EXECUTE') as allowed",['public.'+fn])).rows[0].allowed,true);
    }
    await db.query('insert into auth.users values($1),($2)',[staff,outsider]);await db.query('insert into public.staff values($1)',[staff]);
    async function as(role,user,fn){await db.exec('set role '+role);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user||'']);try{return await fn();}finally{await db.exec('reset role');}}
    const save=(data=product,version=0)=>db.query("select public.save_garment_with_private($1,$2,$3,'[]'::jsonb,null) as item",[id,data,version]);
    const direct=()=>db.query('select public.save_garment($1,$2,$3) as item',[id,product,0]);
    await as('anon',null,async()=>{assert.equal((await db.query('select * from public.staff')).rows.length,0);await assert.rejects(save,/permission denied/);await assert.rejects(()=>db.query('select * from public.analysis_usage'),/permission denied/);});
    await as('authenticated',outsider,async()=>{await assert.rejects(save,/STAFF_REQUIRED/);await assert.rejects(direct,/permission denied/);await assert.rejects(()=>db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['garment-photos',photo]));});
    await as('authenticated',staff,async()=>{
      await assert.rejects(direct,/permission denied/,'staff cannot call the old function directly either');
      await assert.rejects(save,/PHOTO_NOT_UPLOADED/);
      await db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['garment-photos',photo]);
      assert.equal((await save()).rows[0].item.version,1);
      await assert.rejects(save,/VERSION_CONFLICT/);
      await assert.rejects(()=>save({...product,privateNotes:'secret'},1),/INVALID_PRODUCT/);
      await assert.rejects(()=>save({...product,priceMinor:1.5},1),/INVALID_PRODUCT/);
      await assert.rejects(()=>save({...product,measurements:[null,null,null,100]},1),/INVALID_PRODUCT/);
      await assert.rejects(()=>save({...product,images:[{...product.images[0],path:'https://evil.test/x'}]},1),/INVALID_PRODUCT/);
      await assert.rejects(()=>db.query("update public.garments set status='sold'"),/permission denied/);
    });
    await as('anon',null,async()=>{assert.equal((await db.query('select * from public.garments')).rows.length,1);assert.equal((await db.query('select * from storage.objects')).rows.length,1);});
    await as('authenticated',staff,async()=>{
      await db.query('select public.mark_garment_sold($1,1)',[id]);
      await assert.rejects(()=>save(product,1),/VERSION_CONFLICT/);
      const updated=(await save({...product,title:'Gewijzigd'},2)).rows[0].item;assert.equal(updated.status,'sold');assert.equal(updated.version,3);
      await assert.rejects(()=>db.query('select public.consume_analysis($1)',[staff]),/permission denied/);
    });
    await as('anon',null,async()=>{assert.equal((await db.query('select * from public.garments')).rows.length,0);assert.equal((await db.query('select * from storage.objects')).rows.length,0);});
    await as('authenticated',outsider,async()=>{assert.equal((await db.query('select * from public.garments')).rows.length,0);});
    await as('service_role',null,async()=>{for(let i=0;i<30;i++)await db.query('select public.consume_analysis($1)',[staff]);await assert.rejects(()=>db.query('select public.consume_analysis($1)',[staff]),/RATE_LIMIT/);});
    assert.equal((await db.query("select calls from public.analysis_usage where scope='global'")).rows[0].calls,30);
    // Force the global counter near its ceiling; a new staff member still cannot exceed it.
    await db.query('insert into public.staff values($1)',[outsider]);
    await db.exec("update public.analysis_usage set calls=99 where scope='global'");
    await as('service_role',null,async()=>{
      await db.query('select public.consume_analysis($1)',[outsider]);
      await assert.rejects(()=>db.query('select public.consume_analysis($1)',[outsider]),/RATE_LIMIT/);
    });
    assert.equal((await db.query("select calls from public.analysis_usage where scope='global'")).rows[0].calls,100);
    // Taste ranking: visitors cannot call the limiter or read its table; the server can, within limits.
    const client='a'.repeat(32);
    for(const role of ['anon','authenticated'])await as(role,role==='anon'?null:staff,async()=>{
      await assert.rejects(()=>db.query('select public.consume_personalise($1)',[client]),/permission denied/);
      await assert.rejects(()=>db.query('select * from public.personalise_usage'),/permission denied/);
    });
    await as('service_role',null,async()=>{
      await assert.rejects(()=>db.query('select public.consume_personalise($1)',['203.0.113.9']),/BAD_CLIENT/,'raw IP addresses are refused');
      for(let i=0;i<20;i++)await db.query('select public.consume_personalise($1)',[client]);
      await assert.rejects(()=>db.query('select public.consume_personalise($1)',[client]),/RATE_LIMIT/);
    });
    await db.exec("update public.personalise_usage set calls=2000 where scope='global'");
    await as('service_role',null,async()=>{await assert.rejects(()=>db.query('select public.consume_personalise($1)',['b'.repeat(32)]),/RATE_LIMIT/,'global daily ceiling');});
  }finally{await db.close();}
});
