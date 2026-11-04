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
    const file=await prepareImage(photo.file);
    const src=await readPhoto(file);
    return {src,path:photo.cloudPath,role:photo.rol||'Detail',main:photo===primary};
  }));
}
