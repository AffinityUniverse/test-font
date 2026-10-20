/* Font Studio 3.0 UI. Keeps v1 font keys and migrates v2 posters without deleting the source. */
(() => {
'use strict';
const C=window.FontStudioCore,$=id=>document.getElementById(id),esc=C.esc,clone=o=>JSON.parse(JSON.stringify(o));
const KEYS={draw:'my-handfont-drawings-v1',name:'my-handfont-name-v1',custom:'my-handfont-custom-v2',poster:'my-handfont-poster-v3',oldPoster:'my-handfont-poster-v2'};
let locked=false,toastTimer,mode='font',currentColor='#6757d9';
function toast(s){$('toast').textContent=s;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4500);}
function warning(s){$('storageWarning').textContent=s;$('storageWarning').hidden=false;}
function read(key,fallback){try{const s=localStorage.getItem(key);return s===null?fallback:JSON.parse(s);}catch(e){locked=true;warning('자동 저장 데이터를 읽지 못했습니다. 기존 데이터는 덮어쓰지 않습니다. 이 창을 닫기 전에 저장 공간과 브라우저 설정을 확인해 주세요.');return fallback;}}
function put(key,value){if(locked)return false;try{localStorage.setItem(key,value);return true;}catch(e){warning('브라우저 저장 공간이 부족하거나 저장이 차단되었습니다. 현재 작업은 이 창에만 남아 있습니다. 창을 닫지 말고 저장 설정을 확인해 주세요.');return false;}}
const initialDraw=read(KEYS.draw,{});
let drawings=Object.assign(Object.create(null),initialDraw&&typeof initialDraw==='object'&&!Array.isArray(initialDraw)?initialDraw:{});
let customNames=read(KEYS.custom,[]);customNames=Array.isArray(customNames)?[...new Set(customNames.filter(n=>typeof n==='string'&&n.length&&n.length<=64&&!['__proto__','constructor','prototype'].includes(n)))]:[];
let fontName='내 손글씨 폰트';try{fontName=localStorage.getItem(KEYS.name)||fontName;}catch(e){}
$('fontName').value=fontName;
const engine=C.makeEngine(()=>drawings,()=>customNames);
let tab='consonants',current='ㄱ',tool='pen',size=12,ink='#25272c',fontDrag=null;
const dhist=new Map(),dredo=new Map(),canvas=$('drawCanvas'),ctx=canvas.getContext('2d'),inkLayer=document.createElement('canvas');inkLayer.width=900;inkLayer.height=600;
function allNames(){return [...C.basic,...customNames.filter(n=>!C.basic.includes(n))];}
function saveFont(){const ok=put(KEYS.draw,JSON.stringify(drawings))&&put(KEYS.custom,JSON.stringify(customNames))&&put(KEYS.name,$('fontName').value);$('saveStatus').textContent=ok?'✓ 자동 저장됨':'자동 저장 실패';}
function historyFor(map,name){if(!map.has(name))map.set(name,[]);return map.get(name);}
function finishDrawing(cancel=false){
 if(!fontDrag)return;const d=fontDrag;fontDrag=null;
 if(cancel)drawings[d.name]=JSON.parse(d.before);
 else{const now=JSON.stringify(drawings[d.name]||[]);if(now!==d.before){const h=historyFor(dhist,d.name);h.push(d.before);if(h.length>40)h.shift();dredo.set(d.name,[]);}}
 engine.invalidate(d.name);if(!cancel)saveFont();refreshFont();refreshEggTray();if(mode==='poster')renderPoster();
}
function drawFont(){
 ctx.clearRect(0,0,900,600);ctx.fillStyle='#fff';ctx.fillRect(0,0,900,600);
 ctx.strokeStyle='#e4e5e9';ctx.lineWidth=2;ctx.setLineDash([7,7]);for(const y of [75,300,525]){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(900,y);ctx.stroke();}
 ctx.strokeStyle='#eeeeF1';ctx.lineWidth=1;ctx.setLineDash([4,7]);ctx.beginPath();ctx.moveTo(450,75);ctx.lineTo(450,525);ctx.stroke();ctx.setLineDash([]);
 if(current&&tab!=='custom'){ctx.save();ctx.fillStyle='#e1e2e6';ctx.globalAlpha=.65;ctx.font='500 330px sans-serif';ctx.textAlign='center';const sym=C.categories.symbols.includes(current);ctx.textBaseline=sym?'alphabetic':'middle';ctx.fillText(current,450,sym?415:300);ctx.restore();}
 if(!current){ctx.fillStyle='#888';ctx.font='25px sans-serif';ctx.textAlign='center';ctx.fillText('먼저 나만의 글자를 추가해 주세요',450,310);}
 const c=inkLayer.getContext('2d');c.clearRect(0,0,900,600);C.paint(c,drawings[current]||[]);ctx.drawImage(inkLayer,0,0);
}
function renderGrid(){
 const names=tab==='custom'?customNames:C.categories[tab];$('listLabel').textContent=C.labels[tab];$('customManager').hidden=tab!=='custom';$('openCustom').hidden=tab==='custom';
 $('glyphGrid').innerHTML=names.map(n=>`<button class="glyph ${n===current?'active':''} ${engine.has(n)?'done':''} ${Array.from(n).length>1?'long':''}" data-glyph="${esc(n)}" title="${esc(n)}">${esc(n)}</button>`).join('');
 $('glyphGrid').querySelectorAll('[data-glyph]').forEach(b=>b.onclick=()=>{finishDrawing();current=b.dataset.glyph;refreshFont();});
 document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
}
function refreshFont(){
 $('currentChar').textContent=current||'＋';$('currentChar').classList.toggle('long',Array.from(current||'').length>1);$('currentChar').title=current||'';
 $('currentTitle').textContent=current?current+' 디자인하기':'나만의 글자 추가하기';$('currentSub').textContent=C.labels[tab]+(tab==='custom'?' · 이름을 입력하면 그림으로 바뀌어요':' · 글자를 선택하고 그려 보세요');
 renderGrid();drawFont();const all=allNames(),n=all.filter(x=>engine.has(x)).length;$('progressText').textContent=n+' / '+all.length;$('progressBar').style.width=(n/all.length*100)+'%';
 $('undoBtn').disabled=!current||!historyFor(dhist,current).length;$('redoBtn').disabled=!current||!historyFor(dredo,current).length;$('clearBtn').disabled=!current;
 renderPreview();
}
function switchCategory(name){finishDrawing();tab=name;current=(name==='custom'?customNames:C.categories[name])[0]||null;refreshFont();}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>switchCategory(b.dataset.tab));
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{finishDrawing();tool=b.dataset.tool;document.querySelectorAll('[data-tool]').forEach(x=>x.classList.toggle('active',x===b));});
$('openCustom').onclick=()=>{switchCategory('custom');$('customName').focus();};
$('brushSize').oninput=e=>size=+e.target.value;$('inkColor').oninput=e=>ink=e.target.value;
function fontPos(e){const r=canvas.getBoundingClientRect();return[(e.clientX-r.left)*900/r.width,(e.clientY-r.top)*600/r.height];}
canvas.onpointerdown=e=>{
 if(!current||fontDrag||e.button>0)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);
 const p=fontPos(e),before=JSON.stringify(drawings[current]||[]),isPath=['pen','eraser'].includes(tool);
 const s=isPath?{type:'path',points:[p],color:tool==='eraser'?'#ffffff':ink,erase:tool==='eraser',size:tool==='eraser'?Math.max(28,size*3):size}:{type:tool,x:p[0],y:p[1],w:0,h:0,color:ink,erase:false,size};
 if(!drawings[current])drawings[current]=[];drawings[current].push(s);fontDrag={pointer:e.pointerId,name:current,before,s,start:p};drawFont();
};
canvas.onpointermove=e=>{if(!fontDrag||fontDrag.pointer!==e.pointerId)return;e.preventDefault();const s=fontDrag.s,p=fontPos(e);if(s.type==='path')s.points.push(p);else{s.w=p[0]-fontDrag.start[0];s.h=p[1]-fontDrag.start[1];}drawFont();};
canvas.onpointerup=e=>{if(fontDrag?.pointer===e.pointerId)finishDrawing();};
canvas.onpointercancel=e=>{if(fontDrag?.pointer===e.pointerId)finishDrawing(true);};
function undoDrawing(redo=false){
 finishDrawing();if(!current)return;const from=historyFor(redo?dredo:dhist,current),to=historyFor(redo?dhist:dredo,current);if(!from.length)return;
 to.push(JSON.stringify(drawings[current]||[]));drawings[current]=JSON.parse(from.pop());engine.invalidate(current);saveFont();refreshFont();refreshEggTray();
}
$('undoBtn').onclick=()=>undoDrawing();$('redoBtn').onclick=()=>undoDrawing(true);
$('clearBtn').onclick=()=>{finishDrawing();if(!current||!drawings[current]?.length)return;historyFor(dhist,current).push(JSON.stringify(drawings[current]));dredo.set(current,[]);drawings[current]=[];engine.invalidate(current);saveFont();refreshFont();refreshEggTray();};
function validName(raw,except=null){
 const name=String(raw).trim().normalize('NFC');
 if(!name){toast('이름을 입력해 주세요.');return null;}
 if(name.length>32||/[\s\u0000-\u001f\u007f]/u.test(name)){toast('공백 없이 32자 이내의 이름을 입력해 주세요.');return null;}
 if(/[\u200c\u200d\ufe00-\ufe0f\u{E0100}-\u{E01EF}]/u.test(name)){toast('조합형 이모지 대신 치킨, 고양이처럼 이름으로 등록해 주세요.');return null;}
 if(/[가-힣ㄱ-ㅎㅏ-ㅣ]/u.test(name)&&/\p{Script=Latin}/u.test(name)){toast('OTF에서도 같게 보이도록 한글과 영문을 섞지 않은 이름을 사용해 주세요.');return null;}
 if(['__proto__','constructor','prototype'].includes(name)){toast('다른 이름을 사용해 주세요.');return null;}
 if(allNames().some(n=>n!==except&&n.normalize('NFC')===name)){toast('이미 등록된 이름입니다. 기존 항목을 선택해 주세요.');return null;}return name;
}
function renderCustom(){
 $('customList').innerHTML=customNames.map(n=>`<div class="customitem"><button data-open="${esc(n)}">${esc(n)}</button><button data-rename="${esc(n)}" aria-label="${esc(n)} 이름 수정">수정</button><button data-remove="${esc(n)}" aria-label="${esc(n)} 삭제">삭제</button></div>`).join('');
 $('customList').querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{finishDrawing();tab='custom';current=b.dataset.open;refreshFont();});
 $('customList').querySelectorAll('[data-rename]').forEach(b=>b.onclick=()=>{
  finishDrawing();const old=b.dataset.rename,value=prompt('그림을 불러올 새 이름을 입력하세요.',old);if(value===null||value===old)return;const name=validName(value,old);if(!name)return;
  customNames[customNames.indexOf(old)]=name;drawings[name]=drawings[old]||[];delete drawings[old];if(current===old)current=name;
  if(dhist.has(old)){dhist.set(name,dhist.get(old));dhist.delete(old);}dredo.delete(old);
  engine.invalidate();for(const it of poster.items)if(it.kind==='egg'&&it.name===old)it.name=name;savePoster();saveFont();renderCustom();refreshFont();refreshEggTray();toast('이름을 수정했습니다. 그림은 그대로 유지됩니다.');
 });
 $('customList').querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{
  finishDrawing();const name=b.dataset.remove;if(!confirm('‘'+name+'’ 항목과 원본 그림을 삭제할까요? 이미 포스터에 넣은 그림은 남습니다.'))return;
  customNames=customNames.filter(n=>n!==name);delete drawings[name];if(current===name)current=customNames[0]||null;dhist.delete(name);dredo.delete(name);engine.invalidate();saveFont();renderCustom();refreshFont();refreshEggTray();
 });
}
$('customAdd').onclick=()=>{finishDrawing();const name=validName($('customName').value);if(!name)return;customNames.push(name);drawings[name]=[];current=name;tab='custom';$('customName').value='';engine.invalidate();saveFont();renderCustom();refreshFont();toast('이제 가운데 작업 공간에 그림을 그려 주세요.');};
$('customName').onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing)$('customAdd').click();};
$('fontName').oninput=()=>{fontName=$('fontName').value;$('saveStatus').textContent=put(KEYS.name,fontName)?'✓ 자동 저장됨':'자동 저장 실패';};
$('resetAll').onclick=()=>{if(!confirm('모든 글자 그림을 지울까요? 나만의 글자 목록과 포스터는 유지됩니다.'))return;finishDrawing(true);drawings=Object.create(null);dhist.clear();dredo.clear();engine.invalidate();saveFont();refreshFont();refreshEggTray();};
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
let exporting=false;
async function downloadFont(){
 if(exporting)return;finishDrawing();exporting=true;$('downloadBtn').disabled=$('downloadTop').disabled=true;
 try{
  const data=await engine.exportOTF($('fontName').value,p=>{$('downloadBtn').textContent='글꼴 만드는 중 '+p+'%';});
  // Validate that the browser accepts the actual serialized OTF before offering it.
  const face=new FontFace('FontStudioCheck'+Date.now(),data.bytes);await face.load();
  const filename=(data.family.replace(/[\\/:*?"<>|]/g,'-').trim()||'my-font')+'.otf';
  download(new Blob([data.bytes],{type:'font/otf'}),filename);toast('OTF 저장 완료 · '+data.glyphCount+'개 글리프 · '+data.ligatureCount+'개 이름 합자');
 }catch(e){console.error(e);toast(e.message||'글꼴 생성 중 오류가 발생했습니다. 작업은 유지됩니다.');}
 finally{exporting=false;$('downloadBtn').disabled=$('downloadTop').disabled=false;$('downloadBtn').textContent='OTF 글꼴 다운로드';}
}
$('downloadBtn').onclick=$('downloadTop').onclick=downloadFont;

// Typography layout uses the very same contours sent to the OTF writer.
const measure=document.createElement('canvas').getContext('2d');
function textLayout(text,size=80,spacing=0,align='center',own=true,color='#25272c',ghost=false){
 size=Math.max(12,Number(size)||80);measure.font=size+'px sans-serif';
 const lines=String(text||'').split('\n'),rows=[];let w=1,missing=0;
 for(const line of lines){
  const tokens=engine.tokens(line,own),units=tokens.map(t=>{
   const width=t.text===' '?size*.35:t.glyph?t.glyph.advance/1000*size:measure.measureText(t.text).width;
   if(own&&!t.glyph&&t.text.trim())missing++;return {...t,width};
  });
  const width=units.reduce((n,t)=>n+t.width,0)+Math.max(0,units.length-1)*spacing;
  rows.push({units,width});w=Math.max(w,width);
 }
 const h=Math.max(size,lines.length*size*1.3);let svg='';
 rows.forEach((row,i)=>{let x=align==='left'?0:align==='right'?w-row.width:(w-row.width)/2;const y=size*.85+i*size*1.3;
  for(const t of row.units){
   if(t.glyph)svg+=`<path d="${t.glyph.d}" fill="${esc(color)}" transform="translate(${x} ${y}) scale(${size/1000} ${-size/1000})"/>`;
   else if(t.text!==' ')svg+=`<text x="${x}" y="${y}" fill="${ghost&&own?'#b8bac3':esc(color)}" font-size="${size}" font-family="sans-serif" xml:space="preserve">${esc(t.text)}</text>`;
   x+=t.width+spacing;
  }
 });
 return{w,h,svg,missing};
}
function renderPreview(){
 const value=$('wordInput').value;
 if(!value){$('previewNotice').textContent='아직 만들지 않은 글자는 회색 안내 글자로 표시됩니다.';$('previewText').innerHTML='<div class="hint" style="padding:24px 4px;text-align:center">글자나 이스터에그 이름을<br>위에 입력해 보세요.</div>';return;}
 const r=textLayout(value,85,1,'center',true,'#25272c',true);
 $('previewText').innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-5 -5 ${r.w+10} ${r.h+10}" width="${Math.max(180,r.w)}" aria-label="실제 글꼴 윤곽 미리보기">${r.svg}</svg>`;
 $('previewNotice').textContent=r.missing?'회색 글자는 아직 만들지 않은 안내 글자입니다. OTF에는 포함되지 않습니다.':'직접 만든 글꼴 윤곽입니다. OTF에도 같은 그림이 들어갑니다.';
}
$('wordInput').oninput=renderPreview;

// Poster model and v2 -> v3 migration.
let serial=0;const uid=()=>'item-'+Date.now().toString(36)+'-'+(++serial).toString(36);
const num=(n,f,min=-5000,max=5000)=>Number.isFinite(Number(n))?Math.min(max,Math.max(min,Number(n))):f;
const safeColor=(s,f='#6757d9')=>/^#[0-9a-f]{6}$/i.test(s||'')?s:f;
function baseItem(kind,fields={}){return{id:uid(),kind,x:450,y:500,sx:1,sy:1,rot:0,color:currentColor,...fields};}
function newText(text='글자를 입력하세요',fields={}){return baseItem('text',{text,size:100,spacing:0,align:'center',own:true,...fields});}
function newShape(shape,fields={}){return baseItem('shape',{shape,w:190,h:190,...fields});}
function titleTemplate(){return{version:3,width:900,height:1200,bg:'#f5f1ff',pattern:'none',items:[
 newShape('circle',{x:730,y:240,w:300,h:300,color:'#e4dcff'}),
 newShape('star',{x:210,y:330,w:120,h:120,color:'#ffbe61',rot:-14}),
 newText('나만의\n작은 우주',{x:450,y:580,size:115,color:'#51449c'}),
 newText('MY TYPE · MY STORY',{x:450,y:1030,size:27,own:false,color:'#7668a3',spacing:3})
]};}
function migrate(old){
 const d={version:3,width:900,height:1200,bg:safeColor(old.bg,'#ffffff'),pattern:['dots','grid'].includes(old.pattern)?old.pattern:'none',items:[]};
 for(const o of old.items||[]){
  const common={x:num(o.x,450),y:num(o.y,500),sx:num(o.scale,1,.03,30),sy:num(o.scale,1,.03,30),rot:num(o.rot,0,-360,360),color:safeColor(o.color)};
  if(o.kind==='text')d.items.push(newText(String(o.text||''),{...common,size:num(o.size,65,12,400),spacing:num(o.spacing,0,-5,60),align:['left','right'].includes(o.align)?o.align:'center',own:true}));
  else if(o.kind==='egg'){const g=engine.glyph(o.name);d.items.push(baseItem('egg',{...common,name:String(o.name||''),w:180,h:180,snapshot:g?g.contours:[],x:common.x+90*common.sx,y:common.y+60*common.sy}));}
  else if(['circle','square','star','heart'].includes(o.kind))d.items.push(newShape(o.kind,{...common,w:110,h:110}));
 }return d;
}
let saved=read(KEYS.poster,null),oldPoster=saved?null:read(KEYS.oldPoster,null);
let poster=saved&&saved.version===3&&Array.isArray(saved.items)?saved:oldPoster&&Array.isArray(oldPoster.items)?migrate(oldPoster):titleTemplate();
if(!saved&&oldPoster&&!locked)put(KEYS.poster,JSON.stringify(poster));
let selected=null,ptool='select',undo=[],redo=[],transaction=null,inputTimer=null,drag=null,snapLines=[],penPoints=null;
let editing=null,touchSession=null;const touches=new Map(),scene=$('posterScene');
function selectedItem(){return poster.items.find(i=>i.id===selected);}
function savePoster(){const ok=put(KEYS.poster,JSON.stringify(poster));$('posterSaveStatus').textContent=ok?'✓ 자동 저장됨':'저장 실패';}
function begin(){clearTimeout(inputTimer);if(!transaction)transaction=JSON.stringify(poster);}
function commit(){
 clearTimeout(inputTimer);if(transaction){if(transaction!==JSON.stringify(poster)){undo.push(transaction);if(undo.length>60)undo.shift();redo=[];savePoster();}transaction=null;}updateHistory();
}
function cancelTransaction(){if(transaction)poster=JSON.parse(transaction);transaction=null;clearTimeout(inputTimer);}
function change(fn,group=false){begin();fn();renderPoster();syncInspector(false);renderLayers();if(group)inputTimer=setTimeout(commit,600);else commit();}
function undoPoster(forward=false){
 finishText();commit();const from=forward?redo:undo,to=forward?undo:redo;if(!from.length)return;
 to.push(JSON.stringify(poster));poster=JSON.parse(from.pop());if(!poster.items.some(i=>i.id===selected))selected=null;savePoster();syncPoster();toast(forward?'다시 실행했습니다.':'실행을 취소했습니다.');
}
function updateHistory(){$('posterUndo').disabled=!undo.length;$('posterRedo').disabled=!redo.length;}
$('posterUndo').onclick=()=>undoPoster();$('posterRedo').onclick=()=>undoPoster(true);
$('selectTool').onclick=()=>setTool('select');$('posterPen').onclick=()=>setTool('pen');
function setTool(t){finishText();commit();ptool=t;$('selectTool').classList.toggle('active',t==='select');$('posterPen').classList.toggle('active',t==='pen');scene.style.cursor=t==='pen'?'crosshair':'default';if(t==='pen')toast('종이 위를 끌어 자유롭게 그려 보세요.');}
function setSelected(id){if(editing&&editing!==id)finishText();selected=id;ptool='select';$('selectTool').classList.add('active');$('posterPen').classList.remove('active');scene.style.cursor='default';syncPoster();}
function add(item,edit=false){
 finishText();commit();begin();poster.items.push(item);selected=item.id;ptool='select';commit();syncPoster();if(edit)openText(item.id);
}
$('addText').onclick=()=>add(newText(),true);
document.querySelectorAll('[data-addshape]').forEach(b=>b.onclick=()=>add(newShape(b.dataset.addshape,{x:450+(poster.items.length%4)*15,y:510+(poster.items.length%4)*15})));
function refreshEggTray(){
 const names=customNames.filter(n=>engine.has(n));$('eggEmpty').hidden=!!names.length;
 $('eggTray').innerHTML=names.map(n=>{const g=engine.glyph(n);return`<button data-egg="${esc(n)}" title="${esc(n)} 추가"><svg viewBox="0 0 700 850" aria-hidden="true"><path d="${g.d}" fill="#6757d9" transform="translate(0 800) scale(1 -1)"/></svg>${esc(n)}</button>`;}).join('');
 $('eggTray').querySelectorAll('[data-egg]').forEach(b=>b.onclick=()=>{const name=b.dataset.egg,g=engine.glyph(name);if(g)add(baseItem('egg',{name,w:200,h:200,snapshot:clone(g.contours)}));});
}
function geometry(it,ghost=false){
 if(it.kind==='text')return textLayout(it.text,it.size,it.spacing,it.align,it.own!==false,it.color,ghost);
 const w=num(it.w,190,1,5000),h=num(it.h,190,1,5000),color=esc(safeColor(it.color));
 let svg='';
 if(it.kind==='egg'){
  const g=engine.glyph(it.name),contours=g?.contours||it.snapshot||[],d=C.pathD(contours);
  svg=`<path d="${d}" fill="${color}" transform="translate(0 ${h*.94}) scale(${w/700} ${-h/850})"/>`;
 }else if(it.kind==='stroke'){
  svg=`<path d="${(it.points||[]).map((p,i)=>(i?'L':'M')+p[0]+' '+p[1]).join(' ')}" fill="none" stroke="${color}" stroke-width="${it.lineWidth||8}" stroke-linecap="round" stroke-linejoin="round"/>`;
 }else{
  if(it.shape==='circle')svg=`<ellipse cx="${w/2}" cy="${h/2}" rx="${w/2}" ry="${h/2}" fill="${color}"/>`;
  else if(it.shape==='square')svg=`<rect width="${w}" height="${h}" rx="${Math.min(w,h)*.025}" fill="${color}"/>`;
  else if(it.shape==='triangle')svg=`<path d="M${w/2} 0L${w} ${h}L0 ${h}Z" fill="${color}"/>`;
  else if(it.shape==='heart')svg=`<path d="M50 91C40 81 3 57 3 31C3 4 35 -3 50 20C65 -3 97 4 97 31C97 57 60 81 50 91Z" fill="${color}" transform="scale(${w/100} ${h/100})"/>`;
  else{const points=[];for(let k=0;k<10;k++){const a=-Math.PI/2+k*Math.PI/5,r=k%2?.22:.5;points.push([w/2+Math.cos(a)*w*r,h/2+Math.sin(a)*h*r]);}svg=`<polygon points="${points.map(p=>p.join(',')).join(' ')}" fill="${color}"/>`;}
 }return{w,h,svg,missing:0};
}
function itemSVG(it,interactive=false){
 const g=geometry(it);return `<g ${interactive?`class="artitem" data-id="${esc(it.id)}"`:''} transform="translate(${it.x} ${it.y}) rotate(${it.rot||0}) scale(${it.sx||1} ${it.sy||1}) translate(${-g.w/2} ${-g.h/2})">${interactive?`<rect width="${g.w}" height="${g.h}" fill="transparent"/>`:''}<g pointer-events="none">${g.svg}</g></g>`;
}
function patternSVG(){
 if(poster.pattern==='none')return'';
 const inside=poster.pattern==='grid'?'<path d="M60 0H0V60" fill="none" stroke="#6757d9" stroke-opacity=".12" stroke-width="1"/>':'<circle cx="8" cy="8" r="2.5" fill="#6757d9" fill-opacity=".18"/>';
 return `<defs><pattern id="paperPattern" width="60" height="60" patternUnits="userSpaceOnUse">${inside}</pattern></defs><rect width="900" height="1200" fill="url(#paperPattern)"/>`;
}
function artSVG(){return`<rect width="900" height="1200" fill="${esc(safeColor(poster.bg,'#ffffff'))}"/>${patternSVG()}${poster.items.map(i=>itemSVG(i)).join('')}`;}
function uiScale(){const m=scene.getScreenCTM();return m?1/Math.max(.1,m.a):1.8;}
function selectionSVG(){
 const it=selectedItem();if(!it||editing===it.id)return'';
 const g=geometry(it),w=g.w*(it.sx||1),h=g.h*(it.sy||1),u=uiScale(),r=6*u,rotY=-h/2-30*u;
 const handles=[[-1,-1],[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0]];
 let s=`<g transform="translate(${it.x} ${it.y}) rotate(${it.rot||0})"><rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" fill="none" stroke="#6757d9" stroke-width="${1.5*u}" pointer-events="none"/><path d="M0 ${-h/2}V${rotY}" fill="none" stroke="#6757d9" stroke-width="${1.3*u}" pointer-events="none"/>`;
 for(const [x,y]of handles){
  s+=`<g data-handle="${x},${y}" style="cursor:${x&&y?(x===y?'nwse-resize':'nesw-resize'):x?'ew-resize':'ns-resize'}"><rect x="${x*w/2-r*2}" y="${y*h/2-r*2}" width="${r*4}" height="${r*4}" fill="transparent"/><rect x="${x*w/2-r}" y="${y*h/2-r}" width="${r*2}" height="${r*2}" rx="${u*2}" fill="white" stroke="#6757d9" stroke-width="${1.3*u}"/></g>`;
 }
 s+=`<g data-handle="rotate" style="cursor:grab"><circle cy="${rotY}" r="${r*2.5}" fill="transparent"/><circle cy="${rotY}" r="${r*1.15}" fill="#6757d9" stroke="white" stroke-width="${u*2}"/></g></g>`;return s;
}
function renderPoster(){
 let overlays=snapLines.map(axis=>axis==='x'?'<path d="M450 0V1200"/>':'<path d="M0 600H900"/>').join('');
 overlays=overlays?`<g stroke="#df68d9" stroke-width="2" stroke-dasharray="8 8" pointer-events="none">${overlays}</g>`:'';
 const pen=penPoints?`<path d="${penPoints.map((p,i)=>(i?'L':'M')+p.x+' '+p.y).join(' ')}" fill="none" stroke="${esc(currentColor)}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`:'';
 scene.innerHTML=`<defs><clipPath id="paperClip"><rect width="900" height="1200"/></clipPath></defs><rect class="paper" width="900" height="1200" fill="white"/><g clip-path="url(#paperClip)"><rect width="900" height="1200" fill="${esc(safeColor(poster.bg,'#ffffff'))}"/>${patternSVG()}${poster.items.map(it=>itemSVG(it,true)).join('')}${pen}${overlays}</g>${selectionSVG()}`;
}
const shapeLabels={circle:'원',square:'네모',triangle:'세모',star:'별',heart:'하트'};
function itemLabel(it){return it.kind==='text'?(it.text.replace(/\n/g,' ').trim()||'빈 문구'):it.kind==='egg'?it.name:it.kind==='stroke'?'내 그림':shapeLabels[it.shape]||'도형';}
function renderLayers(){
 $('layerList').innerHTML=[...poster.items].reverse().map(it=>`<button class="layer ${it.id===selected?'active':''}" data-layer="${esc(it.id)}"><span>${it.kind==='text'?'T':it.kind==='egg'?'✧':it.kind==='stroke'?'✎':'◇'}</span><span>${esc(itemLabel(it))}</span></button>`).join('');
 $('layerList').querySelectorAll('[data-layer]').forEach(b=>b.onclick=()=>setSelected(b.dataset.layer));
}
function val(id,v){const el=$(id);if(el!==document.activeElement)el.value=v;}
function syncInspector(full=true){
 const it=selectedItem();$('selectionControls').hidden=!it;$('nothingSelected').hidden=!!it;$('selectionTitle').textContent=it?itemLabel(it):'종이 설정';$('textProperties').hidden=it?.kind!=='text';
 val('posterBg',safeColor(poster.bg,'#ffffff'));val('posterPattern',poster.pattern);
 if(it){val('elementColor',safeColor(it.color));if(full)currentColor=safeColor(it.color);
  const g=geometry(it);val('exactWidth',Math.round(g.w*(it.sx||1)));val('exactHeight',Math.round(g.h*(it.sy||1)));val('exactRotation',Math.round(it.rot||0));
  if(it.kind==='text'){
   val('posterText',it.text);val('textFont',it.own===false?'system':'own');val('posterSize',it.size);val('posterSpacing',it.spacing||0);val('posterAlign',it.align||'center');
   $('fontUseNote').textContent=it.own===false?'기본 글꼴로 표시 중입니다.':g.missing?'내 폰트가 자동 적용됩니다. 아직 안 그린 글자는 기본 글꼴로 표시되며 OTF에는 포함되지 않습니다.':'직접 만든 글자와 이스터에그가 적용되었습니다.';
  }
 }
 document.querySelectorAll('#elementPalette button').forEach(b=>b.classList.toggle('selected',b.dataset.color===it?.color));
 document.querySelectorAll('#backgroundPalette button').forEach(b=>b.classList.toggle('selected',b.dataset.color===poster.bg));
 $('bringForward').disabled=!it||poster.items.indexOf(it)===poster.items.length-1;$('sendBackward').disabled=!it||poster.items.indexOf(it)===0;
}
function syncPoster(){renderPoster();syncInspector();renderLayers();updateHistory();$('selectTool').classList.toggle('active',ptool==='select');$('posterPen').classList.toggle('active',ptool==='pen');}
function openText(id){
 const it=poster.items.find(i=>i.id===id);if(!it||it.kind!=='text')return;finishText();selected=id;editing=id;$('inlineText').value=it.text;$('textEditor').hidden=false;renderPoster();
 $('inlineText').focus({preventScroll:true});$('inlineText').select();
}
function finishText(){if(!editing)return;commit();editing=null;$('textEditor').hidden=true;renderPoster();}
$('finishText').onclick=()=>{finishText();scene.focus();};
$('inlineText').oninput=e=>{const it=selectedItem();if(it&&it.kind==='text')change(()=>it.text=e.target.value,true);};
$('inlineText').onkeydown=e=>{if((e.key==='Enter'&&(e.ctrlKey||e.metaKey))||e.key==='Escape'){e.preventDefault();finishText();scene.focus();}};
scene.ondblclick=e=>{const id=e.target.closest('[data-id]')?.dataset.id;if(id)openText(id);};
function bindProperty(id,field,convert=v=>v){
 $(id).addEventListener('input',e=>{const it=selectedItem();if(!it)return;change(()=>{it[field]=convert(e.target.value);},true);});
 $(id).addEventListener('change',()=>commit());$(id).addEventListener('blur',()=>commit());
}
bindProperty('posterText','text');bindProperty('elementColor','color',v=>(currentColor=safeColor(v)));
bindProperty('posterSize','size',v=>num(v,80,12,400));bindProperty('posterSpacing','spacing',v=>num(v,0,-5,60));bindProperty('posterAlign','align');bindProperty('textFont','own',v=>v==='own');
$('exactWidth').onchange=e=>{const it=selectedItem();if(it)change(()=>it.sx=num(e.target.value,100,10,3000)/geometry(it).w);};
$('exactHeight').onchange=e=>{const it=selectedItem();if(it)change(()=>it.sy=num(e.target.value,100,10,4000)/geometry(it).h);};
$('exactRotation').onchange=e=>{const it=selectedItem();if(it)change(()=>it.rot=num(e.target.value,0,-360,360));};
$('posterBg').oninput=e=>change(()=>poster.bg=safeColor(e.target.value,'#ffffff'),true);$('posterBg').onchange=commit;
$('posterPattern').onchange=e=>change(()=>poster.pattern=e.target.value);
function palette(id,colors,apply){
 $(id).innerHTML=colors.map(c=>`<button style="background:${c}" data-color="${c}" title="${c}" aria-label="${c} 색상"></button>`).join('');
 $(id).querySelectorAll('button').forEach(b=>b.onclick=()=>{finishText();apply(b.dataset.color);syncInspector();});
}
palette('elementPalette',['#25272c','#6757d9','#ef86ad','#ffb45e','#6fc5ae','#ffffff'],c=>{currentColor=c;const it=selectedItem();if(it)change(()=>it.color=c);});
palette('backgroundPalette',['#ffffff','#f5f1ff','#fff3db','#fbe5ed','#e8f5f0','#25272c'],c=>change(()=>poster.bg=c));
$('duplicateElement').onclick=()=>{const it=selectedItem();if(it)add({...clone(it),id:uid(),x:it.x+28,y:it.y+28});};
$('deleteElement').onclick=()=>{finishText();const it=selectedItem();if(it)change(()=>{poster.items=poster.items.filter(x=>x.id!==selected);selected=null;});};
$('centerElement').onclick=()=>{const it=selectedItem();if(it)change(()=>{it.x=450;it.y=600;});};
function order(delta){const it=selectedItem();if(!it)return;const i=poster.items.indexOf(it),j=i+delta;if(j<0||j>=poster.items.length)return;change(()=>{poster.items.splice(i,1);poster.items.splice(j,0,it);});}
$('bringForward').onclick=()=>order(1);$('sendBackward').onclick=()=>order(-1);

// Affinity-like selection handles, rotation, snapping, and touch undo/redo.
function point(e){const p=new DOMPoint(e.clientX,e.clientY),m=scene.getScreenCTM();return m?p.matrixTransform(m.inverse()):{x:0,y:0};}
function rotate(x,y,angle){const a=angle*Math.PI/180;return{x:x*Math.cos(a)-y*Math.sin(a),y:x*Math.sin(a)+y*Math.cos(a)};}
function abortDrag(){if(drag||penPoints){cancelTransaction();drag=null;penPoints=null;snapLines=[];renderPoster();}}
scene.onpointerdown=e=>{
 if(e.button>0)return;e.preventDefault();scene.setPointerCapture(e.pointerId);
 if(e.pointerType==='touch'){
  if(!touches.size)touchSession={start:performance.now(),max:0,moved:false,cancelled:false};
  touches.set(e.pointerId,{x:e.clientX,y:e.clientY});touchSession.max=Math.max(touchSession.max,touches.size);
  if(touches.size>1){abortDrag();return;}
 }
 finishText();commit();scene.focus();
 const p=point(e),h=e.target.closest('[data-handle]')?.dataset.handle,it=selectedItem();
 if(h&&it){
  begin();const g=geometry(it);
  drag={type:h==='rotate'?'rotate':'resize',id:it.id,pointer:e.pointerId,start:p,origin:clone(it),g,handle:h,startAngle:Math.atan2(p.y-it.y,p.x-it.x)*180/Math.PI};return;
 }
 if(ptool==='pen'){
  if(p.x<0||p.y<0||p.x>900||p.y>1200)return;
  begin();selected=null;penPoints=[p];drag={type:'pen',pointer:e.pointerId};renderPoster();return;
 }
 const id=e.target.closest('[data-id]')?.dataset.id;
 if(id){setSelected(id);begin();drag={type:'move',id,pointer:e.pointerId,start:p,origin:clone(selectedItem())};}
 else{selected=null;syncPoster();}
};
scene.onpointermove=e=>{
 const touch=touches.get(e.pointerId);
 if(touch&&touchSession&&Math.hypot(e.clientX-touch.x,e.clientY-touch.y)>12)touchSession.moved=true;
 if(touchSession?.max>1||!drag||drag.pointer!==e.pointerId)return;e.preventDefault();
 const p=point(e),d=drag;
 if(d.type==='pen'){penPoints.push(p);renderPoster();return;}
 const it=poster.items.find(i=>i.id===d.id);if(!it)return;
 if(d.type==='move'){
  it.x=d.origin.x+p.x-d.start.x;it.y=d.origin.y+p.y-d.start.y;snapLines=[];
  if(Math.abs(it.x-450)<8){it.x=450;snapLines.push('x');}if(Math.abs(it.y-600)<8){it.y=600;snapLines.push('y');}
 }else if(d.type==='rotate'){
  let rot=d.origin.rot+Math.atan2(p.y-it.y,p.x-it.x)*180/Math.PI-d.startAngle;
  if(e.shiftKey||Math.abs(rot/15-Math.round(rot/15))<.12)rot=Math.round(rot/15)*15;it.rot=((rot+540)%360)-180;
 }else{
  const [hx,hy]=d.handle.split(',').map(Number),o=d.origin,g=d.g,angle=o.rot||0;
  const q=rotate(p.x-o.x,p.y-o.y,-angle),aw=-hx*g.w*o.sx/2,ah=-hy*g.h*o.sy/2;
  let nw=g.w*o.sx,nh=g.h*o.sy;
  if(hx&&hy){const vx=hx*g.w*o.sx,vy=hy*g.h*o.sy,r=Math.max(.03,((q.x-aw)*vx+(q.y-ah)*vy)/(vx*vx+vy*vy));nw=Math.max(10,nw*r);nh=Math.max(10,nh*r);}
  else if(hx)nw=Math.max(10,hx*(q.x-aw));else nh=Math.max(10,hy*(q.y-ah));
  nw=Math.min(3000,nw);nh=Math.min(4000,nh);it.sx=nw/g.w;it.sy=nh/g.h;
  const center=rotate(aw+hx*nw/2,ah+hy*nh/2,angle);it.x=o.x+center.x;it.y=o.y+center.y;
 }
 renderPoster();syncInspector(false);
};
function pointerEnd(e,cancelled=false){
 if(e.pointerType==='touch'){
  touches.delete(e.pointerId);if(touchSession)touchSession.cancelled||=cancelled;
  if(touchSession?.max>1){
   if(!touches.size){const t=touchSession;touchSession=null;if(!t.moved&&!t.cancelled&&performance.now()-t.start<400){if(t.max===2)undoPoster();else if(t.max===3)undoPoster(true);}}
   return;
  }
 }
 if(drag&&drag.pointer===e.pointerId){
  if(cancelled)cancelTransaction();
  else if(drag.type==='pen'&&penPoints){
   if(penPoints.length===1)penPoints.push({x:penPoints[0].x+.1,y:penPoints[0].y+.1});
   const b=C.bounds([penPoints.map(p=>[p.x,p.y])]),pad=5;
   const it=baseItem('stroke',{x:(b.x0+b.x1)/2,y:(b.y0+b.y1)/2,w:b.w+pad*2,h:b.h+pad*2,lineWidth:8,points:penPoints.map(p=>[p.x-b.x0+pad,p.y-b.y0+pad])});
   poster.items.push(it);selected=it.id;
  }
  drag=null;penPoints=null;snapLines=[];if(!cancelled)commit();syncPoster();
 }
 if(!touches.size)touchSession=null;
}
scene.onpointerup=e=>pointerEnd(e);scene.onpointercancel=e=>pointerEnd(e,true);
window.addEventListener('resize',()=>{if(mode==='poster')renderPoster();});
function catPieces(){
 const p=[],make=(shape,x,y,w,h,color,rot=0)=>p.push(newShape(shape,{x,y,w,h,color,rot}));
 make('triangle',355,470,165,195,'#efbc86',-18);make('triangle',545,470,165,195,'#efbc86',18);
 make('triangle',355,477,95,118,'#ee91a4',-18);make('triangle',545,477,95,118,'#ee91a4',18);
 make('circle',450,610,370,310,'#efbc86');make('circle',380,595,28,42,'#25272c');make('circle',520,595,28,42,'#25272c');
 make('triangle',450,653,37,28,'#b86c6c',180);
 make('square',338,650,95,6,'#8f674c',-8);make('square',336,680,95,6,'#8f674c',7);make('square',562,650,95,6,'#8f674c',8);make('square',564,680,95,6,'#8f674c',-7);
 return p;
}
$('addCat').onclick=()=>{finishText();commit();begin();const p=catPieces();poster.items.push(...p);selected=p[4].id;commit();syncPoster();toast('얼굴·귀·눈을 각각 선택해 바꿔 보세요.');};
function replacePoster(doc){if(poster.items.length&&!confirm('현재 포스터를 바꿀까요? 실행 취소로 되돌릴 수 있습니다.'))return;finishText();commit();begin();poster=doc;selected=null;commit();syncPoster();}
$('templateTitle').onclick=()=>replacePoster(titleTemplate());
$('templateCat').onclick=()=>replacePoster({version:3,width:900,height:1200,bg:'#fff3db',pattern:'none',items:[newText('나의 고양이',{x:450,y:260,size:106,color:'#885e3c'}),...catPieces(),newText('동그라미와 세모로 만든 친구',{x:450,y:970,size:32,own:false,color:'#9b7658'})]});
$('blankPoster').onclick=()=>replacePoster({version:3,width:900,height:1200,bg:'#ffffff',pattern:'none',items:[]});
$('posterPng').onclick=async()=>{
 finishText();commit();const btn=$('posterPng');btn.disabled=true;btn.textContent='이미지 만드는 중…';
 try{
  const scale=+$('exportSize').value,w=900*scale,h=1200*scale;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 900 1200"><defs><clipPath id="exportClip"><rect width="900" height="1200"/></clipPath></defs><g clip-path="url(#exportClip)">${artSVG()}</g></svg>`;
  const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
  try{const image=new Image();image.src=url;await image.decode();const cv=document.createElement('canvas');cv.width=w;cv.height=h;cv.getContext('2d').drawImage(image,0,0,w,h);
   const blob=await new Promise(r=>cv.toBlob(r,'image/png'));if(!blob)throw Error('PNG를 만들지 못했습니다.');download(blob,'my-typography-poster.png');toast(w+' × '+h+' PNG 이미지를 저장했습니다.');
  }finally{URL.revokeObjectURL(url);}
 }catch(e){console.error(e);toast('이미지 저장 오류: '+e.message);}
 finally{btn.disabled=false;btn.textContent='PNG 이미지 저장 ↗';}
};
function switchMode(next){
 finishDrawing();finishText();commit();mode=next;$('fontWorkspace').hidden=next!=='font';$('posterWorkspace').hidden=next!=='poster';
 document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===next));
 if(next==='poster'){refreshEggTray();syncPoster();requestAnimationFrame(renderPoster);}
}
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>switchMode(b.dataset.mode));
$('sendToPoster').onclick=()=>{const text=$('wordInput').value.trim();if(!text){toast('먼저 미리보기 문구를 입력해 주세요.');$('wordInput').focus();return;}switchMode('poster');add(newText(text,{y:220}));};
document.addEventListener('keydown',e=>{
 const editable=e.target.closest('input,textarea,select,[contenteditable="true"]');if(editable)return;
 const cmd=e.ctrlKey||e.metaKey,key=e.key.toLowerCase();
 if(cmd&&(key==='z'||key==='y')){e.preventDefault();const redo=key==='y'||e.shiftKey;mode==='font'?undoDrawing(redo):undoPoster(redo);return;}
 if(mode!=='poster')return;
 if(cmd&&key==='d'){e.preventDefault();$('duplicateElement').click();}
 else if(e.key==='Delete'||e.key==='Backspace'){if(selected){e.preventDefault();$('deleteElement').click();}}
 else if(e.key==='Escape'){finishText();selected=null;syncPoster();}
 else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
  const it=selectedItem();if(it){e.preventDefault();const n=e.shiftKey?10:1;change(()=>{if(e.key==='ArrowLeft')it.x-=n;if(e.key==='ArrowRight')it.x+=n;if(e.key==='ArrowUp')it.y-=n;if(e.key==='ArrowDown')it.y+=n;});}
 }
});
window.addEventListener('pagehide',()=>{finishDrawing();commit();});
window.FontStudio={engine,getDrawings:()=>clone(drawings),getCustomNames:()=>customNames.slice(),getPoster:()=>clone(poster),getSelection:()=>selected,artSVG,geometry,textLayout,version:'3.0'};
renderCustom();refreshFont();refreshEggTray();syncPoster();
})();
