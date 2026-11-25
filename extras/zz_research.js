// Two research views on the Company tab, modelled on a brokerage stock page:
// "Dividends & Earnings": dividend strength, sustainability and growth vs the market, payment details, EPS estimate
// vs actual by quarter with beats and misses, and earnings metrics vs industry. "Ratings": a 0-10 analyst score,
// a one-year history of rating changes, and each firm's latest opinion.
const RSL=['Very bearish','Bearish','Neutral','Bullish','Very bullish'],RSC=['var(--dn)','var(--dn)','var(--mu)','var(--up)','var(--up)'],RSO=[1,.55,.7,.55,1];
FN.ANR=['Analyst ratings: score, history and firm opinions',1,()=>{tab=CT;CV='Ratings'}];
FN.DVD=['Dividends',0,t=>{if(t&&CO[t]){tab=CT;CV='Dividends & Earnings'}else{tab=NE;NV='Dividends'}}];
FN.DVH=['Dividends and earnings',1,()=>{tab=CT;CV='Dividends & Earnings'}];FN.ERN=FN.DVH;
if(typeof GUIDE!='undefined'){const g=GUIDE.find(x=>x[0]=='Company research');if(g){g[1].forEach(r=>{if(r[0]=='ANR')r[2]='Analyst ratings: a 0–10 score from this month’s ratings, a one-year history of every upgrade and downgrade, and each firm’s latest opinion and price target.';if(r[0]=='DVD')r[2]='Dividends and earnings: yield vs the market median, payout ratio, dividend growth vs the market, payment dates, EPS estimate vs actual by quarter with beats and misses, earnings metrics vs industry, plus dividend history and S&P 900 leaders. DVD on its own opens the ex-dividend calendar.'});const i=g[1].findIndex(r=>r[0]=='DVD');g[1].splice(i+1,0,['ERN','NVDA ERN','Same as NVDA DVD: the Dividends & Earnings view.'])}}
// ---------- helpers ----------
const rsMed=a=>{a=a.filter(x=>x!=null&&isFinite(x)).sort((x,y)=>x-y);return a.length?a[a.length>>1]:null};
const rsPeers=t=>{const d=fd_(t),ind=Object.keys(CO).filter(k=>d.ind&&fd_(k).ind===d.ind);return ind.length>=5?ind:Object.keys(CO).filter(k=>d.sec&&fd_(k).sec===d.sec)};
const rsDay=d=>{const x=new Date(d+'T12:00:00Z');return x.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'})};
const rsQ=d=>{const x=new Date(d+'T12:00:00Z');return x.toLocaleDateString('en-US',{month:'short',year:'2-digit',timeZone:'UTC'}).replace(' ',' ’')};
function rsStd(g){g=(g||'').toLowerCase().trim();if(!g)return null;
if(/strong sell/.test(g))return 0;if(/strong buy|top pick|conviction/.test(g))return 4;
if(/under ?perform|under ?weight|reduce|negative|moderate sell|market under|sector under/.test(g))return 1;
if(/\bsell\b/.test(g))return 0;
if(/buy|out ?perform|over ?weight|accumulate|positive|\badd\b|long-term buy/.test(g))return 3;
if(/hold|neutral|equal|perform|in-line|inline|peer|sector weight|market weight|mixed|fair value/.test(g))return 2;return null}
const rsBand=s=>s==null?'–':RSL[Math.min(4,Math.floor(s/2))];
const rsDot=l=>'<i class="rsd" style="background:'+RSC[l]+';opacity:'+RSO[l]+'"></i>';
function rsNeed(){const need=[];if(ESTS.has(cur)&&!ESTC[cur])need.push(estLoad(cur));if(CRS.has(cur)&&!CRC[cur])need.push(crLoad(cur));if(CV=='Dividends & Earnings'&&!(CD[cur]&&CD[cur].ok))need.push(coLoad(cur));if(CV=='Dividends & Earnings'&&RAW[cur]&&!RAW[cur]._ok&&typeof load=='function')need.push(load(cur).catch(()=>{}));return need}
// ---------- Ratings ----------
function rsRatings(){const e=ESTC[cur]||{},rec=(e.rec||[])[0],ud=(e.ud||[]).filter(r=>r[0]);
let head='<p class="mu">No ratings for '+cur+'.</p>',sc=null,n=0;
if(rec){const c=rec.slice(1);n=c.reduce((a,b)=>a+b,0);sc=n?(c[0]*10+c[1]*7.5+c[2]*5+c[3]*2.5)/n:null}
const latest=new Map();ud.slice().sort((a,b)=>a[0]<b[0]?1:-1).forEach(r=>{if(!latest.has(r[1])&&rsStd(r[2])!=null)latest.set(r[1],r)});
const fl=[...latest.values()],fs=fl.length?fl.reduce((a,r)=>a+rsStd(r[2])*2.5,0)/fl.length:null;
if(sc!=null){const lv=Math.min(4,Math.floor(sc/2));head='<div class="rsh"><div class="rsb" style="--c:'+RSC[lv]+'"><b>'+rsBand(sc)+'</b><span>'+f(sc,1)+'</span><small>out of 10</small></div><div><p>Combines this month’s ratings from <b>'+n+' analysts</b> into one score: strong buy counts 10, buy 7.5, hold 5, sell 2.5, strong sell 0.</p>'+(fs!=null?'<p class="mu">The latest view of the '+fl.length+' firms that published a rating change in the past year averages <b>'+f(fs,1)+'</b> out of 10 ('+rsBand(fs).toLowerCase()+').</p>':'')+'</div></div>'}
// one-year history
const hist=ud.length?'<h4 class="eh4">One-year history of rating changes</h4><div id="rsh" class="rsvg"></div><div class="mu ecap">Each mark is one firm’s rating action, placed by its standardized opinion. The line is the average of every firm’s latest view at that date (right-hand scale, 0 to 10). Hover a mark for details.</div>':'<p class="mu">No rating changes in the past year.</p>';
// four months
let four='';if((e.rec||[]).length){const nm=['Strong buy','Buy','Hold','Sell','Strong sell'],cl=['esb','eb','eh','es','ess'],stack=r=>{const m=r.reduce((a,b)=>a+b,0)||1;return'<div class="estk">'+r.map((v,i)=>v?'<i class="'+cl[i]+'" style="width:'+(v/m*100).toFixed(1)+'%"></i>':'').join('')+'</div>'};
four='<h4 class="eh4">Ratings by month</h4><div class="eleg">'+nm.map((x,i)=>'<span><i class="'+cl[i]+'"></i>'+x+'</span>').join('')+'</div><div class="erec">'+e.rec.map(r=>'<div data-tip="'+esc(chRecTip((r[0]=='0m'?'This month':r[0].replace('-','').replace('m',' mo ago')),r.slice(1)))+'"><span class="mu">'+(r[0]=='0m'?'This month':r[0].replace('-','').replace('m',' mo ago'))+'</span>'+stack(r.slice(1))+'</div>').join('')+'</div>'}
// firm table
const AC={up:'Upgrade',down:'Downgrade',main:'Maintains',init:'Initiates',reit:'Reiterates'};
const ft=fl.length?T(['Firm','Standardized opinion','Firm’s rating','Price target','Date'],fl.slice(0,15).map(r=>{const l=rsStd(r[2]);return[r[1],rsDot(l)+RSL[l],r[2]+(r[4]&&AC[r[4]]?' <span class="mu">('+AC[r[4]].toLowerCase()+')</span>':''),r[5]?(r[6]&&r[6]!=r[5]?'<span class="mu">'+e$(r[6])+' →</span> ':'')+e$(r[5]):'–',rsDay(r[0])]})).replace('<table','<table class="et rst"'):'<p class="mu">No firm opinions in the past year.</p>';
const pt=e.pt||{},px=CO[cur][1];let ptx='';if(pt.low&&pt.high&&pt.high>pt.low){const lo=Math.min(pt.low,px),hi=Math.max(pt.high,px),X=v=>((v-lo)/(hi-lo)*100).toFixed(1)+'%',up=pt.mean&&px?pt.mean/px-1:null;
ptx='<h4 class="eh4">Price targets</h4><div class="ept" data-tip="'+esc('<b>Analyst price targets</b>'+chRow('var(--mu)','Low',e$(pt.low))+(pt.mean?chRow('var(--am)','Mean',e$(pt.mean)):'')+chRow('var(--mu)','High',e$(pt.high))+chRow('var(--tx)','Price now',e$(px)))+'"><div class="eptr" style="left:'+X(pt.low)+';right:'+(100-parseFloat(X(pt.high)))+'%"></div><i class="epx" style="left:'+X(px)+'"></i>'+(pt.mean?'<i class="epm" style="left:'+X(pt.mean)+'"></i>':'')+'</div><div class="eptl"><span>Low '+e$(pt.low)+'</span><span>High '+e$(pt.high)+'</span></div>'+KV('Mean target',e$(pt.mean)+(up!=null?' <span class="'+(up>0?'up':'dn')+'">('+eP(up)+')</span>':''))+KV('Price',e$(px))}
Q.push(()=>rsHistDraw(ud));
return P('Analyst ratings, '+cur,head+hist,'c6')+P('Latest opinion from each firm',ft+'<div class="mu ecap">Standardized opinion puts each firm’s own wording (Overweight, Outperform, Hold…) on one five-step scale. Ratings from Yahoo Finance; this is not an accuracy-weighted score.</div>'+four+ptx,'c6')}
function rsHistDraw(ud){const el=$('#rsh');if(!el)return;const ev=ud.map(r=>[r[0],rsStd(r[2]),r]).filter(x=>x[1]!=null).sort((a,b)=>a[0]<b[0]?-1:1);if(!ev.length){el.innerHTML='<p class="mu">No rating changes with a recognizable opinion.</p>';return}
const w=Math.max(280,el.clientWidth),h=230,l=100,r=34,t=10,b=24,t1=Date.parse(ev.at(-1)[0]),t0=Math.min(Date.parse(ev[0][0]),t1-330*864e5),X=d=>l+(Date.parse(d)-t0)/((t1-t0)||1)*(w-l-r),rowH=(h-t-b)/5,Yl=lv=>t+(4-lv)*rowH+rowH/2;
let s='<svg width="'+w+'" height="'+h+'" role="img" aria-label="One-year history of analyst rating changes">';
for(let lv=4;lv>=0;lv--){const y=Yl(lv);s+='<line x1="'+l+'" x2="'+(w-r)+'" y1="'+(y+rowH/2)+'" y2="'+(y+rowH/2)+'" style="stroke:var(--ln)"/>'+rTx(l-8,y+4,RSL[lv],'end')}
[0,5,10].forEach(v=>{const y=t+(10-v)/10*(h-t-b);s+=rTx(w-r+6,y+4,v,'start')});
for(let j=0;j<5;j++){const d=new Date(t0+(t1-t0)*j/4).toISOString().slice(0,10);s+=rTx(X(d),h-6,rsQ(d),j==0?'start':j==4?'end':'middle')}
const firm=new Map(),line=[];ev.forEach(([d,lv,r])=>{firm.set(r[1],lv);const m=[...firm.values()].reduce((a,b)=>a+b,0)/firm.size*2.5;line.push([d,m])});
s+='<path d="'+line.map((q,i)=>(i?'L':'M')+X(q[0]).toFixed(1)+' '+(t+(10-q[1])/10*(h-t-b)).toFixed(1)).join('')+'" fill="none" style="stroke:var(--am)" stroke-width="1.75"/>';
ev.forEach(([d,lv,r])=>{const x=X(d),y=Yl(lv);s+='<rect x="'+(x-3).toFixed(1)+'" y="'+(y-rowH*.32).toFixed(1)+'" width="6" height="'+(rowH*.64).toFixed(1)+'" rx="1.5" style="fill:'+RSC[lv]+';opacity:'+RSO[lv]+'"/>'});
el.innerHTML=s+'</svg>';const days=[...new Set(ev.map(x=>x[0]))],sc=new Map(line),Ys=v=>t+(10-v)/10*(h-t-b);
chHover(el,days.map(X),i=>{const d=days[i],L=ev.filter(x=>x[0]==d);return'<b>'+rsDay(d)+'</b>'+chRow('var(--am)','Rating score',f(sc.get(d),1)+' / 10')+L.slice(0,6).map(([_,lv,r])=>chRow(RSC[lv],esc(r[1]),(r[3]&&r[3]!=r[2]?esc(r[3])+' → ':'')+esc(r[2])+(r[5]?' · '+e$(r[5]):''))).join('')+(L.length>6?'<div class="mu">+'+(L.length-6)+' more</div>':'')},
i=>{const d=days[i];return[[X(d),Ys(sc.get(d)),'var(--am)'],...ev.filter(x=>x[0]==d).map(([_,lv])=>[X(d),Yl(lv),RSC[lv]])]},t,h-b)}
// ---------- Dividends & Earnings ----------
function rsFreq(dp){if(!dp||dp.length<3)return null;const t=dp.map(p=>Date.parse(p[0])),g=t.slice(1).map((x,i)=>(x-t[i])/864e5),m=rsMed(g);return m<=45?'Monthly':m<=120?'Quarterly':m<=240?'Semiannual':'Annual'}
function rsDonut(v,lab){const p=v==null||!isFinite(v)?null:Math.max(0,v),fr=p==null?0:Math.min(1,p),C=2*Math.PI*30;return'<div class="rsdn" data-tip="'+esc('<b>'+lab+'</b>'+chRow(p>1?'var(--dn)':'var(--am)','Payout ratio',p==null?'–':f(p*100,1)+'%')+(p>1?'<div class="mu">Paying out more than it earns</div>':''))+'"><svg width="84" height="84" viewBox="0 0 84 84" role="img" aria-label="'+lab+'"><circle cx="42" cy="42" r="30" fill="none" style="stroke:var(--ln)" stroke-width="10"/><circle cx="42" cy="42" r="30" fill="none" style="stroke:'+(p>1?'var(--dn)':'var(--am)')+'" stroke-width="10" stroke-dasharray="'+(fr*C).toFixed(1)+' '+C.toFixed(1)+'" transform="rotate(-90 42 42)"/><text x="42" y="47" text-anchor="middle" style="fill:var(--tx);font:600 14px IBM Plex Mono,monospace">'+(p==null?'–':f(p*100,0)+'%')+'</text></svg><span class="mu">'+lab+'</span></div>'}
function rsEPS(eh){return eh.filter(x=>x[2]!=null)}
function rsDivEarn(){const e=CRC[cur]||{},es=ESTC[cur]||{},d=fd_(cur),px=CO[cur][1],cal=(typeof EV!='undefined'&&EV.cal&&EV.cal[cur])||{},dp=e.dp||[],dv=e.dv||[],s=CRSM[cur]||{},Y=(e.y||[]).length?crYears(e):[],L=Y.at(-1)||{};
const pays=!!(dv.length||e.ttm);let divP;
if(!pays){divP=P('Dividends, '+cur,'<p>'+cur+' doesn’t pay a dividend.'+(L.buy?' It returned '+fbig(L.buy)+' through buybacks in FY'+L.yr+(L.fcf>0?', '+cPc(L.buy/L.fcf)+' of free cash flow':'')+'.':'')+'</p>','c6')}
else{const yl=e.ttm&&px?e.ttm/px*100:null,my=CRM.my,mx=Math.max(yl||0,my||0)||1;
const strength='<div class="rsc"><h4>Strength</h4><div class="mu rss">Dividend yield</div><div class="rsy"><i style="width:'+((yl||0)/mx*100).toFixed(1)+'%;background:var(--am)"></i><b>'+(yl==null?'–':f(yl,2)+'%')+'</b><span>'+cur+'</span></div>'+(my?'<div class="rsy"><i style="width:'+(my/mx*100).toFixed(1)+'%;background:var(--mu);opacity:.45"></i><b>'+f(my,2)+'%</b><span>S&amp;P 900 median, payers</span></div>':'')+'</div>';
// payout: trailing 12 months vs the 12 months before, falling back to fiscal years
const today=Date.now(),yr=365*864e5,sumP=(a,b)=>dp.filter(p=>{const t=Date.parse(p[0]);return t>today-a&&t<=today-b}).reduce((x,p)=>x+p[1],0),q=rsEPS(es.eh||[]);
const cur12=d.eps>0&&e.ttm?e.ttm/d.eps:null,eps8=q.length>=8?q.slice(-8,-4).reduce((a,x)=>a+x[2],0):null,prev12=eps8>0&&dp.length>=6?sumP(2*yr,yr)/eps8:null;
const fyP=Y.map(x=>cD(x.div,x.ni>0?x.ni:null)),usesFY=cur12==null||prev12==null;
const pCur=cur12??fyP.at(-1),pPrev=usesFY?fyP.at(-2):prev12;
const sustain='<div class="rsc"><h4>Sustainability</h4><div class="mu rss">Dividend payout ratio</div><div class="rsdns">'+rsDonut(pPrev,usesFY?'Prior fiscal year':'Previous 12 months')+rsDonut(pCur,usesFY&&cur12==null?'Latest fiscal year':'Last 12 months')+'</div></div>';
const growth='<div class="rsc"><h4>Growth</h4><div class="mu rss">Annual dividend, change vs prior year</div><div class="eleg"><span><i style="background:var(--am)"></i>'+cur+'</span><span><i style="background:var(--mu)"></i>S&amp;P 900 median</span></div><div id="rsg" class="rsvg"></div></div>';
const last=dp.at(-1)||[],med4=rsMed(dp.slice(-5,-1).map(p=>p[1])),type=last[1]&&med4&&last[1]>med4*1.5?'Special (larger than usual)':'Regular';
const nx=cal.x&&cal.x>=new Date().toISOString().slice(0,10);
const rows=KV('Dividend amount',last[1]?'$'+f(last[1],4).replace(/0{1,2}$/,''):'–')+KV(nx?'Next ex-dividend date':'Last ex-dividend date',nx?rsDay(cal.x):last[0]?rsDay(last[0]):'–')+KV('Pay date',cal.p?rsDay(cal.p):'–')+KV('Annual dividend, last 12 months','$'+f(e.ttm||0,2))+KV('Years of consecutive increases',s.st!=null?s.st:'–')+KV('Dividend type',type);
divP=P('Dividends, '+cur,'<p class="rsf">Company payment frequency: <b>'+(rsFreq(dp)||'–')+'</b></p><div class="rsgrid">'+strength+sustain+growth+'</div>'+rows+(usesFY?'<div class="mu ecap">Payout ratio uses fiscal-year dividends ÷ net income where quarterly EPS history isn’t available.</div>':''),'c6')}
// earnings
const eh=es.eh||[],pastQ=rsEPS(eh).slice(-4),nextQ=eh.filter(x=>x[2]==null).slice(0,1),bars=[...pastQ,...nextQ];
const peers=rsPeers(cur).filter(t=>t!=cur),im=k=>rsMed(peers.map(t=>fd_(t)[k])),ttmE=rsEPS(eh).length>=8?[rsEPS(eh).slice(-4).reduce((a,x)=>a+x[2],0),rsEPS(eh).slice(-8,-4).reduce((a,x)=>a+x[2],0)]:null;
const pe5=rsPE5(),mrow=(n,a,b)=>[n,a,b];
const met=T(['',cur,'Industry median'],[mrow('EPS (TTM)',d.eps!=null?e$(d.eps):'–',e$(im('eps'))),mrow('P/E (TTM)',d.pe?f(d.pe,1):'–',im('pe')?f(im('pe'),1):'–'),mrow('Forward P/E',d.fpe?f(d.fpe,1):'–',im('fpe')?f(im('fpe'),1):'–'),mrow('P/E, 5-year average',pe5?f(pe5,1):'–','–'),
mrow('EPS growth, TTM vs prior TTM',ttmE&&ttmE[1]>0?eP(ttmE[0]/ttmE[1]-1):'–','–'),mrow('Earnings growth, latest quarter y/y',d.eg!=null?eP(d.eg):'–',im('eg')!=null?eP(im('eg')):'–'),mrow('Revenue growth, latest quarter y/y',d.rg!=null?eP(d.rg):'–',im('rg')!=null?eP(im('rg')):'–')]).replace('<table','<table class="et"');
const earnP=P('Earnings, '+cur,(bars.length?'<h4 class="eh4" style="margin-top:0">Earnings per share: consensus estimate vs reported</h4><div class="eleg"><span><i style="background:var(--mu);opacity:.45"></i>Consensus estimate</span><span><i style="background:var(--am)"></i>Reported</span></div><div id="rse" class="rsvg"></div>':'<p class="mu">No quarterly earnings history for '+cur+'.</p>')
+'<h4 class="eh4">Earnings metrics vs industry'+(fd_(cur).ind?': '+fd_(cur).ind:'')+'</h4>'+met+'<div class="mu ecap">Industry median across '+peers.length+' S&amp;P 900 peers. P/E 5-year average uses fiscal-year diluted EPS and the share price at each year end.</div>','c6');
// below: history, cash returned, payments, leaders (from the Credit and Dividends add-on)
let more='';if(pays){const cash=Y.length?T(['',...Y.map(x=>'FY'+x.yr)],[['Net income',...Y.map(x=>fbig(x.ni))],['Free cash flow',...Y.map(x=>fbig(x.fcf))],['Dividends paid',...Y.map(x=>fbig(x.div))],['Buybacks',...Y.map(x=>fbig(x.buy))],['Payout ratio',...Y.map(x=>cPc(cD(x.div,x.ni>0?x.ni:null)))],['Dividends + buybacks / FCF',...Y.map(x=>cPc(cD((x.div||0)+(x.buy||0),x.fcf>0?x.fcf:null)))]]).replace('<table','<table class="ct"'):'<p class="mu">No cash flow data.</p>';
const pt=dp.slice().reverse().map((p,i,a)=>{const pr=a[i+1],c=pr&&pr[1]?p[1]/pr[1]-1:null;return[rsDay(p[0]),'$'+f(p[1],4).replace(/0{1,2}$/,''),c==null||Math.abs(c)<.0005?'<span class="mu">–</span>':'<span class="'+(c>0?'up':'dn')+'">'+(c>0?'+':'')+f(c*100,1)+'%</span>']});
more=P('Dividends per share by calendar year','<div id="dvb" class="rsvg"></div>','c8')+P('Recent payments',pt.length?T(['Ex-date','Amount','Change'],pt.slice(0,8)).replace('<table','<table class="ct"'):'<p class="mu">None.</p>','c4')+P('Cash returned to shareholders (USD)','<div class="dscroll">'+cash+'</div>','c12');
Q.push(()=>dvDraw(dv))}
Q.push(()=>{rsEpsDraw(bars);if(pays)rsGrowDraw(dv)});
return divP+earnP+more+dvLists()}
function rsPE5(){const fa=CD[cur]&&CD[cur].sec&&CD[cur].sec.fa,R=RAW[cur];if(!fa||!R||!R.c||!R.c.length||typeof RD=='undefined')return null;const eps=fa.rows['Diluted EPS']||[],dts=RD.slice(-R.c.length),out=[];
fa.ends.forEach((d,i)=>{const e=eps[i];if(!(e>0))return;const k=d.slice(2,4)+d.slice(5,7)+d.slice(8,10);let j=-1;for(let z=dts.length-1;z>=0;z--)if(dts[z]<=k){j=z;break}if(j>=0)out.push(R.c[j]/e)});return out.length?out.slice(-5).reduce((a,b)=>a+b,0)/Math.min(5,out.length):null}
function rsEpsDraw(bars){const el=$('#rse');if(!el||!bars.length)return;const w=Math.max(260,el.clientWidth),h=250,l=48,r=8,t=22,b=58,vs=bars.flatMap(x=>[x[1],x[2]]).filter(v=>v!=null),hi=Math.max(0,...vs)*1.15||1,lo=Math.min(0,...vs)*1.15,gw=(w-l-r)/bars.length,bw=Math.min(34,gw*.32),Y=v=>t+(hi-v)/(hi-lo)*(h-t-b);
let s='<svg width="'+w+'" height="'+h+'" role="img" aria-label="EPS estimate vs reported by quarter">';rTicks(lo,hi).forEach(v=>{s+='<line x1="'+l+'" x2="'+(w-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" style="stroke:var(--ln)"/>'+rTx(l-6,Y(v)+4,e$(v),'end')});
bars.forEach(([d,est,act],i)=>{const cx=l+gw*i+gw/2,bar=(v,x,c,o)=>v==null?'':'<rect x="'+x.toFixed(1)+'" y="'+Math.min(Y(v),Y(0)).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(1,Math.abs(Y(v)-Y(0))).toFixed(1)+'" rx="2" style="fill:'+c+';opacity:'+o+'"/>'+rTx(x+bw/2,Math.min(Y(v),Y(0))-5,f(v,2),'middle','var(--tx)');
s+=bar(est,cx-bw-2,'var(--mu)',.45)+bar(act,cx+2,'var(--am)',1)+rTx(cx,h-b+16,rsQ(d),'middle','var(--tx)');
if(act!=null&&est!=null){const df=act-est,beat=df>=0;s+='<rect x="'+(cx-24)+'" y="'+(h-b+24)+'" width="48" height="17" rx="3" style="fill:'+(beat?'var(--up)':'var(--dn)')+'"/>'+rTx(cx,h-b+36,beat?'Beat':'Miss','middle','#fff')+rTx(cx,h-b+53,'by $'+f(Math.abs(df),2),'middle')}
else if(act==null)s+=rTx(cx,h-b+36,'Next report','middle')});el.innerHTML=s+'</svg>';
chHover(el,bars.map((_,i)=>l+gw*i+gw/2),i=>{const[d,est,act]=bars[i];return'<b>'+(act==null?'Next report, ':'Reported ')+rsDay(d)+'</b>'+chRow('var(--mu)','EPS estimate',est==null?'–':e$(est))+chRow('var(--am)','EPS actual',act==null?'–':e$(act))+(act!=null&&est!=null?chRow(act>=est?'var(--up)':'var(--dn)',act>=est?'Beat':'Miss',(act>=est?'+':'−')+e$(Math.abs(act-est))+(est?' ('+(act>=est?'+':'')+f((act-est)/Math.abs(est)*100,1)+'%)':'')):'')},
i=>{const[d,est,act]=bars[i],cx=l+gw*i+gw/2;return[est!=null?[cx-bw/2-2,Y(est),'var(--mu)']:null,act!=null?[cx+bw/2+2,Y(act),'var(--am)']:null].filter(Boolean)},t,h-b)}
function rsGrowDraw(dv){const el=$('#rsg');if(!el)return;const m=new Map(dv),ys=dv.map(x=>x[0]).slice(-5).filter(y=>m.get(y-1)),pts=ys.map(y=>[y,(m.get(y)/m.get(y-1)-1)*100]),mg=CRM.mg||{},mp=ys.filter(y=>mg[y]!=null).map(y=>[y,mg[y]]);
if(pts.length<2){el.innerHTML='<p class="mu">Not enough history.</p>';return}const w=Math.max(180,el.clientWidth),h=130,l=40,r=18,t=8,b=20,vs=[...pts,...mp].map(p=>p[1]);let lo=Math.min(0,...vs),hi=Math.max(0,...vs);const pad=(hi-lo)*.12||1;lo-=pad;hi+=pad;
const X=y=>l+(y-ys[0])/((ys.at(-1)-ys[0])||1)*(w-l-r),Y=v=>t+(hi-v)/(hi-lo)*(h-t-b),pl=(p,c)=>'<path d="'+p.map((q,i)=>(i?'L':'M')+X(q[0]).toFixed(1)+' '+Y(q[1]).toFixed(1)).join('')+'" fill="none" style="stroke:'+c+'" stroke-width="2"/>'+p.map(q=>'<circle cx="'+X(q[0])+'" cy="'+Y(q[1])+'" r="3" style="fill:'+c+'"/>').join('');
let s='<svg width="'+w+'" height="'+h+'" role="img" aria-label="Dividend growth vs market median">';rTicks(lo,hi,3).forEach(v=>{s+='<line x1="'+l+'" x2="'+(w-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" style="stroke:var(--ln)"/>'+rTx(l-5,Y(v)+4,f(v,0)+'%','end')});
ys.forEach(y=>{s+=rTx(X(y),h-5,y,'middle')});s+=(mp.length>1?pl(mp,'var(--mu)'):'')+pl(pts,'var(--am)');el.innerHTML=s+'</svg>';const mm=new Map(mp);
chHover(el,pts.map(p=>X(p[0])),i=>{const[y,v]=pts[i];return'<b>'+y+'</b>'+chRow('var(--am)',cur+' dividend growth',chPct(v))+(mm.has(y)?chRow('var(--mu)','S&amp;P 900 median',chPct(mm.get(y))):'')},i=>{const[y,v]=pts[i];return[[X(y),Y(v),'var(--am)'],mm.has(y)?[X(y),Y(mm.get(y)),'var(--mu)']:null].filter(Boolean)},t,h-b)}
// ---------- Company tab: add Ratings after Estimates, and Dividends becomes Dividends & Earnings ----------
const _coR=company,RVL0=LVL1,RVL1=['Overview','Financials','DCF','Estimates','Ratings','Credit','Dividends & Earnings','Filings','Ownership','Insiders','News','Events'];
company=function(){if(!CO[cur])return _coR();if(CV=='Dividends')CV='Dividends & Earnings';
if(CV!='Ratings'&&CV!='Dividends & Earnings')return _coR().replace(SG('cv',RVL0,CV),SG('cv',RVL1,CV));
const bar='<section class="p c12" style="padding:6px 12px">'+SG('cv',RVL1,CV)+'</section>',need=rsNeed();
if(need.length){Promise.all(need).then(()=>{if(tab==CT)render0()});return bar+P(CV,'<p class="mu m">Loading '+cur+'…</p>','c12')}
return bar+(CV=='Ratings'?rsRatings():rsDivEarn())};
window.addEventListener('resize',()=>{if(tab==CT&&(CV=='Ratings'||CV=='Dividends & Earnings')){clearTimeout(window.RSTO);window.RSTO=setTimeout(()=>Q.forEach(g=>g()),150)}});
render();
