const paths = {
  hanger:'M9 6a3 3 0 0 1 6 0c0 2-3 2-3 4v1m0 0L3 17v2h18v-2l-9-6',
  refresh:'M20 8a8 8 0 1 0 0 8M20 3v5h-5',
  account:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-2a8 8 0 0 1 16 0v2',
  logout:'M9 4H4v16h5m5-13 5 5-5 5m-5-5h10',
  camera:'M8 5l2-2h4l2 2h5v15H3V5h5m8 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  edit:'m15 4 5 5M4 20l5-1L21 7l-5-5L4 14v6',
  tag:'M3 3h8l10 10-8 8L3 11V3m4 4h.01',
  plus:'M12 5v14M5 12h14'
};
export function icon(name) {
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  for(const [key,value] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.5','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}))svg.setAttribute(key,value);
  const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',paths[name]||paths.hanger);svg.append(path);return svg;
}
