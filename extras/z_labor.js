// Jobs view on the Economy tab (Bloomberg NFP / ECST style): unemployment, payrolls by sector, participation, wages vs
// inflation, jobless claims, job openings and the Sahm recession rule. Data from FRED, loaded when the view opens.
let EV2='Inflation and housing',LDATA=null,LLOAD=null,LR='10Y';
FN.JOBS=['Labor market: payrolls, unemployment, wages, claims',0,()=>{tab=1;EV2='Jobs'}];FN.NFP=FN.JOBS;
FN.ECON=['Inflation and housing',0,()=>{tab=1;EV2='Inflation and housing'}];
if(typeof GUIDE!='undefined'){const g=GUIDE.find(x=>x[0]=='Markets and the economy');if(g){const i=g[1].findIndex(r=>r[0]=='ECON');g[1].splice(i<0?g[1].length:i+1,0,['JOBS','JOBS','Labor market: payrolls by month and by sector, unemployment (U-3 and U-6), participation, wage growth vs inflation, jobless claims, job openings and quits, and the Sahm recession rule.'])}}
if(typeof guide=='function'){const _gL=guide;guide=function(){return _gL().replace('<tr><td>Economy</td><td>Inflation and housing</td></tr>','<tr><td>Economy</td><td>Inflation, housing and the labor market</td></tr>').replace('<tr><td>Fed meeting dates</td>','<tr><td>Jobs, wages, claims, openings</td><td>FRED (Bureau of Labor Statistics, Department of Labor)</td><td>Each weeknight</td></tr><tr><td>Fed meeting dates</td>')}}
S.ev2=v=>{EV2=v};S.lr=v=>{LR=v};
function lLoad(){return LLOAD||(LLOAD=fetch('data/labor.json?v='+META.v).then(r=>{if(!r.ok)throw Error(r.status);return r.json()}).then(j=>{LDATA=j},()=>{LDATA={err:1}}).then(()=>render()))}
const LS=id=>(LDATA.s||{})[id],lMon=d=>['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+d.slice(5,7)-1]+' '+d.slice(0,4);
const lPts=id=>{const s=LS(id);return s?s.d.map((d,i)=>[d,s.v[i]]):[]};
const lYoY=id=>{const p=lPts(id),m=new Map(p);return p.map(([d,v])=>{const y=(+d.slice(0,4)-1)+d.slice(4),b=m.get(y);return b?[d,(v/b-1)*100]:null}).filter(Boolean)};
const lChg=id=>{const p=lPts(id);return p.slice(1).map((x,i)=>[x[0],x[1]-p[i][1]])};
const lLast=id=>{const p=lPts(id);return p.length?p.at(-1):[null,null]};
const lAgo=(id,k)=>{const p=lPts(id);return p.length>k?p.at(-1-k)[1]:null};
const lSince=(p,mo)=>{if(!p.length)return p;const x=new Date(p.at(-1)[0]+'T00:00:00Z');x.setUTCMonth(x.getUTCMonth()-mo);const c=x.toISOString().slice(0,10);return p.filter(q=>q[0]>=c)};
const lAvg=(p,n)=>p.map((q,i)=>i<n-1?null:[q[0],p.slice(i-n+1,i+1).reduce((a,b)=>a+b[1],0)/n]).filter(Boolean);
const lK=v=>v==null?'–':(v>0?'+':'')+f(v,0)+'K',lPp=(v,d=1)=>v==null?'–':f(v,d)+'%',lD=(a,b,d=1,u=' pts')=>a==null||b==null?'':' <span class="'+(a-b>0?'dn':a-b<0?'up':'mu')+'">('+(a-b>0?'+':'')+f(a-b,d)+u+')</span>';
// Sahm rule: 3-month average unemployment minus its lowest 3-month average in the prior 12 months
function lSahm(){const a=lAvg(lPts('UNRATE'),3);if(a.length<13)return null;const s=a.map((q,i)=>i<12?null:[q[0],q[1]-Math.min(...a.slice(i-12,i).map(z=>z[1]))]).filter(Boolean);return s}
function labor(){const D=LDATA,ur=lLast('UNRATE'),u6=lLast('U6RATE'),pc=lChg('PAYEMS'),p3=pc.slice(-3).reduce((a,b)=>a+b[1],0)/3,lp=pc.at(-1)||[null,null];
const ahe=lYoY('CES0500000003'),cpi=lYoY('CPIAUCSL'),aL=ahe.at(-1)||[null,null],cL=cpi.find(q=>q[0]==aL[0])||cpi.at(-1)||[null,null];
const ic=lPts('ICSA'),ic4=lAvg(ic,4).at(-1)||[null,null],cc=lLast('CCSA'),jo=lLast('JTSJOL'),un=lPts('UNEMPLOY'),unJ=un.find(q=>q[0]==jo[0]),qr=lLast('JTSQUR'),sahm=lSahm(),sL=sahm?sahm.at(-1):null;
const key=KV('Unemployment rate (U-3)','<b>'+lPp(ur[1])+'</b>'+lD(ur[1],lAgo('UNRATE',12),1,' pts y/y'))+KV('Broad unemployment (U-6)',lPp(u6[1])+lD(u6[1],lAgo('U6RATE',12),1,' pts y/y'))
+KV('Payrolls, '+(lp[0]?lMon(lp[0]):''),'<b>'+lK(lp[1])+'</b>')+KV('Payrolls, 3-month average',lK(p3))
+KV('Participation rate',lPp(lLast('CIVPART')[1]))+KV('Prime-age (25–54) participation',lPp(lLast('LNS11300060')[1]))+KV('Prime-age employment rate',lPp(lLast('LNS12300060')[1]))
+KV('Hourly earnings, year over year',lPp(aL[1]))+KV('Real wage growth (minus CPI)',aL[1]!=null&&cL[1]!=null?'<span class="'+(aL[1]-cL[1]>0?'up':'dn')+'">'+(aL[1]-cL[1]>0?'+':'')+f(aL[1]-cL[1],1)+'%</span>':'–')
+KV('Initial jobless claims, week of '+(ic.length?ic.at(-1)[0].slice(5):''),(ic.length?f(ic.at(-1)[1]/1e3,0)+'K':'–')+' <span class="mu">(4-wk avg '+(ic4[1]?f(ic4[1]/1e3,0)+'K':'–')+')</span>')
+KV('Continuing claims',cc[1]?f(cc[1]/1e6,2)+'M':'–')+KV('Job openings',jo[1]?f(jo[1]/1e3,1)+'M':'–')+KV('Openings per unemployed person',jo[1]&&unJ?f(jo[1]/unJ[1],2):'–')+KV('Quits rate',lPp(qr[1]))
+(sL?KV('Sahm rule','<b class="'+(sL[1]>=.5?'dn':'up')+'">'+f(sL[1],2)+' pts</b> <span class="mu">'+(sL[1]>=.5?'triggered':'below 0.50')+'</span>'):'')
+'<div class="mu lcap">Latest: unemployment '+(ur[0]?lMon(ur[0]):'–')+', job openings '+(jo[0]?lMon(jo[0]):'–')+'. Red/green in brackets: change vs a year ago (higher unemployment is red).</div>';
// sector table
const SEC=[['Health care and education','USEHS'],['Professional and business services','USPBS'],['Leisure and hospitality','USLAH'],['Government','USGOVT'],['Trade, transportation, utilities','USTPU'],['Construction','USCONS'],['Manufacturing','MANEMP'],['Financial activities','USFIRE'],['Information','USINFO'],['Other services','USSERV'],['Mining and logging','USMINE']].filter(s=>LS(s[1]));
const rows=SEC.map(([n,id])=>{const p=lPts(id),L=p.length,v=p[L-1][1],m1=v-p[L-2][1],m3=(v-p[L-4][1])/3,y=L>12?v-p[L-13][1]:null;return{n,v,m1,m3,y,yp:L>12?(v/p[L-13][1]-1)*100:null}}).sort((a,b)=>(b.y||0)-(a.y||0));
const cl=v=>'<span class="'+(v>0?'up':v<0?'dn':'mu')+'">'+lK(v)+'</span>';
const st=T(['Sector','Jobs','Last month','3-month avg','12 months','12 months %'],rows.map(r=>[r.n,f(r.v/1e3,1)+'M',cl(r.m1),cl(r.m3),cl(r.y),r.yp==null?'–':'<span class="'+(r.yp>0?'up':'dn')+'">'+(r.yp>0?'+':'')+f(r.yp,1)+'%</span>'])).replace('<table','<table class="lt"');
return P('Labor market at a glance',key,'c4')
+P('Nonfarm payrolls, monthly change (thousands)','<div class="eleg"><span><i style="background:var(--am)"></i>Monthly change</span><span><i style="background:var(--tx)"></i>3-month average</span></div><div id="lpay" class="rsvg"></div><div class="mu lcap">Last 36 months. Revisions to recent months are common, so the 3-month average is the steadier read.</div>','c8')
+P('Unemployment rate',SG('lr',['5Y','10Y','Since 2000'],LR)+'<div class="eleg"><span><i style="background:var(--am)"></i>U-3 (headline)</span><span><i style="background:var(--mu)"></i>U-6 (adds part-time for economic reasons and discouraged workers)</span></div><div id="lur" class="rsvg"></div>','c6')
+P('Wage growth vs inflation, year over year','<div class="eleg"><span><i style="background:var(--up)"></i>Average hourly earnings</span><span><i style="background:var(--dn)"></i>CPI inflation</span></div><div id="lwg" class="rsvg"></div><div class="mu lcap">When the green line is above the red, pay is rising faster than prices (real wages are growing).</div>','c6')
+P('Initial jobless claims, weekly','<div class="eleg"><span><i style="background:var(--am)"></i>Weekly</span><span><i style="background:var(--tx)"></i>4-week average</span></div><div id="lic" class="rsvg"></div><div class="mu lcap">The most timely labor data: a rising trend often shows up here before the monthly report.</div>','c6')
+P('Job openings per unemployed person','<div id="ljo" class="rsvg"></div><div class="mu lcap">Above 1 means more open jobs than people looking, a tight market. Source: JOLTS and the household survey.</div>','c6')
+P('Payrolls by sector, sorted by 12-month change',st,'c8')
+P('Sahm recession rule','<div id="lsahm" class="rsvg"></div><div class="mu lcap">The 3-month average unemployment rate minus its low over the prior 12 months. A reading of 0.50 or more has marked the start of every US recession since 1970, though it has given false alarms too. Created by economist Claudia Sahm.</div>','c4')
+'<div class="c12 mu lcap" style="grid-column:1/-1">Source: FRED, St. Louis Fed (Bureau of Labor Statistics, Department of Labor). Updated '+(D.asof||'').slice(0,10)+'.</div>'}
// ---------- charts ----------
// Hover readouts (chHover, chRow, chDate) come from a_chart.js, shared by every chart on the site.
function lTk(lo,hi,n=4){const raw=(hi-lo)/n||1,p=10**Math.floor(Math.log10(raw)),st=[1,2,2.5,5,10].map(x=>x*p).find(x=>x>=raw);const t=[];for(let v=Math.ceil(lo/st)*st;v<=hi+1e-9;v+=st)t.push(+v.toFixed(6));return t}
const lTx=(x,y,s,a='start',c='var(--mu)')=>'<text x="'+x+'" y="'+y+'" text-anchor="'+a+'" style="fill:'+c+'">'+s+'</text>';
function lAxis(w,h,l,r,t,b,lo,hi,t0,t1,fm,Y,X){let s='';lTk(lo,hi).forEach(v=>{s+='<line x1="'+l+'" x2="'+(w-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" style="stroke:var(--ln)"/>'+lTx(l-6,Y(v)+4,fm(v),'end')});
const yrs=(t1-t0)/3.156e10,nl=Math.max(2,Math.min(6,Math.floor((w-l)/110)));for(let j=0;j<nl;j++){const d=new Date(t0+(t1-t0)*j/(nl-1)).toISOString().slice(0,10);s+=lTx(X(d),h-6,yrs>3?d.slice(0,4):lMon(d),j==0?'start':j==nl-1?'end':'middle')}return s}
function lLine(id,S,o={}){const el=$('#'+id);if(!el)return;S=S.filter(x=>x.p.length>1);if(!S.length){el.innerHTML='<p class="mu">No data.</p>';return}
const w=Math.max(260,el.clientWidth),h=o.h||220,l=o.l||48,r=12,t=8,b=24,all=S.flatMap(x=>x.p),ts=all.map(p=>Date.parse(p[0])),t0=Math.min(...ts),t1=Math.max(...ts);
let lo=Math.min(...all.map(p=>p[1]),...(o.ref!=null?[o.ref]:[])),hi=Math.max(...all.map(p=>p[1]),...(o.ref!=null?[o.ref]:[]));const pad=(hi-lo)*.08||1;lo-=pad;hi+=pad;if(o.floor0&&lo<0&&Math.min(...all.map(p=>p[1]))>=0)lo=0;
const X=d=>l+(Date.parse(d)-t0)/((t1-t0)||1)*(w-l-r),Y=v=>t+(hi-v)/(hi-lo)*(h-t-b),fm=o.fm||(v=>f(v,1));
let s='<svg width="'+w+'" height="'+h+'" role="img" aria-label="'+(o.label||'chart')+'">'+lAxis(w,h,l,r,t,b,lo,hi,t0,t1,fm,Y,X);
(o.bands||[]).forEach(([a0,a1])=>{const x0=Math.max(l,X(a0)),x1=Math.min(w-r,X(a1));if(x1>x0)s+='<rect x="'+x0.toFixed(1)+'" y="'+t+'" width="'+Math.max(1,x1-x0).toFixed(1)+'" height="'+(h-t-b)+'" style="fill:var(--mu);opacity:.13"/>'});
if(o.ref!=null)s+='<line x1="'+l+'" x2="'+(w-r)+'" y1="'+Y(o.ref)+'" y2="'+Y(o.ref)+'" style="stroke:'+(o.refc||'var(--mu)')+'" stroke-dasharray="4 3"/>';
S.forEach(x=>{s+='<path d="'+x.p.map((q,i)=>(i?'L':'M')+X(q[0]).toFixed(1)+' '+Y(q[1]).toFixed(1)).join('')+'" fill="none" style="stroke:'+x.c+'" stroke-width="'+(x.w||1.75)+'"'+(x.dash?' stroke-dasharray="'+x.dash+'"':'')+'/>'});
const L0=S[0].p.at(-1);s+='<circle cx="'+X(L0[0])+'" cy="'+Y(L0[1])+'" r="3.5" style="fill:'+S[0].c+'"/>';
el.innerHTML=s+'</svg>';const base=S[0].p,maps=S.map(x=>new Map(x.p));
chHover(el,base.map(q=>X(q[0])),i=>{const d=base[i][0];return'<b>'+(o.dl||chDate)(d)+'</b>'+S.map((x,j)=>{const v=maps[j].get(d);return v==null?'':chRow(x.c,x.n||'',(o.tf||fm)(v))}).join('')},i=>{const d=base[i][0];return S.map((x,j)=>{const v=maps[j].get(d);return[X(d),v==null?null:Y(v),x.c]})},t,h-b)}
function lBars(id,p,avg){const el=$('#'+id);if(!el||!p.length)return;const w=Math.max(260,el.clientWidth),h=w>700?400:230,l=52,r=12,t=8,b=24,vs=p.map(q=>q[1]);let lo=Math.min(0,...vs),hi=Math.max(0,...vs);const pad=(hi-lo)*.08||1;lo-=lo<0?pad:0;hi+=pad;
const bw=(w-l-r)/p.length,X=i=>l+i*bw,Y=v=>t+(hi-v)/(hi-lo)*(h-t-b),t0=Date.parse(p[0][0]),t1=Date.parse(p.at(-1)[0]),XD=d=>l+bw/2+(Date.parse(d)-t0)/((t1-t0)||1)*(w-l-r-bw);
let s='<svg width="'+w+'" height="'+h+'" role="img" aria-label="Monthly payroll change">'+lAxis(w,h,l,r,t,b,lo,hi,t0,t1,v=>f(v,0),Y,XD);
p.forEach((q,i)=>{const y0=Y(0),y1=Y(q[1]);s+='<rect x="'+(X(i)+bw*.15).toFixed(1)+'" y="'+Math.min(y0,y1).toFixed(1)+'" width="'+(bw*.7).toFixed(1)+'" height="'+Math.max(1,Math.abs(y1-y0)).toFixed(1)+'" style="fill:'+(q[1]<0?'var(--dn)':'var(--am)')+';opacity:.85"/>'});
s+='<line x1="'+l+'" x2="'+(w-r)+'" y1="'+Y(0)+'" y2="'+Y(0)+'" style="stroke:var(--mu)"/>';
if(avg&&avg.length>1)s+='<path d="'+avg.map((q,i)=>(i?'L':'M')+XD(q[0]).toFixed(1)+' '+Y(q[1]).toFixed(1)).join('')+'" fill="none" style="stroke:var(--tx)" stroke-width="1.75"/>';
el.innerHTML=s+'</svg>';const am=new Map(avg||[]);chHover(el,p.map((q,i)=>X(i)+bw/2),i=>'<b>'+chDate(p[i][0])+'</b>'+chRow(p[i][1]<0?'var(--dn)':'var(--am)','Change',lK(p[i][1]))+(am.has(p[i][0])?chRow('var(--tx)','3-month avg',lK(am.get(p[i][0]))):''),i=>[[X(i)+bw/2,Y(p[i][1]),p[i][1]<0?'var(--dn)':'var(--am)']].concat(am.has(p[i][0])?[[X(i)+bw/2,Y(am.get(p[i][0])),'var(--tx)']]:[]),t,h-b)}
function lDraw(){if(!LDATA||LDATA.err||!$('#lpay'))return;const pc=lChg('PAYEMS').slice(-36),av=lAvg(lChg('PAYEMS'),3).filter(q=>q[0]>=pc[0][0]);lBars('lpay',pc,av);
const mo={'5Y':60,'10Y':120,'Since 2000':400}[LR];lLine('lur',[{p:lSince(lPts('UNRATE'),mo),c:'var(--am)',w:2,n:'U-3'},{p:lSince(lPts('U6RATE'),mo),c:'var(--mu)',n:'U-6'}],{fm:v=>f(v,0)+'%',tf:v=>f(v,1)+'%',label:'Unemployment rate'});
lLine('lwg',[{p:lYoY('CES0500000003').filter(q=>q[0]>='2008-01-01'),c:'var(--up)',w:2,n:'Hourly earnings'},{p:lYoY('CPIAUCSL').filter(q=>q[0]>='2008-01-01'),c:'var(--dn)',n:'CPI'}],{fm:v=>f(v,0)+'%',tf:v=>f(v,1)+'%',ref:0,label:'Wage growth vs inflation'});
const ic=lSince(lPts('ICSA'),24).map(q=>[q[0],q[1]/1e3]);lLine('lic',[{p:ic,c:'var(--am)',w:1.25,n:'Weekly'},{p:lAvg(ic,4),c:'var(--tx)',w:2,n:'4-week avg'}],{fm:v=>f(v,0)+'K',label:'Initial jobless claims'});
const un=new Map(lPts('UNEMPLOY'));lLine('ljo',[{p:lPts('JTSJOL').map(q=>un.get(q[0])?[q[0],q[1]/un.get(q[0])]:null).filter(Boolean),c:'var(--am)',w:2,n:'Openings per unemployed'}],{fm:v=>f(v,1),tf:v=>f(v,2),ref:1,label:'Job openings per unemployed person'});
const sm=lSahm();if(sm)lLine('lsahm',[{p:sm.filter(q=>q[0]>='2000-01-01'),c:'var(--am)',w:1.75,n:'Sahm rule'}],{fm:v=>f(v,1),tf:v=>f(v,2)+' pts',ref:.5,refc:'var(--dn)',h:170,label:'Sahm rule'})}
window.addEventListener('resize',()=>{if(tab==1&&EV2=='Jobs'){clearTimeout(window.LTO);window.LTO=setTimeout(lDraw,150)}});
// Economy tab: Inflation and housing (existing) | Jobs (new)
const _econ=econ;
econ=function(){const bar='<section class="p c12" style="padding:6px 12px">'+SG('ev2',['Inflation and housing','Jobs'],EV2)+'</section>';
if(EV2!='Jobs')return bar+_econ();
if(!LDATA){lLoad();return bar+P('Jobs','<p class="mu m">Loading labor data…</p>','c12')}
if(LDATA.err||!LDATA.s||!LDATA.s.UNRATE)return bar+P('Jobs','<p class="mu">Labor data isn’t available in this build yet. It appears after the next nightly update.</p>','c12');
Q.push(lDraw);return bar+labor()};
render();
