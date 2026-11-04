// Cloud photo handoff; kept out of build-time source-code substitutions.
function readDataUrl(file) {
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onerror=()=>reject(Error('Een foto kon niet worden gelezen.'));
    reader.onload=()=>resolve(reader.result);
    reader.readAsDataURL(file);
  });
}
export async function transferPhotos(photos,primary,{prepareImage,readPhoto=readDataUrl}) {
  return Promise.all(photos.map(async photo=>{
    // Stored photos were already re-encoded on upload. Keep their path and metadata;
    // only new files need decoding and EXIF removal before they leave the browser.
    if(photo.cloudPath) return {path:photo.cloudPath,role:photo.rol||'Detail',main:photo===primary};
    const file=await prepareImage(photo.file);
    const src=await readPhoto(file);
    return {src,path:photo.cloudPath,role:photo.rol||'Detail',main:photo===primary};
  }));
}
