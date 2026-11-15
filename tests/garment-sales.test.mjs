import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
// Sale prices: recorded together with "verkocht", staff only, never visible to visitors.
const staff='11111111-1111-4111-8111-111111111111', outsider='22222222-2222-4222-8222-222222222222', id='33333333-3333-4333-8333-333333333333';
const photo=id+'/'+'a'.repeat(64)+'.jpg';
const product={title:'Testjas',description:'Test',priceMinor:12550,material:'Leer',species:null,model:'Autojas',colour:'Zwart',length:'Lang',fit:'',era:'',details:['Geen'],measurements:[56,null,null,100],furClass:'Nee',images:[{path:photo,role:'Voorkant',main:true}]};
const fn='public.mark_garment_sold_with_price(uuid,integer,integer)';

test('the sale price is saved with sold, once, and only staff can read it',async()=>{
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
    async function as(role,user,task){await db.exec('set role '+role);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user||'']);try{return await task();}finally{await db.exec('reset role');}}
    const sell=(version,price)=>db.query('select public.mark_garment_sold_with_price($1,$2,$3) as item',[id,version,price]);
    const sales=()=>db.query('select id,sold_price_minor,sold_at from public.garment_sales');

    assert.equal((await db.query("select has_function_privilege('anon',$1,'EXECUTE') as a",[fn])).rows[0].a,false);
    assert.equal((await db.query("select has_function_privilege('authenticated',$1,'EXECUTE') as a",[fn])).rows[0].a,true);
    await as('authenticated',staff,async()=>{
      await db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['garment-photos',photo]);
      await db.query("select public.save_garment_with_private($1,$2,0,'[]'::jsonb,null)",[id,product]);
    });
    await as('anon',null,async()=>{await assert.rejects(()=>sell(1,11050),/permission denied/);await assert.rejects(sales,/permission denied/);});
    await as('authenticated',outsider,async()=>{
      await assert.rejects(()=>sell(1,11050),/STAFF_REQUIRED/);
      await assert.rejects(()=>db.query('insert into public.garment_sales(id,sold_price_minor) values($1,1)',[id]),/permission denied/,'no direct writes');
    });
    await as('authenticated',staff,async()=>{
      // Refused amounts and a stale version save nothing and leave the piece for sale.
      await assert.rejects(()=>sell(1,null),/INVALID_PRICE/);
      await assert.rejects(()=>sell(1,-1),/INVALID_PRICE/);
      await assert.rejects(()=>sell(1,100000001),/INVALID_PRICE/);
      await assert.rejects(()=>sell(0,11050),/VERSION_CONFLICT/);
      assert.equal((await sales()).rows.length,0);
      assert.equal((await db.query('select status from public.garments')).rows[0].status,'published');
      await assert.rejects(()=>db.query('insert into public.garment_sales(id,sold_price_minor) values($1,1)',[id]),/permission denied/,'staff write only through the function');
      const item=(await sell(1,11050)).rows[0].item;assert.equal(item.status,'sold');assert.equal(item.version,2);
      const rows=(await sales()).rows;assert.equal(rows.length,1);assert.equal(rows[0].sold_price_minor,11050);assert.ok(rows[0].sold_at);
      // Sold once: a repeat (also with the new version) changes neither the status nor the price.
      await assert.rejects(()=>sell(2,1),/VERSION_CONFLICT/);
      await assert.rejects(()=>sell(1,1),/VERSION_CONFLICT/);
      assert.equal((await sales()).rows[0].sold_price_minor,11050);
      // A later edit keeps the piece sold and the sale price in place.
      const kept=(await db.query("select public.save_garment_with_private($1,$2,2,'[]'::jsonb,null) as item",[id,{...product,title:'Gewijzigd'}])).rows[0].item;
      assert.equal(kept.status,'sold');assert.equal((await sales()).rows[0].sold_price_minor,11050);
    });
    // Visitors and non-staff accounts see neither the piece nor what it sold for.
    await as('anon',null,async()=>{
      await assert.rejects(sales,/permission denied/);
      assert.doesNotMatch(JSON.stringify((await db.query('select * from public.garments')).rows),/11050/);
    });
    await as('authenticated',outsider,async()=>{assert.equal((await sales()).rows.length,0);});
  }finally{await db.close();}
});
