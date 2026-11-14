// Downscale before upload/AI; canvas export removes original EXIF metadata.
export async function prepareImage(file) {
  // Phone photos are often 5–15 MB; they are scaled down to 1600 px here, so only absurd files are refused.
  if(!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 30*1024*1024) throw Error('Gebruik een JPG-, PNG- of WebP-foto van maximaal 30 MB.');
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
    const canvas = document.createElement('canvas'); canvas.width=Math.max(1,Math.round(bitmap.width*scale)); canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    const ctx=canvas.getContext('2d'); ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.85));
    if(!blob || blob.size>2*1024*1024) throw Error('Foto kon niet voldoende worden verkleind. Kies een andere foto.');
    return new File([blob],'kledingstuk.jpg',{type:'image/jpeg'});
  } finally {bitmap.close();}
}
