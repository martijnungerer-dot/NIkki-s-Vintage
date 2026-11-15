// Drives the conversation in Nieuw stuk (app/intake/) for the browser tests.
const question=f=>f.locator('#question');
const stepId=f=>question(f).getAttribute('data-step');
const type=async(f,text)=>{await f.locator('#free').fill(String(text));await f.locator('#answer [type=submit]').click();};
const pick=(f,value)=>f.locator('#answer [data-value="'+value+'"]').click();
// Answers every open question: a value from `answers` (by step id), otherwise "Weet ik nog niet".
// An array is a multiple choice (chips or own words, then Klaar); other values are tapped when a
// button exists and typed otherwise.
async function answer(f,answers={},{stopAt=null}={}){
  for(let guard=0;guard<40;guard++){
    if(!await question(f).count())return;
    const id=await stepId(f);if(id===stopAt)return;
    const value=answers[id];
    if(value===undefined)await f.locator('[data-skip]').click();
    else if(Array.isArray(value)){
      for(const v of value){const chip=f.locator('#answer [data-value="'+v+'"]');if(await chip.count()){if(await chip.getAttribute('aria-pressed')!=='true')await chip.click();}else await type(f,v);}
      for(const on of await f.locator('#answer [data-value][aria-pressed=true]').all())if(!value.includes(await on.getAttribute('data-value')))await on.click();
      await f.locator('[data-ready]').click();
    }
    else if(await f.locator('#answer [data-value="'+value+'"]').count())await pick(f,value);
    else await type(f,value);
  }
  throw Error('The conversation did not finish.');
}
// From the overview: change one answer and come back to the overview.
async function change(f,id,value){
  await f.locator('#talk [data-edit="'+id+'"]').first().click();
  if(await f.locator('#answer [data-value="'+value+'"]').count())await pick(f,value);else await type(f,value);
}
module.exports={answer,change,question,stepId,type,pick};
