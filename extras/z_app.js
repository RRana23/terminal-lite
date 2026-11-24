// Step 3: Bloomberg-style command bar (e.g. NVDA FA), keyboard shortcuts, help sheet, install as an app.
const ALIAS={SPX:'^GSPC',INDU:'^DJI',DJI:'^DJI',CCMP:'^IXIC',NDX:'^IXIC',RTY:'^RUT',VIX:'^VIX',TNX:'^TNX',US10Y:'^TNX',BTC:'BTC-USD',ETH:'ETH-USD',SOL:'SOL-USD',EUR:'EURUSD=X',EURUSD:'EURUSD=X',JPY:'JPY=X',USDJPY:'JPY=X',GBP:'GBPUSD=X'};
const tick=w=>{w=w.replace('.','-');if(ALIAS[w])return ALIAS[w];if(CO[w]||EXT[w])return w;if(EXT[w+'=X'])return w+'=X';if(EXT['^'+w])return '^'+w;return null};
const desk=n=>{const i=JOBS.findIndex(j=>j[0].startsWith(n));if(i>=0){JOB=i;tab=2}};
// function code: [description, needs a stock?, action]
const FN={
 GP:['Price chart and indicators',0,()=>{tab=0}],DES:['Company description and profile',1,()=>{tab=CT;CV='Overview'}],
 FA:['Financial statements, 5 years',1,()=>{tab=CT;CV='Financials'}],CF:['SEC filings',1,()=>{tab=CT;CV='Filings'}],
 HDS:['Institutional holders',1,()=>{tab=CT;CV='Ownership'}],INS:['Insider trades',1,()=>{tab=CT;CV='Insiders'}],
 CN:['Company news',1,()=>{tab=CT;CV='News'}],ERN:['Next earnings and dividends',1,()=>{tab=CT;CV='Events'}],
 OMON:['Options chain and strategy builder',0,t=>{S.opt(t||OT)}],RV:['Comps and possible acquirers',1,()=>desk('Investment')],
 EE:['Consensus and model builder',1,()=>desk('Equity')],EQS:['Stock screener and factor scores',0,()=>desk('Stock')],
 TOP:['Top market headlines',0,()=>{tab=NE;NV='Top news'}],EVTS:['Earnings calendar',0,()=>{tab=NE;NV='Earnings'}],
 ECO:['Economic calendar, Fed meetings, indicators',0,()=>{tab=NE;NV='Economy'}],DVD:['Ex-dividend calendar',0,()=>{tab=NE;NV='Dividends'}],
 ECON:['Inflation and housing',0,()=>{tab=1}],GC:['Treasury curve and macro',0,()=>desk('Macro')],RISK:['Market risk monitor',0,()=>desk('Risk')],
 QUANT:['Momentum and RSI signals',0,()=>desk('Quant')],PORT:['Your portfolio',0,()=>{tab=4}],G:['Compare tickers and scenarios (list several)',0,()=>{tab=3}],
 FX:['Currencies',0,()=>desk('Corporate')],CRYP:['Crypto',0,()=>desk('Crypto')],HELP:['This list',0,()=>{helpOpen();return 'skip'}]};
