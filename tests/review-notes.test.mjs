import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

// Review notes (app/review-kit): staff-only write and read through the real migrations.
const staff='11111111-1111-4111-8111-111111111111',outsider='22222222-2222-4222-8222-222222222222';
test('review notes: only staff can add and read, notes are append-only and bounded',async()=>{
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
    const add=(kind='vraag',body='Wat betekent dit icoon?',context={screen:'manage'})=>db.query('select public.add_review_note($1,$2,$3) as id',[kind,body,context]);

    assert.equal((await db.query("select has_function_privilege('anon','public.add_review_note(text,text,jsonb)','EXECUTE') as ok")).rows[0].ok,false);
    await as('anon',null,async()=>{
      await assert.rejects(()=>add(),/permission denied/);
      await assert.rejects(()=>db.query('select * from public.review_notes'),/permission denied/);
    });
    await as('authenticated',outsider,async()=>{
      await assert.rejects(()=>add(),/STAFF_REQUIRED/);
      assert.equal((await db.query('select * from public.review_notes')).rows.length,0,'outsiders read nothing');
    });
    await as('authenticated',staff,async()=>{
      assert.ok((await add()).rows[0].id>0);
      await add('opmerking','Mooi zo',{screen:'shop',target:{text:'Leren mantel'}});
      const rows=(await db.query('select kind,body,author,context from public.review_notes order by id')).rows;
      assert.deepEqual(rows.map(r=>r.kind),['vraag','opmerking']);
      assert.equal(rows[0].author,staff,'author is the signed-in user, not a client value');
      await assert.rejects(()=>add('compliment'),/check/,'only the three kinds');
      await assert.rejects(()=>add('vraag',''),/check/,'empty text is refused');
      await assert.rejects(()=>add('vraag','x'.repeat(4001)),/check/,'text is bounded');
      await assert.rejects(()=>add('vraag','x',{big:'x'.repeat(9000)}),/check/,'context is bounded');
      await assert.rejects(()=>add('vraag','x',[1,2]),/check/,'context must be an object');
      await assert.rejects(()=>db.query("update public.review_notes set body='changed'"),/permission denied/,'append-only');
      await assert.rejects(()=>db.query('delete from public.review_notes'),/permission denied/,'no deletes');
      await assert.rejects(()=>db.query("insert into public.review_notes(author,kind,body) values($1,'vraag','direct')",[outsider]),/permission denied/,'writes only through the function');
    });
    await as('service_role',null,async()=>{
      await db.query("insert into public.review_notes(author,kind,body) select $1,'opmerking','x' from generate_series(1,498)",[staff]);
    });
    await as('authenticated',staff,async()=>{await assert.rejects(()=>add(),/RATE_LIMIT/,'daily limit per tester');});
  }finally{await db.close();}
});
