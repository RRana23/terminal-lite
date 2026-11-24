// Phase 5: Options tab (Bloomberg OMON / OSA): real chains, volatility, max pain and a strategy payoff builder.
const OPM=META.OPT||{t:[],asof:''},OPL=OPM.t||[],OPS=new Set(OPL),OCH={};
TABS.push('Options');const OP=TABS.length-1;
let OT=OPS.has('SPY')?'SPY':OPL[0],OX=0,OALL=0,LEGS=[],OLAST='';
S.opt=v=>{if(OPS.has(v))OT=v;OX=0;LEGS=[];tab=OP};S.ox=v=>{OX=+v};S.oall=()=>{OALL^=1};
S.leg=v=>{const[t,k,s]=v.split('|');LEGS.push({t,k:+k,s:+s,q:1})};S.lrm=v=>{LEGS.splice(+v,1)};
const omid=r=>r?(r[1]>0&&r[2]>0?(r[1]+r[2])/2:r[3]):0,o$=v=>v==null||!isFinite(v)?'–':(v<0?'-$':'$')+f(Math.abs(v)),oiv=v=>v?f(v*100,1)+'%':'–',oint=v=>v?f(v,0):'–';
function optLoad(t){return OCH[t]||(OCH[t]=fetch('data/opt/'+t+'.json?v='+META.v).then(r=>r.ok?r.json():null).catch(()=>null).then(j=>{OCH[t]={ok:1,d:j};if(tab==OP)render0()}),{})}
function chainMap(x){const m=new Map();x.c.forEach(r=>m.set(r[0],{k:r[0],c:r}));x.p.forEach(r=>{const o=m.get(r[0])||{k:r[0]};o.p=r;m.set(r[0],o)});return[...m.values()].sort((a,b)=>a.k-b.k)}
const nearK=(rows,v)=>rows.reduce((a,b)=>Math.abs(b.k-v)<Math.abs(a.k-v)?b:a).k;
function atmIV(x,S0){const rows=chainMap(x);if(!rows.length)return null;const k=nearK(rows,S0),r=rows.find(z=>z.k==k),a=[r.c&&r.c[6],r.p&&r.p[6]].filter(v=>v>0);return a.length?a.reduce((s,v)=>s+v)/a.length:null}
function maxPain(rows){let best=null,bv=Infinity;rows.forEach(t=>{let v=0;rows.forEach(r=>{if(r.c)v+=r.c[5]*Math.max(0,t.k-r.k);if(r.p)v+=r.p[5]*Math.max(0,r.k-t.k)});if(v<bv){bv=v;best=t.k}});return best}
function xyPlot(id,series,opt){const q=cv(id);if(!q)return;const[x,w,h]=q,pts=series.flatMap(s=>s.pts),xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]).concat(opt.zero?[0]:[]);if(!pts.length)return;
const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),pw=w-56,ph=h-18,X=v=>(v-x0)/(x1-x0||1)*pw,Y=v=>6+(y1-v)/(y1-y0||1)*(ph-12);
x.strokeStyle=css('--ln');x.fillStyle=css('--mu');[y0,(y0+y1)/2,y1].forEach(v=>{x.beginPath();x.moveTo(0,Y(v));x.lineTo(pw,Y(v));x.stroke();x.fillText(opt.fy(v),pw+4,Y(v)+3)});
[x0,(x0+x1)/2,x1].forEach((v,i)=>x.fillText(opt.fx(v),Math.min(X(v),pw-40)-(i==1?16:0),h-3));
if(opt.zero&&y0<0&&y1>0){x.strokeStyle=css('--tx');x.beginPath();x.moveTo(0,Y(0));x.lineTo(pw,Y(0));x.stroke()}
if(opt.mark!=null){x.setLineDash([3,3]);x.strokeStyle=css('--mu');x.beginPath();x.moveTo(X(opt.mark),0);x.lineTo(X(opt.mark),ph);x.stroke();x.setLineDash([])}
series.forEach(s=>{x.strokeStyle=s.c[0]=='#'?s.c:css(s.c);x.lineWidth=1.8;x.beginPath();s.pts.forEach((p,i)=>i?x.lineTo(X(p[0]),Y(p[1])):x.moveTo(X(p[0]),Y(p[1])));x.stroke()});x.lineWidth=1;
// hover: every x value on the chart, with each series' value at the nearest point (same x within 0.5%)
const ux=[...new Set(xs)].sort((a,b)=>a-b),near=(s,v)=>{let b=null,bd=1e18;for(const p of s.pts){const d=Math.abs(p[0]-v);if(d<bd){bd=d;b=p}}return b&&bd<=Math.abs(x1-x0)*.005+1e-9?b:null};
if(typeof chHover=='function')chHover($('#'+id),ux.map(X),i=>'<b>'+(opt.hx||opt.fx)(ux[i])+'</b>'+series.map((s,k)=>{const p=near(s,ux[i]);return p?chRow(chC(s.c),(opt.names||[])[k]||'Value',(opt.hy||opt.fy)(p[1])):''}).join(''),
i=>series.map(s=>{const p=near(s,ux[i]);return p?[X(p[0]),Y(p[1]),chC(s.c)]:null}).filter(Boolean),0,ph)}
function legPrice(l,rows,S0){if(l.t=='s')return S0;const r=rows.find(z=>z.k==l.k);return r?omid(l.t=='c'?r.c:r.p):null}
function preset(name,rows,S0){const k=v=>nearK(rows,v),K=k(S0),P={'Long call':[['c',K,1]],'Long put':[['p',K,1]],'Covered call':[['s',0,1],['c',k(S0*1.05),-1]],'Bull call spread':[['c',K,1],['c',k(S0*1.05),-1]],'Bear put spread':[['p',K,1],['p',k(S0*.95),-1]],Straddle:[['c',K,1],['p',K,1]],Strangle:[['c',k(S0*1.05),1],['p',k(S0*.95),1]],'Iron condor':[['p',k(S0*.9),1],['p',k(S0*.95),-1],['c',k(S0*1.05),-1],['c',k(S0*1.1),1]]};return(P[name]||[]).map(([t,kk,s])=>({t,k:kk,s,q:1}))}
S.opre=v=>{const o=OCH[OT];if(!o||!o.d)return;const x=o.d.x[OX];LEGS=v=='Clear'?[]:preset(v,chainMap(x),o.d.s)};
function options(){if(!OPL.length)return P('Options','<p class="mu">No options data yet. It arrives with the next build.</p>','c12');
if(ac!=OLAST){OLAST=ac;if(OPS.has(ac)&&OT!=ac){OT=ac;OX=0;LEGS=[]}}
const o=OCH[OT];const sel='<select class="in" style="width:auto;padding:5px" aria-label="Options ticker" onchange="OT=this.value;OX=0;LEGS=[];render0()">'+OPL.map(t=>'<option'+(t==OT?' selected':'')+'>'+t+'</option>').join('')+'</select>';
if(!o||!o.ok){optLoad(OT);return P('Options',sel+' <span class="mu m">Loading '+OT+'…</span>','c12')}
if(!o.d)return P('Options',sel+' <span class="mu">No chain for '+OT+'.</span>','c12');
const d=o.d,S0=d.s,X=d.x,x=X[Math.min(OX,X.length-1)],rows=chainMap(x),K0=nearK(rows,S0);
const nr=chainMap(X[0]),nK=nearK(nr,S0),nrow=nr.find(z=>z.k==nK),strad=omid(nrow.c)+omid(nrow.p),days=Math.max(1,Math.round((Date.parse(x.e)-Date.now())/864e5));
let cv_=0,pv_=0,co=0,po=0;X.forEach(e=>{e.c.forEach(r=>{cv_+=r[4];co+=r[5]});e.p.forEach(r=>{pv_+=r[4];po+=r[5]})});
const ivAt=(t,v)=>{const r=rows.find(z=>z.k==nearK(rows,v));const q=r&&(t=='p'?r.p:r.c);return q&&q[6]?q[6]:null},skew=ivAt('p',S0*.9)&&ivAt('c',S0*1.1)?(ivAt('p',S0*.9)-ivAt('c',S0*1.1))*100:null,mp=maxPain(rows);
const term=X.map(e=>[Math.max(1,Math.round((Date.parse(e.e)-Date.now())/864e5)),atmIV(e,S0)]).filter(p=>p[1]);
const show=OALL?rows:rows.filter(r=>r.k>=S0*.85&&r.k<=S0*1.15),cell=(r,t,i)=>r?(i==1||i==2?'<button data-a="leg" data-v="'+t+'|'+r[0]+'|'+(i==2?1:-1)+'" title="'+(i==2?'Buy':'Sell')+' this '+(t=='c'?'call':'put')+'" style="background:none;border:0;color:inherit;cursor:pointer;padding:0;font:inherit;text-decoration:underline dotted">'+f(r[i])+'</button>':i==6?oiv(r[i]):i>=4?oint(r[i]):f(r[i])):'–',
hl='background:color-mix(in srgb,var(--am) 9%,transparent)';
const chain='<table><tr><th colspan="6" style="text-align:center">Calls</th><th></th><th colspan="6" style="text-align:center">Puts</th></tr><tr>'+['Bid','Ask','Last','Vol','OI','IV','Strike','Bid','Ask','Last','Vol','OI','IV'].map(h=>'<th>'+h+'</th>').join('')+'</tr>'+show.map(r=>'<tr><td'+(r.k<S0?' style="'+hl+'"':'')+'>'+[1,2,3,4,5,6].map(i=>cell(r.c,'c',i)).join('</td><td'+(r.k<S0?' style="'+hl+'"':'')+'>')+'</td><td style="text-align:center;font-weight:'+(r.k==K0?700:400)+'">'+f(r.k)+'</td><td'+(r.k>S0?' style="'+hl+'"':'')+'>'+[1,2,3,4,5,6].map(i=>cell(r.p,'p',i)).join('</td><td'+(r.k>S0?' style="'+hl+'"':'')+'>')+'</td></tr>').join('')+'</table>';
// strategy payoff at expiry
const legs=LEGS.map(l=>({...l,px:legPrice(l,rows,S0)})).filter(l=>l.px!=null),mult=l=>l.t=='s'?100:100,lo=Math.min(S0*.7,...legs.map(l=>l.k||S0)),hi=Math.max(S0*1.3,...legs.map(l=>l.k||S0)),pay=ST=>legs.reduce((s,l)=>s+l.s*l.q*mult(l)*((l.t=='s'?ST:l.t=='c'?Math.max(0,ST-l.k):Math.max(0,l.k-ST))-l.px),0);
const grid=Array.from({length:241},(_,i)=>lo+(hi-lo)*i/240),pl=grid.map(v=>[v,pay(v)]),net=legs.reduce((s,l)=>s-l.s*l.q*mult(l)*l.px,0),ys=pl.map(p=>p[1]),up=legs.length&&pay(hi*2)>pay(hi)+1,dn=legs.length&&pay(hi*2)<pay(hi)-1;
const be=[];for(let i=1;i<pl.length;i++)if((pl[i-1][1]<0)!=(pl[i][1]<0))be.push(pl[i-1][0]+(pl[i][0]-pl[i-1][0])*(-pl[i-1][1])/(pl[i][1]-pl[i-1][1]||1));
Q.push(()=>xyPlot('osmile',[{pts:rows.filter(r=>r.c&&r.c[6]>0&&r.k>=S0*.7&&r.k<=S0*1.3).map(r=>[r.k,r.c[6]*100]),c:'--up'},{pts:rows.filter(r=>r.p&&r.p[6]>0&&r.k>=S0*.7&&r.k<=S0*1.3).map(r=>[r.k,r.p[6]*100]),c:'--dn'}],{fx:v=>f(v,0),fy:v=>f(v,0)+'%',mark:S0,hx:v=>'Strike $'+f(v,v%1?2:0),hy:v=>f(v,1)+'%',names:['Call implied volatility','Put implied volatility']}),
()=>xyPlot('oterm',[{pts:term.map(p=>[p[0],p[1]*100]),c:'--am'}],{fx:v=>f(v,0)+'d',fy:v=>f(v,1)+'%',hx:v=>f(v,0)+' days to expiry',names:['At-the-money implied volatility']}),()=>{if(legs.length)xyPlot('opay',[{pts:pl,c:'--am'}],{fx:v=>f(v,0),fy:v=>o$(v),zero:1,mark:S0,hx:v=>'Stock at $'+f(v,2)+' at expiry',names:['Profit or loss']})});
const pre=['Long call','Long put','Covered call','Bull call spread','Bear put spread','Straddle','Strangle','Iron condor','Clear'];
return P(OT+' options · '+(CO[OT]?CO[OT][0]:(EXT[OT]||{}).n||''),sel+' <span class="big" style="margin-left:12px">'+f(S0)+'</span> <span class="mu m">chains as of '+OPM.asof+'</span>'+SG('ox',X.map((e,i)=>i),OX).replace(/>(\d+)<\/button>/g,(m,i)=>'>'+X[+i].e.slice(5)+'</button>'),'c12')
+P('Summary, '+x.e+' ('+days+' days)',KV('Expected move by '+X[0].e+' (ATM straddle)',o$(strad)+' (±'+f(strad/S0*100,1)+'%)')+KV('ATM implied volatility',oiv(atmIV(x,S0)))+KV('Skew (90% put IV minus 110% call IV)',skew==null?'–':f(skew,1)+' pts')+KV('Max pain',mp?'$'+f(mp):'–')+KV('Put/call volume, all expiries',cv_?f(pv_/cv_,2):'–')+KV('Put/call open interest',co?f(po/co,2):'–'),'c4')
+P('Volatility smile (green calls, red puts)','<canvas id="osmile" class="sm" style="height:190px"></canvas><div class="mu">Dashed line: current price.</div>','c4')
+P('Term structure (ATM IV by days to expiry)','<canvas id="oterm" class="sm" style="height:190px"></canvas>','c4')
+P('Chain, '+x.e,'<div class="mu" style="margin-bottom:6px">Shaded = in the money. Click a bid to sell or an ask to buy that contract in the strategy builder. <button data-a="oall" class="in" style="width:auto;cursor:pointer">'+(OALL?'Show strikes near the money':'Show all strikes')+'</button></div>'+chain,'c8')
+P('Strategy builder (payoff at expiry)',SG('opre',pre,'')+(legs.length?T(['Leg','Strike','Price','Qty',''],legs.map((l,i)=>[(l.s>0?'Buy ':'Sell ')+(l.t=='s'?'100 shares':l.t=='c'?'call':'put'),l.t=='s'?'–':f(l.k),'$'+f(l.px),'<input type="number" min="1" class="in" style="width:52px" value="'+l.q+'" onchange="LEGS['+i+'].q=Math.max(1,+this.value||1);render0()">','<button data-a="lrm" data-v="'+i+'" aria-label="Remove leg" style="background:none;border:0;color:var(--mu);cursor:pointer">x</button>']))
+'<canvas id="opay" class="sm" style="height:200px;margin-top:8px"></canvas>'+KV(net>=0?'Net credit':'Net debit',o$(Math.abs(net)))+KV('Max profit',up?'Unlimited':o$(Math.max(...ys)))+KV('Max loss',dn?'Unlimited':o$(Math.min(...ys)))+KV('Breakeven',be.length?be.map(v=>'$'+f(v)).join(', '):'–'):'<p class="mu">Pick a preset or click prices in the chain.</p>')+'<div class="mu" style="margin-top:6px">Uses mid prices, 100 shares per contract, held to expiry. Ignores fees and early exercise. Not advice.</div>','c4')}
const _r2=render0;
render0=function(){if(tab!=OP)_r2();else{Q=[];$('#hd').textContent=ac+' '+(CO[ac]?CO[ac][0]:EXT[ac].n);$('#v').innerHTML='<div class="mu m" style="margin-bottom:8px">Options chains from Yahoo Finance for '+OPL.length+' heavily traded names, refreshed each weeknight. Prices are end-of-day snapshots, not live quotes.</div><div class="grid">'+options()+'</div>';requestAnimationFrame(()=>Q.forEach(g=>g()))}
$('#nav').innerHTML=[0,CT,OP,NE,1,2,3,4].map(i=>'<button data-a="tab" data-v="'+i+'" class="'+(i==tab?'on':'')+'">'+TABS[i]+'</button>').join('')};
// Markets tab: link the model-priced chain to the real one
const _h0c=home0;home0=function(){const s=_h0c();return OPS.has(cur)?s.replace('Options chain, 30 days (model prices)','Options chain, 30 days (model prices) · <button data-a="opt" data-v="'+cur+'" style="background:none;border:0;color:var(--am);cursor:pointer;padding:0;font:inherit">real '+cur+' chain</button>'):s};
render();
