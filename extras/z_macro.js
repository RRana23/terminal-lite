// Economy tab, part 3: a Growth view (real GDP since 1947 and what drove it, GDPNow, consumer spending, saving,
// retail sales), a more detailed inflation panel (CPI, PCE, core, shelter, food, energy; ranges; 3- and 6-month
// annualized rates), and hover readouts on the housing charts. Data from FRED, loaded when the Economy tab opens.
let MDATA=null,MLOAD=null,MGR='25Y',MIR='10Y',MIS=['CPIAUCSL','CPILFESL','PCEPILFE'];
const MINF=[['CPI','CPIAUCSL','var(--am)'],['Core CPI','CPILFESL','var(--up)'],['PCE','PCEPI','#5aa9ff'],['Core PCE','PCEPILFE','#c58bff'],['Shelter','CUSR0000SAH1','#e9c46a'],['Food','CPIUFDSL','#f472b6'],['Energy','CPIENGSL','#2dd4bf']];
FN.GDP=['Growth: GDP, consumer spending, retail sales',0,()=>{tab=1;EV2='Growth'}];FN.GROWTH=FN.GDP;FN.PCE=FN.GDP;FN.RETAIL=FN.GDP;
FN.CPI=['Inflation: CPI, PCE, core, shelter, food, energy',0,()=>{tab=1;EV2='Inflation and housing'}];FN.INFL=FN.CPI;
if(typeof GUIDE!='undefined'){const g=GUIDE.find(x=>x[0]=='Markets and the economy');if(g){const i=g[1].findIndex(r=>r[0]=='JOBS');g[1].splice(i<0?g[1].length:i+1,0,['GDP','GDP','Growth: real GDP growth every quarter since 1947 with recessions shaded, what drove it (consumers, investment, government, trade), the Atlanta Fed’s GDPNow estimate, consumer spending (PCE), the saving rate and retail sales.'],['CPI','CPI','Inflation: headline and core CPI and PCE, shelter, food and energy, with 3- and 6-month annualized rates and the Fed’s 2% target. Hover any chart for the date and value.'])}}
if(typeof guide=='function'){const _gM=guide;guide=function(){return _gM().replace('<tr><td>Economy</td><td>Inflation, housing and the labor market</td></tr>','<tr><td>Economy</td><td>Inflation, housing, the labor market and growth (GDP, spending, retail sales)</td></tr>').replace('<tr><td>Fed meeting dates</td>','<tr><td>GDP, spending, retail sales, CPI and PCE detail</td><td>FRED (BEA, Census Bureau, BLS, Atlanta Fed, NBER)</td><td>Each weeknight</td></tr><tr><td>Fed meeting dates</td>')}}
S.mgr=v=>{MGR=v};S.mir=v=>{MIR=v};S.mis=v=>{MIS=MIS.includes(v)?MIS.filter(x=>x!=v):[...MIS,v];if(!MIS.length)MIS=[v]};
function mLoad(){return MLOAD||(MLOAD=fetch('data/macro.json?v='+META.v).then(r=>{if(!r.ok)throw Error(r.status);return r.json()}).then(j=>{MDATA=j},()=>{MDATA={err:1}}).then(()=>{if(tab==1)render()}))}
// ---------- helpers ----------
const mS=id=>{const s=(MDATA&&MDATA.s||{})[id];return s?s.d.map((d,i)=>[d,s.v[i]]):[]};
const mYoY=p=>{const m=new Map(p);return p.map(([d,v])=>{const b=m.get((+d.slice(0,4)-1)+d.slice(4));return b?[d,(v/b-1)*100]:null}).filter(Boolean)};
const mChg=p=>p.slice(1).map((q,i)=>[q[0],(q[1]/p[i][1]-1)*100]);
const mAnn=(p,k)=>p.length>k?(Math.pow(p.at(-1)[1]/p.at(-1-k)[1],12/k)-1)*100:null;
const mYrs=r=>({'5Y':5,'10Y':10,'25Y':25}[r]||200);
const mCut=(p,y)=>{if(!p.length)return p;const c=(+p.at(-1)[0].slice(0,4)-y)+p.at(-1)[0].slice(4);return p.filter(q=>q[0]>=c)};
const mQ=d=>'Q'+(Math.floor((+d.slice(5,7)-1)/3)+1)+' '+d.slice(0,4);
const mP=(v,d=1)=>v==null||!isFinite(v)?'–':(v>0?'+':'')+f(v,d)+'%',mPl=(v,d=1)=>v==null||!isFinite(v)?'–':f(v,d)+'%';
const mBands=()=>(MDATA&&MDATA.rec)||[];
const mSeg=(a,list,cur2)=>'<div class="seg mseg">'+list.map(v=>'<button data-a="'+a+'" data-v="'+v+'" class="'+(v==cur2?'on':'')+'">'+v+'</button>').join('')+'</div>';
// bar chart by date (positive amber/green, negative red), with recession bands and hover
function mBars(id,p,o={}){const el=$('#'+id);if(!el)return;if(!p.length){el.innerHTML='<p class="mu">No data.</p>';return}
const w=Math.max(260,el.clientWidth),h=o.h||220,l=o.l||46,r=12,t=8,b=24,vs=p.map(q=>q[1]);let lo=Math.min(0,...vs),hi=Math.max(0,...vs);const pad=(hi-lo)*.06||1;lo-=lo<0?pad:0;hi+=pad;
const bw=(w-l-r)/p.length,Xi=i=>l+i*bw,Y=v=>t+(hi-v)/(hi-lo)*(h-t-b),t0=Date.parse(p[0][0]),t1=Date.parse(p.at(-1)[0]),XD=d=>l+bw/2+(Date.parse(d)-t0)/((t1-t0)||1)*(w-l-r-bw),fm=o.fm||(v=>f(v,1));
let s='<svg width="'+w+'" height="'+h+'" role="img" aria-label="'+(o.label||'chart')+'">'+lAxis(w,h,l,r,t,b,lo,hi,t0,t1,fm,Y,XD);
(o.bands||[]).forEach(([a0,a1])=>{if(a1<p[0][0]||a0>p.at(-1)[0])return;const x0=Math.max(l,XD(a0)),x1=Math.min(w-r,XD(a1));if(x1>x0)s+='<rect x="'+x0.toFixed(1)+'" y="'+t+'" width="'+(x1-x0).toFixed(1)+'" height="'+(h-t-b)+'" style="fill:var(--mu);opacity:.13"/>'});
const col=v=>v<0?'var(--dn)':(o.c||'var(--am)');
p.forEach((q,i)=>{const y0=Y(0),y1=Y(q[1]);s+='<rect x="'+(Xi(i)+bw*.12).toFixed(2)+'" y="'+Math.min(y0,y1).toFixed(1)+'" width="'+Math.max(.6,bw*.76).toFixed(2)+'" height="'+Math.max(.8,Math.abs(y1-y0)).toFixed(1)+'" style="fill:'+col(q[1])+';opacity:.88"/>'});
s+='<line x1="'+l+'" x2="'+(w-r)+'" y1="'+Y(0)+'" y2="'+Y(0)+'" style="stroke:var(--mu)"/>';el.innerHTML=s+'</svg>';
chHover(el,p.map((q,i)=>Xi(i)+bw/2),i=>'<b>'+(o.qtr?mQ(p[i][0]):chDate(p[i][0]))+'</b>'+chRow(col(p[i][1]),o.n||'Value',(o.tf||fm)(p[i][1])),i=>[[Xi(i)+bw/2,Y(p[i][1]),col(p[i][1])]],t,h-b)}
// stacked bars (contributions), with the total as a dot
function mStack(id,rows,names,cols,tot){const el=$('#'+id);if(!el||!rows.length)return;const w=Math.max(260,el.clientWidth),h=250,l=40,r=10,t=10,b=26;
let lo=0,hi=0;rows.forEach(([d,a])=>{let p=0,n=0;a.forEach(v=>{v>0?p+=v:n+=v});hi=Math.max(hi,p,tot.get(d)||0);lo=Math.min(lo,n,tot.get(d)||0)});const pad=(hi-lo)*.08;hi+=pad;lo-=pad;
const bw=(w-l-r)/rows.length,Y=v=>t+(hi-v)/(hi-lo)*(h-t-b);let s='<svg width="'+w+'" height="'+h+'" role="img" aria-label="Contributions to GDP growth">';
lTk(lo,hi).forEach(v=>{s+='<line x1="'+l+'" x2="'+(w-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" style="stroke:var(--ln)"/>'+lTx(l-6,Y(v)+4,f(v,0),'end')});
rows.forEach(([d,a],i)=>{let up=0,dn=0;const x=l+i*bw+bw*.18,bwi=bw*.64;a.forEach((v,j)=>{if(v==null)return;const y0=v>=0?Y(up+v):Y(dn),hh=Math.abs(Y(0)-Y(Math.abs(v)));v>=0?up+=v:dn+=v;s+='<rect x="'+x.toFixed(1)+'" y="'+(v>=0?y0:Y(dn-v)).toFixed(1)+'" width="'+bwi.toFixed(1)+'" height="'+Math.max(.5,hh).toFixed(1)+'" style="fill:'+cols[j]+';opacity:.9"/>'});
const tv=tot.get(d);if(tv!=null)s+='<circle cx="'+(x+bwi/2).toFixed(1)+'" cy="'+Y(tv).toFixed(1)+'" r="3.5" style="fill:var(--tx)"/>';if(i%Math.ceil(rows.length/6)==0||i==rows.length-1)s+=lTx(x+bwi/2,h-8,mQ(d),'middle')});
s+='<line x1="'+l+'" x2="'+(w-r)+'" y1="'+Y(0)+'" y2="'+Y(0)+'" style="stroke:var(--mu)"/>';el.innerHTML=s+'</svg>';
chHover(el,rows.map((q,i)=>l+i*bw+bw/2),i=>{const[d,a]=rows[i];return'<b>'+mQ(d)+'</b>'+chRow('var(--tx)','GDP growth',mP(tot.get(d)))+a.map((v,j)=>chRow(cols[j],names[j],v==null?'–':(v>0?'+':'')+f(v,2)+' pts')).join('')},i=>{const tv=tot.get(rows[i][0]);return tv==null?[]:[[l+i*bw+bw/2,Y(tv),'var(--tx)']]},t,h-b)}
// ---------- Growth view ----------
function mGrowth(){const g=mS('A191RL1Q225SBEA'),gl=g.at(-1)||[],gy=mYoY(mS('GDPC1')).at(-1)||[],nw=mS('GDPNOW').at(-1),ng=mS('GDP').at(-1)||[],pc=mYoY(mS('PCE')).at(-1)||[],rp=mYoY(mS('PCEC96')).at(-1)||[],sv=mS('PSAVERT').at(-1)||[],rs=mS('RSAFS'),rsm=mChg(rs).at(-1)||[],rsy=mYoY(rs).at(-1)||[],rr=mYoY(mS('RRSFS')).at(-1)||[],rx=mChg(mS('RSXFS')).at(-1)||[];
const key=KV('Real GDP growth, '+(gl[0]?mQ(gl[0]):'')+' (annualized)','<b class="'+(gl[1]<0?'dn':'up')+'">'+mPl(gl[1])+'</b>')+KV('Real GDP vs a year ago',mP(gy[1]))+(nw?KV('GDPNow estimate, current quarter','<b>'+mPl(nw[1])+'</b> <span class="mu">('+chDate(nw[0])+')</span>'):'')
+KV('Nominal GDP, annual rate',ng[1]?'$'+f(ng[1]/1e3,1)+'T':'–')+KV('Consumer spending (PCE), y/y',mP(pc[1]))+KV('Real consumer spending, y/y',mP(rp[1]))+KV('Personal saving rate',mPl(sv[1]))
+KV('Retail sales, '+(rsm[0]?chDate(rsm[0]):'')+', m/m',mP(rsm[1]))+KV('Retail sales, y/y',mP(rsy[1]))+KV('Real retail sales, y/y',mP(rr[1]))+KV('Retail sales excluding autos, m/m',mP(rx[1]))
+'<div class="mu lcap">Quarterly GDP is the annualized change from the prior quarter, the way the BEA reports it. GDPNow is the Atlanta Fed’s running model estimate for the quarter in progress.</div>';
const leg=(a)=>'<div class="eleg">'+a.map(([c,n])=>'<span><i style="background:'+c+'"></i>'+n+'</span>').join('')+'</div>';
return P('Growth at a glance',key,'c4')
+P('Real GDP growth by quarter, annualized',mSeg('mgr',['10Y','25Y','Since 1947'],MGR)+'<div id="mgdp" class="rsvg"></div><div class="mu lcap">Grey bands are recessions (NBER). The range buttons apply to every chart on this page. Hover any chart for the date and value.</div>','c8')
+P('What drove GDP growth, last 12 quarters (percentage points)',leg([['var(--am)','Consumer spending'],['var(--up)','Business and housing investment'],['#5aa9ff','Government'],['#c58bff','Net exports'],['var(--tx)','Total GDP growth']])+'<div id="mcon" class="rsvg"></div>','c6')
+P('Real GDP, trillions of 2017 dollars','<div id="mlvl" class="rsvg"></div><div class="mu lcap">Inflation-adjusted size of the economy, annual rate.</div>','c6')
+P('Consumer spending (PCE), year over year',leg([['var(--am)','Nominal'],['var(--up)','Real (inflation-adjusted)']])+'<div id="mpce" class="rsvg"></div><div class="mu lcap">Consumer spending is about two-thirds of GDP.</div>','c6')
+P('Personal saving rate','<div id="msav" class="rsvg"></div><div class="mu lcap">Share of after-tax income households save.</div>','c6')
+P('Retail sales, year over year',leg([['var(--am)','Retail sales'],['var(--up)','Real retail sales'],['#5aa9ff','Excluding autos']])+'<div id="mrsy" class="rsvg"></div>','c6')
+P('Retail sales, monthly change','<div id="mrsm" class="rsvg"></div><div class="mu lcap">Last 36 months, seasonally adjusted.</div>','c6')
+'<div class="c12 mu lcap" style="grid-column:1/-1">Source: FRED, St. Louis Fed (Bureau of Economic Analysis, Census Bureau, Atlanta Fed, NBER). Updated '+(MDATA.asof||'').slice(0,10)+'.</div>'}
function mGrowthDraw(){if(!MDATA||MDATA.err||!$('#mgdp'))return;const y=mYrs(MGR),B=mBands();
mBars('mgdp',mCut(mS('A191RL1Q225SBEA'),y),{qtr:1,c:'var(--up)',fm:v=>f(v,0)+'%',tf:v=>mPl(v),n:'Real GDP growth',bands:B,label:'Real GDP growth by quarter'});
const ids=['DPCERY2Q224SBEA','A006RY2Q224SBEA','A822RY2Q224SBEA','A019RY2Q224SBEA'],M=ids.map(i=>new Map(mS(i))),dts=mS('DPCERY2Q224SBEA').slice(-12).map(q=>q[0]);
mStack('mcon',dts.map(d=>[d,M.map(m=>m.get(d)??null)]),['Consumer spending','Business and housing investment','Government','Net exports'],['var(--am)','var(--up)','#5aa9ff','#c58bff'],new Map(mS('A191RL1Q225SBEA')));
lLine('mlvl',[{p:mCut(mS('GDPC1'),y),c:'var(--am)',w:2,n:'Real GDP'}],{fm:v=>'$'+f(v/1e3,0)+'T',tf:v=>'$'+f(v/1e3,2)+'T',dl:mQ,bands:B,label:'Real GDP'});
lLine('mpce',[{p:mCut(mYoY(mS('PCE')),y),c:'var(--am)',w:2,n:'Nominal PCE'},{p:mCut(mYoY(mS('PCEC96')),y),c:'var(--up)',n:'Real PCE'}],{fm:v=>f(v,0)+'%',tf:v=>mP(v),ref:0,bands:B,label:'Consumer spending growth'});
lLine('msav',[{p:mCut(mS('PSAVERT'),y),c:'var(--am)',w:2,n:'Saving rate'}],{fm:v=>f(v,0)+'%',tf:v=>mPl(v),bands:B,label:'Personal saving rate'});
lLine('mrsy',[{p:mCut(mYoY(mS('RSAFS')),y),c:'var(--am)',w:2,n:'Retail sales'},{p:mCut(mYoY(mS('RRSFS')),y),c:'var(--up)',n:'Real retail sales'},{p:mCut(mYoY(mS('RSXFS')),y),c:'#5aa9ff',n:'Excluding autos'}],{fm:v=>f(v,0)+'%',tf:v=>mP(v),ref:0,bands:B,label:'Retail sales growth'});
mBars('mrsm',mChg(mS('RSAFS')).slice(-36),{fm:v=>f(v,1)+'%',tf:v=>mP(v),n:'Retail sales, m/m',label:'Retail sales monthly change'})}
// ---------- Inflation panel ----------
function mInfl(){const big=MINF.slice(0,4).map(([n,id])=>{const p=mYoY(mS(id)),L=p.at(-1)||[];return'<div><div class="big">'+mPl(L[1])+'</div><div class="mu">'+n+(L[0]?', '+chDate(L[0]):'')+'</div></div>'}).join('');
const rows=MINF.map(([n,id,c])=>{const s=mS(id),yy=mYoY(s),L=yy.at(-1)||[],ya=yy.length>12?yy.at(-13)[1]:null;return['<i class="rsd" style="background:'+c+'"></i>'+n,L[0]?chDate(L[0]):'–',mPl(L[1]),mPl(mAnn(s,3)),mPl(mAnn(s,6)),mPl(ya)]});
const chips='<div class="mchips">'+MINF.map(([n,id,c])=>'<button data-a="mis" data-v="'+id+'" class="'+(MIS.includes(id)?'on':'')+'"><i style="background:'+c+'"></i>'+n+'</button>').join('')+'</div>';
return P('Inflation, year over year','<div class="mbig">'+big+'</div>'+chips+mSeg('mir',['5Y','10Y','25Y','Max'],MIR)+'<div id="minf" class="rsvg"></div><div class="mu lcap">Dashed line: the Fed’s 2% target, which it measures with PCE inflation. Grey bands are recessions. Click the measures above to add or remove them; hover for values.</div>'
+T(['Measure','Latest','Year over year','3 months, annualized','6 months, annualized','A year ago'],rows).replace('<table','<table class="lt mit"')+'<div class="mu lcap">Annualized rates show the recent pace: 3-month annualized compounds the last 3 months’ change over a full year. Source: BLS and BEA via FRED.</div>','c12')}
function mInflDraw(){if(!MDATA||MDATA.err||!$('#minf'))return;const y=mYrs(MIR),S2=MINF.filter(x=>MIS.includes(x[1])).map(([n,id,c],i)=>({p:mCut(mYoY(mS(id)),y),c,n,w:i?1.6:2.2}));
lLine('minf',S2,{fm:v=>f(v,0)+'%',tf:v=>mPl(v),ref:2,refc:'var(--dn)',bands:mBands(),h:280,label:'Inflation year over year'})}
// ---------- Housing charts with hover ----------
function mHouseDraw(){const z=HS.zillow[cls];if(!z)return;
const a=[...z.metros].sort((x,y)=>x-y),n=a.length,cap=a[Math.floor(n*.97)],bw=Math.max(5e3,Math.round(cap/24/5e3)*5e3),nb=Math.ceil(cap/bw),hs=Array(nb).fill(0);a.forEach(v=>hs[Math.min(nb-1,Math.floor(v/bw))]++);
const k$=v=>v>=1e6?'$'+f(v/1e6,2)+'M':'$'+f(v/1e3,0)+'K',el=$('#xhi');
if(el){const w=Math.max(260,el.clientWidth),h=200,l=34,r=8,t=8,b=24,mx=Math.max(...hs),cw=(w-l-r)/nb,Y=v=>t+(mx-v)/mx*(h-t-b),mi=hs.indexOf(mx);let s='<svg width="'+w+'" height="'+h+'" role="img" aria-label="Metros by price band">';
lTk(0,mx,3).forEach(v=>{s+='<line x1="'+l+'" x2="'+(w-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" style="stroke:var(--ln)"/>'+lTx(l-6,Y(v)+4,f(v,0),'end')});
hs.forEach((c,i)=>{s+='<rect x="'+(l+i*cw+1).toFixed(1)+'" y="'+Y(c).toFixed(1)+'" width="'+Math.max(1,cw-2).toFixed(1)+'" height="'+(Y(0)-Y(c)).toFixed(1)+'" style="fill:var(--am);opacity:'+(i==mi?1:.7)+'"/>'});
[0,Math.floor(nb/2),nb].forEach((i,j)=>{s+=lTx(l+i*cw,h-6,k$(i*bw)+(j==2?'+':''),j==0?'start':j==2?'end':'middle')});el.innerHTML=s+'</svg>';
chHover(el,hs.map((_,i)=>l+i*cw+cw/2),i=>'<b>'+k$(i*bw)+(i==nb-1?' and up':' to '+k$((i+1)*bw))+'</b>'+chRow('var(--am)','Metro areas',hs[i]+(i==mi?' (most common)':''))+chRow('var(--mu)','Share of metros',f(hs[i]/n*100,1)+'%'),i=>[[l+i*cw+cw/2,Y(hs[i]),'var(--am)']],t,h-b)}
const pts=k=>{const x=HF(k);return x?x.d.map((d,i)=>[d,x.v[i]]):[]};
lLine('xsd',[{p:pts('ACTLISCOUUS'),c:'var(--am)',w:2,n:'Active listings'},{p:pts('PENLISCOUUS'),c:'var(--up)',w:2,n:'Pending sales'}],{fm:v=>f(v/1e3,0)+'K',tf:v=>f(v,0),h:200,label:'Active listings vs pending sales'});
const zp=c=>HS.zillow[c].d.map((d,i)=>[d,HS.zillow[c].v[i]]);
lLine('xtr',[{p:zp('Working'),c:'var(--am)',w:2,n:'Working class'},{p:zp('High'),c:'var(--up)',n:'High class'},{p:zp('Low'),c:'var(--mu)',n:'Low class'}],{fm:k$,tf:v=>'$'+f(v,0),h:200,l:56,label:'Typical home value by class'})}
function mHouseSwap(h){return h.replace('<canvas id="hi" class="sm" style="height:190px"></canvas>','<div id="xhi" class="rsvg"></div>').replace(/<div class="m mu" style="display:flex;justify-content:space-between">[\s\S]*?<\/div>/,'')
.replace('<canvas id="sd" class="sm" style="height:190px"></canvas>','<div id="xsd" class="rsvg"></div>').replace('<canvas id="tr" class="sm" style="height:190px"></canvas>','<div id="xtr" class="rsvg"></div>')}
function mInflSwap(h){const a=h.indexOf('<section class="p c12"><h3>Inflation, year over year');if(a<0)return h;const b=h.indexOf('</section>',a);return h.slice(0,a)+mInfl()+h.slice(b+10)}
// ---------- Economy tab: Inflation and housing | Jobs | Growth ----------
const _econM=econ,ML2=['Inflation and housing','Jobs'],ML3=['Inflation and housing','Jobs','Growth'];
econ=function(){if(!MDATA)mLoad();const bar3=SG('ev2',ML3,EV2);
if(EV2=='Growth'){const bar='<section class="p c12" style="padding:6px 12px">'+bar3+'</section>';
if(!MDATA)return bar+P('Growth','<p class="mu m">Loading growth data…</p>','c12');
if(MDATA.err||!MDATA.s||!MDATA.s.A191RL1Q225SBEA)return bar+P('Growth','<p class="mu">Growth data isn’t available in this build yet. It appears after the next nightly update.</p>','c12');
Q.push(mGrowthDraw);return bar+mGrowth()}
let h=_econM().replace(SG('ev2',ML2,EV2),bar3);
if(EV2=='Inflation and housing'){h=mHouseSwap(h);Q.push(mHouseDraw);if(MDATA&&!MDATA.err&&MDATA.s&&MDATA.s.CPIAUCSL){h=mInflSwap(h);Q.push(mInflDraw)}}
return h};
render();
