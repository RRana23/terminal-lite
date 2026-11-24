// Earnings calls and M&A, from SEC EDGAR.
// Company tab: the Events view gets an "Earnings calls" panel (every earnings release since 2023 with the press
// release, the filing, the EPS result, and links to find the transcript and replay; investor relations; add the
// next call to your calendar), and a new M&A view lists the company's merger, tender offer and activist filings.
// News & Events tab: an M&A button lists every merger filing on EDGAR over the last 45 days.
const SXM=META.SX||{t:[]},SXS=new Set(SXM.t||[]),SXC={};let SXD=null,SXDL=null,MAF='All',DLU='S&P 500',DLT='All';
const SXF={'DEFM14A':['Merger proxy (final)','Proxy sent to shareholders before they vote on a merger. Has the price, the background of the deal and the bankers’ fairness opinion.','Merger votes'],
'PREM14A':['Merger proxy (draft)','First draft of the merger proxy, filed before the final version.','Merger votes'],
'DEFM14C':['Merger information statement','Merger approved by written consent of the majority holders, so no shareholder vote is held.','Merger votes'],
'PREM14C':['Merger information statement (draft)','Draft of the information statement above.','Merger votes'],
'S-4':['Stock deal registration','Registers new shares the buyer will issue to pay for an acquisition.','Stock deals'],
'F-4':['Stock deal registration (foreign buyer)','The S-4 for a buyer based outside the U.S.','Stock deals'],
'SC TO-T':['Tender offer','A buyer offers to purchase shares directly from shareholders, usually at a premium.','Tender offers'],
'SC 14D9':['Board response to a tender offer','The target’s board tells shareholders whether to accept a tender offer.','Tender offers'],
'SC 13E3':['Going-private transaction','Insiders or affiliates are taking the company private.','Going private'],
'425':['Deal communication','Press releases, slides and letters about a pending stock deal.','Deal communications'],
'SC 13D':['Activist stake (13D)','An investor owns more than 5% and may push for changes, such as a sale or new directors.','Activist stakes'],
'SCHEDULE 13D':['Activist stake (13D)','An investor owns more than 5% and may push for changes, such as a sale or new directors.','Activist stakes'],
'8-K 2.01':['Deal completed','The company closed an acquisition or sold a business (8-K Item 2.01).','Completed deals']};
const sxInfo=f=>{const a=/\/A$/.test(f),x=SXF[f.replace(/\/A$/,'')]||[f,'',''];return[x[0]+(a?' (amended)':''),x[1],x[2]]};
const SXCAT=['Merger votes','Stock deals','Tender offers','Going private','Activist stakes','Completed deals','Deal communications'];
FN.MNA=['M&A: merger, tender offer and activist filings',0,t=>{if(t&&CO[t]){tab=CT;CV='M&A'}else{tab=NE;NV='M&A'}}];FN.DEALS=FN.MNA;
FN.CALLS=['Earnings calls: press releases, transcripts, replays',1,()=>{tab=CT;CV='Events'}];FN.TRAN=FN.CALLS;
if(typeof GUIDE!='undefined'){const add=(sec,after,rows)=>{const g=GUIDE.find(x=>x[0]==sec);if(!g)return;const i=g[1].findIndex(r=>r[0]==after);g[1].splice(i<0?g[1].length:i+1,0,...rows)};
add('Company research','ERN',[['CALLS','NVDA CALLS','Earnings calls: every earnings release since 2023 with the press release, the SEC filing and the EPS beat or miss, links to find the call transcript and replay, the investor relations site, and the next call added to your calendar.'],['MNA','NVDA MNA','M&A: the company’s merger proxies, stock deal registrations, tender offers, going-private filings, activist 13D stakes and completed deals from SEC EDGAR, with what each form means.']]);
add('Markets and the economy','DVD',[['MNA','MNA','Deals feed: every merger, tender offer, going-private and activist filing on EDGAR in the last 45 days, for the S&P 500 or all companies.']])}
if(typeof guide=='function'){const _gS=guide;guide=function(){return _gS().replace('<tr><td>Fed meeting dates</td>','<tr><td>Earnings releases and M&amp;A filings</td><td>SEC EDGAR (company filings and the daily form index)</td><td>Each weeknight</td></tr><tr><td>Fed meeting dates</td>')}}
S.maf=v=>{MAF=v};S.dlu=v=>{DLU=v};S.dlt=v=>{DLT=v};
function sxLoad(t){return SXC[t]?Promise.resolve():(SXS.has(t)?fetch('data/sx/'+t+'.json?v='+META.v).then(r=>r.ok?r.json():null).catch(()=>null):Promise.resolve(null)).then(j=>{SXC[t]=j||{none:1}})}
function sxDeals(){return SXDL||(SXDL=fetch('data/deals.json?v='+META.v).then(r=>r.ok?r.json():null).catch(()=>null).then(j=>{SXD=j||{f:[],err:1}}))}
// ---------- helpers ----------
const sxA=(u,txt)=>u?'<a target="_blank" rel="noopener" href="'+esc(u)+'">'+txt+'</a>':'<span class="mu">–</span>';
const sxMon=d=>new Date(d+'T12:00:00Z').toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'});
const sxDay=d=>new Date(d+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
const sxQ=s=>encodeURIComponent(s);
const sxName=s=>String(s||'').toLowerCase().replace(/\b([a-z])/g,c=>c.toUpperCase()).replace(/\b(Inc|Corp|Co|Ltd|Plc|Llc|Lp|L\.p|Nv|Sa|Ag|Se|Etf|Ii|Iii|Iv|Reit|Usa|Us|Spac)\b\.?/g,w=>/^(Inc|Corp|Co|Ltd)/.test(w)?w:w.toUpperCase()).replace(/\/([a-z]{2})\/?$/i,'');
const sxCo=()=>CO[cur][0].replace(/,? (Inc|Corp|Corporation|Co|Ltd|plc|Holdings)\.?$/i,'');
function sxICS(t,d){const ds=d.replace(/-/g,''),nx=new Date(Date.parse(d)+864e5).toISOString().slice(0,10).replace(/-/g,''),now=new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z';
const s=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Terminal Lite//EN','BEGIN:VEVENT','UID:'+t+'-'+ds+'@terminal-lite','DTSTAMP:'+now,'DTSTART;VALUE=DATE:'+ds,'DTEND;VALUE=DATE:'+nx,'SUMMARY:'+t+' earnings ('+CO[t][0].replace(/[,;]/g,'')+')','DESCRIPTION:Expected earnings date from Yahoo Finance. Check investor relations for the call time.','END:VEVENT','END:VCALENDAR'].join('\r\n');
return 'data:text/calendar;charset=utf-8,'+encodeURIComponent(s)}
function sxNeed(){const n=[];if(!SXC[cur])n.push(sxLoad(cur));if(typeof coLoad=='function'&&!(CD[cur]&&CD[cur].ok))n.push(coLoad(cur));if(typeof ESTS!='undefined'&&ESTS.has(cur)&&!ESTC[cur])n.push(estLoad(cur));return n}
// ---------- Company tab: Events view with earnings calls ----------
function sxEvents(bar){const c=EV.cal[cur]||{},sx=SXC[cur]||{},er=sx.er||[],own=(CD[cur]&&CD[cur].own)||{},eh=((ESTC[cur]||{}).eh)||[],nm=sxCo(),yh=sx.src=='yahoo';
const fil=sxFil(cur).filter(x=>/^8-K/.test(x.f)).slice(0,8);
const ir=own.ir?sxA(own.ir,'Investor relations site'):own.web?sxA(own.web,'Company website')+' <span class="mu">·</span> '+sxA('https://www.google.com/search?q='+sxQ(nm+' investor relations'),'Find investor relations'):sxA('https://www.google.com/search?q='+sxQ(nm+' investor relations'),'Find investor relations');
const nextE=c.e&&c.e>=today?c.e:null;
const up=P('Upcoming events, '+cur,KV('Next earnings',c.e?dayName(c.e)+(c.e<today?' <span class="mu">(reported)</span>':''):'–')+KV('EPS estimate (low to high)',c.eA!=null?'$'+f(c.eA)+' ($'+f(c.eL)+' to $'+f(c.eH)+')':'–')+KV('Revenue estimate',c.rA?fbig(c.rA):'–')+KV('Ex-dividend date',c.x?dayName(c.x):'–')+KV('Dividend pay date',c.p?dayName(c.p):'–')
+KV('Webcasts and slides',ir)+(nextE?'<p style="margin:10px 0 0"><a class="sxbtn" download="'+cur+'-earnings.ics" href="'+sxICS(cur,nextE)+'">Add next earnings to calendar</a></p>':''),'c6');
const k8=P('Recent 8-K filings (material events)',fil.length?T(['Date','Form','What happened',''],fil.map(x=>[sxDay(x.d),x.f,esc(sxDesc(x)),sxA(x.u,'Open')])).replace('<table','<table class="sxt sx8"'):'<p class="mu">None loaded.</p>','c6');
const match=d=>{const t=Date.parse(d);return eh.find(x=>x[2]!=null&&Math.abs(Date.parse(x[0])-t)<=4*864e5)};
const rows=er.map(x=>{const m=match(x.d),sp=m&&m[1]?(m[2]-m[1])/Math.abs(m[1])*100:null,mo=sxMon(x.d);
return[sxDay(x.d),m&&m[1]!=null?'$'+f(m[1]):'–',m?'$'+f(m[2]):'–',sp==null?'–':'<span class="'+(sp>=0?'up':'dn')+'">'+(sp>=0?'Beat ':'Miss ')+(sp>=0?'+':'')+f(sp,1)+'%</span>',
sxA(x.pr||x.i||x.u,x.pr?'Press release':'Filing index'),sxA(x.u,'8-K'),sxA('https://www.google.com/search?q='+sxQ(nm+' earnings call transcript '+mo),'Find transcript'),sxA('https://www.youtube.com/results?search_query='+sxQ(nm+' earnings call '+mo),'Find replay')]});
const calls=P('Earnings calls and releases, '+cur,(er.length?T(['Reported','EPS estimate','EPS actual','Result','Release','Filing','Transcript','Replay'],rows).replace('<table','<table class="sxt"'):'<p class="mu">'+(sx.none?'Earnings filings for '+cur+' arrive with the next nightly update.':'No earnings releases (8-K Item 2.02) found for '+cur+' since 2023.')+'</p>')
+'<div class="mu lcap">Each row is an earnings release filed with the SEC on Form 8-K (Item 2.02); the press release is the exhibit companies attach (usually Exhibit 99.1). EPS estimate and actual are from Yahoo Finance. Transcripts and replays aren’t free to republish, so those links search for them; the investor relations site above usually hosts the webcast and slides.'+(yh?' Filing links come from Yahoo Finance’s copy of SEC EDGAR.':'')+'</div>','c12');
return bar+up+k8+calls}
// ---------- Company tab: M&A view ----------
function sxMA(bar){const sx=SXC[cur]||{},a=(sx.ma||[]).map(x=>{const i=sxInfo(x.f);return{...x,l:i[0],w:i[1],c:i[2]}}),cats=SXCAT.filter(c=>a.some(x=>x.c==c)),yr=addD(today,-365);
if(MAF!='All'&&!cats.includes(MAF))MAF='All';const L=a.filter(x=>MAF=='All'||x.c==MAF);
const sig={'Merger votes':'Merger proxy filed: shareholders vote on a deal','Stock deals':'Stock deal registration (S-4) filed: shares issued to pay for an acquisition','Tender offers':'Tender offer filing: a buyer offering to purchase shares directly','Going private':'Going-private filing','Activist stakes':'An investor disclosed an active stake over 5% (13D)','Completed deals':'Closed an acquisition or sale of a business','Deal communications':'Deal communications (425): a stock deal is being marketed'};
const recent=SXCAT.map(c=>{const r=a.filter(x=>x.c==c&&x.d>=yr);return r.length?'<li><b>'+sig[c]+'</b> <span class="mu">('+(r.length>1?r.length+' filings, latest ':'')+sxDay(r[0].d)+')</span></li>':''}).join('');
const sum=P('Deal activity, '+cur,KV('M&A filings since '+(+today.slice(0,4)-3),a.length)+KV('In the last 12 months',a.filter(x=>x.d>=yr).length)+KV('Latest',a.length?sxDay(a[0].d)+' · '+a[0].l:'–')
+'<h4 class="sxh">Last 12 months</h4>'+(recent?'<ul class="sxl">'+recent+'</ul>':'<p class="mu" style="margin:4px 0 0">No merger, tender offer, activist or completed-deal filings.</p>')
+(sx.cik?'<p style="margin:10px 0 0">'+sxA('https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK='+sx.cik,'All '+cur+' filings on EDGAR')+'</p>':''),'c4');
const tbl=P('M&A filings, '+cur,(cats.length>1?SG('maf',['All',...cats],MAF):'')+(L.length?T(['Date','Form','What it is',''],L.slice(0,60).map(x=>[sxDay(x.d),x.f,'<b>'+x.l+'</b><div class="mu sxw">'+x.w+'</div>',sxA(x.i||x.u,'Open')])).replace('<table','<table class="sxt sxm"'):'<p class="mu">'+(sx.none?'M&amp;A filings for '+cur+' arrive with the next nightly update.':'No merger, tender offer or activist filings for '+cur+' since '+(+today.slice(0,4)-3)+'.')+'</p>')
+'<div class="mu lcap">Includes filings by other parties about '+cur+', such as an acquirer’s tender offer or an investor’s 13D. Source: SEC EDGAR'+(sx.src=='yahoo'?' via Yahoo Finance':'')+'.</div>','c8');
return bar+sum+tbl+sxGloss()}
function sxGloss(){return P('Reading M&A filings',T(['Form','Name','What it tells you'],[['DEFM14A','Merger proxy','Price, deal background, the bankers’ fairness opinion and the shareholder vote'],['S-4 / F-4','Stock deal registration','New shares the buyer issues to pay; includes pro forma financials'],['SC TO-T','Tender offer','A buyer offers to purchase shares directly, often to move faster than a vote'],['SC 14D9','Board response','Whether the target’s board backs the tender offer'],['SC 13E3','Going private','Insiders or a sponsor taking the company private; extra disclosure required'],['425','Deal communication','Press releases, slides and investor letters during a pending stock deal'],['13D','Activist stake','Over 5% owned with intent to influence; filed within 10 days'],['8-K 2.01','Deal completed','The company closed an acquisition or sale']]).replace('<table','<table class="sxt sxg"'),'c12')}
// ---------- News & Events tab: M&A feed ----------
function sxFeed(){if(!SXD){sxDeals().then(()=>{if(tab==NE&&NV=='M&A')render0()});return P('M&A filings','<p class="mu m">Loading deal filings…</p>','c12')}
const F=(SXD.f||[]).map(e=>({...e,cat:sxInfo(e.f)[2],sp:(e.t||[]).some(t=>t&&CO[t])})),U=F.filter(e=>DLU=='All companies'||e.sp);
if(!F.length)return P('M&A filings','<p class="mu">'+(SXD.err?'The deals feed isn’t in this build yet. It appears after the next nightly update.':'No M&amp;A filings in the last 45 days.')+'</p>','c12');
const cnt=SXCAT.map(c=>[c,U.filter(e=>e.cat==c).length]).filter(x=>x[1]);if(DLT!='All'&&!cnt.some(x=>x[0]==DLT))DLT='All';const L=U.filter(e=>DLT=='All'||e.cat==DLT);
const who=e=>(e.t||[]).map((t,i)=>t&&CO[t]?LK(t)+' <span class="mu">'+esc(CO[t][0])+'</span>':esc(sxName(e.n&&e.n[i]))).filter(Boolean).join('<br>')||'–';
const stats='<div class="sxs">'+[['All',U.length],...cnt].map(([c,n])=>'<button data-a="dlt" data-v="'+c+'" class="'+(DLT==c?'on':'')+'"><b>'+n+'</b><span>'+c+'</span></button>').join('')+'</div>';
return P('M&A filings on EDGAR, last 45 days',SG('dlu',['S&P 500','All companies'],DLU)+stats
+(L.length?T(['Filed','Form','Companies','What it is',''],L.slice(0,120).map(e=>[sxDay(e.d),e.f,who(e),sxInfo(e.f)[0],sxA(e.u,'Open')])).replace('<table','<table class="sxt sxf"'):'<p class="mu">No filings of this type for this filter.</p>')
+'<div class="mu lcap">'+(L.length>120?'Showing the latest 120 of '+L.length+'. Pick a type above to narrow the list.':'Showing '+L.length+' filing'+(L.length==1?'':'s')+'.')+' Every merger proxy, stock deal registration, tender offer, going-private and activist 13D filed on EDGAR, from the SEC’s daily index'+(SXD.src=='yahoo'?' (S&amp;P 500 only this build, via Yahoo Finance)':'')+'. A filing lists every company on it: the buyer, the target, or the investor and the company. Updated '+(SXD.asof||'')+'.</div>','c12')
+sxGloss()}
const _evS=events;events=function(){const L4=['Top news','Earnings','Economy','Dividends'],bar='<section class="p c12" style="padding:6px 12px">'+SG('nv',[...L4,'M&A'],NV)+'</section>';
if(NV!='M&A')return _evS().replace(SG('nv',L4,NV),SG('nv',[...L4,'M&A'],NV));return bar+sxFeed()};
// ---------- Filings view: the nightly list from this module (the statements job that fed it runs weekly) ----------
const SXDS={'10-K':'Annual report','10-Q':'Quarterly report','8-K':'Current report','4':'Insider trade','DEF 14A':'Annual meeting proxy','DEFA14A':'Additional proxy material','S-1':'Registration of new shares','S-3':'Shelf registration','S-8':'Shares for employee plans','11-K':'Employee savings plan report','20-F':'Annual report (foreign issuer)','6-K':'Current report (foreign issuer)','SC 13G':'Passive stake over 5% (13G)','SCHEDULE 13G':'Passive stake over 5% (13G)','ARS':'Annual report to shareholders','8-A12B':'Securities registration','424B2':'Prospectus (notes)','FWP':'Free writing prospectus'};
const sxDesc=x=>{const b=x.f.replace(/\/A$/,''),a=/\/A$/.test(x.f)?' (amended)':'',d=(x.x||'').trim();return d&&d.toUpperCase()!=b&&!/^(FORM )?[0-9A-Z -]{1,9}$/.test(d)?(d==d.toUpperCase()?d.charAt(0)+d.slice(1).toLowerCase():d):SXDS[b]?SXDS[b]+a:SXF[b]?sxInfo(x.f)[0]:d||'–'};
const sxFil=t=>{const x=SXC[t];return x&&x.fil&&x.fil.length?x.fil:((CD[t]&&CD[t].sec&&CD[t].sec.fil)||[])};
const SXFG={All:()=>1,'10-K / 10-Q':f=>/^10-[KQ]/.test(f),'8-K':f=>/^8-K/.test(f),'Insider (Form 4)':f=>/^4(\/A)?$/.test(f),Proxy:f=>/^DEFA?14A/.test(f),'M&A':f=>!!SXF[f.replace(/\/A$/,'')],'13D / 13G':f=>/^(SC |SCHEDULE )13[DG]/.test(f)};
coFil=function(c){if(!SXFG[FF])FF='All';const L=sxFil(cur),M=L.filter(x=>SXFG[FF](x.f)),cik=(SXC[cur]&&SXC[cur].cik)||(c.sec&&c.sec.cik);
return P('SEC filings, '+cur,SG('ff',Object.keys(SXFG),FF)+(M.length?T(['Date','Form','Description',''],M.slice(0,40).map(x=>[sxDay(x.d),x.f,esc(sxDesc(x)),sxA(x.u,'Open')])).replace('<table','<table class="sxt sx8"'):'<p class="mu">No filings of this type in the recent list.</p>')
+'<div class="mu lcap">'+(SXC[cur]&&SXC[cur].fil?'Checked against SEC EDGAR each weeknight, so a new filing appears the evening it is filed (or the next weeknight). ':'')+'8-K descriptions list the items the company reported.'+(cik?' '+sxA('https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK='+cik,'All '+cur+' filings on EDGAR'):'')+'</div>','c12')};
// ---------- Company tab bar: M&A after Filings ----------
const _coS=company,SVL0=RVL1,SVL1=[...RVL1.slice(0,RVL1.indexOf('Filings')+1),'M&A',...RVL1.slice(RVL1.indexOf('Filings')+1)];
company=function(){if(!CO[cur])return _coS();if(CV=='Filings'&&!SXC[cur])sxLoad(cur).then(()=>{if(tab==CT&&CV=='Filings')render0()});if(CV!='M&A'&&CV!='Events')return _coS().replace(SG('cv',SVL0,CV),SG('cv',SVL1,CV));
const bar='<section class="p c12" style="padding:6px 12px">'+SG('cv',SVL1,CV)+'</section>',need=sxNeed();
if(need.length){Promise.all(need).then(()=>{if(tab==CT)render0()});return bar+P(CV,'<p class="mu m">Loading '+cur+'…</p>','c12')}
return CV=='M&A'?sxMA(bar):sxEvents(bar)};
const _r0S=render0;render0=function(){_r0S();if(tab==CT&&CO[ac]){const d=$('#v').firstElementChild;if(d&&/Updated weekly/.test(d.textContent))d.textContent='Filings, earnings releases and M&A from SEC EDGAR, checked each weeknight. Statements, profile, ownership and insider trades from SEC EDGAR and Yahoo Finance, refreshed weekly.'}};
render();
