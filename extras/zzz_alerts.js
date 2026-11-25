// Alerts view (News & Events > Alerts, or ALRT): tonight's watchlist alerts, the same ones the nightly email sends.
// Data: data/alerts.json from extras/zzz_alerts.py. Watchlist and rules: alerts.json in the repo.
let ALD=null,ALP=null;const ALEDIT='https://github.com/RRana23/terminal-lite/edit/main/alerts.json';
function alLoad(){return ALP||(ALP=fetch('data/alerts.json?v='+META.v).then(r=>r.ok?r.json():null).catch(()=>null).then(j=>{ALD=j||{none:1}}))}
const alPc=(v,d=1)=>v==null?'<span class="mu">–</span>':'<span class="'+(v>=0?'up':'dn')+'">'+(v>=0?'+':'')+f(v,d)+'%</span>';
const alPx=v=>f(v,v<10?4:2),alTk=t=>CO[t]||EXT[t]?LK(t):esc(t);
const ALR=[['move_pct','Big move, stocks and funds',v=>v+'% in a day'],['crypto_move_pct','Big move, crypto',v=>v+'% in a day'],['high_low_52w','New 52-week high or low',v=>v?'On':'Off'],['ma_cross','200-day average and golden or death crosses',v=>v?'On':'Off'],
['rsi_high','RSI overbought',v=>'Crosses above '+v],['rsi_low','RSI oversold',v=>'Crosses below '+v],['volume_x','Volume spike',v=>v+'x the 3-month average'],['earnings_days','Earnings coming up',v=>'Within '+v+' days'],['filings','New SEC filings (not Form 4)',v=>v?'On':'Off'],['ratings','Analyst upgrades, downgrades, new coverage',v=>v?'On':'Off'],
['market_move_pct','S&P 500 move',v=>v+'% in a day'],['vix_level','VIX level',v=>'Crosses '+v],['vix_jump_pct','VIX jump',v=>v+'% in a day'],['yield_move_bp','10-year yield move',v=>v+' bp in a day']];
function alView(){if(!ALD){alLoad().then(()=>{if(tab==NE&&NV=='Alerts')render0()});return P('Alerts','<p class="mu m">Loading tonight’s alerts…</p>','c12')}
if(ALD.none||!ALD.asof)return P('Alerts','<p class="mu">Alerts appear after the next nightly build. The watchlist and rules are in <a target="_blank" rel="noopener" href="'+ALEDIT+'">alerts.json</a>.</p>','c12');
const A=ALD,day=chDay(A.asof),it=A.items||[];
const list=it.length?'<div class="alst">'+it.map(i=>{const[m,u]=i.m.split('|');return'<div class="alrow"><span class="altk">'+alTk(i.t)+'</span><span class="altag al-'+i.s+'">'+esc(i.k)+'</span><span class="almsg">'+esc(m)+(u?' · <a target="_blank" rel="noopener" href="'+esc(u)+'">Open</a>':'')+'</span></div>'}).join('')+'</div>'
:'<p class="mu m">Nothing crossed your alert rules on '+day+'.</p>';
const mk=(A.mkt||[]).map(m=>KV(m.n,(m.bp?f(m.p,2)+'%':alPx(m.p))+' &nbsp;'+(m.bp?'<span class="'+(m.ch>=0?'up':'dn')+'">'+(m.ch>=0?'+':'')+f(m.ch,0)+' bp</span>':alPc(m.ch,2)))).join('');
const R=A.rows||[],mx=Math.max(1,...R.map(r=>Math.abs(r.ch||0)));
const bars=R.slice().sort((a,b)=>(b.ch||0)-(a.ch||0)).map(r=>{const v=r.ch||0,c=v>=0?'var(--up)':'var(--dn)';return'<div class="albar" data-tip="'+esc('<b>'+r.t+' · '+day+'</b>'+chRow(c,'Day change',(v>=0?'+':'')+f(v,2)+'%')+chRow('var(--mu)','Close',alPx(r.p)))+'"><span>'+esc(r.t)+'</span><div class="alz"><i style="'+(v>=0?'left:50%':'right:50%')+';width:'+(Math.abs(v)/mx*50).toFixed(1)+'%;background:'+c+'"></i></div><b class="'+(v>=0?'up':'dn')+'">'+(v>=0?'+':'')+f(v,1)+'%</b></div>'}).join('');
const wt=T(['Ticker','Name','Close','Day','1 month','YTD','RSI','vs 200-day','Next earnings'],R.map(r=>[alTk(r.t),esc((r.n||'').slice(0,28)),alPx(r.p),alPc(r.ch,2),alPc(r.m1),alPc(r.ytd),r.rsi==null?'–':'<span'+(r.rsi>=70||r.rsi<=30?' style="color:var(--am)"':'')+'>'+f(r.rsi,0)+'</span>',alPc(r.v200),r.e?chDay(r.e):'–'])).replace('<table','<table class="alwt"');
const rules=ALR.map(([k,lab,fm])=>A.rules&&A.rules[k]!=null?KV(lab,fm(A.rules[k])):'').join('')+Object.entries(A.levels||{}).map(([t,l])=>KV(t+' price levels',[l.above!=null?'above '+l.above:'',l.below!=null?'below '+l.below:''].filter(Boolean).join(', ')||'–')).join('');
return P('Alerts for '+day,'<div class="mu alsub">'+it.length+' alert'+(it.length==1?'':'s')+' on a '+(A.watch||[]).length+'-ticker watchlist, from the closing prices. The same list is emailed each weeknight after the build.</div>'+list,'c8')
+P('Market at the close',mk,'c4')
+P('Watchlist',wt,'c8')
+P('Day change',bars||'<p class="mu">No data.</p>','c4')
+P('Your alert rules',rules+'<div class="xbtn"><a class="albtn" target="_blank" rel="noopener" href="'+ALEDIT+'">Edit watchlist and rules on GitHub</a></div><div class="mu tnote">Edit alerts.json, then Commit; the site and email pick it up on the next build. Price levels: add "NVDA": {"above": 200, "below": 150} under price_levels.</div>','c6')
+P('Email',KV('When','Each weeknight after the 6:17 pm ET build')+KV('Holidays','Skipped when markets are closed')+KV('Turn on','Add three repository secrets: ALERT_EMAIL_TO, SMTP_USER, SMTP_PASS')+'<div class="mu tnote">SMTP_PASS is a Gmail app password, so your real password never goes into GitHub. A manual run of the Nightly data update workflow sends a test email.</div>','c6')}
const _evA=events;events=function(){const L5=['Top news','Earnings','Economy','Dividends','M&A'],bar='<section class="p c12" style="padding:6px 12px">'+SG('nv',[...L5,'Alerts'],NV)+'</section>';
if(NV!='Alerts')return _evA().replace(SG('nv',L5,NV),SG('nv',[...L5,'Alerts'],NV));return bar+alView()};
FN.ALRT=['Alerts: tonight’s watchlist alerts (also emailed each weeknight)',0,()=>{tab=NE;NV='Alerts'}];FN.ALERTS=FN.ALRT;
if(typeof GUIDE!='undefined'){const g=GUIDE.find(x=>x[1].some(r=>r[0]=='TOP'))||GUIDE[GUIDE.length-1];g[1].push(['ALRT','ALRT','Alerts: big moves, 52-week highs and lows, 200-day and golden or death crosses, RSI extremes, volume spikes, your price levels, earnings within a week, new SEC filings and analyst rating changes for your watchlist, plus S&P 500, VIX, 10-year yield and yield-curve signals. Emailed each weeknight.'])}
render();
