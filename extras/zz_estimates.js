// Analyst estimates (Bloomberg EE / ANR) as an Estimates view on the Company tab: EPS estimate trend and revisions,
// consensus EPS and revenue, ratings, price targets, upgrades and downgrades, and the S&P 500's biggest estimate changes.
const ESTM=META.EST||{t:[],r:{}},ESTS=new Set(ESTM.t||[]),ESTC={};
const EPL={'0q':'Current quarter','+1q':'Next quarter','0y':'Current fiscal year','+1y':'Next fiscal year'},EPK=['0q','+1q','0y','+1y'];
FN.EST=['Analyst estimates and revisions',1,()=>{tab=CT;CV='Estimates'}];
FN.ANR=['Analyst ratings and price targets',1,()=>{tab=CT;CV='Estimates'}];
if(typeof GUIDE!='undefined'){const g=GUIDE.find(x=>x[0]=='Company research');if(g){const i=g[1].findIndex(r=>r[0]=='WACC');g[1].splice(i<0?g[1].length:i+1,0,['EST','NVDA EST','EPS estimates now vs 7, 30, 60 and 90 days ago, analysts raising or cutting, consensus EPS and revenue with ranges, and the S&P 500’s biggest estimate changes.'],['ANR','NVDA ANR','Analyst ratings over four months, consensus score, price target range vs price, and recent upgrades and downgrades with target changes.'])}}
function estLoad(t){return ESTC[t]?Promise.resolve():fetch('data/est/'+t+'.json?v='+META.v).then(r=>r.ok?r.json():null).then(j=>{ESTC[t]=j||{none:1}}).catch(()=>{ESTC[t]={none:1}})}
const e$=v=>v==null?'–':(v<0?'-$':'$')+f(Math.abs(v),2),eP=v=>v==null?'–':(v>0?'+':'')+f(v*100,1)+'%',eN=v=>v==null?'–':f(v,0);
const eChg=(a,b)=>a==null||b==null||!b?null:(a-b)/Math.abs(b);
function estView(){const e=ESTC[cur];
if(!e||e.none||(!e.tr&&!e.rec))return P('Analyst estimates, '+cur,'<p class="mu">No analyst estimates are available for '+cur+' in this build.</p>','c12')+estMarket();
const tr=e.tr||{},rv=e.rv||{},ee=e.ee||{},re=e.re||{},px=CO[cur][1];
// trend table
const tt=T(['Period','Now','7 days ago','30 days ago','60 days ago','90 days ago','90-day change'],EPK.filter(p=>tr[p]).map(p=>{const r=tr[p],c=eChg(r[0],r[4]);return[EPL[p],'<b>'+e$(r[0])+'</b>',e$(r[1]),e$(r[2]),e$(r[3]),e$(r[4]),'<span class="'+(c>0?'up':c<0?'dn':'mu')+'">'+eP(c)+'</span>']})).replace('<table','<table class="et"');
const rvt=T(['Period','Up 7d','Up 30d','Down 7d','Down 30d'],EPK.filter(p=>rv[p]).map(p=>{const r=rv[p];return[EPL[p],'<span class="up">'+eN(r[0])+'</span>','<span class="up">'+eN(r[1])+'</span>','<span class="dn">'+eN(r[2])+'</span>','<span class="dn">'+eN(r[3])+'</span>']})).replace('<table','<table class="et"');
// ratings
let rat='<p class="mu">No ratings.</p>';if(e.rec&&e.rec.length){const nm=['Strong buy','Buy','Hold','Sell','Strong sell'],cl=['esb','eb','eh','es','ess'],r0=e.rec[0].slice(1),n=r0.reduce((a,b)=>a+b,0),sc=n?r0.reduce((a,v,i)=>a+v*(i+1),0)/n:null,lab=sc==null?'–':sc<1.75?'Strong buy':sc<2.5?'Buy':sc<3.5?'Hold':sc<4.25?'Sell':'Strong sell';
const stack=r=>{const m=r.reduce((a,b)=>a+b,0)||1;return'<div class="estk">'+r.map((v,i)=>v?'<i class="'+cl[i]+'" style="width:'+(v/m*100).toFixed(1)+'%"></i>':'').join('')+'</div>'};
const mo=p=>p=='0m'?'This month':p.replace('-','').replace('m',' mo ago');
rat='<div class="ebig"><b>'+lab+'</b><span class="mu">'+(sc?f(sc,2)+' on a 1 (strong buy) to 5 (strong sell) scale · ':'')+n+' analysts</span></div>'+stack(r0)
+'<div class="eleg">'+nm.map((x,i)=>'<span><i class="'+cl[i]+'"></i>'+x+' '+r0[i]+'</span>').join('')+'</div>'
+'<div class="erec">'+e.rec.map(r=>'<div data-tip="'+esc(chRecTip(mo(r[0]),r.slice(1)))+'"><span class="mu">'+mo(r[0])+'</span>'+stack(r.slice(1))+'</div>').join('')+'</div>'}
let ptx='';const pt=e.pt||{};if(pt.low&&pt.high&&pt.high>pt.low){const lo=Math.min(pt.low,px),hi=Math.max(pt.high,px),X=v=>((v-lo)/(hi-lo)*100).toFixed(1)+'%',up=pt.mean&&px?pt.mean/px-1:null;
ptx='<h4 class="eh4">Price targets</h4><div class="ept" data-tip="'+esc('<b>Analyst price targets</b>'+chRow('var(--mu)','Low',e$(pt.low))+(pt.mean?chRow('var(--am)','Mean',e$(pt.mean)):'')+(pt.median?chRow('var(--mu)','Median',e$(pt.median)):'')+chRow('var(--mu)','High',e$(pt.high))+chRow('var(--tx)','Price now',e$(px)))+'"><div class="eptr" style="left:'+X(pt.low)+';right:'+(100-parseFloat(X(pt.high)))+'%"></div><i class="epx" style="left:'+X(px)+'"></i>'+(pt.mean?'<i class="epm" style="left:'+X(pt.mean)+'"></i>':'')+'</div>'
+'<div class="eptl"><span>Low '+e$(pt.low)+'</span><span>High '+e$(pt.high)+'</span></div>'+'<div class="mu ecap" style="margin:0 0 6px">Grey bar: analysts’ range. Dark tick: price. Amber tick: mean target.</div>'+KV('Mean target',e$(pt.mean)+(up!=null?' <span class="'+(up>0?'up':'dn')+'">('+eP(up)+')</span>':''))+KV('Median target',e$(pt.median))+KV('Price',e$(px))}
// detail tables
const det=(rows,fmt,ya)=>T(['Period','Average','Low','High','Analysts',ya,'Growth'],EPK.filter(p=>rows[p]).map(p=>{const r=rows[p];return[EPL[p],'<b>'+fmt(r[0])+'</b>',fmt(r[1]),fmt(r[2]),eN(r[3]),fmt(r[4]),'<span class="'+(r[5]>0?'up':r[5]<0?'dn':'mu')+'">'+eP(r[5])+'</span>']})).replace('<table','<table class="et"');
// upgrades and downgrades
const AC={up:'Upgrade',down:'Downgrade',main:'Maintains',init:'Initiates',reit:'Reiterates'};
const ud=(e.ud||[]).slice(0,12),udt=ud.length?T(['Date','Firm','Action','Rating','Target'],ud.map(r=>[r[0],r[1],'<span class="'+(r[4]=='up'?'up':r[4]=='down'?'dn':'')+'">'+(AC[r[4]]||r[4]||'–')+'</span>',(r[3]&&r[3]!=r[2]?r[3]+' → ':'')+(r[2]||'–'),r[5]?(r[6]&&r[6]!=r[5]?e$(r[6])+' → ':'')+e$(r[5]):'–'])).replace('<table','<table class="et eud"'):'<p class="mu">None recently.</p>';
Q.push(estChart);
return P('EPS estimate trend, '+cur,tt+'<div class="mu ecap">How the average analyst EPS estimate has moved. Rising estimates usually support the stock; falling ones often come before it underperforms.</div>','c8')
+P('Analyst ratings',rat+ptx,'c4')
+P('Fiscal-year EPS estimates over time','<div class="eleg"><span><i style="background:var(--am)"></i>Current fiscal year</span><span><i style="background:var(--up)"></i>Next fiscal year</span></div><div id="ech" class="rsvg"></div><div class="mu ecap">Points 90, 60, 30 and 7 days ago come from Yahoo Finance. The site also saves the consensus every night, so this line lengthens over time.</div>','c8')
+P('Analysts revising EPS estimates',rvt,'c4')
+P('Consensus EPS',det(ee,e$,'Year ago'),'c6')+P('Consensus revenue',det(re,v=>v==null?'–':fbig(v),'Year ago'),'c6')
+P('Recent upgrades and downgrades',udt,'c6')+estMarket('c6')}
function estMarket(c='c12'){const r=ESTM.r||{},a=Object.entries(r).filter(([t,v])=>v[0]!=null&&CO[t]&&isFinite(v[0]));if(!a.length)return'';
a.sort((x,y)=>y[1][0]-x[1][0]);const row=([t,v])=>['<button class="in" data-a="run" data-v="'+t+' EST" style="width:auto">'+t+'</button>',CO[t][0],'<span class="'+(v[0]>0?'up':'dn')+'">'+(v[0]>0?'+':'')+f(v[0],1)+'%</span>','<span class="up">'+eN(v[1])+'</span> / <span class="dn">'+eN(v[2])+'</span>'];
const hd=['','Company','30-day change','Up / down'];
return P('Biggest estimate changes in the S&P 500, last 30 days','<h4 class="eh4">Raised the most</h4>'+T(hd,a.slice(0,6).map(row)).replace('<table','<table class="et emk"')+'<h4 class="eh4">Cut the most</h4>'+T(hd,a.slice(-6).reverse().map(row)).replace('<table','<table class="et emk"')+'<div class="mu ecap">Change in the current fiscal-year EPS estimate. Click a ticker to open its estimates.</div>',c)}
function estChart(){const el=$('#ech'),e=ESTC[cur];if(!el||!e||!e.tr)return;const asof=(ESTM.asof||'').slice(0,10)||new Date().toISOString().slice(0,10),base=Date.parse(asof),day=864e5;
const ser=p=>{const m=new Map(),r=e.tr[p];if(r)[0,7,30,60,90].forEach((d,i)=>{if(r[i]!=null)m.set(new Date(base-d*day).toISOString().slice(0,10),r[i])});((e.h||{})[p]||[]).forEach(([d,v])=>{if(v!=null)m.set(d,v)});return[...m].sort((a,b)=>a[0]<b[0]?-1:1)};
const S2=[[ser('0y'),'var(--am)','This fiscal year'],[ser('+1y'),'var(--up)','Next fiscal year']].filter(s=>s[0].length>1);if(!S2.length){el.innerHTML='<p class="mu">Not enough history yet.</p>';return}
const all=S2.flatMap(s=>s[0]),ts=all.map(p=>Date.parse(p[0])),vs=all.map(p=>p[1]),t0=Math.min(...ts),t1=Math.max(...ts);let lo=Math.min(...vs),hi=Math.max(...vs);const pad=(hi-lo)*.15||Math.abs(hi)*.05||.1;lo-=pad;hi+=pad;
const w=Math.max(260,el.clientWidth),h=220,l=54,r=14,t=10,b=24,X=d=>l+(Date.parse(d)-t0)/((t1-t0)||1)*(w-l-r),Y=v=>t+(hi-v)/(hi-lo)*(h-t-b);
let s='<svg width="'+w+'" height="'+h+'" role="img" aria-label="EPS estimates over time">';
rTicks(lo,hi).forEach(v=>{s+='<line x1="'+l+'" x2="'+(w-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" style="stroke:var(--ln)"/>'+rTx(l-6,Y(v)+4,e$(v),'end')});
const nl=Math.max(2,Math.min(5,Math.floor((w-l)/120)));for(let j=0;j<nl;j++){const d=new Date(t0+(t1-t0)*j/(nl-1)).toISOString().slice(0,10);s+=rTx(X(d),h-6,rMon(d).slice(0,3)+' '+(+d.slice(8)),j==0?'start':j==nl-1?'end':'middle')}
S2.forEach(([p,c])=>{s+='<path d="'+p.map((q,i)=>(i?'L':'M')+X(q[0]).toFixed(1)+' '+Y(q[1]).toFixed(1)).join('')+'" fill="none" style="stroke:'+c+'" stroke-width="2"/>'+p.map(q=>'<circle cx="'+X(q[0])+'" cy="'+Y(q[1])+'" r="3" style="fill:'+c+'"/>').join('')});
el.innerHTML=s+'</svg>';const ds=[...new Set(all.map(p=>p[0]))].sort(),at=(p,d)=>{let v=null;for(const q of p){if(q[0]<=d)v=q;else break}return v};
chHover(el,ds.map(X),i=>'<b>'+chDay(ds[i])+'</b>'+S2.map(([p,c,n])=>{const q=at(p,ds[i]);return q?chRow(c,n+' EPS',e$(q[1])):''}).join(''),i=>S2.map(([p,c])=>{const q=at(p,ds[i]);return q?[X(q[0]),Y(q[1]),c]:null}).filter(Boolean),t,h-b)}
// Company tab: add an Estimates view after DCF
const _coE=company,EVL0=DVL1,EVL1=['Overview','Financials','DCF','Estimates','Filings','Ownership','Insiders','News','Events'];
company=function(){if(!CO[cur])return _coE();if(CV!='Estimates')return _coE().replace(SG('cv',EVL0,CV),SG('cv',EVL1,CV));
const bar='<section class="p c12" style="padding:6px 12px">'+SG('cv',EVL1,CV)+'</section>';
if(ESTS.has(cur)&&!ESTC[cur]){estLoad(cur).then(()=>{if(tab==CT)render0()});return bar+P('Analyst estimates','<p class="mu m">Loading '+cur+'…</p>','c12')}
return bar+estView()};
render();
