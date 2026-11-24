// Phase 3: Company tab (Bloomberg DES / FA / CF / HDS / insider screens). Loaded after app.js and fundamentals.js.
let CV='Overview',FF='All';const CD={},HASSEC=new Set(META.SEC||[]),HASOWN=new Set(META.OWN||[]);
TABS.push('Company');const CT=TABS.length-1;
S.cv=v=>{CV=v};S.ff=v=>{FF=v};S.co=v=>{if(CO[v]){cur=ac=v}tab=CT};
S.fcopy=()=>{const c=CD[cur]&&CD[cur].sec,fa=c&&c.fa;if(!fa)return 'skip';const t='Line\t'+fa.ends.join('\t')+'\n'+Object.entries(fa.rows).map(([k,v])=>k+'\t'+v.map(x=>x??'').join('\t')).join('\n');const m=$('#fcm'),ok=()=>m.textContent='Copied. Paste into Excel.',no=()=>m.textContent='Clipboard blocked here.';try{navigator.clipboard.writeText(t).then(ok,no)}catch(e){no()}return 'skip'};
function coLoad(t){if(CD[t])return CD[t].p;const o=CD[t]={};const g=(dir,has,k)=>has.has(t)?fetch('data/'+dir+'/'+t+'.json?v='+META.v).then(r=>r.ok?r.json():null).then(j=>{o[k]=j}).catch(()=>{}):Promise.resolve();
o.p=Promise.all([g('sec',HASSEC,'sec'),g('own',HASOWN,'own')]).then(()=>{o.ok=1});return o.p}
const fnum=v=>v==null?'–':Math.abs(v)>=1e9?f(v/1e9,1)+'B':Math.abs(v)>=1e6?f(v/1e6,0)+'M':f(v,2);
const fpc2=v=>v==null||!isFinite(v)?'–':(v*100).toFixed(1)+'%';
function coFA(c){const fa=c.sec&&c.sec.fa;if(!fa)return P('Financial statements','<p class="mu">No SEC financial data for '+cur+'. Banks and some companies report in formats this page does not read yet.</p>','c12');
const R=fa.rows,yr=fa.ends.map(e=>'FY '+e.slice(0,4)),row=k=>R[k]?[k,...R[k].map(fnum)]:null,rat=(n,a,b)=>R[a]&&R[b]?[n,...R[a].map((x,i)=>x!=null&&R[b][i]?fpc2(x/R[b][i]):'–')]:null,
fcf=R['Operating cash flow']&&R['Capital spending']?['Free cash flow',...R['Operating cash flow'].map((x,i)=>x!=null&&R['Capital spending'][i]!=null?fnum(x-R['Capital spending'][i]):'–')]:null,
gr=R.Revenue?['Revenue growth',...R.Revenue.map((x,i)=>i&&x!=null&&R.Revenue[i-1]?fpc2(x/R.Revenue[i-1]-1):'–')]:null,
sec=(t,rows)=>'<tr><th colspan="'+(yr.length+1)+'" style="text-align:left;color:var(--am);padding-top:10px">'+t+'</th></tr>'+rows.filter(Boolean).map(r=>'<tr>'+r.map(x=>'<td>'+x+'</td>').join('')+'</tr>').join('');
Q.push(()=>{if(R.Revenue)line('far',[{d:R.Revenue.map(x=>x||0),c:'--am'}].concat(R['Net income']?[{d:R['Net income'].map(x=>x||0),c:'--up'}]:[]),x=>fnum(x))});
return P('Annual financials, '+cur+' (USD, from 10-K filings)','<table><tr><th>Line</th>'+yr.map(y=>'<th>'+y+'</th>').join('')+'</tr>'
+sec('Income statement',[row('Revenue'),gr,row('Gross profit'),rat('Gross margin','Gross profit','Revenue'),row('Operating income'),rat('Operating margin','Operating income','Revenue'),row('Net income'),rat('Net margin','Net income','Revenue'),row('Diluted EPS'),row('Diluted shares')])
+sec('Cash flow',[row('Operating cash flow'),row('Capital spending'),fcf,row('Dividends paid'),row('Buybacks')])
+sec('Balance sheet',[row('Cash'),row('Total assets'),row('Total liabilities'),row("Shareholders' equity"),row('Long-term debt')])+'</table>'
+'<p><button class="in" data-a="fcopy" style="width:auto;cursor:pointer">Copy for Excel</button> <span id="fcm" class="mu"></span></p>','c8')
+P('Revenue (amber) and net income (green)','<canvas id="far" class="sm" style="height:220px"></canvas><div class="mu">Fiscal years '+yr[0].slice(3)+' to '+yr.at(-1).slice(3)+'. Source: SEC EDGAR XBRL.</div>','c4')}
function coFil(c){const L=(c.sec&&c.sec.fil)||[],G={All:()=>1,'10-K / 10-Q':f=>/^10-[KQ]/.test(f),'8-K':f=>/^8-K/.test(f),'Insider (Form 4)':f=>f=='4',Proxy:f=>f=='DEF 14A','13D / 13G':f=>/^SC 13/.test(f)},M=L.filter(x=>G[FF](x.f));
return P('SEC filings, '+cur,SG('ff',Object.keys(G),FF)+(M.length?T(['Date','Form','Description',''],M.slice(0,30).map(x=>[x.d,x.f,x.x||'–','<a target="_blank" rel="noopener" href="'+x.u+'">Open</a>'])):'<p class="mu">No filings of this type in the recent list.</p>')+(c.sec&&c.sec.cik?'<p><a target="_blank" rel="noopener" href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK='+c.sec.cik+'">All '+cur+' filings on EDGAR</a></p>':''),'c12')}
function coOwn(c){const o=c.own;if(!o)return P('Ownership','<p class="mu">No ownership data for '+cur+'.</p>','c12');const m=o.major||{},H=a=>a&&a.length?T(['Holder','Shares','% held','Value','Change','Reported'],a.map(r=>[r.Holder||'–',fnum(r.Shares),fpc2(r.pctHeld),fbig(r.Value),r.pctChange==null?'–':pc(r.pctChange*100),r['Date Reported']||'–'])):'<p class="mu">None reported.</p>';
return P('Ownership summary',KV('Insiders',fpc2(m.insidersPercentHeld))+KV('Institutions',fpc2(m.institutionsPercentHeld))+KV('Institutions, % of float',fpc2(m.institutionsFloatPercentHeld))+KV('Number of institutions',m.institutionsCount?f(m.institutionsCount,0):'–'),'c4')
+P('Top institutional holders (13F)',H(o.inst),'c8')+P('Top mutual fund holders',H(o.funds),'c12')}
function coIns(c){const a=(c.own&&c.own.ins)||[],tot=k=>a.filter(r=>k.test(r.Text||'')).reduce((s,r)=>s+(r.Value||0),0),buy=tot(/Purchase|Buy/i),sell=tot(/Sale|Sell/i);
return P('Insider activity, recent',KV('Purchases',fbig(buy))+KV('Sales',fbig(sell))+KV('Transactions listed',a.length)+'<div class="mu" style="margin-top:6px">Grants and option exercises have no cash value. Each trade links to its Form 4 under Filings.</div>','c4')
+P('Insider transactions',a.length?T(['Date','Insider','Position','Transaction','Shares','Value'],a.map(r=>[r['Start Date']||'–',r.Insider||'–',r.Position||'–',r.Text||'–',fnum(r.Shares),r.Value?fbig(r.Value):'–'])):'<p class="mu">No recent insider transactions.</p>','c8')}
function coOver(c){const d=fd_(cur),o=c.own||{},fa=c.sec&&c.sec.fa;
return P(CO[cur][0]+' ('+cur+')','<p style="max-width:80ch">'+(o.about||'No description available.')+'</p>'+fgrid([['Sector',d.sec||'–'],['Industry',d.ind||'–'],['Headquarters',o.hq||'–'],['Employees',o.emp?f(o.emp,0):'–'],['Website',o.web?'<a target="_blank" rel="noopener" href="'+o.web+'">'+o.web.replace(/^https?:\/\//,'')+'</a>':'–'],['SEC CIK',(c.sec&&c.sec.cik)||'–'],['Market cap',fbig(d.cap)],['P/E',fz(d.pe)],['Dividend yield',fpct(d.dy,2)]]),'c12')
+(fa?coFA(c):'')}
function company(){if(!CO[cur])return P('Company','<p class="mu">Pick a stock in the search box to see its company page.</p>','c12');const c=CD[cur];
if(!c||!c.ok){coLoad(cur).then(()=>{if(tab==CT)render0()});return P('Company','<p class="mu m">Loading '+cur+'…</p>','c12')}
return '<section class="p c12" style="padding:6px 12px">'+SG('cv',['Overview','Financials','Filings','Ownership','Insiders'],CV)+'</section>'+({Overview:coOver,Financials:coFA,Filings:coFil,Ownership:coOwn,Insiders:coIns}[CV])(c)}
const _r0=render0;
render0=function(){if(tab!=CT)_r0();else{Q=[];$('#hd').textContent=ac+' '+(CO[ac]?CO[ac][0]:EXT[ac].n);$('#v').innerHTML='<div class="mu m" style="margin-bottom:8px">Statements and filings from SEC EDGAR. Profile, ownership and insider trades from Yahoo Finance. Updated weekly.</div><div class="grid">'+company()+'</div>';requestAnimationFrame(()=>Q.forEach(g=>g()))}
$('#nav').innerHTML=[0,CT,1,2,3,4].map(i=>'<button data-a="tab" data-v="'+i+'" class="'+(i==tab?'on':'')+'">'+TABS[i]+'</button>').join('')};
// link from the Markets tab fundamentals panel to the company page
const _h0b=home0;home0=function(){return _h0b().replace(cur+' fundamentals','<button data-a="co" data-v="'+cur+'" style="background:none;border:0;color:var(--am);cursor:pointer;padding:0;font:inherit">'+cur+' company page</button> · fundamentals')};
render();
