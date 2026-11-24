// Chart hover for the whole site: hover (or tap) any chart to see the date and the value under the pointer.
// Loads right after the core app code, before every other add-on, so all of them can use it.
//
// RULE FOR EVERY NEW CHART: after drawing, call
//   chHover(el, xs, tip, marks, top, bottom)
//   el     the <div> holding the chart's <svg>, or the <canvas> itself
//   xs     x position (CSS pixels, from the chart's left edge) of each data point
//   tip(i) tooltip HTML for point i: '<b>'+chDate(date)+'</b>' then one chRow(color, name, value) per series
//   marks(i) dots to highlight: [[x, y, color], ...]
//   top, bottom  y range of the dashed guide line
// This file also adds hover to the core page's canvas charts (price candles, asset lines, Grouping, small lines).
const NSV='http://www.w3.org/2000/svg';
function chHover(el,xs,tip,marks,y0,y1){if(!el||!xs||!xs.length)return;let host,sv,tgt,ox=0,oy=0;
if(el.tagName=='CANVAS'){let w=el.parentNode;if(!w.classList||!w.classList.contains('cvw')){w=document.createElement('div');w.className='cvw';el.parentNode.insertBefore(w,el);w.appendChild(el)}
host=w;sv=w.querySelector('svg.cvo');if(!sv){sv=document.createElementNS(NSV,'svg');sv.setAttribute('class','cvo');w.appendChild(sv)}
ox=el.offsetLeft;oy=el.offsetTop;sv.setAttribute('width',el.clientWidth);sv.setAttribute('height',el.clientHeight);sv.style.left=ox+'px';sv.style.top=oy+'px';sv.innerHTML='';tgt=el}
else{sv=el.querySelector('svg');if(!sv)return;host=el;tgt=sv;sv.querySelectorAll('g.chg').forEach(n=>n.remove())}
if(getComputedStyle(host).position=='static')host.style.position='relative';
let tt=[...host.children].find(n=>n.classList.contains('ctt'));if(!tt){tt=document.createElement('div');tt.className='ctt';host.appendChild(tt)}
const g=document.createElementNS(NSV,'g'),vl=document.createElementNS(NSV,'line');g.setAttribute('class','chg');g.style.display='none';g.setAttribute('pointer-events','none');
vl.setAttribute('y1',y0);vl.setAttribute('y2',y1);vl.setAttribute('style','stroke:var(--mu);stroke-dasharray:3 3');g.appendChild(vl);sv.appendChild(g);
if(tgt._chh){tgt.removeEventListener('pointermove',tgt._chh[0]);tgt.removeEventListener('pointerdown',tgt._chh[0]);tgt.removeEventListener('pointerleave',tgt._chh[1])}
const mv=e=>{const bx=tgt.getBoundingClientRect(),hb=host.getBoundingClientRect(),x=e.clientX-bx.left;let i=0,bd=1e9;for(let k=0;k<xs.length;k++){const d=Math.abs(xs[k]-x);if(d<bd){bd=d;i=k}}
let html;try{html=tip(i)}catch(err){html=''}if(!html){g.style.display='none';tt.style.display='none';return}
vl.setAttribute('x1',xs[i]);vl.setAttribute('x2',xs[i]);g.querySelectorAll('circle').forEach(c=>c.remove());
(marks?marks(i):[]).forEach(([cx,cy,c])=>{if(cx==null||cy==null||!isFinite(cy))return;const k=document.createElementNS(NSV,'circle');k.setAttribute('cx',cx);k.setAttribute('cy',cy);k.setAttribute('r',3.5);k.setAttribute('style','fill:'+c+';stroke:var(--pn);stroke-width:1.5');g.appendChild(k)});
g.style.display='';tt.innerHTML=html;tt.style.display='block';const tw=tt.offsetWidth,W=host.clientWidth,px=xs[i]+(bx.left-hb.left);let L=px+14;if(L+tw>W)L=px-14-tw;
tt.style.left=Math.max(0,L)+'px';tt.style.top=Math.max(0,Math.min(e.clientY-hb.top-20,host.clientHeight-tt.offsetHeight))+'px'};
const lv=e=>{if(e&&e.pointerType=='touch')return;g.style.display='none';tt.style.display='none'};
tgt.addEventListener('pointermove',mv);tgt.addEventListener('pointerdown',mv);tgt.addEventListener('pointerleave',lv);tgt._chh=[mv,lv]}
const chRow=(c,n,v)=>'<div><i style="background:'+c+'"></i>'+n+' <b>'+v+'</b></div>';
const chDate=d=>{if(!d)return'';const m=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+d.slice(5,7)-1];return d.length>7&&d.slice(8,10)!='01'?m+' '+(+d.slice(8,10))+', '+d.slice(0,4):m+' '+d.slice(0,4)};
const chDay=d=>{if(!d)return'';const m=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+d.slice(5,7)-1];return m+' '+(+d.slice(8,10))+', '+d.slice(0,4)};
const chYMD=z=>z&&z.length==6?'20'+z.slice(0,2)+'-'+z.slice(2,4)+'-'+z.slice(4,6):z;  // core date format YYMMDD -> YYYY-MM-DD
const chC=c=>!c?'var(--am)':c[0]=='#'||c.startsWith('var(')?c:'var('+c+')';
const chPct=v=>v==null||!isFinite(v)?'–':'<span class="'+(v>=0?'up':'dn')+'">'+(v>=0?'+':'')+f(v,2)+'%</span>';
// ---------- small line charts in the core page (line(id, series, format)) ----------
// Labels for each chart: dates (or categories) for the x axis and a name per series.
const CHY=['^IRX','^FVX','^TNX','^TYX'],CHYL=['3 months','5 years','10 years','30 years'];
const LMETA={
inf:()=>({t:HF('CPIAUCSL').d.slice(12).slice(-120),n:['Headline CPI','Core CPI'],tf:v=>f(v,1)+'%'}),
mi:()=>({t:HF('CPIAUCSL').d.slice(12).slice(-36),n:['CPI, year over year'],tf:v=>f(v,1)+'%'}),
mc:()=>({t:CHYL,n:['Treasury yield'],tf:v=>f(v,2)+'%'}),
yc:()=>({t:CHYL,n:['Treasury yield'],tf:v=>f(v,2)+'%'}),
pfc:()=>({t:RD.map(chYMD),n:['Portfolio value'],day:1}),
wv:()=>({t:RD.map(chYMD),n:['Value of $10,000'],day:1}),
far:()=>{const fa=CD[cur]&&CD[cur].sec&&CD[cur].sec.fa;return{t:fa?fa.ends.map(e=>'Fiscal year '+e.slice(0,4)):[],n:['Revenue','Net income']}},
sd:()=>({t:HF('ACTLISCOUUS').d,n:['Active listings','Pending sales'],tf:v=>f(v,0)}),
tr:()=>({t:HS.zillow.Low.d,n:['Low class','Working class','High class'],tf:v=>'$'+f(v,0)})};
const _lineA=line;
line=function(id,S,fm=f){_lineA(id,S,fm);const c=$('#'+id);if(!c||!S||!S.length)return;let M={};try{M=LMETA[id]?LMETA[id]():{}}catch(e){}
const w=c.clientWidth,h=c.clientHeight,a=S.flatMap(s=>s.d).filter(v=>v!=null&&isFinite(v));if(!a.length)return;const mx=Math.max(...a),mn=Math.min(...a),Y=v=>6+(mx-v)/(mx-mn||1)*(h-14),N=Math.max(...S.map(s=>s.d.length));
const X=(i,n)=>n<2?0:i/(n-1)*(w-50),xs=[...Array(N)].map((_,i)=>X(i,N)),J=(s,i)=>Math.round(i*(s.d.length-1)/Math.max(1,N-1)),tf=M.tf||fm;
const lab=i=>{const t=M.t&&M.t[M.t.length-N+i];return t==null?'Point '+(i+1):/^\d{4}-\d{2}(-\d{2})?$/.test(t)?(M.day?chDay(t):chDate(t)):t};
chHover(c,xs,i=>'<b>'+lab(i)+'</b>'+S.map((s,k)=>chRow(chC(s.c),(M.n&&M.n[k])||'Value',tf(s.d[J(s,i)]))).join('')+(M.day&&i>0&&S.length==1?chRow('transparent','Change from start',chPct((S[0].d[J(S[0],i)]/S[0].d[0]-1)*100)):''),
i=>S.map(s=>[X(J(s,i),s.d.length),Y(s.d[J(s,i)]),chC(s.c)]),2,h-4)};
// ---------- price candles on the Markets tab ----------
const CHG={'1D':1,'1W':5,'1M':21},CHN={'1D':130,'1W':104,'1M':24};
const chMA=(cl,p)=>{const o=Array(cl.length).fill(null);let s=0;for(let k=0;k<cl.length;k++){s+=cl[k];if(k>=p)s-=cl[k-p];if(k>=p-1)o[k]=s/p}return o};
const _drawCA=drawC;
drawC=function(){_drawCA();const c=$('#ch');if(!c||!RAW[cur])return;const all=series(cur,iv);if(!all.length)return;const off=Math.max(0,all.length-CHN[iv]),d=all.slice(off),cl=all.map(z=>z[3]),dt=RAW[cur].d||RD,Lr=RAW[cur].c.length,g=CHG[iv],s0=g==1?0:Lr%g,
ms=Object.keys(MA).filter(p=>MA[p]).map(p=>({p,c:MAC[p],v:chMA(cl,+p).slice(off)})),vs=d.flatMap(z=>[z[1],z[2]]).concat(ms.flatMap(m=>m.v.filter(z=>z!=null))),mx=Math.max(...vs),mn=Math.min(...vs),
w=c.clientWidth,h=c.clientHeight,pw=w-54,s=pw/d.length,Y=v=>6+(mx-v)/(mx-mn||1)*(h-12),xs=d.map((_,i)=>i*s+s/2);
const when=i=>{const k=off+i,a=dt[s0+k*g],b=dt[Math.min(Lr-1,s0+k*g+g-1)];return g==1?chDay(chYMD(a)):chDay(chYMD(a))+' to '+chDay(chYMD(b))};
chHover(c,xs,i=>{const z=d[i],pv=i?d[i-1][3]:(off?all[off-1][3]:null);return'<b>'+when(i)+'</b>'+chRow('transparent','Open',f(z[0]))+chRow('transparent','High',f(z[1]))+chRow('transparent','Low',f(z[2]))+chRow(chC(z[3]>=z[0]?'--up':'--dn'),'Close',f(z[3]))
+(pv?chRow('transparent','Change',chPct((z[3]/pv-1)*100)):'')+ms.filter(m=>m.v[i]!=null).map(m=>chRow(chC(MAC[m.p]),m.p+(g==1?'-day':g==5?'-week':'-month')+' average',f(m.v[i]))).join('')},
i=>[[xs[i],Y(d[i][3]),chC(d[i][3]>=d[i][0]?'--up':'--dn')],...ms.filter(m=>m.v[i]!=null).map(m=>[xs[i],Y(m.v[i]),chC(MAC[m.p])])],6,h-6)};
// ---------- price line for ETFs, indexes, currencies and crypto ----------
const _drawXA=drawX;
drawX=function(){_drawXA();const c=$('#ch'),e=EXT[ac];if(!c||!e)return;const cl=e.c,T=tsr(ac),st=T.at(-1)-GD[XR],o=Math.max(0,T.findIndex(z=>z>=st)),n=cl.length-o,dg=cl.at(-1)<10?4:2;if(n<1)return;
const ms=Object.keys(MA).filter(p=>MA[p]).map(p=>({p,v:chMA(cl,+p).slice(o)})),vs=cl.slice(o).concat(ms.flatMap(m=>m.v.filter(z=>z!=null))),mx=Math.max(...vs),mn=Math.min(...vs),
w=c.clientWidth,h=c.clientHeight,pw=w-60,Y=v=>6+(mx-v)/(mx-mn||1)*(h-12),X=i=>i/Math.max(1,n-1)*pw,xs=[...Array(n)].map((_,i)=>X(i));
chHover(c,xs,i=>'<b>'+chDay(fdn(T[o+i]))+'</b>'+chRow('var(--tx)',e.n||ac,f(cl[o+i],dg))+chRow('transparent','Change from start',chPct((cl[o+i]/cl[o]-1)*100))+ms.filter(m=>m.v[i]!=null).map(m=>chRow(chC(MAC[m.p]),m.p+'-day average',f(m.v[i],dg))).join(''),
i=>[[X(i),Y(cl[o+i]),'var(--tx)'],...ms.filter(m=>m.v[i]!=null).map(m=>[X(i),Y(m.v[i]),chC(MAC[m.p])])],6,h-6)};
// ---------- Grouping chart (zoom and drag stay as they were) ----------
const _drawGA=drawG;
drawG=function(){_drawGA();const c=$('#gc');if(!c||!SEL.length)return;const w=c.clientWidth,h=c.clientHeight,end=Math.max(...SEL.map(t=>tsr(t).at(-1))),t0=end-GD[GR],va=t0+gz[0]*(end-t0),vb=t0+gz[1]*(end-t0);
const D=SEL.map(t=>{const T=tsr(t),cl=ser(t).c,i0=Math.max(0,T.findIndex(z=>z>=t0)),b0=cl[i0];return{t,p:T.slice(i0).map((z,k)=>[z,(cl[i0+k]/b0-1)*100])}}),
vix=VPON&&EXT['^VIX']?tsr('^VIX').map((z,k)=>[z,EXT['^VIX'].c[k]]).filter(z=>z[0]>=va&&z[0]<=vb):null,pw=w-52-(vix?46:0),ph=h-18,X=z=>(z-va)/(vb-va)*pw,vis=D.map(d=>d.p.filter(p=>p[0]>=va&&p[0]<=vb)),vs=vis.flat().map(p=>p[1]);if(!vs.length)return;
const mx=Math.max(...vs),mn=Math.min(...vs),Y=v=>6+(mx-v)/(mx-mn||1)*(ph-12),base=vis.reduce((a,b)=>b.length>a.length?b:a,[]),near=(p,z)=>{let b=null,bd=1e9;for(const q of p){const dd=Math.abs(q[0]-z);if(dd<bd){bd=dd;b=q}}return bd<=4?b:null};
chHover(c,base.map(p=>X(p[0])),i=>{const z=base[i][0];return'<b>'+chDay(fdn(z))+'</b>'+vis.map((p,j)=>{const q=near(p,z);return q?chRow(PAL[j%10],D[j].t,chPct(q[1])):''}).join('')+(vix&&vix.length?(q=>q?chRow('var(--tx)','VIX',f(q[1],1)):'')(near(vix,z)):'')},
i=>{const z=base[i][0];return vis.map((p,j)=>{const q=near(p,z);return q?[X(q[0]),Y(q[1]),PAL[j%10]]:null}).filter(Boolean)},6,ph-6)};
// ---------- hover for HTML visuals (stacked bars, gauges): put the tooltip HTML in a data-tip attribute ----------
(()=>{let tp=null;document.addEventListener('pointermove',e=>{const el=e.target&&e.target.closest?e.target.closest('[data-tip]'):null;
if(!el){if(tp)tp.style.display='none';return}if(!tp){tp=document.createElement('div');tp.className='ctt ctf';document.body.appendChild(tp)}
tp.innerHTML=el.getAttribute('data-tip');tp.style.display='block';const w=tp.offsetWidth,h=tp.offsetHeight;let x=e.clientX+14,y=e.clientY-h-10;if(x+w>innerWidth-8)x=e.clientX-14-w;if(y<8)y=e.clientY+16;tp.style.left=Math.max(4,x)+'px';tp.style.top=y+'px'},{passive:true})})();
const chRecTip=(lb,r)=>'<b>'+lb+'</b>'+['Strong buy','Buy','Hold','Sell','Strong sell'].map((x,i)=>chRow(['var(--up)','var(--up)','var(--mu)','var(--dn)','var(--dn)'][i],x,r[i]||0)).join('')+chRow('transparent','Analysts',r.reduce((a,b)=>a+(b||0),0));
