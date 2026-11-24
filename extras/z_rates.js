// Rates tab (Bloomberg GC, YAS): Treasury curve vs history, curve and credit spreads, policy rates, and a bond calculator.
// Data from FRED, loaded when the tab opens.
TABS.push('Rates');const RT=TABS.length-1;
let RDATA=null,RLOAD=null,RH='10Y',RR='5Y',RCMP=['1M','1Y'],RSCROLL=0,RTO=0,RB=null;
const RM=[['1M','DGS1MO',1/12],['3M','DGS3MO',.25],['6M','DGS6MO',.5],['1Y','DGS1',1],['2Y','DGS2',2],['3Y','DGS3',3],['5Y','DGS5',5],['7Y','DGS7',7],['10Y','DGS10',10],['20Y','DGS20',20],['30Y','DGS30',30]];
const RHS={'10Y':'DGS10','2Y':'DGS2','30Y':'DGS30','2s10s':'T10Y2Y','3m10y':'T10Y3M','Fed funds':'DFF','Real 10Y':'DFII10','Breakeven':'T10YIE','IG spread':'BAMLC0A0CM','HY spread':'BAMLH0A0HYM2'};
const RBP=new Set(['T10Y2Y','T10Y3M','BAMLC0A0CM','BAMLC0A4CBBB','BAMLH0A0HYM2']);
const RCC={'1M':['var(--tx)',.5,''],'1Y':['var(--up)',.9,''],'5Y':['var(--mu)',.9,'5 4']};
FN.GC=['Treasury yield curve, spreads and credit',0,()=>{tab=RT}];FN.RATES=FN.GC;
FN.YAS=['Bond calculator: price, duration, convexity, DV01',0,()=>{tab=RT;RSCROLL=1}];
if(typeof GUIDE!='undefined'){const g=GUIDE.find(x=>x[0]=='Markets and the economy');if(g){const i=g[1].findIndex(r=>r[0]=='GC');const rows=[['GC','GC','Treasury yield curve today vs 1 month, 1 year and 5 years ago; history of yields, curve spreads and credit spreads; inversion and recession signals.'],['YAS','YAS','Bond calculator: price from yield, Macaulay and modified duration, convexity, DV01, spread to the Treasury curve, and a price-yield chart.']];i>=0?g[1].splice(i,1,...rows):g[1].push(...rows)}}
if(typeof guide=='function'){const _g=guide;guide=function(){return _g().replace('<tr><td>Economy</td><td>Inflation and housing</td></tr>','<tr><td>Economy</td><td>Inflation and housing</td></tr><tr><td>Rates</td><td>Treasury yield curve, spreads, credit and the bond calculator</td></tr>').replace('<tr><td>Fed meeting dates</td>','<tr><td>Treasury yields, policy rates, credit spreads</td><td>FRED (U.S. Treasury, Federal Reserve, ICE BofA)</td><td>Each weeknight</td></tr><tr><td>Fed meeting dates</td>')}}
S.rcmp=v=>{RCMP=RCMP.includes(v)?RCMP.filter(x=>x!=v):[...RCMP,v]};S.rh=v=>{RH=v};S.rr=v=>{RR=v};
function rLoad(){return RLOAD||(RLOAD=fetch('data/rates.json?v='+META.v).then(r=>{if(!r.ok)throw Error(r.status);return r.json()}).then(j=>{RDATA=j},()=>{RDATA={err:1}}).then(()=>render()))}
// lookups
const rIdx=d=>{const D=RDATA.d;if(d<D[0])return 0;let lo=0,hi=D.length-1;while(lo<hi){const m=(lo+hi+1)>>1;D[m]<=d?lo=m:hi=m-1}return lo};
const rAt=(id,i)=>{const a=RDATA.s[id];if(!a||i<0)return null;for(let k=Math.min(i,a.length-1);k>=0&&k>i-12;k--)if(a[k]!=null)return a[k];return null};
const rLast=id=>{const a=RDATA.s[id];if(!a)return[-1,null];for(let k=a.length-1;k>=0;k--)if(a[k]!=null)return[k,a[k]];return[-1,null]};
const rMinus=(d,mo)=>{const x=new Date(d+'T00:00:00Z');x.setUTCMonth(x.getUTCMonth()-mo);return x.toISOString().slice(0,10)};
const rBackI=mo=>rIdx(rMinus(RDATA.d.at(-1),mo));
const rMon=d=>['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+d.slice(5,7)-1]+' '+d.slice(0,4);
const rDay=d=>rMon(d).slice(0,3)+' '+(+d.slice(8))+', '+d.slice(0,4);
const rV=(id,v)=>v==null?'–':RBP.has(id)?(v>0&&id.startsWith('T10')?'+':'')+f(v*100,0)+' bp':f(v,2)+'%';
const rCh=(a,b)=>{if(a==null||b==null)return'<span class="mu">–</span>';const c=Math.round((a-b)*100);return'<span class="'+(c>0?'up':c<0?'dn':'mu')+'">'+(c>0?'+':'')+c+'</span>'};
const rCurve=i=>RM.map(m=>rAt(m[1],i));
function rInterp(t){const c=rCurve(RDATA.d.length-1),p=RM.map((m,i)=>[m[2],c[i]]).filter(x=>x[1]!=null);if(!p.length)return 4;if(t<=p[0][0])return p[0][1];for(let i=1;i<p.length;i++)if(t<=p[i][0]){const[a,b]=[p[i-1],p[i]];return a[1]+(b[1]-a[1])*(t-a[0])/(b[0]-a[0])}return p.at(-1)[1]}
// streaks below zero (curve inversions)
function rInv(id){const a=RDATA.s[id],D=RDATA.d;if(!a)return'';const[li,lv]=rLast(id);let k=li;
if(lv<0){while(k>0&&(a[k-1]==null||a[k-1]<0))k--;return'Inverted since '+rMon(D[k])}
while(k>=0&&(a[k]==null||a[k]>=0))k--;if(k<0)return'Not inverted since '+rMon(D[0]);const end=k;while(k>0&&(a[k-1]==null||a[k-1]<0))k--;
return'Last inverted '+rMon(D[k])+' to '+rMon(D[end])}
// nice axis ticks
function rTicks(lo,hi,n=4){const raw=(hi-lo)/n||1,p=10**Math.floor(Math.log10(raw)),st=[1,2,2.5,5,10].map(x=>x*p).find(x=>x>=raw);const t=[];for(let v=Math.ceil(lo/st)*st;v<=hi+1e-9;v+=st)t.push(+v.toFixed(6));return t}
const rkv=(a,b)=>'<div class="kv"><span class="mu">'+a+'</span><span class="m">'+b+'</span></div>';
const rTx=(x,y,s,a='start',c='var(--mu)')=>'<text x="'+x+'" y="'+y+'" text-anchor="'+a+'" style="fill:'+c+'">'+s+'</text>';
// ---------- view ----------
function rView(){const D=RDATA.d,L=D.length-1;
const krows=[['Fed funds, effective','DFF'],['SOFR','SOFR'],['3M T-bill','DGS3MO'],['2Y Treasury','DGS2'],['10Y Treasury','DGS10'],['30Y Treasury','DGS30'],['2s10s curve','T10Y2Y'],['3m10y curve','T10Y3M'],['10Y real yield (TIPS)','DFII10'],['10Y breakeven inflation','T10YIE'],['IG corporate spread','BAMLC0A0CM'],['BBB spread','BAMLC0A4CBBB'],['High-yield spread','BAMLH0A0HYM2']].filter(r=>RDATA.s[r[1]]);
const kt=T(['Rate','Last','1D','1M','1Y'],krows.map(([n,id])=>{const[i,v]=rLast(id),d=D[i];return[n,rV(id,v),rCh(v,rAt(id,i-1)),rCh(v,rAt(id,rIdx(rMinus(d,1)))),rCh(v,rAt(id,rIdx(rMinus(d,12))))]})).replace('<table','<table class="rk"');
const cm={'Today':L,'1M':rBackI(1),'1Y':rBackI(12),'5Y':rBackI(60)},cur=rCurve(L),c1y=rCurve(cm['1Y']),c1m=rCurve(cm['1M']);
const ct='<table class="rc"><tr><th></th>'+RM.map(m=>'<th>'+m[0]+'</th>').join('')+'</tr><tr><td>Today</td>'+cur.map(v=>'<td>'+(v==null?'–':f(v,2))+'</td>').join('')+'</tr><tr><td>1M chg (bp)</td>'+cur.map((v,i)=>'<td>'+rCh(v,c1m[i])+'</td>').join('')+'</tr><tr><td>1Y chg (bp)</td>'+cur.map((v,i)=>'<td>'+rCh(v,c1y[i])+'</td>').join('')+'</tr></table>';
const leg='<div class="rleg"><span><i style="background:var(--am)"></i>Today, '+rDay(D[L])+'</span>'+['1M','1Y','5Y'].map(k=>'<button data-a="rcmp" data-v="'+k+'" class="'+(RCMP.includes(k)?'on':'')+'"><i style="background:'+RCC[k][0]+'"></i>'+k+' ago</button>').join('')+'</div>';
// signals
const v2s=rLast('T10Y2Y')[1],v3m=rLast('T10Y3M')[1],shape=v2s==null?'–':v2s<0?'Inverted':v2s<.5?'Flat':'Upward sloping';
const n10=rLast('DGS10')[1],r10=rLast('DFII10')[1],b10=rLast('T10YIE')[1],ff=rLast('DFF')[1],y2=rLast('DGS2')[1],ig=rLast('BAMLC0A0CM'),hy=rLast('BAMLH0A0HYM2');
let pct='';if(hy[1]!=null){const a=RDATA.s.BAMLH0A0HYM2.filter(x=>x!=null),below=a.filter(x=>x<hy[1]).length,fi=RDATA.s.BAMLH0A0HYM2.findIndex(x=>x!=null);pct='Wider than '+Math.round(below/a.length*100)+'% of days since '+rMon(D[fi])}
const sig=rkv('Curve shape (2s10s)','<b>'+shape+'</b>')+rkv('2s10s',rV('T10Y2Y',v2s))+'<div class="rnote">'+rInv('T10Y2Y')+'</div>'+rkv('3m10y',rV('T10Y3M',v3m))+'<div class="rnote">'+rInv('T10Y3M')+'. The New York Fed uses this spread to estimate recession odds.</div>'
+(r10!=null&&b10!=null?rkv('10Y yield, split',f(n10,2)+'% ≈ '+f(r10,2)+'% real + '+f(b10,2)+'% inflation'):'')
+(ff!=null&&y2!=null?rkv('2Y minus fed funds',rCh(y2,ff)+' bp')+'<div class="rnote">'+(y2<ff-.1?'The market leans toward rate cuts over the next two years.':y2>ff+.1?'The market leans toward rate hikes over the next two years.':'The market expects rates to stay about here.')+'</div>':'')
+(hy[1]!=null?rkv('High-yield spread',rV('BAMLH0A0HYM2',hy[1]))+'<div class="rnote">'+pct+'. Wider means investors demand more to take credit risk.</div>':'')
+(ig[1]!=null&&hy[1]!=null?rkv('HY minus IG',f((hy[1]-ig[1])*100,0)+' bp'):'');
if(!RB){const t=10,y=rInterp(t);RB={c:Math.round(y*8)/8,t,y:+y.toFixed(3),m:2,face:1e6}}
const yas='<div class="yas"><div class="yin"><label>Coupon (%)<input type="number" id="yc" step="0.125" value="'+RB.c+'" oninput="rIn()"></label><label>Years to maturity<input type="number" id="yt" step="0.5" min="0.25" max="50" value="'+RB.t+'" oninput="rIn()"></label><label>Yield (%)<input type="number" id="yy" step="0.05" value="'+RB.y+'" oninput="rIn()"></label><label>Coupons per year<select id="ym" onchange="rIn()">'+[[1,'1 (annual)'],[2,'2 (Treasuries)'],[4,'4 (quarterly)']].map(([v,n])=>'<option value="'+v+'"'+(v==RB.m?' selected':'')+'>'+n+'</option>').join('')+'</select></label><label>Face value ($)<input type="number" id="yf" step="100000" min="1000" value="'+RB.face+'" oninput="rIn()"></label><button class="in" data-a="ryld" style="width:auto">Use Treasury yield</button></div><div id="yout"></div><div><div id="ypy" class="rsvg"></div><div class="mu rcap">Amber: actual price. Dashed: duration\'s straight-line estimate. The gap is convexity, which helps the holder whichever way yields move.</div></div></div>';
const src='<div class="mu rcap">Source: FRED (U.S. Treasury, Federal Reserve, ICE BofA). Last data '+rDay(D[L])+'. Credit spread history on FRED starts about three years back.</div>';
return P('Treasury yield curve',leg+'<div id="rcv" class="rsvg"></div>'+ct,'c8')
+P('Key rates',kt+'<div class="mu rcap">Changes in basis points (1 bp = 0.01%).</div>','c4')
+P('History',SG('rh',Object.keys(RHS).filter(k=>RDATA.s[RHS[k]]),RH)+SG('rr',['1Y','5Y','10Y','Max'],RR)+'<div id="rhv" class="m rread"></div><div id="rhc" class="rsvg"></div>','c8')
+P('Curve and credit signals',sig,'c4')
+P('Bond calculator (YAS)',yas+src,'c12" id="yasp')}
S.ryld=()=>{RB.y=+rInterp(RB.t).toFixed(3);$('#yy').value=RB.y;rCalc();return'skip'};
function rIn(){const n=(id,d)=>{const v=parseFloat($(id).value);return isFinite(v)?v:d};RB.c=Math.max(0,n('#yc',RB.c));RB.t=Math.min(50,Math.max(.25,n('#yt',RB.t)));RB.y=n('#yy',RB.y);RB.m=+$('#ym').value||2;RB.face=Math.max(1000,n('#yf',RB.face));rCalc()}
// bond math: priced on a coupon date (no accrued interest)
function bond(c,t,y,m){const n=Math.max(1,Math.round(t*m)),cp=c/m,r=y/100/m;if(r<=-1)return null;let P=0,mac=0,cx=0;
for(let k=1;k<=n;k++){const cf=cp+(k==n?100:0),df=(1+r)**-k;P+=cf*df;mac+=k/m*cf*df;cx+=cf*k*(k+1)*(1+r)**-(k+2)}
mac/=P;return{P,mac,md:mac/(1+r),cx:cx/(m*m)/P}}
function rCalc(){const b=bond(RB.c,RB.t,RB.y,RB.m),o=$('#yout');if(!o)return;if(!b){o.innerHTML='<p class="dn">Check the inputs.</p>';return}
const dv=b.md*b.P/100*RB.face*1e-4,sp=(RB.y-rInterp(RB.t))*100,mv=d=>{const a=bond(RB.c,RB.t,RB.y+d,RB.m),ad=a?(a.P/b.P-1)*100:null,du=-b.md*d,dc=du+.5*b.cx*d*d/100;return[(d>0?'+':'')+d*100+' bp',ad==null?'–':f(ad,2)+'%',f(du,2)+'%',f(dc,2)+'%']};
o.innerHTML=rkv('Price (per 100)','<b>'+f(b.P,3)+'</b>')+rkv('Price for face','$'+f(b.P/100*RB.face,0))+rkv('Spread to Treasury curve',(sp>0?'+':'')+f(sp,0)+' bp')+rkv('Macaulay duration',f(b.mac,2)+' yrs')+rkv('Modified duration',f(b.md,2))+rkv('Convexity',f(b.cx,1))+rkv('DV01 (value of 1 bp)','$'+f(dv,0))
+T(['Yield move','Actual','Duration only','+ convexity'],[mv(1),mv(-1)]).replace('<table','<table class="rk"');rPY(b)}
// ---------- charts (SVG, sized to their panel) ----------
function rFrame(el,h){const w=Math.max(260,el.clientWidth);return[w,h]}
function rCurveSvg(){const el=$('#rcv');if(!el)return;const[w,h]=rFrame(el,290),L=RDATA.d.length-1,sets=[['Today',L,'var(--am)',1,'']].concat(['5Y','1Y','1M'].filter(k=>RCMP.includes(k)).map(k=>[k,rBackI({'1M':1,'1Y':12,'5Y':60}[k]),...RCC[k]]));
const cv=sets.map(s=>rCurve(s[1])),all=cv.flat().filter(v=>v!=null);if(!all.length){el.innerHTML='';return}
let lo=Math.min(...all),hi=Math.max(...all);const pad=(hi-lo)*.12||.25;lo-=pad;hi+=pad;const l=46,r=14,t=10,b=26,X=i=>l+i*(w-l-r)/(RM.length-1),Y=v=>t+(hi-v)/(hi-lo)*(h-t-b);
let s='<svg width="'+w+'" height="'+h+'" role="img" aria-label="Treasury yield curve">';
rTicks(lo,hi).forEach(v=>{s+='<line x1="'+l+'" x2="'+(w-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" style="stroke:var(--ln)"/>'+rTx(l-6,Y(v)+4,f(v,v%1?2:0)+'%','end')});
RM.forEach((m,i)=>{s+=rTx(X(i),h-8,m[0],'middle')});
sets.slice().reverse().forEach((st,j)=>{const k=sets.length-1-j,c=cv[k];let d='';c.forEach((v,i)=>{if(v!=null)d+=(d?'L':'M')+X(i).toFixed(1)+' '+Y(v).toFixed(1)});
s+='<path d="'+d+'" fill="none" style="stroke:'+st[2]+';opacity:'+st[3]+'" stroke-width="'+(k?1.5:2.25)+'"'+(st[4]?' stroke-dasharray="'+st[4]+'"':'')+'/>';
if(!k)c.forEach((v,i)=>{if(v!=null)s+='<circle cx="'+X(i)+'" cy="'+Y(v)+'" r="3" style="fill:var(--am)"/>'})});
el.innerHTML=s+'</svg>';const nm={Today:'Today','1M':'1 month ago','1Y':'1 year ago','5Y':'5 years ago'},dd=sets.map(st=>RDATA.d[st[1]]);
chHover(el,RM.map((_,i)=>X(i)),i=>'<b>'+RM[i][0].replace('M',' month').replace('Y',' year')+' Treasury</b>'+sets.map((st,k)=>cv[k][i]==null?'':chRow(st[2],nm[st[0]]+(dd[k]?' <span class="mu">('+chDate(dd[k])+')</span>':''),f(cv[k][i],2)+'%')).join('')+(cv.length>1&&cv[0][i]!=null&&cv[1][i]!=null?chRow('transparent','Change vs '+nm[sets[1][0]].toLowerCase(),(cv[0][i]-cv[1][i]>=0?'+':'')+f((cv[0][i]-cv[1][i])*100,0)+' bp'):''),
i=>sets.map((st,k)=>cv[k][i]==null?null:[X(i),Y(cv[k][i]),st[2]]).filter(Boolean),t,h-b)}
function rHist(){const el=$('#rhc');if(!el)return;const id=RHS[RH],a=RDATA.s[id];if(!a){el.innerHTML='';return}
const i0={'1Y':rBackI(12),'5Y':rBackI(60),'10Y':rBackI(120),'Max':0}[RR],pts=[];for(let i=i0;i<a.length;i++)if(a[i]!=null)pts.push([RDATA.d[i],a[i]]);
const st=Math.ceil(pts.length/700),P2=pts.filter((p,i)=>i%st==0||i==pts.length-1);if(P2.length<2){el.innerHTML='<p class="mu">Not enough history for this range.</p>';$('#rhv').textContent='';return}
const bp=RBP.has(id),k=bp?100:1,[w,h]=rFrame(el,230),vs=P2.map(p=>p[1]*k);let lo=Math.min(...vs),hi=Math.max(...vs);if(bp||lo<0){lo=Math.min(lo,0);hi=Math.max(hi,0)}const pad=(hi-lo)*.08||1;lo-=pad;hi+=pad;
const l=58,r=14,t=8,b=24,X=i=>l+i*(w-l-r)/(P2.length-1),Y=v=>t+(hi-v)/(hi-lo)*(h-t-b),u=bp?' bp':'%',fm=v=>f(v,bp?0:2)+u;
let s='<svg width="'+w+'" height="'+h+'" role="img" aria-label="'+RH+' history">';
rTicks(lo,hi).forEach(v=>{s+='<line x1="'+l+'" x2="'+(w-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" style="stroke:var(--ln)"/>'+rTx(l-6,Y(v)+4,f(v,bp||v%1==0?0:(Math.abs(v%.5)<1e-9?1:2))+u,'end')});
const yrs=(Date.parse(P2.at(-1)[0])-Date.parse(P2[0][0]))/3.156e10,nl=Math.max(2,Math.min(6,Math.floor((w-l)/110)));
for(let j=0;j<nl;j++){const i=Math.round(j*(P2.length-1)/(nl-1)),d=P2[i][0];s+=rTx(X(i),h-6,yrs>3?d.slice(0,4):rMon(d),j==0?'start':j==nl-1?'end':'middle')}
let d='';P2.forEach((p,i)=>{d+=(i?'L':'M')+X(i).toFixed(1)+' '+Y(p[1]*k).toFixed(1)});
if(bp&&lo<0&&id.startsWith('T10')){const z=Y(0),cid='rclip'+Date.now();s+='<clipPath id="'+cid+'"><rect x="'+l+'" y="'+z+'" width="'+(w-l-r)+'" height="'+(h-b-z)+'"/></clipPath><path d="'+d+'L'+X(P2.length-1)+' '+z+'L'+l+' '+z+'Z" clip-path="url(#'+cid+')" style="fill:var(--dn);opacity:.22"/>'}
if(lo<0&&hi>0)s+='<line x1="'+l+'" x2="'+(w-r)+'" y1="'+Y(0)+'" y2="'+Y(0)+'" style="stroke:var(--mu)" stroke-dasharray="3 3"/>';
s+='<path d="'+d+'" fill="none" style="stroke:var(--am)" stroke-width="1.6"/></svg>';
el.innerHTML=s;const rv=$('#rhv'),last=P2.at(-1);rv.innerHTML=RH+' <b>'+fm(last[1]*k)+'</b> <span class="mu">'+rDay(last[0])+'</span>';
chHover(el,P2.map((_,i)=>X(i)),i=>'<b>'+chDay(P2[i][0])+'</b>'+chRow('var(--am)',RH,fm(P2[i][1]*k))+(i?chRow('transparent','Change from start',(P2[i][1]-P2[0][1]>=0?'+':'')+f((P2[i][1]-P2[0][1])*(bp?k:100),0)+' bp'):''),i=>[[X(i),Y(P2[i][1]*k),'var(--am)']],t,h-b)}
function rPY(b){const el=$('#ypy');if(!el)return;const[w,h]=rFrame(el,220),y0=RB.y,ys=[];for(let j=0;j<=60;j++)ys.push(y0-3+j*.1);
const pts=ys.map(y=>{const q=bond(RB.c,RB.t,y,RB.m);return q?[y,q.P]:null}).filter(Boolean),tan=y=>b.P*(1-b.md*(y-y0)/100);
const ps=pts.map(p=>p[1]).concat(tan(ys[0]),tan(ys.at(-1)));let lo=Math.min(...ps),hi=Math.max(...ps);const pad=(hi-lo)*.06||1;lo-=pad;hi+=pad;
const l=46,r=12,t=8,b2=26,X=y=>l+(y-ys[0])/(ys.at(-1)-ys[0])*(w-l-r),Y=v=>t+(hi-v)/(hi-lo)*(h-t-b2);
let s='<svg width="'+w+'" height="'+h+'" role="img" aria-label="Price against yield">';
rTicks(lo,hi).forEach(v=>{s+='<line x1="'+l+'" x2="'+(w-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" style="stroke:var(--ln)"/>'+rTx(l-6,Y(v)+4,f(v,0),'end')});
rTicks(ys[0],ys.at(-1),5).forEach(v=>{s+=rTx(X(v),h-12,f(v,v%1?1:0)+'%','middle')});s+=rTx(w-r,h-1,'Yield','end');
s+='<path d="M'+X(ys[0])+' '+Y(tan(ys[0]))+'L'+X(ys.at(-1))+' '+Y(tan(ys.at(-1)))+'" style="stroke:var(--mu)" stroke-dasharray="5 4" stroke-width="1.25"/>';
s+='<path d="'+pts.map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)).join('')+'" fill="none" style="stroke:var(--am)" stroke-width="2"/>';
s+='<circle cx="'+X(y0)+'" cy="'+Y(b.P)+'" r="4" style="fill:var(--am)"/>'+rTx(X(y0)+8,Y(b.P)-8,f(b.P,2)+' at '+f(y0,2)+'%','start','var(--tx)');
el.innerHTML=s+'</svg>';chHover(el,pts.map(p=>X(p[0])),i=>{const[y,P]=pts[i];return'<b>Yield '+f(y,2)+'%</b>'+chRow('var(--am)','Price',f(P,2))+chRow('var(--mu)','Price estimated from duration',f(tan(y),2))+chRow('transparent','Change vs today',(P-b.P>=0?'+':'')+f((P/b.P-1)*100,2)+'%')},i=>[[X(pts[i][0]),Y(pts[i][1]),'var(--am)'],[X(pts[i][0]),Y(tan(pts[i][0])),'var(--mu)']],t,h-b2)}
function rDraw(){rCurveSvg();rHist();rCalc()}
window.addEventListener('resize',()=>{if(tab==RT&&RDATA&&!RDATA.err){clearTimeout(RTO);RTO=setTimeout(rDraw,150)}});
const _r6=render0;
render0=function(){if(tab!=RT)return _r6();
Q=[];$('#hd').textContent='US Treasuries, rates and credit';
if(!RDATA){$('#v').innerHTML='<p class="mu m">Loading rates…</p>';rLoad();return}
if(RDATA.err||!RDATA.d||!RDATA.d.length){$('#v').innerHTML='<p class="mu">Rates data isn’t available in this build yet. It appears after the next nightly update.</p>';return}
$('#v').innerHTML='<div class="grid rates">'+rView()+'</div>';rDraw();
if(RSCROLL){RSCROLL=0;const p=$('#yasp');if(p)p.scrollIntoView({behavior:'smooth',block:'start'})}};
render();
