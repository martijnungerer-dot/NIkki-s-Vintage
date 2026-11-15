import test from 'node:test';
import assert from 'node:assert/strict';
// Nieuw stuk als gesprek: the questions and the product contract (app/intake/steps.js). No DOM needed.
await import('../app/intake/steps.js');
const I=globalThis.GSFIntake, SKIP=I.SKIP;
const make=(A={},G={},learned={})=>{const state={A,G,learned};return {state,steps:I.build(state)};};
const ids=steps=>I.active(steps).map(s=>s.id);
const step=(steps,id)=>steps.find(s=>s.id===id);
const give=(m,id,value)=>{m.state.A[id]=value;const s=step(m.steps,id);if(s.set)s.set(value);};

test('the fur species is asked only for fur, and a Gemini guess never becomes an answer by itself',()=>{
  const m=make({}, I.proposals({bont:{waarde:'Ja'},bontsoort:{waarde:'Nerts'},kleur:{waarde:'Zwart'}}));
  assert.equal(step(m.steps,'bont').guess(),'Ja');assert.equal(step(m.steps,'bontsoort').guess(),'Nerts');
  assert.deepEqual(m.state.A,{}, 'proposals fill nothing in');
  assert.ok(!ids(m.steps).includes('bontsoort'),'not asked before fur is confirmed');
  give(m,'bont','Ja');
  assert.ok(ids(m.steps).includes('bontsoort'));assert.ok(!ids(m.steps).includes('materiaal'),'whole piece fur: material is Bont');
  assert.equal(m.state.A.materiaal,'Bont');assert.equal(m.state.A.bontsoort,undefined);
  // Still missing for the boutique until Nikki names it herself.
  assert.ok(I.missing(m.steps,m.state.A,[{internal:false}]).some(x=>x.id==='bontsoort'));
  give(m,'bont','Nee');
  assert.ok(!ids(m.steps).includes('bontsoort'));assert.ok(ids(m.steps).includes('materiaal'));assert.equal(m.state.A.materiaal,undefined,'Bont is not a material without fur');
});

test('what Gemini saw is confirmed in one tap, or asked one by one; skipping never blocks',()=>{
  const m=make({}, I.proposals({model:{waarde:'Sjaalkraag'},kleur:{waarde:'Donkerbruin'},lengte:{waarde:''}}));
  assert.ok(ids(m.steps).includes('zie'));assert.match(step(m.steps,'zie').ask(),/Ik zie: sjaalkraag en donkerbruin\. Klopt dat\?/);
  give(m,'zie','Klopt');
  assert.equal(m.state.A.model,'Sjaalkraag');assert.equal(m.state.A.kleur,'Donkerbruin');
  assert.deepEqual(ids(m.steps).filter(id=>['model','kleur','lengte'].includes(id)),['lengte'],'only the part Gemini did not see is still asked');
  give(m,'zie','Anders');
  assert.equal(m.state.A.model,undefined);assert.deepEqual(ids(m.steps).filter(id=>['model','kleur','lengte'].includes(id)),['model','kleur','lengte']);
  give(m,'zie',SKIP);
  assert.deepEqual(I.missing(m.steps,m.state.A,[{internal:false}]).map(x=>x.id).filter(id=>['model','kleur','lengte'].includes(id)),['model','kleur','lengte']);
  // One guess is not enough for the combined question.
  assert.ok(!ids(make({},I.proposals({kleur:{waarde:'Zwart'}})).steps).includes('zie'));
});

test('the product follows the saved contract: cm, null for a skipped measurement, no invented values',()=>{
  const A={bont:'Alleen kraag of rand',bontsoort:'Vos',materiaal:'Wol',model:'Cape',kleur:'Zwart',lengte:'Kort',pasvorm:SKIP,periode:SKIP,bijzonderheden:['Vlek'],
    chest:56.5,length:100,shoulder:SKIP,sleeve:62,titel:'  Cape  ',beschrijving:'',prijs:125.5};
  const images=[{path:'p',role:'Voorkant',main:true}], p=I.product(A,'key-1',images);
  assert.deepEqual(p,{furClass:'Alleen kraag of rand',key:'key-1',title:'Cape',description:'',priceMinor:12550,material:'Wol',species:'Vos',model:'Cape',colour:'Zwart',length:'Kort',fit:'',era:'',details:['Vlek'],measurements:[56.5,null,62,100],images});
  assert.equal(I.product({...A,bont:'Nee'},'k',images).species,null,'no species without fur');
  const m=make(A);
  assert.deepEqual(I.missing(m.steps,A,[{internal:false}]),[]);
  assert.deepEqual(I.missing(m.steps,A,[{internal:true}]).map(x=>x.id),['fotos'],'a photo only for checking is not a boutique photo');
  assert.deepEqual(I.missing(m.steps,{...A,chest:SKIP,prijs:SKIP},[{internal:false}]).map(x=>x.id),['chest','prijs']);
  assert.deepEqual(I.missing(m.steps,{...A,pasvorm:SKIP,shoulder:SKIP,periode:SKIP},[{internal:false}]),[],'optional answers are never required');
});

test('an opened piece comes back as answers and saves to the same product',()=>{
  const record={key:'k',furClass:'Ja',species:'Nerts',material:'Bont',model:'Sjaalkraag',colour:'Bruin',length:'Lang',fit:'',era:'Jaren 70',details:['Geen'],measurements:[54,null,null,98],title:'Mantel',description:'Tekst',priceMinor:45000,images:[]};
  const A=I.fromRecord(record), m=make(A);
  assert.ok(!ids(m.steps).includes('zie'));assert.ok(!ids(m.steps).includes('materiaal'));
  assert.deepEqual(I.missing(m.steps,A,[{internal:false}]),[]);
  assert.ok(I.active(m.steps).every(s=>A[s.id]!==undefined),'every question is answered, so editing starts in the overview');
  const {images,...rest}=I.product(A,'k',[]), {images:_,...original}=record;
  assert.deepEqual(rest,original);
});

test('proposals keep only short plain values; the title is composed from what Nikki said',()=>{
  const G=I.proposals({titel:'x'.repeat(500),beschrijving:' tekst ',bont:{waarde:'Misschien'},materiaal:{waarde:null},bijzonderheden:{waarde:['Vlek',5,'']},controleer:{titel:['leren']},prijs:10});
  assert.equal(G.titel.length,200);assert.equal(G.beschrijving,'tekst');assert.deepEqual(G.bijzonderheden,['Vlek']);assert.equal(G.materiaal,undefined);assert.equal(G.prijs,undefined);
  assert.equal(step(make({},G).steps,'bont').guess(),null,'an unknown fur value is not offered');
  assert.equal(I.composeTitle({bont:'Ja',bontsoort:'Nerts',lengte:'Lang',model:'Sjaalkraag'}),'Lange jas van nerts met sjaalkraag');
  assert.equal(I.composeTitle({bont:'Alleen kraag of rand',bontsoort:'Vos',materiaal:'Leer',lengte:'Kort'}),'Korte jas van leer, kraag van vos');
  assert.equal(I.composeTitle({bont:SKIP,lengte:SKIP}),'Jas','nothing unknown ends up in the title');
  // Own words are offered next time, after the standard choices.
  assert.deepEqual(step(make({},{}, {kleur:['Petrol']}).steps,'kleur').options().slice(-1),['Petrol']);
});
