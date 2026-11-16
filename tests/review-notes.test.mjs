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

    // Safe retries: same author + client id stores once; changed content conflicts; authors are separate.
    await as('service_role',null,async()=>{await db.query('delete from public.review_notes where body=$1',['x']);});
    const cid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const ctx={screen:'manage',clientId:cid};
    await as('authenticated',staff,async()=>{
      const first=(await add('vraag','Herhaal mij',ctx)).rows[0].id;
      assert.equal((await add('vraag','Herhaal mij',ctx)).rows[0].id,first,'same note returns the same id');
      assert.equal((await db.query('select count(*)::int n from public.review_notes where client_id=$1',[cid])).rows[0].n,1,'stored once');
      await assert.rejects(()=>add('vraag','Andere tekst',ctx),/REVIEW_NOTE_CONFLICT/,'same id, different body');
      await assert.rejects(()=>add('aanpassing','Herhaal mij',ctx),/REVIEW_NOTE_CONFLICT/,'same id, different kind');
      await assert.rejects(()=>add('vraag','Herhaal mij',{...ctx,screen:'shop'}),/REVIEW_NOTE_CONFLICT/,'same id, different context');
      const a=(await add('vraag','Zonder id',{screen:'x'})).rows[0].id,b=(await add('vraag','Zonder id',{screen:'x'})).rows[0].id;
      assert.notEqual(a,b,'old clients without a client id still work');
    });
    await db.query('insert into auth.users values($1)',['33333333-3333-4333-8333-333333333333']);await db.query('insert into public.staff values($1)',['33333333-3333-4333-8333-333333333333']);
    await as('authenticated','33333333-3333-4333-8333-333333333333',async()=>{
      const other=(await add('vraag','Herhaal mij',ctx)).rows[0].id;
      assert.equal((await db.query('select count(*)::int n from public.review_notes where client_id=$1',[cid])).rows[0].n,2,'another author may reuse a client id');
      assert.ok(other>0);
    });
    // A retry still succeeds when the daily quota has just been reached.
    await as('service_role',null,async()=>{
      await db.query("insert into public.review_notes(author,kind,body) select $1,'opmerking','q' from generate_series(1,600)",[staff]);
    });
    await as('authenticated',staff,async()=>{
      assert.ok((await add('vraag','Herhaal mij',ctx)).rows[0].id>0,'existing note returned at the quota');
      await assert.rejects(()=>add('vraag','Nieuw',{clientId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'}),/RATE_LIMIT/,'new notes still limited');
    });
  }finally{await db.close();}
});
