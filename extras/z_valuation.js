// DCF and WACC (Bloomberg DCF / WACC): a five-year unlevered free cash flow model on the Company tab, seeded from the
// company's own statements, current Treasury yield and beta. Every assumption is editable; a sensitivity grid shows the range.
let DS={t:null},DSCROLL=0;
FN.DCF=['Discounted cash flow valuation',1,()=>{tab=CT;CV='DCF'}];
FN.WACC=['Cost of capital (WACC)',1,()=>{tab=CT;CV='DCF';DSCROLL=1}];
if(typeof GUIDE!='undefined'){const g=GUIDE.find(x=>x[0]=='Company research');if(g){const i=g[1].findIndex(r=>r[0]=='FA');g[1].splice(i+1,0,['DCF','NVDA DCF','Five-year discounted cash flow model seeded from the company’s statements: revenue growth, margins, cash conversion, terminal value, value per share vs price, and a WACC by terminal growth sensitivity grid. Every input is editable.'],['WACC','NVDA WACC','Cost of capital: risk-free rate (10-year Treasury), adjusted beta, equity risk premium, cost of debt and capital weights.'])}}
S.dreset=()=>{DS.t=null};
const dClamp=(v,a,b)=>Math.min(b,Math.max(a,v)),dR=(v,s=.5)=>Math.round(v/s)*s;
function dHist(fa){const R=fa.rows,rev=R.Revenue||[],op=R['Operating income']||[],ocf=R['Operating cash flow']||[],cx=R['Capital spending']||[];
let L=-1;rev.forEach((v,i)=>{if(v!=null&&op[i]!=null)L=i});if(L<0||!(rev[L]>0))return null;
const k=Math.max(0,L-3);let i0=k;while(i0<L&&!(rev[i0]>0))i0++;const yrs=L-i0,cagr=yrs?(rev[L]/rev[i0])**(1/yrs)-1:0;
const ms=[];for(let i=Math.max(0,L-2);i<=L;i++)if(rev[i]>0&&op[i]!=null)ms.push(op[i]/rev[i]);
const cv=[];for(let i=Math.max(0,L-2);i<=L;i++)if(op[i]>0&&ocf[i]!=null&&cx[i]!=null)cv.push((ocf[i]-Math.abs(cx[i]))/(op[i]*(1-.21)));
const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
return{L,yr:fa.ends[L].slice(0,4),rev:rev[L],m0:op[L]/rev[L],mAvg:ms.length?avg(ms):op[L]/rev[L],cagr,yrs,conv:cv.length?avg(cv):null,
ltd:(R['Long-term debt']||[])[L],cash:(R.Cash||[])[L],dsh:(R['Diluted shares']||[])[L]}}
function dDefaults(h){const d=fd_(cur),px=CO[cur][1],tg=2.5,g1=dR(dClamp(h.cagr*100,-5,40)),rf=EXT['^TNX']?+EXT['^TNX'].p.toFixed(2):4.25,raw=CO[cur][5];
return{t:cur,g1,g5:g1>tg?dR(Math.max(tg+.5,g1/2)):tg,mT:+(h.mAvg*100).toFixed(1),tax:21,conv:Math.round(dClamp(h.conv==null?.8:h.conv,.3,1.2)*100),tg,
rf,beta:raw==null?1:+(raw).toFixed(2),erp:4.5,kd:+(rf+1.5).toFixed(2),px,cap:d.cap||null,ev:d.ev||null,tgt:d.tgt||null}}
// model
function dModel(h,a,W,tg){const t=a.tax/100,rows=[];let rev=h.rev;
for(let y=1;y<=5;y++){const g=(a.g1+(a.g5-a.g1)*(y-1)/4)/100,m=h.m0+(a.mT/100-h.m0)*y/5;rev*=1+g;const ebit=rev*m,nop=ebit*(1-t),fcf=nop*a.conv/100,df=(1+W)**-y;rows.push({y,g,rev,m,ebit,nop,fcf,df,pv:fcf*df})}
const last=rows[4],ok=W>tg+.0025,tv=ok?last.fcf*(1+tg)/(W-tg):null,pvtv=ok?tv*last.df:null,sum=rows.reduce((s,r)=>s+r.pv,0),ev=ok?sum+pvtv:null;
const nd=a.ev!=null&&a.cap!=null?a.ev-a.cap:(h.ltd||0)-(h.cash||0),sh=a.cap&&a.px?a.cap/a.px:h.dsh,eq=ev==null?null:ev-nd,ps=eq!=null&&sh?eq/sh:null;
return{rows,tv,pvtv,sum,ev,nd,sh,eq,ps,tvShare:ev?pvtv/ev:null,exit:tv&&last.ebit>0?tv/last.ebit:null}}
function dWacc(h,a){const ba=.67*a.beta+.33,ke=a.rf/100+ba*a.erp/100,kd=a.kd/100*(1-a.tax/100),D=Math.max(0,h.ltd!=null?h.ltd:(a.ev!=null&&a.cap!=null?a.ev-a.cap:0)),E=a.cap||0,wd=D+E?D/(D+E):0;
return{ba,ke,kd,D,E,wd,we:1-wd,W:(1-wd)*ke+wd*kd}}
// view
function dcfView(c){const fa=c.sec&&c.sec.fa,h=fa&&dHist(fa);
if(!h)return P('DCF, '+cur,'<p class="mu">There aren’t enough statement lines for '+cur+' to build a cash flow model. Banks and insurers don’t report operating income the same way; for them, compare P/B and P/E with peers (<code>'+cur+' RV</code>).</p>','c12');
if(DS.t!=cur)DS=dDefaults(h);const a=DS,inp=(id,lab,step,hint)=>'<label class="dl"><span>'+lab+(hint?'<small>'+hint+'</small>':'')+'</span><input type="number" id="d_'+id+'" step="'+step+'" value="'+a[id]+'" oninput="dIn()"></label>';
const ops=inp('g1','Revenue growth, year 1 (%)',.5,h.yrs?h.yrs+'-yr history: '+f(h.cagr*100,1)+'% a year':'')+inp('g5','Revenue growth, year 5 (%)',.5,'Fades in a straight line from year 1')+inp('mT','Operating margin by year 5 (%)',.5,'FY'+h.yr+': '+f(h.m0*100,1)+'%; 3-yr avg '+f(h.mAvg*100,1)+'%')
+inp('tax','Tax rate (%)',1,'US federal rate is 21%')+inp('conv','Cash conversion (%)',5,'Free cash flow ÷ after-tax operating profit'+(h.conv!=null?'; recent avg '+f(h.conv*100,0)+'%':''))+inp('tg','Terminal growth (%)',.25,'Long-run growth, usually 2–3%');
const wc=inp('rf','Risk-free rate (%)',.05,'10-year Treasury yield')+inp('beta','Beta, raw',.05,'1-year daily vs the average S&P 500 stock')+inp('erp','Equity risk premium (%)',.25,'Damodaran’s US estimate has run about 4–5%')+inp('kd','Pre-tax cost of debt (%)',.05,'Treasury yield + about 1.5% for investment grade')+'<div id="dwacc"></div>';
return P('DCF assumptions, '+cur,ops+'<p><button class="in" data-a="dreset" style="width:auto">Reset to defaults</button></p>','c4')
+P('Cost of capital (WACC)',wc,'c4" id="dwp')
+P('Value per share','<div id="dres"></div>','c4')
+P('Five-year projection (USD)','<div id="dproj" class="dscroll"></div>','c12')
+P('Sensitivity: value per share','<div id="dsens"></div><div class="mu dcap">Rows: WACC. Columns: terminal growth. Green is above today’s price, red below.</div>','c6')
+P('How this model works','<ol class="dhow"><li>Revenue grows from the last fiscal year at a rate that fades from year 1 to year 5.</li><li>Operating margin moves in a straight line to the year-5 target. Operating profit is taxed to get NOPAT.</li><li>Free cash flow = NOPAT × cash conversion, a shortcut for capex, depreciation and working capital, set from the company’s own history.</li><li>Cash flows and a Gordon growth terminal value are discounted at the WACC, at year end.</li><li>Enterprise value minus net debt is equity value; divided by shares, that’s value per share.</li></ol><p class="mu dcap">Beta uses the Bloomberg-style adjustment (⅔ raw + ⅓ × 1), which pulls estimates toward the market average. Statements: '+(c.sec.src=='yahoo'?'Yahoo Finance':'SEC filings')+'. A model, not a forecast.</p>','c6')}
function dIn(){['g1','g5','mT','tax','conv','tg','rf','beta','erp','kd'].forEach(k=>{const v=parseFloat(($('#d_'+k)||{}).value);if(isFinite(v))DS[k]=v});dCalc()}
function dCalc(){const c=CD[cur],fa=c&&c.sec&&c.sec.fa,h=fa&&dHist(fa);if(!h||!$('#dres'))return;const a=DS,w=dWacc(h,a),m=dModel(h,a,w.W,a.tg/100),px=a.px,pp=v=>v==null||!isFinite(v)?'–':(v<0?'-$':'$')+f(Math.abs(v),2);
$('#dwacc').innerHTML=KV('Adjusted beta',f(w.ba,2))+KV('Cost of equity',fpct(w.ke,2))+KV('After-tax cost of debt',fpct(w.kd,2))+KV('Weights: equity / debt',fpct(w.we,0)+' / '+fpct(w.wd,0))+KV('<b>WACC</b>','<b>'+fpct(w.W,2)+'</b>')+'<div class="mu dcap">Cost of equity = risk-free + beta × premium (CAPM). Debt is long-term debt; equity is market cap.</div>';
const up=m.ps!=null&&px?m.ps/px-1:null,mx=Math.max(px||0,m.ps||0,a.tgt||0)||1,bar=(n,v,cl)=>v==null||!isFinite(v)?'':'<div class="dbar"><span>'+n+'</span><div><i class="'+cl+'" style="width:'+Math.max(2,Math.max(0,v)/mx*100).toFixed(1)+'%"></i></div><b>'+pp(v)+'</b></div>';
$('#dres').innerHTML=(m.ps==null?'<p class="dn">WACC must be above terminal growth. Raise the WACC inputs or lower terminal growth.</p>':
'<div class="dbig"><b>'+pp(m.ps)+'</b><span class="'+(up>0?'up':'dn')+'">'+(up>0?'+':'')+f(up*100,1)+'% vs price</span></div>'
+bar('DCF value',m.ps,'dv')+bar('Price',px,'dp')+bar('Analyst target',a.tgt,'dt')
+KV('Enterprise value',fbig(m.ev))+KV('Less net debt',fbig(m.nd))+KV('Equity value',fbig(m.eq))+KV('Shares',m.sh?f(m.sh/1e6,0)+'M':'–')
+KV('Terminal value share of EV',fpct(m.tvShare,0))+KV('Implied exit multiple, EV/EBIT',m.exit?f(m.exit,1)+'x':'–'))
+(m.tvShare>.8?'<div class="mu dcap">Most of the value sits in the terminal value, so small changes to WACC or terminal growth move the answer a lot.</div>':'');
const r=m.rows,hd=['','FY'+h.yr+' actual',...r.map(x=>'Year '+x.y)],act=[h.rev,null,h.rev*h.m0,h.rev*h.m0*(1-a.tax/100)];
const line=(n,fn,a0)=>[n,a0,...r.map(fn)];
$('#dproj').innerHTML=T(hd,[line('Revenue',x=>fnum(x.rev),fnum(h.rev)),line('Revenue growth',x=>fpct(x.g,1),h.yrs?fpct(h.cagr,1)+' avg':'–'),line('Operating margin',x=>fpct(x.m,1),fpct(h.m0,1)),line('Operating profit (EBIT)',x=>fnum(x.ebit),fnum(act[2])),line('NOPAT (after tax)',x=>fnum(x.nop),fnum(act[3])),line('Free cash flow',x=>fnum(x.fcf),'–'),line('Discount factor',x=>f(x.df,3),''),line('Present value',x=>fnum(x.pv),'')]).replace('<table','<table class="dt"')
+'<div class="mu dcap">Sum of present values '+fbig(m.sum)+(m.tv?' + present value of terminal value '+fbig(m.pvtv)+' (terminal value '+fbig(m.tv)+')':'')+' = enterprise value '+fbig(m.ev)+'.</div>';
const Ws=[-1,-.5,0,.5,1].map(d=>w.W+d/100),Gs=[-1,-.5,0,.5,1].map(d=>a.tg/100+d/100);
$('#dsens').innerHTML='<table class="ds"><tr><th>WACC \\ g</th>'+Gs.map(g=>'<th>'+fpct(g,1)+'</th>').join('')+'</tr>'+Ws.map((W,i)=>'<tr><th>'+fpct(W,1)+'</th>'+Gs.map((g,j)=>{const v=dModel(h,a,W,g).ps;return'<td class="'+(v==null?'mu':v>px?'up':'dn')+(i==2&&j==2?' dc':'')+'">'+(v==null?'n/m':pp(v))+'</td>'}).join('')+'</tr>').join('')+'</table>'}
// Company tab: add a DCF view after Financials
const _coV=company,DVL0=[...CVL,'News','Events'],DVL1=['Overview','Financials','DCF','Filings','Ownership','Insiders','News','Events'];
company=function(){if(!CO[cur])return _coV();if(CV!='DCF')return _coV().replace(SG('cv',DVL0,CV),SG('cv',DVL1,CV));
const c=CD[cur];if(!c||!c.ok){coLoad(cur).then(()=>{if(tab==CT)render0()});return P('Company','<p class="mu m">Loading '+cur+'…</p>','c12')}
Q.push(()=>{dCalc();if(DSCROLL){DSCROLL=0;const p=$('#dwp');if(p)p.scrollIntoView({behavior:'smooth',block:'start'})}});
return'<section class="p c12" style="padding:6px 12px">'+SG('cv',DVL1,CV)+'</section>'+dcfView(c)};
render();
