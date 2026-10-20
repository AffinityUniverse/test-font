/* Font Studio 3.0 - shared outlines, legacy Hangul layout, standalone OpenType/CFF writer.
   No artwork is uploaded. v1 drawing arrays are read without changing their format.
   Web preview and OTF use the same integer outline coordinates.
*/
(() => {
'use strict';
const L=Array.from('ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ');
const V=Array.from('ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ');
const T=['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const compounds={'ㄳ':['ㄱ','ㅅ'],'ㄵ':['ㄴ','ㅈ'],'ㄶ':['ㄴ','ㅎ'],'ㄺ':['ㄹ','ㄱ'],'ㄻ':['ㄹ','ㅁ'],'ㄼ':['ㄹ','ㅂ'],'ㄽ':['ㄹ','ㅅ'],'ㄾ':['ㄹ','ㅌ'],'ㄿ':['ㄹ','ㅍ'],'ㅀ':['ㄹ','ㅎ'],'ㅄ':['ㅂ','ㅅ']};
const categories={consonants:L,vowels:V,uppercase:Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ'),lowercase:Array.from('abcdefghijklmnopqrstuvwxyz'),numbers:Array.from('0123456789'),symbols:Array.from('.,!?~-():;/@\'"')};
const labels={consonants:'자음',vowels:'모음',uppercase:'영문 대문자',lowercase:'영문 소문자',numbers:'숫자',symbols:'기호',custom:'나만의 글자'};
const basic=Object.values(categories).flat(), symbols=new Set(categories.symbols);
const esc=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const erase=s=>s.erase===true || (s.erase!==false && /^#fff(?:fff)?$/i.test(s.color||''));
function paint(c,shapes,mono=false){
  for(const s of shapes||[]){
    if(!s || !['path','rect','circle'].includes(s.type))continue;
    c.save();c.globalCompositeOperation=erase(s)?'destination-out':'source-over';
    c.strokeStyle=c.fillStyle=mono?'#000':s.color||'#25272c';
    c.lineWidth=Math.max(.1,Number(s.size)||12);c.lineCap='round';c.lineJoin='round';
    c.beginPath();
    if(s.type==='path'){
      const p=s.points||[];if(p.length){if(p.length===1){c.arc(p[0][0],p[0][1],c.lineWidth/2,0,Math.PI*2);c.fill();}
      else{c.moveTo(...p[0]);for(let i=1;i<p.length;i++)c.lineTo(...p[i]);c.stroke();}}
    }else if(s.type==='rect'){c.strokeRect(s.x,s.y,s.w,s.h);}
    else{c.ellipse(s.x+s.w/2,s.y+s.h/2,Math.abs(s.w/2),Math.abs(s.h/2),0,0,Math.PI*2);c.stroke();}
    c.restore();
  }
}
function simplify(points,tolerance){
  if(points.length<5)return points;
  function open(p){
    const keep=new Uint8Array(p.length);keep[0]=keep[p.length-1]=1;const jobs=[[0,p.length-1]];
    while(jobs.length){const [a,b]=jobs.pop(),A=p[a],B=p[b],dx=B[0]-A[0],dy=B[1]-A[1],den=dx*dx+dy*dy;let best=tolerance*tolerance,idx=-1;
      for(let i=a+1;i<b;i++){const t=den?Math.max(0,Math.min(1,((p[i][0]-A[0])*dx+(p[i][1]-A[1])*dy)/den)):0;
        const d=(p[i][0]-A[0]-t*dx)**2+(p[i][1]-A[1]-t*dy)**2;if(d>best){best=d;idx=i;}}
      if(idx!==-1){keep[idx]=1;jobs.push([a,idx],[idx,b]);}
    }return p.filter((_,i)=>keep[i]);
  }
  let far=1,dist=0;for(let i=1;i<points.length;i++){const d=(points[i][0]-points[0][0])**2+(points[i][1]-points[0][1])**2;if(d>dist){dist=d;far=i;}}
  return [...open(points.slice(0,far+1)).slice(0,-1),...open([...points.slice(far),points[0]]).slice(0,-1)];
}
// Alpha-mask boundary tracing preserves the effect of legacy white eraser strokes and holes.
function trace(shapes){
  const w=900,h=600,c=document.createElement('canvas');c.width=w;c.height=h;
  const cx=c.getContext('2d',{willReadFrequently:true});paint(cx,shapes,true);
  const pix=cx.getImageData(0,0,w,h).data,ink=new Uint8Array(w*h);
  for(let i=0;i<ink.length;i++)ink[i]=pix[i*4+3]>=96?1:0;
  const stride=w+1,edges=new Uint8Array(stride*(h+1));
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const k=y*w+x;if(!ink[k])continue;
    if(!y||!ink[k-w])edges[y*stride+x]|=1;
    if(x===w-1||!ink[k+1])edges[y*stride+x+1]|=2;
    if(y===h-1||!ink[k+w])edges[(y+1)*stride+x+1]|=4;
    if(!x||!ink[k-1])edges[(y+1)*stride+x]|=8;
  }
  const delta=[1,stride,-1,-stride],out=[];
  for(let start=0;start<edges.length;start++){
    while(edges[start]){
      let k=start,d=0;while(!(edges[k]&(1<<d)))d++;
      const pts=[];let guard=0;
      do{
        pts.push([k%stride,Math.floor(k/stride)]);edges[k]&=~(1<<d);k+=delta[d];
        if(k===start)break;
        const choices=[(d+1)%4,d,(d+3)%4,(d+2)%4];d=choices.find(q=>edges[k]&(1<<q));
        if(d===undefined)break;
      }while(++guard<2000000);
      if(pts.length>2){
        const simple=simplify(pts,1);let area=0;
        for(let i=0;i<simple.length;i++){const p=simple[i],q=simple[(i+1)%simple.length];area+=p[0]*q[1]-q[0]*p[1];}
        if(simple.length>2&&Math.abs(area)>=1)out.push(simple);
      }
    }
  }return out;
}
function bounds(contours){
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  for(const p of contours)for(const [x,y]of p){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  return Number.isFinite(x0)?{x0,y0,x1,y1,w:Math.max(1,x1-x0),h:Math.max(1,y1-y0)}:{x0:0,y0:0,x1:0,y1:0,w:1,h:1};
}
function pathD(contours){return contours.map(p=>p.length?'M'+p.map(q=>q.join(' ')).join('L')+'Z':'').join('');}
function makeEngine(getDrawings,getNames){
  let rawCache=new Map(),glyphCache=new Map(),layoutCache=new Map();
  function invalidate(name){if(name)rawCache.delete(name);else rawCache.clear();glyphCache.clear();layoutCache.clear();}
  function raw(name){if(!rawCache.has(name))rawCache.set(name,(getDrawings()[name]||[]).length?trace(getDrawings()[name]):[]);return rawCache.get(name);}
  function has(name){return !!raw(name).length;}
  function parts(ti){return compounds[T[ti]]||[T[ti]];}
  // Preserved 100x100 initial/vowel/final placement rules from the existing font maker.
  function layout(v,ti){
    const hasT=ti>0;let initial,vowel;
    if(['ㅘ','ㅙ','ㅚ','ㅝ','ㅞ','ㅟ','ㅢ'].includes(v)){
      const key=v+(hasT?'1':'0');if(layoutCache.has(key)){const r=layoutCache.get(key);initial=r.initial;vowel=r.vowel;}
      else{
        const box=hasT?[4,4,92,64]:[4,4,92,88],a=raw(v),b=bounds(a),sc=Math.min((box[2]-6)/b.w,(box[3]-6)/b.h);
        const ox=box[0]+(box[2]-b.w*sc)/2-b.x0*sc,oy=box[1]+(box[3]-b.h*sc)/2-b.y0*sc;
        const occ=new Uint8Array(2500);
        function mark(x,y){const cx=Math.floor(x/2),cy=Math.floor(y/2);for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++){const X=cx+i,Y=cy+j;if(X>=0&&Y>=0&&X<50&&Y<50)occ[Y*50+X]=1;}}
        a.forEach(poly=>poly.forEach((p,i)=>{const q=poly[(i+1)%poly.length],n=Math.ceil(Math.hypot(q[0]-p[0],q[1]-p[1])*sc);
          for(let k=0;k<=n;k++)mark((p[0]+(q[0]-p[0])*k/Math.max(1,n))*sc+ox,(p[1]+(q[1]-p[1])*k/Math.max(1,n))*sc+oy);
        }));
        const S=new Int32Array(51*51);for(let y=0;y<50;y++)for(let x=0;x<50;x++)S[(y+1)*51+x+1]=occ[y*50+x]+S[y*51+x+1]+S[(y+1)*51+x]-S[y*51+x];
        let best=null,score=0;
        for(let w=6;w<=48;w++)for(let h=6;h<=48;h++){
          if(S[(1+h)*51+1+w]-S[51+1+w]-S[(1+h)*51+1]+S[52])continue;
          const s=Math.min(w,h*1.5)*Math.min(h,w*1.5);if(s>score){score=s;best=[2,2,w*2,h*2];}
        }
        initial=best&&Math.min(best[2],best[3])>=16?best:(hasT?[24,3,52,30]:[22,4,56,40]);
        vowel=best?box:(hasT?[6,34,88,36]:[6,46,88,42]);layoutCache.set(key,{initial,vowel});
      }
    }else if(['ㅗ','ㅛ','ㅜ','ㅠ','ㅡ'].includes(v)){initial=hasT?[12,3,76,32]:[12,5,76,42];vowel=hasT?[24,36,52,33]:[24,43,52,31];}
    else{initial=hasT?[5,6,47,62]:[5,10,47,75];vowel=hasT?[51,6,43,62]:[51,10,43,75];}
    const finals=hasT?(parts(ti).length===1?[[20,72,60,24]]:[[12,73,38,22],[51,73,38,22]]):[];
    return {initial,vowel,finals};
  }
  function place(name,box){
    const a=raw(name);if(!a.length)return[];
    const b=bounds(a),[x,y,w,h]=box,pad=1.5,s=Math.min((w-pad*2)/b.w,(h-pad*2)/b.h);
    const ox=x+(w-b.w*s)/2-b.x0*s,oy=y+(h-b.h*s)/2-b.y0*s;
    return a.map(p=>p.map(q=>[Math.round((q[0]*s+ox)*7),Math.round(770-(q[1]*s+oy)*7)]));
  }
  function glyph(name){
    if(glyphCache.has(name))return glyphCache.get(name);
    let a=null;
    if(has(name)){
      if(symbols.has(name)){
        const b=bounds(raw(name)),mid=(b.x0+b.x1)/2;
        a=raw(name).map(p=>p.map(q=>[Math.round(325+(q[0]-mid)*2.1),Math.round(100+(415-q[1])*2.1)]));
      }else a=place(name,[5,5,90,90]);
    }else if(Array.from(name).length===1){
      const cp=name.codePointAt(0);
      if(cp>=0xAC00&&cp<=0xD7A3){
        const n=cp-0xAC00,li=Math.floor(n/588),vi=Math.floor(n%588/28),ti=n%28,fin=ti?parts(ti):[],need=[L[li],V[vi],...fin];
        if(need.every(has)){
          const lay=layout(V[vi],ti);a=[...place(L[li],lay.initial),...place(V[vi],lay.vowel)];
          fin.forEach((f,i)=>a.push(...place(f,lay.finals[i])));
        }
      }
    }
    const g=a&&a.length?{contours:a,d:pathD(a),advance:symbols.has(name)?650:700}:null;
    glyphCache.set(name,g);return g;
  }
  function triggers(){return getNames().filter(n=>has(n)).map(n=>({name:n,text:n.normalize('NFC')})).sort((a,b)=>b.text.length-a.text.length);}
  function tokens(text,own=true){
    text=String(text).normalize('NFC');const names=own?triggers():[],out=[];
    for(let i=0;i<text.length;){
      const match=names.find(n=>text.startsWith(n.text,i));
      if(match){out.push({text:match.text,glyph:glyph(match.name)});i+=match.text.length;}
      else{const ch=String.fromCodePoint(text.codePointAt(i));out.push({text:ch,glyph:own?glyph(ch):null});i+=ch.length;}
    }return out;
  }
  async function exportOTF(family,onProgress=()=>{}){
    const map=new Map(),ligs=[],names=triggers();
    for(const ch of basic){const g=glyph(ch);if(g)map.set(ch.codePointAt(0),g);}
    // Build only complete Hangul syllables; retain distinct cmap slots for ligature components below.
    for(let cp=0xAC00;cp<=0xD7A3;cp++){
      const g=glyph(String.fromCodePoint(cp));if(g)map.set(cp,g);
      if(cp%512===0){onProgress(Math.round((cp-0xAC00)/11172*80));await new Promise(r=>setTimeout(r,0));}
    }
    for(const n of names){
      const chars=Array.from(n.text),g=glyph(n.name);
      if(chars.length===1)map.set(chars[0].codePointAt(0),g);
      else{for(const ch of chars)if(!map.has(ch.codePointAt(0)))map.set(ch.codePointAt(0),{contours:[],advance:700});ligs.push({chars,g});}
    }
    map.set(32,{contours:[],advance:350});
    if(map.size<=1&&!ligs.length)throw Error('먼저 글자나 이스터에그를 하나 이상 그려 주세요.');
    onProgress(85);await new Promise(r=>setTimeout(r,0));
    const data=writeOTF(map,ligs,family);onProgress(100);return data;
  }
  return{raw,has,glyph,tokens,triggers,invalidate,exportOTF};
}
// Binary OpenType writer. Tables: CFF, cmap(4/12), GSUB(4), head, hhea, hmtx,
// maxp, name, OS/2, post. No external library/CDN is required.
class Bytes{
  constructor(){this.a=[];}
  u8(n){this.a.push(n&255);return this;}
  u16(n){return this.u8(n>>>8).u8(n);}
  u32(n){return this.u16(n>>>16).u16(n);}
  text(s){for(const ch of s)this.u8(ch.charCodeAt(0));return this;}
  add(a){for(const n of a)this.a.push(n);return this;}
  get data(){return new Uint8Array(this.a);}
}
const join=parts=>{const a=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let k=0;for(const p of parts){a.set(p,k);k+=p.length;}return a;};
const ascii=s=>new Bytes().text(s).data;
function index(items){
  const b=new Bytes().u16(items.length);if(!items.length)return b.data;
  const size=items.reduce((n,a)=>n+a.length,1),off=size<=255?1:size<=65535?2:size<=16777215?3:4;b.u8(off);
  let at=1;for(const item of [...items,null]){for(let i=off-1;i>=0;i--)b.u8(at>>>(i*8));if(item)at+=item.length;}
  return join([b.data,...items]);
}
function csnum(b,n){
  n=Math.round(n);
  if(n>=-107&&n<=107)b.u8(n+139);
  else if(n>=108&&n<=1131){const v=n-108;b.u8(247+(v>>8)).u8(v);}
  else if(n>=-1131&&n<=-108){const v=-n-108;b.u8(251+(v>>8)).u8(v);}
  else if(n>=-32768&&n<=32767)b.u8(28).u16(n);
  else throw Error('글자 좌표가 너무 큽니다.');
}
function charstring(g){
  const b=new Bytes();csnum(b,g.advance);let x=0,y=0;
  for(const p of g.contours){if(p.length<3)continue;
    csnum(b,p[0][0]-x);csnum(b,p[0][1]-y);b.u8(21);x=p[0][0];y=p[0][1];
    for(let i=1;i<p.length;i++){csnum(b,p[i][0]-x);csnum(b,p[i][1]-y);b.u8(5);x=p[i][0];y=p[i][1];}
  }b.u8(14);return b.data;
}
function cff(glyphs,ps,bbox){
  const name=index([ascii(ps)]),strings=index(glyphs.slice(1).map(g=>ascii(g.name))),subrs=index([]);
  const charset=new Bytes().u8(0);for(let i=1;i<glyphs.length;i++)charset.u16(390+i);
  const charstrings=index(glyphs.map(charstring));
  function dict(offset,cs,privateAt){
    const b=new Bytes(),num=n=>b.u8(29).u32(n);
    for(const n of bbox)num(n);b.u8(5);num(offset);b.u8(15);num(cs);b.u8(17);num(0);num(privateAt);b.u8(18);
    return index([b.data]);
  }
  const start=4+name.length+dict(0,0,0).length+strings.length+subrs.length;
  return join([new Uint8Array([1,0,4,4]),name,dict(start,start+charset.a.length,start+charset.a.length+charstrings.length),strings,subrs,charset.data,charstrings]);
}
function cmap(entries){
  const ranges=[];
  for(const [cp,id]of entries){const last=ranges[ranges.length-1];if(last&&last.end+1===cp&&last.gid+cp-last.start===id)last.end=cp;else ranges.push({start:cp,end:cp,gid:id});}
  const f12=new Bytes().u16(12).u16(0).u32(16+ranges.length*12).u32(0).u32(ranges.length);
  ranges.forEach(r=>f12.u32(r.start).u32(r.end).u32(r.gid));
  const bmp=ranges.filter(r=>r.start<65535).map(r=>({...r,end:Math.min(65534,r.end)}));
  bmp.push({start:65535,end:65535,gid:0});
  const count=bmp.length,power=2**Math.floor(Math.log2(count));
  const f4=new Bytes().u16(4).u16(16+8*count).u16(0).u16(count*2).u16(power*2).u16(Math.log2(power)).u16(count*2-power*2);
  bmp.forEach(r=>f4.u16(r.end));f4.u16(0);bmp.forEach(r=>f4.u16(r.start));bmp.forEach(r=>f4.u16(r.gid-r.start));bmp.forEach(()=>f4.u16(0));
  if(f4.a.length>65535)throw Error('문자 매핑이 너무 많습니다.');
  const header=new Bytes().u16(0).u16(4),off=36;
  header.u16(0).u16(3).u32(off).u16(0).u16(4).u32(off+f4.a.length).u16(3).u16(1).u32(off).u16(3).u16(10).u32(off+f4.a.length);
  return join([header.data,f4.data,f12.data]);
}
function gsub(ligs){
  const groups=new Map();for(const l of ligs){const first=l.ids[0];if(!groups.has(first))groups.set(first,[]);groups.get(first).push(l);}
  const starts=[...groups.keys()].sort((a,b)=>a-b),sets=[];
  for(const first of starts){
    const rules=groups.get(first).sort((a,b)=>b.ids.length-a.ids.length),items=rules.map(l=>{const b=new Bytes().u16(l.out).u16(l.ids.length);l.ids.slice(1).forEach(id=>b.u16(id));return b.data;});
    let offset=2+items.length*2;const b=new Bytes().u16(items.length);
    items.forEach(a=>{b.u16(offset);offset+=a.length;});sets.push(join([b.data,...items]));
  }
  let offset=6+sets.length*2;const header=new Bytes().u16(1).u16(offset+sets.reduce((n,a)=>n+a.length,0)).u16(sets.length);
  sets.forEach(a=>{header.u16(offset);offset+=a.length;});
  const cover=new Bytes().u16(1).u16(starts.length);starts.forEach(id=>cover.u16(id));
  const sub=join([header.data,...sets,cover.data]);
  if(sub.length>60000)throw Error('이스터에그가 너무 많습니다. 이름을 줄이거나 항목을 나누어 주세요.');
  const lookup=join([new Bytes().u16(1).u16(4).u16(4).u16(0).u16(1).u16(8).data,sub]);
  const tags=['DFLT','hang','latn'],scripts=new Bytes().u16(tags.length);let o=2+tags.length*6;
  const scriptData=new Bytes().u16(4).u16(0).u16(0).u16(65535).u16(2).u16(0).u16(1).data;
  tags.forEach(tag=>{scripts.text(tag).u16(o);o+=scriptData.length;});
  tags.forEach(()=>scripts.add(scriptData));
  const features=new Bytes().u16(2).text('liga').u16(14).text('rlig').u16(20).u16(0).u16(1).u16(0).u16(0).u16(1).u16(0).data;
  const h=new Bytes().u32(0x10000).u16(10).u16(10+scripts.a.length).u16(10+scripts.a.length+features.length).data;
  return join([h,scripts.data,features,lookup]);
}
function nameTable(family,ps){
  const pairs=[[1,family],[2,'Regular'],[3,ps],[4,family+' Regular'],[5,'Version 3.001'],[6,ps],[16,family],[17,'Regular']];
  const header=new Bytes().u16(0).u16(pairs.length).u16(6+pairs.length*12),strings=[];let at=0;
  for(const [id,text]of pairs){const b=new Bytes();for(let i=0;i<text.length;i++)b.u16(text.charCodeAt(i));const data=b.data;header.u16(3).u16(1).u16(0x409).u16(id).u16(data.length).u16(at);at+=data.length;strings.push(data);}
  return join([header.data,...strings]);
}
function checksum(a){let sum=0;for(let i=0;i<a.length;i+=4)sum=(sum+(((a[i]||0)*0x1000000)+((a[i+1]||0)<<16)+((a[i+2]||0)<<8)+(a[i+3]||0)))>>>0;return sum;}
function writeOTF(map,ligatureData,family){
  family=(family||'내 손글씨 폰트').trim().replace(/[\\/:*?"<>|]/g,' ').slice(0,60)||'My Handfont';
  const glyphs=[{name:'.notdef',advance:700,contours:[[[80,0],[620,0],[620,700],[80,700]],[[130,50],[130,650],[570,650],[570,50]]]}],entries=[],ids=new Map(),ligs=[];
  for(const [cp,g]of [...map.entries()].sort((a,b)=>a[0]-b[0])){const id=glyphs.length;ids.set(cp,id);entries.push([cp,id]);glyphs.push({...g,name:cp===32?'space':'uni'+cp.toString(16).toUpperCase()});}
  for(const l of ligatureData){const out=glyphs.length;glyphs.push({...l.g,name:'egg'+out});ligs.push({out,ids:l.chars.map(c=>ids.get(c.codePointAt(0)))});}
  if(glyphs.length>65000)throw Error('글자 수가 너무 많습니다.');
  const boxes=glyphs.map(g=>bounds(g.contours)),bb=[Math.min(0,...boxes.map(b=>b.x0)),Math.min(0,...boxes.map(b=>b.y0)),Math.max(0,...boxes.map(b=>b.x1)),Math.max(0,...boxes.map(b=>b.y1))];
  let hash=2166136261;for(const g of glyphs)for(const p of g.contours)for(const xy of p)for(const n of xy)hash=Math.imul(hash^n,16777619)>>>0;
  for(const l of ligs)for(const id of l.ids)hash=Math.imul(hash^id,16777619)>>>0;
  const ps='HandFont-'+hash.toString(16),n=glyphs.length,advance=Math.max(...glyphs.map(g=>g.advance));
  const head=new Bytes().u32(0x10000).u32(0x30042).u32(0).u32(0x5F0F3CF5).u16(3).u16(1000);
  const time=Math.floor(Date.now()/1000)+2082844800;head.u32(0).u32(time).u32(0).u32(time);bb.forEach(v=>head.u16(v));head.u16(0).u16(8).u16(2).u16(0).u16(0);
  const hhea=new Bytes().u32(0x10000).u16(850).u16(-150).u16(200).u16(advance).u16(Math.min(...boxes.map(b=>b.x0))).u16(Math.min(...glyphs.map((g,i)=>g.advance-boxes[i].x1))).u16(Math.max(...boxes.map(b=>b.x1))).u16(1).u16(0).u16(0);
  for(let i=0;i<4;i++)hhea.u16(0);hhea.u16(0).u16(n);
  const hmtx=new Bytes();glyphs.forEach((g,i)=>hmtx.u16(g.advance).u16(boxes[i].x0));
  const os=new Bytes().u16(4).u16(700).u16(400).u16(5).u16(0);
  [650,600,0,75,650,600,0,350,50,250,0].forEach(v=>os.u16(v));for(let i=0;i<10;i++)os.u8(0);
  os.u32(0x10000003).u32(0x11000000).u32(0).u32(0).text('AU  ').u16(0xC0).u16(entries[0][0]).u16(Math.min(65535,entries[entries.length-1][0])).u16(850).u16(-150).u16(200).u16(Math.max(850,bb[3])).u16(Math.max(150,-bb[1])).u32(0x80001).u32(0).u16(500).u16(700).u16(0).u16(32).u16(Math.max(1,...ligs.map(l=>l.ids.length)));
  const post=new Bytes().u32(0x30000).u32(0).u16(-100).u16(50);for(let i=0;i<5;i++)post.u32(0);
  const tables={'CFF ':cff(glyphs,ps,bb),'OS/2':os.data,cmap:cmap(entries),head:head.data,hhea:hhea.data,hmtx:hmtx.data,maxp:new Bytes().u32(0x5000).u16(n).data,name:nameTable(family,ps),post:post.data};
  if(ligs.length)tables.GSUB=gsub(ligs);
  const tags=Object.keys(tables).sort(),count=tags.length,power=2**Math.floor(Math.log2(count)),dir=new Bytes().text('OTTO').u16(count).u16(power*16).u16(Math.log2(power)).u16(count*16-power*16),chunks=[];
  let at=12+count*16,headAt=0;
  for(const tag of tags){const data=tables[tag];dir.text(tag).u32(checksum(data)).u32(at).u32(data.length);if(tag==='head')headAt=at;const padded=new Uint8Array((data.length+3)&~3);padded.set(data);chunks.push(padded);at+=padded.length;}
  const out=join([dir.data,...chunks]);new DataView(out.buffer).setUint32(headAt+8,(0xB1B0AFBA-checksum(out))>>>0);
  return{bytes:out,glyphCount:n,ligatureCount:ligs.length,family,postScriptName:ps};
}
window.FontStudioCore={L,V,T,categories,labels,basic,esc,paint,trace,bounds,pathD,makeEngine,writeOTF};
})();
