// Credit and Dividends views on the Company tab. Credit: leverage, coverage, liquidity, a synthetic rating from
// interest coverage, Altman Z-score and peers. Dividends: yield, payout, growth, streaks, history and S&P 500 leaders.
const CRM=META.CR||{t:[],s:{}},CRS=new Set(CRM.t||[]),CRC={},CRSM=CRM.s||{};
FN.LEV=['Leverage, coverage and credit profile',1,()=>{tab=CT;CV='Credit'}];FN.CRPR=FN.LEV;
{const dv=FN.DVD;FN.DVD=['Dividends',0,t=>{if(t&&CO[t]){tab=CT;CV='Dividends'}else return dv[2](t)}]}
FN.DVH=['Dividend history, yield, payout and growth',1,()=>{tab=CT;CV='Dividends'}];
if(typeof GUIDE!='undefined'){const g=GUIDE.find(x=>x[0]=='Company research');if(g){const i=g[1].findIndex(r=>r[0]=='ANR');g[1].splice(i<0?g[1].length:i+1,0,['LEV','NVDA LEV','Credit profile: net debt to EBITDA, interest coverage, a synthetic credit rating, Altman Z-score, liquidity ratios, five years of debt and cash, and leverage vs industry peers.'],['DVD','NVDA DVD','Dividend history: yield, payout ratios, 5-year growth, years of consecutive increases, payments, cash returned to shareholders, and S&P 500 dividend leaders. DVD on its own still opens the ex-dividend calendar.'])}}
function crLoad(t){return CRC[t]?Promise.resolve():fetch('data/cr/'+t+'.json?v='+META.v).then(r=>r.ok?r.json():null).then(j=>{CRC[t]=j||{none:1}}).catch(()=>{CRC[t]={none:1}})}
const cX=v=>v==null||!isFinite(v)?'–':f(v,1)+'x',cPc=v=>v==null||!isFinite(v)?'–':f(v*100,1)+'%',cD=(a,b)=>a==null||b==null||!b?null:a/b;
// Damodaran's interest coverage to rating table for large non-financial companies
const RLAD=[[8.5,'AAA'],[6.5,'AA'],[5.5,'A+'],[4.25,'A'],[3,'A-'],[2.5,'BBB'],[2.25,'BB+'],[2,'BB'],[1.75,'B+'],[1.5,'B'],[1.25,'B-'],[.8,'CCC'],[.65,'CC'],[.2,'C'],[-1e9,'D']];
const cRate=c=>c==null||!isFinite(c)?null:RLAD.find(r=>c>r[0])[1],cIG=r=>r&&['AAA','AA','A+','A','A-','BBB'].includes(r);
const cZone=z=>z==null?'':z>2.99?'<span class="up">safe zone</span>':z>=1.81?'<span class="mu">grey zone</span>':'<span class="dn">distress zone</span>';
function crYears(e){const r=e.r||{},y=e.y||[],g=(k,i)=>(r[k]||[])[i]??null;return y.map((d,i)=>{const ebit=g('ebit',i),dep=g('dep',i),ebitda=g('ebitda',i)??(ebit!=null&&dep!=null?ebit+dep:null),debt=g('debt',i),cash=g('cash',i),nd=debt==null?null:debt-(cash||0),eq=g('eq',i),it=g('int',i),ca=g('ca',i),cl=g('cl',i),inv=g('inv',i)||0,fcf=g('fcf',i)??(g('ocf',i)!=null&&g('capex',i)!=null?g('ocf',i)-g('capex',i):null);
return{d,yr:d.slice(0,4),rev:g('rev',i),ebit,ebitda,debt,cash,nd,eq,it,fcf,ni:g('ni',i),div:g('div',i),buy:g('buy',i),ta:g('ta',i),tl:g('tl',i),wc:g('wc',i),re:g('re',i),
nde:ebitda>0&&nd!=null?nd/ebitda:null,tde:ebitda>0&&debt!=null?debt/ebitda:null,cov:it>0&&ebit!=null?ebit/it:null,ecov:it>0&&ebitda!=null?ebitda/it:null,dcap:debt!=null&&eq!=null&&debt+eq>0?debt/(debt+eq):null,de:eq>0&&debt!=null?debt/eq:null,cr:cD(ca,cl),qr:ca!=null&&cl?(ca-inv)/cl:null,fcfd:debt>0&&fcf!=null?fcf/debt:null}})}
function crZ(y){const L=y.at(-1),cap=fd_(cur).cap;if(!L||!L.ta||!L.tl||!cap||[L.wc,L.re,L.ebit,L.rev].includes(null))return null;return 1.2*L.wc/L.ta+1.4*L.re/L.ta+3.3*L.ebit/L.ta+.6*cap/L.tl+L.rev/L.ta}
const crBtn=(t,code)=>'<button class="in" data-a="run" data-v="'+t+' '+code+'" style="width:auto">'+t+'</button>';
function crCredit(){const e=CRC[cur];if(!e||e.none||!(e.y||[]).length)return P('Credit, '+cur,'<p class="mu">No balance sheet data for '+cur+' in this build.</p>','c12')+crLists('c6');
const Y=crYears(e),L=Y.at(-1),z=crZ(Y),noInt=!L.it||L.it<=0,rate=noInt?(L.debt>0?null:'AAA'):cRate(L.cov),bank=/Bank|Insurance|Capital Markets|Credit Services|Asset Management/i.test(fd_(cur).ind||'');
const snap=(bank?'<p class="dn" style="font-size:12.5px">'+cur+' is a financial company. Its debt funds lending and investing, so these industrial leverage ratios don’t apply well; look at capital ratios and P/B instead.</p>':'')
+KV('Net debt / EBITDA','<b>'+(L.nd!=null&&L.nd<0?'Net cash':cX(L.nde))+'</b>')+KV('Total debt / EBITDA',cX(L.tde))+KV('Interest coverage (EBIT ÷ interest)',noInt?'n/m':cX(L.cov))
+KV('Synthetic rating',rate?'<b>'+rate+'</b> <span class="'+(cIG(rate)?'up':'dn')+'">'+(cIG(rate)?'investment grade':'high yield')+'</span>':'n/m')
+KV('Altman Z-score',z==null?'–':f(z,2)+' '+cZone(z))+KV('Debt / capital',cPc(L.dcap))+KV('Current ratio',cX(L.cr))+KV('Quick ratio',cX(L.qr))+KV('Free cash flow / total debt',cPc(L.fcfd))
+'<div class="mu ccap">FY'+L.yr+'. Rough guide: net debt under about 2x EBITDA is comfortable for an investment-grade company; above about 4x is typical of high yield.</div>';
const yrs=Y.map(x=>'FY'+x.yr),row=(n,k,fm)=>[n,...Y.map(x=>fm(x[k]))];
const tb=T(['',...yrs],[row('Total debt','debt',fbig),row('Cash and short-term investments','cash',fbig),row('Net debt','nd',fbig),row('EBITDA','ebitda',fbig),row('Net debt / EBITDA','nde',cX),row('Total debt / EBITDA','tde',cX),row('EBIT','ebit',fbig),row('Interest expense','it',fbig),row('Interest coverage','cov',cX),row('EBITDA / interest','ecov',cX),row('Debt / capital','dcap',cPc),row('Debt / equity','de',cX),row('Current ratio','cr',cX),row('Quick ratio','qr',cX),row('Free cash flow / debt','fcfd',cPc)]).replace('<table','<table class="ct"');
const lad=T(['Interest coverage above','Rating'],RLAD.slice(0,-1).map(r=>[f(r[0],2)+'x',r[1]]).concat([['below 0.2x','D']]).map(r=>r[1]==rate?['<b>'+r[0]+'</b>','<b class="ca">'+r[1]+' ← '+cur+'</b>']:r)).replace('<table','<table class="ct cl"');
const peers=fpeers(cur,10),pr=peers.map(t=>{const s=CRSM[t]||{},rt=s.cov!=null?cRate(s.cov):null;return[t==cur?'<b>'+t+'</b>':crBtn(t,'LEV'),CO[t][0],s.nde==null?'–':s.nde<0?'Net cash':cX(s.nde),cX(s.cov),rt||'–',s.z==null?'–':f(s.z,2)]});
Q.push(()=>crBarsDraw(Y));
return P('Credit snapshot, '+cur,snap,'c4')+P('Leverage and liquidity by fiscal year (USD)','<div class="dscroll">'+tb+'</div>','c8')
+P('Debt, cash and EBITDA','<div class="eleg"><span><i style="background:var(--dn)"></i>Total debt</span><span><i style="background:var(--up)"></i>Cash</span><span><i style="background:var(--am)"></i>EBITDA</span></div><div id="crb" class="rsvg"></div>','c6')
+P('Synthetic rating from interest coverage',lad+'<div class="mu ccap">Aswath Damodaran’s table for large non-financial companies maps interest coverage to the rating a company would likely get. A quick cross-check, not an actual agency rating.</div>','c6')
+P('Leverage vs industry peers',T(['','Company','Net debt / EBITDA','Coverage','Synthetic rating','Altman Z'],pr).replace('<table','<table class="ct cp"')+'<div class="mu ccap">Peers: same industry, closest in market cap. Altman Z: above 2.99 safe, below 1.81 distress; built for manufacturers, so read it loosely for others.</div>','c12')+crLists('c6')}
function crLists(c){const a=Object.entries(CRSM).filter(([t,s])=>CO[t]&&s.nde!=null&&!/Bank|Insurance|Capital Markets|Credit Services|Asset Management/i.test(fd_(t).ind||''));if(!a.length)return'';
const row=([t,s])=>[crBtn(t,'LEV'),CO[t][0],s.nde<0?'<span class="up">Net cash</span>':cX(s.nde),cX(s.cov)],hd=['','Company','Net debt / EBITDA','Coverage'];
const hi=[...a].sort((x,y)=>y[1].nde-x[1].nde).slice(0,8),lo=[...a].sort((x,y)=>x[1].nde-y[1].nde).slice(0,8);
return P('Most leveraged in the S&P 500',T(hd,hi.map(row)).replace('<table','<table class="ct cp"')+'<div class="mu ccap">Excludes banks, insurers and asset managers.</div>',c)+P('Most net cash in the S&P 500',T(hd,lo.map(row)).replace('<table','<table class="ct cp"'),c)}
function crBarsDraw(Y){const el=$('#crb');if(!el)return;const S=[['debt','var(--dn)'],['cash','var(--up)'],['ebitda','var(--am)']],vs=Y.flatMap(x=>S.map(s=>x[s[0]]||0));if(!vs.some(v=>v))return;
const w=Math.max(260,el.clientWidth),h=220,l=58,r=10,t=8,b=24,hi=Math.max(...vs)*1.08,lo=Math.min(0,...vs),gw=(w-l-r)/Y.length,bw=gw*.8/3,Yp=v=>t+(hi-v)/(hi-lo)*(h-t-b);
let s='<svg width="'+w+'" height="'+h+'" role="img" aria-label="Debt, cash and EBITDA by year">';
rTicks(lo,hi).forEach(v=>{s+='<line x1="'+l+'" x2="'+(w-r)+'" y1="'+Yp(v)+'" y2="'+Yp(v)+'" style="stroke:var(--ln)"/>'+rTx(l-6,Yp(v)+4,v?fbig(v).replace('.0B','B'):'$0','end')});
Y.forEach((x,i)=>{S.forEach(([k,c],j)=>{const v=x[k];if(v==null)return;const y0=Yp(0),y1=Yp(v);s+='<rect x="'+(l+i*gw+gw*.1+j*bw).toFixed(1)+'" y="'+Math.min(y0,y1).toFixed(1)+'" width="'+(bw-2).toFixed(1)+'" height="'+Math.max(1,Math.abs(y1-y0)).toFixed(1)+'" style="fill:'+c+';opacity:.85"/>'});s+=rTx(l+i*gw+gw/2,h-6,'FY'+x.yr,'middle')});
el.innerHTML=s+'</svg>';const NM={debt:'Total debt',cash:'Cash',ebitda:'EBITDA'};
chHover(el,Y.map((_,i)=>l+i*gw+gw/2),i=>{const x=Y[i];return'<b>Fiscal year '+x.yr+'</b>'+S.map(([k,c])=>x[k]==null?'':chRow(c,NM[k],fbig(x[k]))).join('')+(x.debt!=null&&x.ebitda>0?chRow('transparent','Net debt / EBITDA',f((x.debt-(x.cash||0))/x.ebitda,1)+'x'):'')},
i=>S.map(([k,c],j)=>Y[i][k]==null?null:[l+i*gw+gw*.1+j*bw+(bw-2)/2,Yp(Y[i][k]),c]).filter(Boolean),t,h-b)}
// dividends
function crDiv(){const e=CRC[cur],px=CO[cur][1],cal=(typeof EV!='undefined'&&EV.cal&&EV.cal[cur])||{};if(!e||e.none)return P('Dividends, '+cur,'<p class="mu">No dividend data for '+cur+' in this build.</p>','c12')+dvLists();
const dv=e.dv||[],Y=(e.y||[]).length?crYears(e):[],L=Y.at(-1)||{},s=CRSM[cur]||{},pays=e.dp||[];
if(!dv.length&&!e.ttm){const bb=L.buy;return P('Dividends, '+cur,'<p>'+cur+' doesn’t pay a dividend.'+(bb?' It returned '+fbig(bb)+' through buybacks in FY'+L.yr+(L.fcf>0?', '+cPc(bb/L.fcf)+' of free cash flow':'')+'.':'')+'</p>','c12')+dvLists()}
const snap=KV('Dividends per share, last 12 months','<b>$'+f(e.ttm||0,2)+'</b>')+KV('Dividend yield','<b>'+(e.ttm&&px?f(e.ttm/px*100,2)+'%':'–')+'</b>')
+KV('Payout ratio (of earnings), FY'+(L.yr||''),cPc(cD(L.div,L.ni>0?L.ni:null)))+KV('Payout of free cash flow',cPc(cD(L.div,L.fcf>0?L.fcf:null)))
+KV('Dividend growth, 5 years a year',s.g5!=null?f(s.g5,1)+'%':'–')+KV('Consecutive annual increases',s.st!=null?s.st+' yr'+(s.st==1?'':'s'):'–')+KV('Paying since',e.first||'–')
+KV('Next ex-dividend date',cal.x?dayName(cal.x):'–')+KV('Pay date',cal.p?dayName(cal.p):'–')
+'<div class="mu ccap">Growth and streaks use calendar-year totals, so a payment that moves between years can break a streak that the company counts as unbroken.</div>';
const cash=Y.length?T(['',...Y.map(x=>'FY'+x.yr)],[['Net income',...Y.map(x=>fbig(x.ni))],['Free cash flow',...Y.map(x=>fbig(x.fcf))],['Dividends paid',...Y.map(x=>fbig(x.div))],['Buybacks',...Y.map(x=>fbig(x.buy))],['Payout ratio',...Y.map(x=>cPc(cD(x.div,x.ni>0?x.ni:null)))],['Dividends + buybacks / FCF',...Y.map(x=>cPc(cD((x.div||0)+(x.buy||0),x.fcf>0?x.fcf:null)))]]).replace('<table','<table class="ct"'):'<p class="mu">No cash flow data.</p>';
const pt=pays.slice().reverse().map((p,i,a)=>{const pr=a[i+1],c=pr&&pr[1]?p[1]/pr[1]-1:null;return[p[0],'$'+f(p[1],4).replace(/0{1,2}$/,''),c==null||Math.abs(c)<.0005?'<span class="mu">–</span>':'<span class="'+(c>0?'up':'dn')+'">'+(c>0?'+':'')+f(c*100,1)+'%</span>']});
Q.push(()=>dvDraw(dv));
return P('Dividend snapshot, '+cur,snap,'c4')+P('Dividends per share by calendar year','<div id="dvb" class="rsvg"></div>','c8')
+P('Cash returned to shareholders (USD)','<div class="dscroll">'+cash+'</div>','c6')+P('Recent payments',pt.length?T(['Ex-date','Amount','Change'],pt).replace('<table','<table class="ct"'):'<p class="mu">None.</p>','c6')+dvLists()}
function dvLists(){const a=Object.entries(CRSM).filter(([t,s])=>CO[t]);if(!a.length)return'';const nm=t=>CO[t][0];
const top=(k,fn,n=8)=>a.filter(([t,s])=>s[k]!=null&&fn(s)).sort((x,y)=>y[1][k]-x[1][k]).slice(0,n);
const yl=top('y',s=>s.y>0&&s.y<20),st=top('st',s=>s.st>0),gr=top('g5',s=>s.g5>0&&s.y>.5&&s.st>=3);
const t3=(rows,col,fm)=>T(['','Company',col],rows.map(([t,s])=>[crBtn(t,'DVD'),nm(t),fm(s)])).replace('<table','<table class="ct cp"');
return P('Highest dividend yields, S&P 500',t3(yl,'Yield',s=>f(s.y,2)+'%'),'c4')+P('Longest streaks of increases',t3(st,'Years',s=>s.st),'c4')+P('Fastest 5-year dividend growth',t3(gr,'Growth a year',s=>f(s.g5,1)+'%')+'<div class="mu ccap">Among stocks yielding over 0.5% with at least 3 straight increases.</div>','c4')}
function dvDraw(dv){const el=$('#dvb');if(!el||!dv.length)return;const w=Math.max(260,el.clientWidth),h=220,l=52,r=10,t=18,b=24,hi=Math.max(...dv.map(x=>x[1]))*1.15,bw=(w-l-r)/dv.length,Yp=v=>t+(hi-v)/hi*(h-t-b);
let s='<svg width="'+w+'" height="'+h+'" role="img" aria-label="Dividends per share by year">';
rTicks(0,hi).forEach(v=>{s+='<line x1="'+l+'" x2="'+(w-r)+'" y1="'+Yp(v)+'" y2="'+Yp(v)+'" style="stroke:var(--ln)"/>'+rTx(l-6,Yp(v)+4,'$'+f(v,2),'end')});
const every=Math.ceil(dv.length/Math.max(2,Math.floor((w-l)/56)));
dv.forEach(([y,v],i)=>{const up=i&&v>dv[i-1][1]*1.0001;s+='<rect x="'+(l+i*bw+bw*.15).toFixed(1)+'" y="'+Yp(v).toFixed(1)+'" width="'+(bw*.7).toFixed(1)+'" height="'+(Yp(0)-Yp(v)).toFixed(1)+'" style="fill:var(--am);opacity:'+(up||!i?.9:.45)+'"/>';if(i%every==0||i==dv.length-1)s+=rTx(l+i*bw+bw/2,h-6,y,'middle')});
el.innerHTML=s+'</svg><div class="mu ccap">Faded bars: years the dividend did not rise. Excludes the current, partial year.</div>';
chHover(el,dv.map((_,i)=>l+i*bw+bw/2),i=>{const[y,v]=dv[i],p=i?dv[i-1][1]:null;return'<b>'+y+'</b>'+chRow('var(--am)','Dividends per share','$'+f(v,2))+(p?chRow('transparent','Change from '+dv[i-1][0],chPct((v/p-1)*100)):'')},i=>[[l+i*bw+bw/2,Yp(dv[i][1]),'var(--am)']],t,h-b)}
// Company tab: add Credit and Dividends views after Estimates
const _coL=company,LVL0=EVL1,LVL1=['Overview','Financials','DCF','Estimates','Credit','Dividends','Filings','Ownership','Insiders','News','Events'];
company=function(){if(!CO[cur])return _coL();if(CV!='Credit'&&CV!='Dividends')return _coL().replace(SG('cv',LVL0,CV),SG('cv',LVL1,CV));
const bar='<section class="p c12" style="padding:6px 12px">'+SG('cv',LVL1,CV)+'</section>';
if(CRS.has(cur)&&!CRC[cur]){crLoad(cur).then(()=>{if(tab==CT)render0()});return bar+P(CV,'<p class="mu m">Loading '+cur+'…</p>','c12')}
return bar+(CV=='Credit'?crCredit():crDiv())};
render();