FN.GO=FN.GP;FN.N=FN.TOP;FN.GRP=FN.G;FN.WEI=FN.GP;
function say(msg,err){const m=$('#cmdmsg');if(m){m.textContent=msg;m.className=err?'err':''}}
function cmd(raw){const w=raw.toUpperCase().trim().split(/[\s,]+/).filter(Boolean);if(!w.length)return;
let code=null;const ts=[];for(const x of w){const t=tick(x);if(FN[x]&&!code&&(ts.length||!t))code=x;else if(t)ts.push(t);else{say('Unknown: '+x+'. Type HELP for the list.',1);return}}
if(!code)code=ts.length>1?'G':'GP';const f=FN[code],t=ts[0];
if(code=='G'){if(ts.length){SEL=ts.slice(0,10);GR=GR||'1Y'}}
else if(t){if(f[1]&&!CO[t]){say(code+' works for S&P 500 stocks. Try '+t+' GP.',1);return}if(CO[t])cur=ac=t;else ac=t}
else if(f[1]&&!CO[cur]){say('Add a stock, for example NVDA '+code+'.',1);return}
if(code=='OMON'&&t&&!OPS.has(t)){say('No options chain for '+t+'. Covered: '+OPL.slice(0,12).join(', ')+'…',1);return}
const r=f[2](t);say((t&&code!='G'?t+' ':'')+code+' · '+f[0]);if(r!=='skip')render();const q=$('#q');q.select()}
// command bar replaces plain search
{const q=$('#q');q.removeAttribute('onchange');q.placeholder='Ticker or command, e.g. NVDA FA';q.setAttribute('aria-label','Command bar');q.setAttribute('autocomplete','off');
q.addEventListener('keydown',e=>{if(e.key=='Enter'){e.preventDefault();cmd(q.value)}else if(e.key=='Escape'){q.blur()}});
const m=document.createElement('span');m.id='cmdmsg';m.textContent='Press / to type a command, ? for the list';$('#hd').after(m);
const b=document.createElement('button');b.id='helpbtn';b.textContent='?';b.title='Commands and shortcuts';b.setAttribute('aria-label','Commands and shortcuts');b.onclick=()=>helpOpen();$('header').append(b)}
// help sheet
{const h=document.createElement('div');h.id='help';h.setAttribute('role','dialog');h.setAttribute('aria-modal','true');h.setAttribute('aria-label','Commands and shortcuts');
const rows=Object.entries(FN).filter(([k])=>!['GO','N','GRP','WEI'].includes(k)).map(([k,v])=>['<code>'+(v[1]?'NVDA ':'')+(k=='G'?'NVDA AMD MSFT':k=='OMON'?'SPY OMON':k)+'</code>',v[0]]);
h.innerHTML='<div class="sheet" tabindex="-1"><h2>Commands</h2><p class="mu">Type in the bar at the top and press Enter. A ticker on its own opens its chart. Index names work too: SPX, VIX, BTC, EURUSD.</p>'+T(['Type','Opens'],rows)
+'<h2 style="margin-top:16px">Shortcuts</h2>'+T(['Key','Does'],[['<kbd>/</kbd> or <kbd>⌘K</kbd>','Jump to the command bar'],['<kbd>1</kbd> to <kbd>8</kbd>','Switch tabs, left to right'],['<kbd>?</kbd>','Open this list'],['<kbd>Esc</kbd>','Close this list or leave the command bar']])
+'<h2 style="margin-top:16px">Install as an app</h2><p class="mu">Chrome: the install icon at the right end of the address bar. Safari on Mac: File, then Add to Dock. It opens in its own window with a dock icon.</p><p><button class="in" id="helpclose">Close</button></p></div>';
document.body.append(h);h.addEventListener('click',e=>{if(e.target==h||e.target.id=='helpclose')helpClose()})}
function helpOpen(){$('#help').classList.add('open');const s=$('#help .sheet');s.scrollTop=0;s.focus()}
function helpClose(){$('#help').classList.remove('open')}
// keyboard shortcuts
document.addEventListener('keydown',e=>{const typing=/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName);
if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()=='k'){e.preventDefault();$('#q').focus();$('#q').select();return}
if(e.key=='Escape'){helpClose();return}
if(typing||e.metaKey||e.ctrlKey||e.altKey)return;
if(e.key=='/'){e.preventDefault();$('#q').focus();$('#q').select()}
else if(e.key=='?'){helpOpen()}
else if(/^[1-9]$/.test(e.key)){const b=document.querySelectorAll('#nav button')[+e.key-1];if(b)b.click()}});
// install as an app
if('serviceWorker' in navigator&&location.protocol=='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});
