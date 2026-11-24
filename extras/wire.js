// Phase 4: News & Events tab (Bloomberg TOP / EVTS / ECO / DVD) plus News and Events views on the Company tab.
const EV=META.EV||{cal:{},top:[],eco:[],ind:{},fomc:[],news:[]},HASN=new Set(EV.news||[]),NWS={};
let NV='Top news',EF='All';TABS.push('News & Events');const NE=TABS.length-1;
S.nv=v=>{NV=v};S.ef=v=>{EF=v};
const today=new Date().toISOString().slice(0,10),addD=(d,n)=>new Date(Date.parse(d)+n*864e5).toISOString().slice(0,10);
const dayName=d=>new Date(d+'T12:00:00Z').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'});
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function newsLoad(t){return NWS[t]||(NWS[t]=HASN.has(t)?fetch('data/news/'+t+'.json?v='+META.v).then(r=>r.ok?r.json():[]).catch(()=>[]):Promise.resolve([])).then(a=>(NWS[t]=Promise.resolve(a),a))}
const newsList=(a,tag)=>a.length?'<table>'+a.map(n=>'<tr><td class="mu m" style="white-space:nowrap;width:1%">'+esc(n.w.slice(5))+'</td>'+(tag?'<td class="m" style="width:1%">'+LK(n.k)+'</td>':'')+'<td style="text-align:left"><a target="_blank" rel="noopener" href="'+esc(n.u)+'">'+esc(n.t)+'</a> <span class="mu">'+esc(n.s)+'</span></td></tr>').join('')+'</table>':'<p class="mu">No headlines.</p>';
// cache of loaded news lists, used to render synchronously after loading
const NWC={};function needNews(ts,then){const m=ts.filter(t=>!NWC[t]);if(!m.length)return true;Promise.all(m.map(t=>newsLoad(t).then(a=>{NWC[t]=a}))).then(then);return false}
function evTop(){const mine=[...new Set(PF.map(h=>h.t).filter(t=>CO[t]))].slice(0,15);
const ready=needNews(mine,()=>{if(tab==NE)render0()}),pfn=ready?mine.flatMap(t=>NWC[t].slice(0,3).map(n=>({...n,k:t}))).sort((a,b)=>b.w<a.w?-1:1).slice(0,25):null;
return P('Market headlines',newsList(EV.top),'c8')+P('Headlines for your portfolio',mine.length?(pfn?newsList(pfn,1):'<p class="mu m">Loading…</p>'):'<p class="mu">Add stocks on the Portfolio tab to see their news here.</p>','c4')}
function evEarn(){const cal=EV.cal,G={All:t=>1,'My portfolio':t=>PF.some(h=>h.t==t),Grouping:t=>SEL.includes(t),'Over $50B':t=>cap(t)>=50},end=addD(today,28);
const L=Object.keys(cal).filter(t=>CO[t]&&cal[t].e&&cal[t].e>=addD(today,-7)&&cal[t].e<=end&&G[EF](t)).sort((a,b)=>cal[a].e<cal[b].e?-1:cal[a].e>cal[b].e?1:cap(b)-cap(a)),by={};L.forEach(t=>(by[cal[t].e]=by[cal[t].e]||[]).push(t));
return P('Earnings calendar, last week and next 4 weeks',SG('ef',Object.keys(G),EF)+(L.length?Object.keys(by).map(d=>'<h3 style="margin:12px 0 4px;color:var(--tx)">'+dayName(d)+(d<today?' <span class="mu">(reported)</span>':'')+'</h3>'+T(['Ticker','Name','Mkt cap','EPS estimate','EPS range','Revenue estimate'],by[d].map(t=>{const c=cal[t];return[LK(t),CO[t][0],f(cap(t),0)+'B',c.eA!=null?'$'+f(c.eA):'–',c.eL!=null?'$'+f(c.eL)+' to $'+f(c.eH):'–',c.rA?fbig(c.rA):'–']}))).join(''):'<p class="mu">No earnings in this window for this filter.</p>')+'<div class="mu" style="margin-top:6px">Dates and estimates from Yahoo Finance. Companies sometimes move dates; check investor relations before trading around them.</div>','c12')}
function evEco(){const up=(EV.eco||[]).slice(0,40),fomc=(EV.fomc||[]).filter(d=>d>=today).slice(0,4),I=EV.ind||{};
return P('Economic calendar, next 60 days',up.length?T(['Date','Release'],up.map(r=>[dayName(r[0]),r[1]])):'<p class="mu">Calendar unavailable this run.</p>','c6')
+P('Fed meetings (rate decision day)',fomc.length?T(['Date','Meeting'],fomc.map(d=>[dayName(d),'FOMC statement and press conference'])):'<p class="mu">None scheduled.</p>','c6')
+P('Key indicators',T(['Indicator','Latest','Prior','Change','As of'],Object.values(I).map(s=>{const v=s.v,l=v.at(-1),p=v.at(-2);return[s.n,f(l,2),p!=null?f(p,2):'–',p!=null?'<span class="'+(l-p>=0?'up':'dn')+'">'+(l-p>=0?'+':'')+f(l-p,2)+'</span>':'–',s.d.at(-1)]}))+'<div class="mu" style="margin-top:6px">Source: FRED (BLS, BEA, Federal Reserve, U. Michigan). Fed dates: federalreserve.gov.</div>','c12')}
function evDiv(){const cal=EV.cal,end=addD(today,30),L=Object.keys(cal).filter(t=>CO[t]&&cal[t].x&&cal[t].x>=today&&cal[t].x<=end).sort((a,b)=>cal[a].x<cal[b].x?-1:1);
return P('Ex-dividend dates, next 30 days',L.length?T(['Ex-dividend','Ticker','Name','Pay date','Yield'],L.map(t=>[dayName(cal[t].x),LK(t),CO[t][0],cal[t].p?dayName(cal[t].p):'–',fpct(fd_(t).dy,2)])):'<p class="mu">None in the next 30 days.</p>'+'','c12')}
function events(){return '<section class="p c12" style="padding:6px 12px">'+SG('nv',['Top news','Earnings','Economy','Dividends'],NV)+'</section>'+({'Top news':evTop,Earnings:evEarn,Economy:evEco,Dividends:evDiv}[NV])()}
// Company tab: add News and Events views
const CVL=['Overview','Financials','Filings','Ownership','Insiders'],_coB=company;
company=function(){if(!CO[cur])return _coB();const bar='<section class="p c12" style="padding:6px 12px">'+SG('cv',[...CVL,'News','Events'],CV)+'</section>';
if(CV=='News'){if(!needNews([cur],()=>{if(tab==CT)render0()}))return bar+P('News','<p class="mu m">Loading…</p>','c12');return bar+P('Headlines, '+cur,newsList(NWC[cur]),'c12')}
if(CV=='Events'){const c=EV.cal[cur]||{},fil=((CD[cur]&&CD[cur].sec&&CD[cur].sec.fil)||[]).filter(x=>/^8-K/.test(x.f)).slice(0,8);
return bar+P('Upcoming events, '+cur,KV('Next earnings',c.e?dayName(c.e):'–')+KV('EPS estimate (low to high)',c.eA!=null?'$'+f(c.eA)+' ($'+f(c.eL)+' to $'+f(c.eH)+')':'–')+KV('Revenue estimate',c.rA?fbig(c.rA):'–')+KV('Ex-dividend date',c.x?dayName(c.x):'–')+KV('Dividend pay date',c.p?dayName(c.p):'–'),'c6')
+P('Recent 8-K filings (material events)',fil.length?T(['Date','Form',''],fil.map(x=>[x.d,x.f,'<a target="_blank" rel="noopener" href="'+x.u+'">Open</a>'])):'<p class="mu">None loaded.</p>','c6')}
return _coB().replace(SG('cv',CVL,CV),SG('cv',[...CVL,'News','Events'],CV))};
// new top-level tab, placed after Company
const _r1=render0;
render0=function(){if(tab!=NE)_r1();else{Q=[];$('#hd').textContent=ac+' '+(CO[ac]?CO[ac][0]:EXT[ac].n);$('#v').innerHTML='<div class="mu m" style="margin-bottom:8px">Headlines and company calendars from Yahoo Finance, economic data from FRED. Updated each weeknight.</div><div class="grid">'+events()+'</div>';requestAnimationFrame(()=>Q.forEach(g=>g()))}
$('#nav').innerHTML=[0,CT,NE,1,2,3,4].map(i=>'<button data-a="tab" data-v="'+i+'" class="'+(i==tab?'on':'')+'">'+TABS[i]+'</button>').join('')};
render();
