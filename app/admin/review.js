// Temporary review mode for the pilot: signed-in staff can mark part of the screen and leave a note.
// Notes go to public.review_notes (supabase/migrations/20261114120000_review_notes.sql).
// Remove when the app is finished: delete this file, the two lines in app/main.js and app/review-kit/.
import {createReviewKit} from '../review-kit/review-kit.js';

export function startReview({api,admin}) {
  return createReviewKit({
    isEnabled:()=>admin.state.staff,
    context:()=>({screen:document.body.dataset.screen}),
    // Keep clear of the shop's controls: the empty top-left corner of the photo; elsewhere bottom or middle right.
    place:()=>{
      const screen=document.body.dataset.screen;
      if(screen==='shop'){
        const frame=document.getElementById('shop'),photo=frame?.contentDocument?.getElementById('photo');
        if(!photo)return null;
        const f=frame.getBoundingClientRect(),r=photo.getBoundingClientRect();
        return {top:Math.round(f.top+r.top+8)+'px',left:Math.round(f.left+r.left+8)+'px'};
      }
      return screen==='intake'?{top:'50%',right:'12px'}:{bottom:'12px',right:'12px'};
    },
    save:(kind,body,context)=>api.request('/rest/v1/rpc/add_review_note',{method:'POST',body:{p_kind:kind,p_body:body,p_context:context}})
  });
}
