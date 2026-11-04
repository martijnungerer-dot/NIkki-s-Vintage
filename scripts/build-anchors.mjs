// Build transforms are contracts: never silently skip or ambiguously repeat a patch.
export function replaceExactly(source, anchor, replacement, {file, name=anchor, count=1}) {
  if(typeof anchor !== 'string' || !anchor || !Number.isInteger(count) || count<1) throw Error('Invalid build anchor contract');
  const found=source.split(anchor).length-1;
  if(found!==count) throw Error(`[build] ${file}: anchor ${JSON.stringify(name)} expected ${count} occurrence(s), found ${found}. Restore the anchor or update the integration and its tests.`);
  // split/join inserts source literally, including $&, $` and $$ in embedded code.
  return source.split(anchor).join(replacement);
}
export function replaceRegion(source, name, replacement, file) {
  const start=`/* NIKKI:${name}:START */`, end=`/* NIKKI:${name}:END */`;
  replaceExactly(source,start,start,{file});replaceExactly(source,end,end,{file});
  const a=source.indexOf(start), b=source.indexOf(end);
  if(b<a)throw Error(`[build] ${file}: reversed region ${name}`);
  return source.slice(0,a+start.length)+'\n'+replacement+'\n'+source.slice(b);
}
export function injectAt(source, name, code, file) {
  const marker=`/* NIKKI:${name} */`;
  return replaceExactly(source,marker,code,{file,name:marker});
}
