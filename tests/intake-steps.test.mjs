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

test('reactions vary per piece but stay the same for the same piece and answer, and refer to earlier answers',()=>{
  const lines=new Set();
  for(let seed=1;seed<40;seed++){const m=make({bont:'Nee',materiaal:'Suède'},{}, {});m.state.seed=seed;lines.add(step(m.steps,'kleur').warm('Cognac'));}
  assert.ok(lines.size>1,'different pieces get different lines');
  for(const line of lines)assert.match(line,/cognac/i);
  assert.ok([...lines].some(l=>/suède/i.test(l)),'the colour reaction can mention the material Nikki gave');
  const m=make({bont:'Nee'});m.state.seed=7;
  assert.equal(step(m.steps,'kleur').warm('Zwart'),step(m.steps,'kleur').warm('Zwart'),'no flicker on re-render');
  assert.equal(I.skipLine(7,'kleur'),I.skipLine(7,'kleur'));
  // A reaction never ends up in the product.
  const p=I.product({bont:'Nee',titel:'Jas',prijs:100,materiaal:'Suède'},'k',[]);assert.ok(!JSON.stringify(p).match(/mooi|genoteerd/i));
});

test('Gemini says why and how sure, and opens the conversation without claims',()=>{
  const G=I.proposals({bontsoort:{waarde:'Nerts',zekerheid:'laag',waarom:'korte, glanzende haren'},kleur:{waarde:'Zwart',zekerheid:'hoog',waarom:'diep zwart'},opening:'Wat een mooie lange jas met die kraag.'});
  const m=make({bont:'Ja'},G);
  assert.equal(I.guessLine(step(m.steps,'bontsoort'),G),'Gemini twijfelt, misschien nerts. Korte, glanzende haren. Tik het aan als het klopt.');
  assert.match(I.guessLine(step(m.steps,'kleur'),G),/^Gemini denkt: Zwart\. Diep zwart\./);
  assert.equal(m.state.A.bontsoort,undefined,'still not chosen');
  assert.equal(I.opening(G,1),'Wat een mooie lange jas met die kraag.');
  assert.ok(I.opening({},1).length>0);
});

test('the price proposal compares own sales by species or material, prefers the same length, and never fills in',()=>{
  const sale=(furClass,species,material,length,euro)=>({key:'k'+euro,furClass,species,material,length,priceMinor:euro*100});
  const sales=[sale('Ja','Nerts','Bont','Lang',300),sale('Ja','Nerts','Bont','Lang',380),sale('Ja','Nerts','Bont','Lang',240),sale('Ja','Nerts','Bont','Kort',90),sale('Ja','Vos','Bont','Lang',900),sale('Nee',null,'Suède','Kort',120)];
  const p=I.priceProposal({bont:'Ja',bontsoort:'Nerts',lengte:'Lang'},sales);
  assert.deepEqual([p.count,p.low,p.high,p.proposal],[3,24000,38000,300]);
  assert.equal(p.say,'Van je eigen verkopen: 3 lange stukken van nerts gingen voor € 240 tot € 380.');
  assert.equal(I.priceProposal({bont:'Ja',bontsoort:'Nerts',lengte:'Kort'},sales).count,4,'too few of the same length: all mink');
  assert.equal(I.priceProposal({bont:'Nee',materiaal:'Suède'},sales).say,'Van je eigen verkopen: één stuk van suède ging voor € 120.');
  assert.equal(I.priceProposal({bont:'Nee',materiaal:'Leer'},sales),null);
  assert.equal(I.priceProposal({bont:'Ja',bontsoort:SKIP},sales),null,'no species, no comparison');
  const m=make({bont:'Ja',bontsoort:'Nerts',lengte:'Lang'});m.state.sales=sales;
  const prijs=step(m.steps,'prijs');
  assert.deepEqual(prijs.options(),[['300','Rond € 300']]);assert.match(prijs.ask(),/^Van je eigen verkopen: .* Wat moet deze kosten\?$/);
  assert.equal(m.state.A.prijs,undefined);
  m.state.sales=[];assert.deepEqual(step(m.steps,'prijs').options(),[]);assert.equal(step(m.steps,'prijs').ask(),'Wat moet hij kosten?');
});

test('a free sentence becomes answers only within the lists, and species only with fur',()=>{
  const r=I.interpret({velden:{bont:'Alleen kraag of rand',materiaal:'shearling',bontsoort:'vos',lengte:'heel lang',periode:'Jaren 70',kleur:'<b>bruin</b>',bijzonderheden:['Vlek','x'.repeat(80)],prijs:'1000'},reactie:'Een lammy met vossenkraag, mooi.'},{});
  assert.deepEqual(r.values,[['bont','Alleen kraag of rand'],['materiaal','Shearling'],['bontsoort','Vos'],['periode','Jaren 70'],['bijzonderheden',['Vlek']]],'lengte is not an own list; markup and long words are dropped; price never');
  assert.equal(r.reply,'Een lammy met vossenkraag, mooi.');
  assert.equal(I.heardText(r.values),'bont alleen aan kraag of rand, materiaal shearling, bontsoort vos, periode jaren 70, bijzonderheden vlek');
  assert.deepEqual(I.interpret({velden:{bontsoort:'Nerts',materiaal:'Bont'}},{bont:'Nee'}).values,[],'no species without fur, Bont is not a material');
  assert.deepEqual(I.interpret({velden:{bontsoort:'Nerts'}},{bont:'Ja'}).values,[['bontsoort','Nerts']]);
  assert.deepEqual(I.interpret(null,{}).values,[]);
});

test('the brand comes from Nikki: Gemini only proposes what it read, and only a real brand is saved',()=>{
  const m=make({},I.proposals({merk:{waarde:'Dior',zekerheid:'hoog',waarom:'Staat op het label'}}));
  const merk=step(m.steps,'merk');
  assert.equal(merk.guess(),'Dior');assert.equal(merk.options()[0],'Dior','the read brand is a button');
  assert.equal(m.state.A.merk,undefined,'never chosen by itself');
  assert.match(I.guessLine(merk,m.state.G,''),/^Gemini las: Dior\. Staat op het label\./);
  const A={bont:'Nee',titel:'Jas',prijs:100,materiaal:'Leer'};
  assert.equal(I.product({...A,merk:'Dior'},'k',[]).brand,'Dior');
  assert.equal('brand' in I.product({...A,merk:'Geen merk'},'k',[]),false,'no brand: the field stays out');
  assert.equal('brand' in I.product({...A,merk:SKIP},'k',[]),false);
  assert.equal(I.fromRecord({furClass:'Nee',brand:'Dior',measurements:[]}).merk,'Dior');
  assert.equal(I.fromRecord({furClass:'Nee',measurements:[]}).merk,SKIP);
  assert.ok(I.ROLES.includes('Kraag')&&I.CLOSE.includes('Label')&&!I.CLOSE.includes('Voorkant'),'close-ups are sent sharp, overview photos smaller');
});
