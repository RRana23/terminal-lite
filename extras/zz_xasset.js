// The Company tab follows whatever you select. For ETFs, bond funds, crypto, indexes and currencies it shows a profile
// instead of the last company: what it is, fund facts or coin facts, performance, risk, a price chart with hover,
// and for funds the top holdings and sector mix. Stocks keep the full company pages.
const FPS=new Set(META.FP||[]),FPC={};let XPR='1Y';
function fpLoad(t){return FPC[t]?Promise.resolve():(FPS.has(t)?fetch('data/fp/'+t.replace(/[^A-Za-z0-9-]/g,'_')+'.json?v='+META.v).then(r=>r.ok?r.json():null).catch(()=>null):Promise.resolve(null)).then(j=>{FPC[t]=j||{none:1}})}
S.xpr=v=>{XPR=v};
const XSEC={realestate:'Real estate',consumer_cyclical:'Consumer cyclical',basic_materials:'Basic materials',consumer_defensive:'Consumer defensive',technology:'Technology',communication_services:'Communication services',financial_services:'Financial services',utilities:'Utilities',industrials:'Industrials',energy:'Energy',healthcare:'Healthcare'};
const XCLS={stockPosition:'Stocks',bondPosition:'Bonds',cashPosition:'Cash',preferredPosition:'Preferred',convertiblePosition:'Convertibles',otherPosition:'Other'};
const xType=t=>{const g=EXT[t]&&EXT[t].g;return g=='Bond'?(t.startsWith('^')?'Treasury yield':'Bond fund'):XTYPE[g]||g||'asset'};
const XTYPE={ETF:'Exchange-traded fund',Crypto:'Cryptocurrency',Index:'Market index',Currency:'Currency pair'};
const xPc=v=>v==null||!isFinite(v)?'–':'<span class="'+(v>=0?'up':'dn')+'">'+(v>=0?'+':'')+f(v,1)+'%</span>';
const xBig=v=>v==null?'–':v>=1e12?'$'+f(v/1e12,2)+'T':v>=1e9?'$'+f(v/1e9,1)+'B':v>=1e6?'$'+f(v/1e6,0)+'M':'$'+f(v,0);
const xNum=v=>v==null?'–':v>=1e9?f(v/1e9,2)+'B':v>=1e6?f(v/1e6,1)+'M':f(v,0);
function xStats(t){const e=EXT[t],c=e.c,isY=e.g=='Bond'&&t.startsWith('^'),T=tsr(t),n=c.length,L=T.at(-1),at=days=>{const i=T.findIndex(z=>z>=L-days);return i<0?null:i},ret=days=>{const i=at(days);return i==null||i>=n-1?null:isY?c[n-1]-c[i]:(c[n-1]/c[i]-1)*100},pts=yrs=>{const i=at(yrs*365.25);return i==null||T[i]>L-yrs*365.25+20?null:c[n-1]-c[i]},
ann=yrs=>{const i=at(yrs*365.25);if(i==null||T[i]>L-yrs*365.25+20)return null;return(Math.pow(c[n-1]/c[i],1/yrs)-1)*100},
y0=(()=>{const d=fdn(L).slice(0,4);let i=n-1;while(i>0&&fdn(T[i-1]).slice(0,4)==d)i--;return i>0?i-1:null})(),
dd=days=>{const i=at(days)??0;let pk=0,m=0;for(let k=i;k<n;k++){pk=Math.max(pk,c[k]);m=Math.min(m,c[k]/pk-1)}return m*100},
i1=at(365)??0,r1=c.slice(i1).map((v,k,a)=>k?(v/a[k-1]-1)*100:null).filter(v=>v!=null),hi=Math.max(...c.slice(i1)),lo=Math.min(...c.slice(i1)),vv=e.vol||e.fvol,i3=at(91);
return{isY,r:isY?{'1 week':ret(7),'1 month':ret(30),'3 months':ret(91),'Year to date':y0==null?null:c[n-1]-c[y0],'1 year':ret(365),'3 years':pts(3),'5 years':pts(5),'10 years':pts(10)}:{'1 week':ret(7),'1 month':ret(30),'3 months':ret(91),'Year to date':y0==null?null:(c[n-1]/c[y0]-1)*100,'1 year':ret(365),'3 years, a year':ann(3),'5 years, a year':ann(5),'10 years, a year':ann(10)},
dd1:dd(365),dd5:dd(1826),hi,lo,fromHi:(c[n-1]/hi-1)*100,best:Math.max(...r1),worst:Math.min(...r1),avgV:vv&&i3!=null?vv.slice(i3).reduce((a,b)=>a+b,0)/(n-i3):null,px:c[n-1],day:(c[n-1]/c[n-2]-1)*100,dpt:c[n-1]-c[n-2],dg:c[n-1]<10?4:2}}
const xName=t=>{const p=FPC[t];return(p&&p.nm)||(EXT[t]&&EXT[t].n)||t};
function xProfile(t){const e=EXT[t],p=FPC[t]&&!FPC[t].none?FPC[t]:{},s=xStats(t),isF=e.g=='ETF'||(e.g=='Bond'&&!t.startsWith('^')),isC=e.g=='Crypto';
const er=p.er==null?null:p.er<.01?p.er*100:p.er,inc=p.inc?new Date(p.inc*1000).toISOString().slice(0,10):null;
const K=(k,v)=>v==null?'':KV(k,v);let facts='';if(isF)facts=K('Category',p.cat)+K('Fund family',p.fam)+K('Total assets',p.aum==null?null:xBig(p.aum))+K('Expense ratio',er==null?null:f(er,2)+'% a year')+K('Yield',p.yld==null?null:f(p.yld*100,2)+'%')+K('3-year average return',p.r3==null?null:xPc(p.r3*100))+K('5-year average return',p.r5==null?null:xPc(p.r5*100))+K('Beta (3 years)',p.beta3==null?null:f(p.beta3,2))+K('Launched',inc?chDay(inc):null);
else if(isC)facts=K('Market value',p.cap==null?null:xBig(p.cap))+K('Coins in circulation',p.circ==null?null:xNum(p.circ))+(p.cap||p.circ?KV('Maximum supply',p.max?xNum(p.max):'No cap'):'')+K('Trading volume, 24 hours',p.v24==null?null:xBig(p.v24))+K('Trading since',p.start?chDay(new Date(p.start*1000).toISOString().slice(0,10)):null);
const about=p.desc?'<p class="xdesc">'+esc(p.desc)+'</p>':'';
const nm=xName(t),head=P(nm+(nm!=t?' ('+t+')':''),'<div class="xhd"><span class="xbadge">'+xType(t)+'</span><span class="big">'+f(s.px,s.isY?2:s.dg)+(s.isY?'%':'')+'</span><span class="'+(s.day>=0?'up':'dn')+' m">'+(s.day>=0?'+':'')+(s.isY?f(s.dpt,2)+' pts':f(s.day,2)+'%')+' last day</span></div>'+about+facts
+'<div class="xbtn"><button class="in" data-a="tab" data-v="0">Price chart and studies</button>'+(CO[cur]?'<button class="in" data-a="co" data-v="'+cur+'">Back to '+cur+' company page</button>':'')+'</div>'
+(!isF&&!isC?'<div class="mu tnote">'+(e.g=='Bond'?'A Treasury yield is an interest rate, so this page shows its level, changes and risk. See the Rates tab for the full curve.':e.g=='Currency'?'Currencies have no company filings or financial statements, so this page shows price, performance and risk.':'An index tracks a basket of stocks; it has no filings or financial statements of its own.')+'</div>':(!p.desc&&!p.cat&&!p.cap?'<div class="mu tnote">Fund and coin details arrive with the weekly update.</div>':'')),'c8');
const xPt=v=>'<span class="'+(v>=0?'up':'dn')+'">'+(v>=0?'+':'')+f(v,2)+' pts</span>',perf=P(s.isY?'Yield change':'Performance',T(['Period',s.isY?'Change':'Return'],Object.entries(s.r).filter(([k,v])=>v!=null).map(([k,v])=>[k,s.isY?xPt(v):xPc(v)])).replace('<table','<table class="xt"')+'<div class="mu tnote">'+(s.isY?'Change in the yield, in percentage points.':'Price change only'+(isF?'; fund distributions are not added back':'')+'. Multi-year rows are yearly averages.')+'</div>','c4');
const risk=P('Risk',KV('Volatility, annualized (60 days)',f(e.v,1)+'%')+KV('Beta vs the average S&P 500 stock',f(e.b,2))+KV('52-week high',f(s.hi,s.dg))+KV('52-week low',f(s.lo,s.dg))+KV('From 52-week high',xPc(s.fromHi))+KV('Max drawdown, 1 year',xPc(s.dd1))+KV('Max drawdown, 5 years',xPc(s.dd5))+KV('Best day, 1 year',xPc(s.best))+KV('Worst day, 1 year',xPc(s.worst))+(s.avgV?KV(e.fvol&&!e.vol?'Avg futures volume, 3 months':'Avg daily volume, 3 months',xNum(s.avgV)):''),'c4');
Q.push(()=>xChart(t));
const chart=P(s.isY?'Yield':'Price',SG('xpr',['3M','1Y','5Y','10Y'],XPR)+'<div id="xpc" class="rsvg"></div>','c8');
let hold='';if(p.top&&p.top.length){const tot=p.top.reduce((a,r)=>a+(r[2]||0),0);hold=P('Top 10 holdings',T(['','Holding','Weight'],p.top.map(r=>[CO[r[0]]?LK(r[0]).replace('data-a="open"','data-a="co"'):esc(r[0]||''),esc(r[1]||''),r[2]==null?'–':f(r[2]*100,2)+'%'])).replace('<table','<table class="xt xh"')+'<div class="mu tnote">The top 10 make up '+f(tot*100,1)+'% of the fund. Click a ticker to open its company page.</div>','c6')}
let mix='';const sec=Object.entries(p.sec||{}).sort((a,b)=>b[1]-a[1]),cls=Object.entries(p.cls||{}).filter(([k,v])=>v>.0005).sort((a,b)=>b[1]-a[1]);
if(sec.length||cls.length){const bar=(lab,v,c)=>'<div class="xbar" data-tip="'+esc('<b>'+lab+'</b>'+chRow(c,'Share of fund',f(v*100,1)+'%'))+'"><span>'+lab+'</span><i style="width:'+Math.max(1,v*100).toFixed(1)+'%;background:'+c+'"></i><b>'+f(v*100,1)+'%</b></div>';
mix=P(sec.length?'Sector mix':'What it holds',(cls.length?'<h4 class="eh4" style="margin-top:0">Asset classes</h4>'+cls.map(([k,v])=>bar(XCLS[k]||k,v,'var(--up)')).join(''):'')+(sec.length?'<h4 class="eh4">Sectors (stock holdings)</h4>'+sec.map(([k,v])=>bar(XSEC[k]||k,v,'var(--am)')).join(''):''),'c6')}
return head+perf+chart+risk+hold+mix}
function xChart(t){const e=EXT[t],T=tsr(t),L=T.at(-1),d={'3M':91,'1Y':365,'5Y':1826,'10Y':3653}[XPR],pts=[];T.forEach((z,i)=>{if(z>=L-d)pts.push([fdn(z),e.c[i]])});
lLine('xpc',[{p:pts,c:'var(--am)',w:2,n:xName(t)}],{fm:v=>f(v,e.c.at(-1)<10?2:0),tf:v=>f(v,e.c.at(-1)<10?4:2),dl:chDay,h:240,l:62,label:xName(t)+' price'})}
const _coX=company;
company=function(){const e=EXT[ac];if(!e)return _coX();
if(!e._ok){load(ac).then(()=>{if(tab==CT)render0()}).catch(()=>{});return P(e.n||ac,'<p class="mu m">Loading '+ac+'…</p>','c12')}
if(FPS.has(ac)&&!FPC[ac]){fpLoad(ac).then(()=>{if(tab==CT)render0()});return P(e.n||ac,'<p class="mu m">Loading '+ac+'…</p>','c12')}
return xProfile(ac)};
const _r0X=render0;render0=function(){_r0X();if(tab==CT&&EXT[ac]){$('#hd').textContent=ac+(xName(ac)!=ac?' '+xName(ac):'');const d=$('#v').firstElementChild;if(d&&d.classList.contains('mu'))d.textContent='Profile of the selected '+xType(ac).toLowerCase()+'. Prices update each weeknight; fund and coin details weekly. Pick a stock to see full company pages.'}};
if(typeof GUIDE!='undefined'){const g=GUIDE.flatMap(x=>x[1]).find(r=>r[0]=='DES');if(g){g[1]='NVDA DES, SPY DES';g[2]+=' For an ETF, bond fund, crypto, index or currency it shows fund or coin facts, holdings, sector mix, performance and risk.'}}
if(FN.DES){FN.DES[0]='Description and profile for any stock, ETF, bond fund, crypto, index or currency';FN.DES[1]=0}
window.addEventListener('resize',()=>{if(tab==CT&&EXT[ac]&&$('#xpc')){clearTimeout(window.XTO);window.XTO=setTimeout(()=>xChart(ac),150)}});
render();
