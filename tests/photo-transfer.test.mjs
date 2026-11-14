import test from 'node:test';
import assert from 'node:assert/strict';
import {transferPhotos} from '../app/photo-transfer.js';
import {Api} from '../app/api.js';

test('mixed photos reuse stored paths and only prepare/read new files, preserving order and main photo',async()=>{
  const id='11111111-1111-4111-8111-111111111111';
  const saved={cloudPath:id+'/'+'a'.repeat(64)+'.jpg',rol:'Voorkant'};
  // A saved photo deliberately has no file: neither decoding nor FileReader should need one.
  const fresh={file:{name:'new.jpg'},rol:'Achterkant'};
  const savedDetail={cloudPath:id+'/'+'b'.repeat(64)+'.jpg',internal:true};
  const prepared=[],read=[],cleaned={name:'re-encoded.jpg'};
  // Even if an internal photo were passed as primary, it never becomes the main photo.
  const result=await transferPhotos([saved,fresh,savedDetail],saved,{
    prepareImage:async file=>{prepared.push(file);return cleaned;},
    readPhoto:async file=>{read.push(file);return 'data:image/jpeg;base64,cleaned';}
  });
  assert.deepEqual(prepared,[fresh.file]);assert.deepEqual(read,[cleaned]);
  assert.deepEqual(result,[
    {path:saved.cloudPath,role:'Voorkant',main:true,internal:false},
    {src:'data:image/jpeg;base64,cleaned',path:undefined,role:'Achterkant',main:false,internal:false},
    {path:savedDetail.cloudPath,role:'Detail',main:false,internal:true}
  ]);
  assert.equal((await transferPhotos([savedDetail],savedDetail,{prepareImage:async()=>assert.fail(),readPhoto:async()=>assert.fail()}))[0].main,false);
  const api=new Api({supabaseUrl:'https://test.supabase.co',supabasePublishableKey:'test'},
    ()=>assert.fail('Reusing a saved path must not read a data URL or upload'),{getItem:()=>null});
  assert.deepEqual(await api.upload(id,result[0]),{path:saved.cloudPath,role:'Voorkant',main:true});
});

test('new photo processing errors stop the handoff without reading original bytes',async()=>{
  await assert.rejects(transferPhotos([{file:{}}],null,{
    prepareImage:async()=>{throw Error('unreadable photo');},
    readPhoto:()=>assert.fail('Must not read the original after preparation fails')
  }),/unreadable photo/);
  await assert.rejects(transferPhotos([{file:{}}],null,{
    prepareImage:async()=>({}),readPhoto:async()=>{throw Error('read failed');}
  }),/read failed/);
});
