// Technical studies on every price chart (stocks, ETFs, indexes, currencies, crypto), Bloomberg GP-style:
// on the chart: Bollinger Bands, EMA, Keltner Channels, rolling VWAP, Parabolic SAR, Ichimoku Cloud, Fibonacci
// retracement, TD Sequential; in panels below: volume, RSI, MACD, stochastics, Williams %R, CCI, ATR, ADX/DMI, OBV,
// rate of change. Plus a 5-minute intraday chart with each session's VWAP, and a live VWAP from the Finnhub feed.
// Every chart here has hover readouts (chHover from a_chart.js). Choices and settings are remembered in this browser.
const TSO=[['bb','Bollinger Bands',[20,2],['Period','Std devs'],'Price ± 2 standard deviations around its 20-day average. Touching a band means the move is stretched.'],
['ema','EMA',[12,26],['Fast','Slow'],'Exponential moving averages weight recent prices more, so they turn faster than simple averages.'],
['kc','Keltner Channels',[20,2],['Period','ATR multiple'],'Like Bollinger Bands, but the width comes from the average true range.'],
['vwap','VWAP',[20],['Days'],'Volume-weighted average price over the last N bars. Price above VWAP means buyers have been paying up.'],
['sar','Parabolic SAR',[.02,.2],['Step','Max'],'Dots that trail the trend; when price crosses them the trend has flipped. Often used as a stop.'],
['ich','Ichimoku Cloud',[9,26,52],['Conversion','Base','Span B'],'Price above the cloud is an uptrend, below it a downtrend, inside it no clear trend.'],
['fib','Fibonacci',[],[],'Retracement levels (23.6%, 38.2%, 50%, 61.8%, 78.6%) between the high and low on screen.'],
['td','TD Sequential',[],[],'DeMark setup: nine closes in a row above (or below) the close four bars earlier often marks an exhausted trend.']];
const TSP=[['vol','Volume',[20],['Average'],'Shares (or contracts) traded per bar, green on up bars, red on down bars, with its average.'],
['rsi','RSI',[14],['Period'],'Relative Strength Index, 0 to 100. Above 70 is overbought, below 30 oversold.'],
['macd','MACD',[12,26,9],['Fast','Slow','Signal'],'Fast EMA minus slow EMA, with a signal line. The MACD crossing above its signal is read as bullish.'],
['sto','Stochastic',[14,3,3],['%K','Smooth','%D'],'Where the close sits in its recent high-low range. Above 80 overbought, below 20 oversold.'],
['wr','Williams %R',[14],['Period'],'Like the stochastic on a 0 to -100 scale. Above -20 overbought, below -80 oversold.'],
['cci','CCI',[20],['Period'],'Commodity Channel Index: distance from the average in units of typical deviation. Beyond ±100 is unusual.'],
['atr','ATR',[14],['Period'],'Average true range: the typical size of a bar, used to size stops and positions.'],
['adx','ADX / DMI',[14],['Period'],'ADX measures trend strength (above 25 is a strong trend); +DI above -DI means the trend is up.'],
['obv','OBV',[],[],'On-balance volume adds volume on up bars and subtracts it on down bars. Rising OBV backs a rising price.'],
['roc','Rate of change',[12],['Period'],'Percent change over the last N bars.']];
const TALL=[...TSO,...TSP],TDEF=Object.fromEntries(TALL.map(s=>[s[0],s]));
let TSX=(()=>{try{return JSON.parse(localStorage.getItem('tStudies'))||null}catch(e){return null}})()||{on:{vol:1},p:{}};
const tSave=()=>{try{localStorage.setItem('tStudies',JSON.stringify(TSX))}catch(e){}};
const tP=k=>{const d=TDEF[k][2],p=TSX.p[k];return d.map((v,i)=>p&&isFinite(p[i])&&p[i]>0?p[i]:v)};
S.tst=v=>{TSX.on[v]=TSX.on[v]?0:1;tSave()};
S.tnone=()=>{TSX.on={};tSave()};
function tSet(k,i,v){v=+v;if(!(v>0))return;(TSX.p[k]=TSX.p[k]||tP(k).slice())[i]=v;tSave();render()}
FN.TECH=['Technical studies: Bollinger, MACD, RSI, stochastics, VWAP and more',0,()=>{tab=0;setTimeout(()=>{const d=$('#tsd');if(d)d.open=true},50)}];FN.STUDY=FN.TECH;FN.BOLL=FN.TECH;
if(typeof GUIDE!='undefined'){const g=GUIDE.find(x=>x[0]=='Markets and the economy')||GUIDE[0];const i=g[1].findIndex(r=>r[0]=='MA');g[1].splice(i<0?1:i+1,0,['TECH','NVDA TECH','Technical studies on any price chart: Bollinger Bands, EMA, Keltner Channels, VWAP, Parabolic SAR, Ichimoku, Fibonacci, TD Sequential on the chart; volume, RSI, MACD, stochastics, Williams %R, CCI, ATR, ADX/DMI, OBV and rate of change below it. Settings are adjustable and remembered.'],['GIP','SPY GIP','Intraday chart: 5-minute bars for the last five sessions with each session’s VWAP and volume, for ETFs, crypto and the 100 largest stocks. With live prices on, a live VWAP builds from the trades you receive.'])}
FN.GIP=['Intraday chart with VWAP',0,t=>{if(t&&A(t)){cur=CO[t]?t:cur;ac=t}tab=0;setTimeout(()=>{const p=$('#tin');if(p)p.scrollIntoView({behavior:'smooth',block:'start'})},300)}];
// ---------- math (arrays aligned to bars; null while warming up) ----------
const tSMA=(a,p)=>{const o=Array(a.length).fill(null);let s=0,k=0;for(let i=0;i<a.length;i++){const v=a[i];if(v==null){s=0;k=0;continue}s+=v;k++;if(k>p){s-=a[i-p];k=p}if(k==p)o[i]=s/p}return o};
const tEMA=(a,p)=>{const o=Array(a.length).fill(null),m=2/(p+1);let e=null,s=0,k=0;for(let i=0;i<a.length;i++){const v=a[i];if(v==null)continue;if(e==null){s+=v;k++;if(k==p){e=s/p;o[i]=e}}else{e=v*m+e*(1-m);o[i]=e}}return o};
const tRMA=(a,p)=>{const o=Array(a.length).fill(null);let e=null,s=0,k=0;for(let i=0;i<a.length;i++){const v=a[i];if(v==null)continue;if(e==null){s+=v;k++;if(k==p){e=s/p;o[i]=e}}else{e=(e*(p-1)+v)/p;o[i]=e}}return o};
const tSD=(a,p)=>{const m=tSMA(a,p);return a.map((_,i)=>{if(m[i]==null)return null;let s=0;for(let j=i-p+1;j<=i;j++)s+=(a[j]-m[i])**2;return Math.sqrt(s/p)})};
const tHH=(a,p)=>a.map((_,i)=>i<p-1?null:Math.max(...a.slice(i-p+1,i+1))),tLL=(a,p)=>a.map((_,i)=>i<p-1?null:Math.min(...a.slice(i-p+1,i+1)));
const tTR=(h,l,c)=>h.map((v,i)=>i?Math.max(v-l[i],Math.abs(v-c[i-1]),Math.abs(l[i]-c[i-1])):v-l[i]);
function tRSI(c,p){const g=[null],d=[null];for(let i=1;i<c.length;i++){const z=c[i]-c[i-1];g.push(Math.max(z,0));d.push(Math.max(-z,0))}const ag=tRMA(g,p),al=tRMA(d,p);return ag.map((v,i)=>v==null||al[i]==null?null:al[i]==0?100:100-100/(1+v/al[i]))}
function tSAR(h,l,st,mx){const n=h.length,o=Array(n).fill(null);if(n<3)return o;let up=h[1]>h[0],sar=up?l[0]:h[0],ep=up?h[1]:l[1],af=st;
for(let i=1;i<n;i++){sar=sar+af*(ep-sar);if(up){sar=Math.min(sar,l[i-1],i>1?l[i-2]:l[i-1]);if(l[i]<sar){up=false;sar=ep;ep=l[i];af=st}else if(h[i]>ep){ep=h[i];af=Math.min(mx,af+st)}}
else{sar=Math.max(sar,h[i-1],i>1?h[i-2]:h[i-1]);if(h[i]>sar){up=true;sar=ep;ep=h[i];af=st}else if(l[i]<ep){ep=l[i];af=Math.min(mx,af+st)}}o[i]=sar}return o}
function tTD(c){const n=c.length,o=Array(n).fill(0);let b=0,s=0;for(let i=4;i<n;i++){if(c[i]<c[i-4]){b=b>=9?1:b+1;s=0}else if(c[i]>c[i-4]){s=s>=9?1:s+1;b=0}else{b=s=0}o[i]=b?-b:s}return o}
// every study for a set of bars; returns {key:{series:[{n,v,c,w,dash,type}],ref:[],range:[lo,hi]}}
function tCalc(B){const{h,l,c,v}=B,R={};const on=k=>TSX.on[k];
if(on('bb')){const[p,k]=tP('bb'),m=tSMA(c,p),sd=tSD(c,p);R.bb=[{n:'Upper band',v:m.map((x,i)=>x==null?null:x+k*sd[i]),c:'#8b9bb4',w:1.1},{n:'Middle (SMA '+p+')',v:m,c:'#8b9bb4',w:1,dash:[4,3]},{n:'Lower band',v:m.map((x,i)=>x==null?null:x-k*sd[i]),c:'#8b9bb4',w:1.1}]}
if(on('ema')){const[a,b]=tP('ema');R.ema=[{n:'EMA '+a,v:tEMA(c,a),c:'#f97316',w:1.4},{n:'EMA '+b,v:tEMA(c,b),c:'#a855f7',w:1.4}]}
if(on('kc')){const[p,k]=tP('kc'),m=tEMA(c,p),at=tRMA(tTR(h,l,c),p);R.kc=[{n:'Keltner upper',v:m.map((x,i)=>x==null||at[i]==null?null:x+k*at[i]),c:'#14b8a6',w:1.1,dash:[2,2]},{n:'Keltner middle',v:m,c:'#14b8a6',w:1,dash:[6,3]},{n:'Keltner lower',v:m.map((x,i)=>x==null||at[i]==null?null:x-k*at[i]),c:'#14b8a6',w:1.1,dash:[2,2]}]}
if(on('vwap')&&v){const[p]=tP('vwap'),tp=c.map((x,i)=>(h[i]+l[i]+x)/3),pv=tSMA(tp.map((x,i)=>x*v[i]),p),vv=tSMA(v,p);R.vwap=[{n:'VWAP '+p,v:pv.map((x,i)=>x==null||!vv[i]?null:x/vv[i]),c:'#ec4899',w:1.6}]}
if(on('sar')){const[a,m]=tP('sar');R.sar=[{n:'Parabolic SAR',v:tSAR(h,l,a,m),c:'#eab308',type:'dot'}]}
if(on('ich')){const[a,b,s2]=tP('ich'),ten=tHH(h,a).map((x,i)=>x==null?null:(x+tLL(l,a)[i])/2),kij=tHH(h,b).map((x,i)=>x==null?null:(x+tLL(l,b)[i])/2),hb=tHH(h,s2),lb=tLL(l,s2);
const A=c.map((_,i)=>i>=b&&ten[i-b]!=null&&kij[i-b]!=null?(ten[i-b]+kij[i-b])/2:null),Bs=c.map((_,i)=>i>=b&&hb[i-b]!=null?(hb[i-b]+lb[i-b])/2:null);
R.ich=[{n:'Conversion line',v:ten,c:'#3b82f6',w:1.1},{n:'Base line',v:kij,c:'#ef4444',w:1.1},{n:'Leading span A',v:A,c:'#22c55e',w:.8,cloud:Bs},{n:'Leading span B',v:Bs,c:'#ef4444',w:.8}]}
if(on('td'))R.td=[{n:'TD setup count',v:tTD(c),type:'td'}];
if(on('vol')&&v){const[p]=tP('vol');R.vol=[{n:B.vlab||'Volume',v,type:'vbar'},{n:p+'-bar average',v:tSMA(v,p),c:'var(--tx)',w:1.2}]}
if(on('rsi')){const[p]=tP('rsi');R.rsi=[{n:'RSI '+p,v:tRSI(c,p),c:'#a855f7',w:1.5}];R.rsi.ref=[70,30];R.rsi.rng=[0,100]}
if(on('macd')){const[a,b,s]=tP('macd'),fa=tEMA(c,a),sl=tEMA(c,b),m=fa.map((x,i)=>x==null||sl[i]==null?null:x-sl[i]),sg=tEMA(m,s);R.macd=[{n:'Histogram',v:m.map((x,i)=>x==null||sg[i]==null?null:x-sg[i]),type:'hist'},{n:'MACD',v:m,c:'#3b82f6',w:1.4},{n:'Signal',v:sg,c:'#f97316',w:1.3}];R.macd.ref=[0]}
if(on('sto')){const[p,sm,d]=tP('sto'),hh=tHH(h,p),ll=tLL(l,p),raw=c.map((x,i)=>hh[i]==null?null:hh[i]==ll[i]?50:(x-ll[i])/(hh[i]-ll[i])*100),K=tSMA(raw,sm);R.sto=[{n:'%K',v:K,c:'#3b82f6',w:1.4},{n:'%D',v:tSMA(K,d),c:'#f97316',w:1.2}];R.sto.ref=[80,20];R.sto.rng=[0,100]}
if(on('wr')){const[p]=tP('wr'),hh=tHH(h,p),ll=tLL(l,p);R.wr=[{n:'%R',v:c.map((x,i)=>hh[i]==null?null:hh[i]==ll[i]?-50:(hh[i]-x)/(hh[i]-ll[i])*-100),c:'#14b8a6',w:1.4}];R.wr.ref=[-20,-80];R.wr.rng=[-100,0]}
if(on('cci')){const[p]=tP('cci'),tp=c.map((x,i)=>(h[i]+l[i]+x)/3),m=tSMA(tp,p);R.cci=[{n:'CCI '+p,v:tp.map((x,i)=>{if(m[i]==null)return null;let s=0;for(let j=i-p+1;j<=i;j++)s+=Math.abs(tp[j]-m[i]);const md=s/p;return md?(x-m[i])/(.015*md):0}),c:'#eab308',w:1.4}];R.cci.ref=[100,-100]}
if(on('atr')){const[p]=tP('atr');R.atr=[{n:'ATR '+p,v:tRMA(tTR(h,l,c),p),c:'#f97316',w:1.4}]}
if(on('adx')){const[p]=tP('adx'),pd=[0],md=[0];for(let i=1;i<c.length;i++){const u=h[i]-h[i-1],d=l[i-1]-l[i];pd.push(u>d&&u>0?u:0);md.push(d>u&&d>0?d:0)}const tr=tRMA(tTR(h,l,c),p),P=tRMA(pd,p),M=tRMA(md,p),pi=P.map((x,i)=>x==null||!tr[i]?null:100*x/tr[i]),mi=M.map((x,i)=>x==null||!tr[i]?null:100*x/tr[i]),dx=pi.map((x,i)=>x==null||mi[i]==null||x+mi[i]==0?null:100*Math.abs(x-mi[i])/(x+mi[i]));
R.adx=[{n:'ADX',v:tRMA(dx,p),c:'var(--tx)',w:1.6},{n:'+DI',v:pi,c:'#22c55e',w:1.1},{n:'-DI',v:mi,c:'#ef4444',w:1.1}];R.adx.ref=[25]}
if(on('obv')&&v){let s=0;R.obv=[{n:'OBV',v:c.map((x,i)=>{if(i)s+=x>c[i-1]?v[i]:x<c[i-1]?-v[i]:0;return s}),c:'#3b82f6',w:1.4}]}
if(on('roc')){const[p]=tP('roc');R.roc=[{n:'ROC '+p,v:c.map((x,i)=>i<p?null:(x/c[i-p]-1)*100),c:'#22c55e',w:1.4}];R.roc.ref=[0]}
return R}
// ---------- bars for the selected asset and range ----------
const TCN={'1D':130,'1W':156,'1M':120},TCG={'1D':1,'1W':5,'1M':21};
function tBars(){const e=EXT[ac];if(e&&!e._ok)return null;
if(e){const T=tsr(ac),st=T.at(-1)-GD[XR],o0=Math.max(0,T.findIndex(z=>z>=st)),c=e.c,h=e.h&&e.h.length==c.length?e.h:c,l=e.l&&e.l.length==c.length?e.l:c,vv=e.vol||e.fvol||null;
return{kind:'line',c,h,l,o:c.map((x,i)=>i?c[i-1]:x),v:vv&&vv.length==c.length?vv:null,vlab:e.fvol&&!e.vol?'Futures volume ('+e.fsym+', CME)':e.vsum?'Volume (S&P 500 members, total)':'Volume',hl:!!e.h,
d0:T.map(z=>fdn(z)),d1:T.map(z=>fdn(z)),n:c.length-o0,unit:'day',name:e.n||ac,dg:c.at(-1)<10?4:2}}
const r=RAW[cur];if(!r||!r.c)return null;const dt=(r.d||RD).slice(-r.c.length),g=TCG[iv]||1,L=r.c.length,s0=g==1?0:L%g,B={kind:'candle',o:[],h:[],l:[],c:[],v:r.vol&&r.vol.length==L?[]:null,d0:[],d1:[],unit:g==1?'day':g==5?'week':'month',name:cur,dg:2,hl:1};
for(let k=s0;k<L;k+=g){const e2=Math.min(L,k+g);B.o.push(r.o[k]);B.h.push(Math.max(...r.h.slice(k,e2)));B.l.push(Math.min(...r.l.slice(k,e2)));B.c.push(r.c[e2-1]);if(B.v)B.v.push(r.vol.slice(k,e2).reduce((a,b)=>a+b,0));B.d0.push(chYMD(dt[k]));B.d1.push(chYMD(dt[e2-1]))}
B.n=Math.min(B.c.length,TCN[iv]||130);return B}
const tCol=c=>c&&c.startsWith('var(')?css(c.slice(4,-1)):c;
const tFmt=(v,dg)=>v==null||!isFinite(v)?'–':Math.abs(v)>=1e9?f(v/1e9,2)+'B':Math.abs(v)>=1e6?f(v/1e6,2)+'M':Math.abs(v)>=1e4&&dg!=null&&dg<0?f(v/1e3,1)+'K':f(v,dg==null?2:Math.abs(dg));
const tWhen=(B,i)=>B.unit=='day'?chDay(B.d1[i]):chDay(B.d0[i])+' to '+chDay(B.d1[i]);
function tLine(x,vals,X,Y,col,w,dash){x.strokeStyle=tCol(col);x.lineWidth=w||1.3;x.setLineDash(dash||[]);x.beginPath();let s=0;vals.forEach((v,i)=>{if(v==null||!isFinite(v)){s=0;return}s?x.lineTo(X(i),Y(v)):x.moveTo(X(i),Y(v));s=1});x.stroke();x.setLineDash([]);x.lineWidth=1}
// ---------- the price chart (replaces the core candle and line charts) ----------
function tDraw(){const q=cv('ch');if(!q)return;const[x,w,h]=q,B=tBars();if(!B||!B.c.length)return;const N=B.c.length,o=N-B.n,n=B.n,sl=a=>a.slice(o);
const C=sl(B.c),O=sl(B.o),H=sl(B.h),Lw=sl(B.l),R=tCalc(B),ms=Object.keys(MA).filter(p=>MA[p]).map(p=>({p,c:MAC[p],v:sl(chMA(B.c,+p))}));
const ov=['bb','kc','ich','ema','vwap','sar'].filter(k=>R[k]).flatMap(k=>R[k].map(s=>({...s,k,v:sl(s.v),cloud:s.cloud?sl(s.cloud):null})));
const vis=[...(B.kind=='candle'?[...H,...Lw]:C),...ms.flatMap(m=>m.v),...ov.flatMap(s=>s.v)].filter(v=>v!=null&&isFinite(v));let mx=Math.max(...vis),mn=Math.min(...vis);const pad=(mx-mn)*.04||mx*.01||1;mx+=pad;mn-=pad;
const pw=w-56,top=6,bot=h-18,s=pw/n,X=i=>i*s+s/2,Y=v=>top+(mx-v)/(mx-mn)*(bot-top);
x.font='11px IBM Plex Mono,monospace';x.strokeStyle=css('--ln');x.fillStyle=css('--mu');lTk(mn,mx,5).forEach(v=>{const y=Y(v);if(y<top||y>bot)return;x.beginPath();x.moveTo(0,y);x.lineTo(pw,y);x.stroke();x.fillText(f(v,B.dg),pw+4,y+3)});
const nl=Math.max(2,Math.min(6,Math.floor(pw/120)));for(let j=0;j<nl;j++){const i=Math.round(j*(n-1)/(nl-1)),d=B.d1[o+i];x.textAlign=j==0?'left':j==nl-1?'right':'center';x.fillText(B.unit=='month'||n>400?d.slice(0,7):chDay(d).replace(/, \d{4}$/,''),Math.min(pw,Math.max(0,X(i))),h-4)}x.textAlign='left';
// Ichimoku cloud fill
(ov.filter(s=>s.cloud)).forEach(s=>{for(let i=1;i<n;i++){const a0=s.v[i-1],a1=s.v[i],b0=s.cloud[i-1],b1=s.cloud[i];if([a0,a1,b0,b1].some(z=>z==null))continue;x.fillStyle=a1>=b1?'rgba(34,197,94,.13)':'rgba(239,68,68,.13)';x.beginPath();x.moveTo(X(i-1),Y(a0));x.lineTo(X(i),Y(a1));x.lineTo(X(i),Y(b1));x.lineTo(X(i-1),Y(b0));x.closePath();x.fill()}});
// Bollinger fill
if(R.bb){const u=ov.find(s=>s.n=='Upper band').v,d=ov.find(s=>s.n=='Lower band').v;x.fillStyle='rgba(139,155,180,.10)';x.beginPath();let st=0;u.forEach((v,i)=>{if(v==null)return;st?x.lineTo(X(i),Y(v)):x.moveTo(X(i),Y(v));st=1});for(let i=n-1;i>=0;i--)if(d[i]!=null)x.lineTo(X(i),Y(d[i]));x.closePath();x.fill()}
// price
if(B.kind=='candle')C.forEach((c,i)=>{const cx=X(i);x.strokeStyle=x.fillStyle=css(c>=O[i]?'--up':'--dn');x.beginPath();x.moveTo(cx,Y(H[i]));x.lineTo(cx,Y(Lw[i]));x.stroke();x.fillRect(cx-s*.35,Y(Math.max(O[i],c)),Math.max(1,s*.7),Math.max(1,Math.abs(Y(O[i])-Y(c))))});
else tLine(x,C,X,Y,css('--tx'),1.6);
ms.forEach(m=>tLine(x,m.v,X,Y,m.c[0]=='#'?m.c:css(m.c),1.3));
ov.forEach(s=>{if(s.type=='dot'){x.fillStyle=tCol(s.c);s.v.forEach((v,i)=>{if(v!=null){x.beginPath();x.arc(X(i),Y(v),1.6,0,7);x.fill()}})}else tLine(x,s.v,X,Y,s.c,s.w,s.dash)});
// Fibonacci retracement between the high and low on screen
let fib=null;if(TSX.on.fib){const hi=Math.max(...H),lo=Math.min(...Lw),iH=H.indexOf(hi),iL=Lw.indexOf(lo),upT=iL<iH;fib=[0,.236,.382,.5,.618,.786,1].map(r=>[r,upT?hi-(hi-lo)*r:lo+(hi-lo)*r]);
x.setLineDash([3,3]);fib.forEach(([r,v])=>{const y=Y(v);x.strokeStyle='rgba(234,179,8,.7)';x.beginPath();x.moveTo(0,y);x.lineTo(pw,y);x.stroke();x.fillStyle=css('--mu');x.fillText((r*100).toFixed(1)+'%  '+f(v,B.dg),4,y-3)});x.setLineDash([])}
// TD Sequential: mark completed nine-counts
let td=null;if(R.td){td=sl(R.td[0].v);x.font='600 11px IBM Plex Mono,monospace';td.forEach((k,i)=>{if(Math.abs(k)==9){x.fillStyle=css(k<0?'--up':'--dn');x.fillText('9',X(i)-3,k<0?Math.min(bot-2,Y(Lw[i])+13):Math.max(top+10,Y(H[i])-5))}});x.font='11px IBM Plex Mono,monospace'}
// readout line above the chart: latest bar
const ro=$('#ro');if(ro)ro.textContent=tWhen(B,N-1)+'  '+(B.kind=='candle'?'O '+f(B.o[N-1])+'  H '+f(B.h[N-1])+'  L '+f(B.l[N-1])+'  C '+f(B.c[N-1]):f(B.c[N-1],B.dg))+(B.v&&B.v[N-1]?'  Vol '+tFmt(B.v[N-1],-1):'');
const V=B.v?sl(B.v):null,xs=C.map((_,i)=>X(i));
chHover($('#ch'),xs,i=>{const pv=i?C[i-1]:o?B.c[o-1]:null,ch=pv?(C[i]/pv-1)*100:null;let t='<b>'+tWhen(B,o+i)+'</b>';
t+=B.kind=='candle'?chRow('transparent','Open',f(O[i]))+chRow('transparent','High',f(H[i]))+chRow('transparent','Low',f(Lw[i]))+chRow(css(C[i]>=O[i]?'--up':'--dn'),'Close',f(C[i])):chRow(css('--tx'),B.name,f(C[i],B.dg))+(B.hl?chRow('transparent','High / low',f(H[i],B.dg)+' / '+f(Lw[i],B.dg)):'');
t+=chRow('transparent','Change',chPct(ch))+(V?chRow('transparent',B.vlab||'Volume',tFmt(V[i],-1)):'');
t+=ms.filter(m=>m.v[i]!=null).map(m=>chRow(m.c[0]=='#'?m.c:'var('+m.c+')',m.p+'-'+B.unit+' average',f(m.v[i],B.dg))).join('');
t+=ov.filter(s=>s.v[i]!=null).map(s=>chRow(s.c,s.n,f(s.v[i],B.dg))).join('');
if(td&&td[i])t+=chRow(td[i]<0?'var(--up)':'var(--dn)','TD '+(td[i]<0?'buy':'sell')+' setup',Math.abs(td[i])+' of 9');
return t},i=>[[X(i),Y(C[i]),B.kind=='candle'?css(C[i]>=O[i]?'--up':'--dn'):css('--tx')],...ms.filter(m=>m.v[i]!=null).map(m=>[X(i),Y(m.v[i]),m.c[0]=='#'?m.c:css(m.c)]),...ov.filter(s=>s.v[i]!=null&&s.type!='dot').map(s=>[X(i),Y(s.v[i]),tCol(s.c)])],top,bot);
tPanels(B,R,o,n,pw)}
// ---------- panels below the chart ----------
function tPanels(B,R,o,n,pw){const el=$('#tpn');if(!el)return;const ks=TSP.map(s=>s[0]).filter(k=>R[k]);
el.innerHTML=ks.map(k=>{const d=TDEF[k],p=tP(k),last=R[k].filter(s=>s.type!='hist').map(s=>{const v=s.v[s.v.length-1];return'<span><i style="background:'+(s.type=='vbar'?'var(--am)':s.c)+'"></i>'+s.n+' <b>'+tFmt(v,k=='vol'||k=='obv'?-1:2)+'</b></span>'}).join('');
return'<div class="tpn"><div class="tph"><b title="'+esc(d[4])+'">'+d[1]+(p.length?' ('+p.join(', ')+')':'')+'</b>'+last+'<button class="tpx" data-a="tst" data-v="'+k+'" aria-label="Remove '+d[1]+'">×</button></div><canvas id="tp_'+k+'" style="height:'+(k=='vol'?90:105)+'px"></canvas></div>'}).join('');
ks.forEach(k=>{const q=cv('tp_'+k);if(!q)return;const[x,w,h]=q,S2=R[k].map(s=>({...s,v:s.v.slice(o)})),s=pw/n,X=i=>i*s+s/2,top=6,bot=h-6;
let vals=S2.flatMap(z=>z.v).filter(v=>v!=null&&isFinite(v));if(R[k].ref)vals=vals.concat(R[k].ref);let lo=R[k].rng?R[k].rng[0]:Math.min(...vals),hi=R[k].rng?R[k].rng[1]:Math.max(...vals);if(S2.some(z=>z.type=='vbar'||z.type=='hist'))lo=Math.min(lo,0),hi=Math.max(hi,0);if(hi==lo)hi=lo+1;
const Y=v=>top+(hi-v)/(hi-lo)*(bot-top),dg=k=='vol'||k=='obv'?-1:2;
x.font='10px IBM Plex Mono,monospace';x.strokeStyle=css('--ln');x.fillStyle=css('--mu');x.beginPath();x.moveTo(0,top);x.lineTo(pw,top);x.moveTo(0,bot);x.lineTo(pw,bot);x.stroke();x.fillText(tFmt(hi,dg),pw+4,top+8);x.fillText(tFmt(lo,dg),pw+4,bot);
(R[k].ref||[]).forEach(r=>{x.setLineDash([3,3]);x.strokeStyle=css('--mu');x.beginPath();x.moveTo(0,Y(r));x.lineTo(pw,Y(r));x.stroke();x.setLineDash([]);if(!R[k].rng||(r!=R[k].rng[0]&&r!=R[k].rng[1]))x.fillText(tFmt(r,dg),pw+4,Y(r)+3)});
S2.forEach(z=>{if(z.type=='vbar'){z.v.forEach((v,i)=>{if(v==null)return;const up=B.c[o+i]>=(B.kind=='candle'?B.o[o+i]:(o+i?B.c[o+i-1]:B.c[o+i]));x.fillStyle=css(up?'--up':'--dn');x.globalAlpha=.55;x.fillRect(X(i)-s*.35,Y(v),Math.max(1,s*.7),Y(0)-Y(v));x.globalAlpha=1})}
else if(z.type=='hist'){z.v.forEach((v,i)=>{if(v==null)return;x.fillStyle=css(v>=0?'--up':'--dn');x.globalAlpha=.5;x.fillRect(X(i)-s*.35,Math.min(Y(v),Y(0)),Math.max(1,s*.7),Math.abs(Y(v)-Y(0)));x.globalAlpha=1})}
else tLine(x,z.v,X,Y,z.c,z.w,z.dash)});
chHover($('#tp_'+k),S2[0].v.map((_,i)=>X(i)),i=>'<b>'+tWhen(B,o+i)+'</b>'+S2.map(z=>z.v[i]==null?'':chRow(z.type=='vbar'?'var(--am)':z.type=='hist'?(z.v[i]>=0?'var(--up)':'var(--dn)'):z.c,z.n,tFmt(z.v[i],dg))).join(''),i=>S2.filter(z=>z.v[i]!=null&&z.type!='hist').map(z=>[X(i),Y(z.v[i]),z.type=='vbar'?'var(--am)':tCol(z.c)]),top,bot)})}
// ---------- study picker ----------
function tCtl(){const B=tBars(),noV=B&&!B.v,btn=s=>{const k=s[0],dis=noV&&['vol','obv','vwap'].includes(k);
return'<button data-a="tst" data-v="'+k+'" class="'+(TSX.on[k]?'on':'')+'"'+(dis?' disabled title="No volume data for this asset"':' title="'+esc(s[4])+'"')+'>'+s[1]+'</button>'};
const onK=TALL.filter(s=>TSX.on[s[0]]&&s[2].length);
const set=onK.length?'<details id="tsd"><summary class="mu">Study settings</summary><div class="tset">'+onK.map(s=>'<div><b>'+s[1]+'</b>'+s[3].map((lb,i)=>'<label>'+lb+'<input type="number" class="in" step="any" min="0" value="'+tP(s[0])[i]+'" onchange="tSet(\''+s[0]+'\','+i+',this.value)"></label>').join('')+'</div>').join('')+'</div></details>':'';
return'<div class="tst"><div class="tsr"><span class="mu">Studies on chart</span>'+TSO.map(btn).join('')+'</div><div class="tsr"><span class="mu">Below the chart</span>'+TSP.map(btn).join('')+'<button class="tclr" data-a="tnone">Clear studies</button></div>'+set
+(B&&noV?'<div class="mu tnote">'+(EXT[ac]&&EXT[ac].g=='Currency'?'Spot currencies trade between banks with no published volume.':'Yahoo Finance reports no volume for '+(EXT[ac]?EXT[ac].n:cur)+'.')+' Volume, OBV and VWAP need it.</div>':'')+'</div>'}
const _homeT=home0;home0=function(){const h=_homeT();return h.includes('<canvas id="ch"></canvas>')?h.replace('<canvas id="ch"></canvas>',tCtl()+'<canvas id="ch"></canvas><div id="tpn"></div>')+tIntra(cur):h};
const _homeXT=homeX;homeX=function(){const h=_homeXT();return h.includes('<canvas id="ch"></canvas>')?h.replace('<canvas id="ch"></canvas>',tCtl()+'<canvas id="ch"></canvas><div id="tpn"></div>').replace('Close prices only, no candles.','Daily closes.')+tIntra(ac):h};
drawC=tDraw;drawX=tDraw;
// ---------- intraday: 5-minute bars with session VWAP (GIP) ----------
const TIM=META.INTRA||{t:[]},TIS=new Set(TIM.t||[]),TIC={};let TIDY=null;
const tFn=t=>t.replace(/[^A-Za-z0-9-]/g,'_');
function tiLoad(t){return TIC[t]?Promise.resolve():fetch('data/in/'+tFn(t)+'.json?v='+META.v).then(r=>r.ok?r.json():null).catch(()=>null).then(j=>{TIC[t]=j||{none:1}})}
const tET=m=>new Date(m*6e4).toLocaleString('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
const tDayET=m=>{const s=tET(m);return s.slice(6,10)+'-'+s.slice(0,2)+'-'+s.slice(3,5)},tTimeET=m=>{const s=tET(m).slice(12,17);return(s.startsWith('24')?'00'+s.slice(2):s)+' ET'};
S.tid=v=>{TIDY=v};
function tIntra(t){if(!TIS.has(t))return'';if(!TIC[t]){tiLoad(t).then(()=>{if(tab==0)render0()});return P('Intraday, '+t,'<p class="mu m">Loading 5-minute bars…</p>','c12" id="tin')}
const d=TIC[t];if(d.none||!d.t)return'';const days=[...new Set(d.t.map(tDayET))];if(!TIDY||!days.includes(TIDY))TIDY=days.at(-1);
Q.push(()=>tiDraw(t));const lv=TLV[t];
return P('Intraday, '+t+' · 5-minute bars with VWAP',SG('tid',days,TIDY).replace(/>(\d{4})-(\d{2})-(\d{2})</g,(m,y,mo,da)=>'>'+chDate(y+'-'+mo+'-'+da).replace(/, \d{4}$/,'')+'<')
+'<div class="tlg"><span><i style="background:#ec4899"></i>Session VWAP</span><span class="mu">Volume bars along the bottom. Times are New York time.</span></div><canvas id="tic" style="height:300px"></canvas>'
+'<div class="mu tnote" id="tlv">'+tLiveTxt(t)+'</div><div class="mu tnote">VWAP adds up price × volume from the session’s first bar and divides by total volume. Funds compare their fills against it. Source: Yahoo Finance, refreshed each weeknight'+(TIM.asof?' ('+TIM.asof+')':'')+'.</div>','c12" id="tin')}
function tiDraw(t){const q=cv('tic'),d=TIC[t];if(!q||!d||!d.t)return;const[x,w,h]=q,idx=d.t.map((m,i)=>[m,i]).filter(([m])=>tDayET(m)==TIDY).map(z=>z[1]);if(!idx.length)return;
const T=idx.map(i=>d.t[i]),O=idx.map(i=>d.o[i]),H=idx.map(i=>d.h[i]),L=idx.map(i=>d.l[i]),C=idx.map(i=>d.c[i]),V=idx.map(i=>d.v[i]);let pv=0,vv=0;const VW=C.map((c,i)=>{pv+=(H[i]+L[i]+c)/3*V[i];vv+=V[i];return vv?pv/vv:null});
const n=C.length,pw=w-56,s=pw/n,X=i=>i*s+s/2,vh=(h-20)*.22,top=6,bot=h-20-vh-6,vals=[...H,...L,...VW.filter(v=>v!=null)],mx=Math.max(...vals),mn=Math.min(...vals),pad=(mx-mn)*.05||1,Y=v=>top+(mx+pad-v)/(mx-mn+2*pad)*(bot-top),vm=Math.max(...V)||1,YV=v=>h-20-v/vm*vh,dg=C.at(-1)<10?4:2;
x.font='11px IBM Plex Mono,monospace';x.strokeStyle=css('--ln');x.fillStyle=css('--mu');lTk(mn,mx,4).forEach(v=>{const y=Y(v);if(y<top||y>bot)return;x.beginPath();x.moveTo(0,y);x.lineTo(pw,y);x.stroke();x.fillText(f(v,dg),pw+4,y+3)});
const nl=Math.max(2,Math.min(7,Math.floor(pw/90)));for(let j=0;j<nl;j++){const i=Math.round(j*(n-1)/(nl-1));x.textAlign=j==0?'left':j==nl-1?'right':'center';x.fillText(tTimeET(T[i]).replace(' ET',''),X(i),h-5)}x.textAlign='left';
V.forEach((v,i)=>{x.fillStyle=css(C[i]>=O[i]?'--up':'--dn');x.globalAlpha=.45;x.fillRect(X(i)-s*.35,YV(v),Math.max(1,s*.7),h-20-YV(v));x.globalAlpha=1});
C.forEach((c,i)=>{const cx=X(i);x.strokeStyle=x.fillStyle=css(c>=O[i]?'--up':'--dn');x.beginPath();x.moveTo(cx,Y(H[i]));x.lineTo(cx,Y(L[i]));x.stroke();x.fillRect(cx-s*.35,Y(Math.max(O[i],c)),Math.max(1,s*.7),Math.max(1,Math.abs(Y(O[i])-Y(c))))});
tLine(x,VW,X,Y,'#ec4899',1.8);
chHover($('#tic'),C.map((_,i)=>X(i)),i=>'<b>'+chDay(TIDY)+', '+tTimeET(T[i])+'</b>'+chRow('transparent','Open',f(O[i],dg))+chRow('transparent','High',f(H[i],dg))+chRow('transparent','Low',f(L[i],dg))+chRow(css(C[i]>=O[i]?'--up':'--dn'),'Close',f(C[i],dg))+chRow('#ec4899','Session VWAP',f(VW[i],dg))+chRow('transparent','Close vs VWAP',chPct((C[i]/VW[i]-1)*100))+chRow('var(--am)','Volume',tFmt(V[i],-1)),
i=>[[X(i),Y(C[i]),css(C[i]>=O[i]?'--up':'--dn')],[X(i),Y(VW[i]),'#ec4899']],top,h-20)}
// ---------- live VWAP from the Finnhub trade feed (Live prices on) ----------
const TLV={};
function tLiveTxt(t){const z=TLV[t];if(typeof LWS=='undefined'||!LWS)return'Turn on live prices (top bar) to build a live VWAP from today’s trades while this page is open.';
if(!z||!z.v)return'Live VWAP: waiting for '+t+' trades (US stocks and ETFs, market hours).';return'Live VWAP since '+new Date(z.t0).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})+': <b>$'+f(z.pv/z.v,2)+'</b> from '+f(z.n,0)+' trades ('+tFmt(z.v,-1)+' shares). Last trade $'+f(z.p,2)+'.'}
setInterval(()=>{if(typeof LWS=='undefined'||!LWS||LWS._tv)return;LWS._tv=1;LWS.addEventListener('message',e=>{let m;try{m=JSON.parse(e.data)}catch(x){return}if(m.type!='trade')return;
m.data.forEach(r=>{const t=(typeof LBACK!='undefined'&&LBACK[r.s])||r.s;if(!r.v)return;const z=TLV[t]||(TLV[t]={pv:0,v:0,n:0,t0:Date.now()});z.pv+=r.p*r.v;z.v+=r.v;z.n++;z.p=r.p});const el=$('#tlv');if(el&&tab==0)el.innerHTML=tLiveTxt(EXT[ac]?ac:cur)})},2000);
render();
