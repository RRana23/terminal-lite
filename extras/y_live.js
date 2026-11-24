// Phase 6: live prices from Finnhub (free key, stored only in this browser). Ticker tape, live quotes on Markets, live portfolio value.
const LV={},LSEED={},TAPE=['SPY','QQQ','DIA','IWM','TLT','GLD','BTC-USD'];let LKEY='',LWS=null,LSTAT='off',LSUB=new Set(),LDIRTY=0,LOPEN=0;
try{LKEY=localStorage.getItem('fhkey')||''}catch(e){}
const LSYM=t=>({'BTC-USD':'BINANCE:BTCUSDT','ETH-USD':'BINANCE:ETHUSDT','SOL-USD':'BINANCE:SOLUSDT'})[t]||(/^[A-Z][A-Z0-9-]*$/.test(t)?t.replace('-','.'):null);
const LBACK={};const lastClose=t=>{const a=A(t);if(!a)return null;if(a.c&&a.c.length)return a.c.at(-2);return a.p};
function lWanted(){const s=new Set(TAPE);[cur,ac,...PF.map(h=>h.t),...SEL].forEach(t=>{if(t&&LSYM(t))s.add(t)});return[...s].slice(0,45)}
function lMarket(){const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short',hour:'numeric',minute:'numeric',hour12:false}).formatToParts(new Date()),g=k=>(p.find(x=>x.type==k)||{}).value,wd=g('weekday'),m=+g('hour')*60+ +g('minute');return!['Sat','Sun'].includes(wd)&&m>=570&&m<960}
function lSeed(t){if(LSEED[t]||!LKEY)return;LSEED[t]=1;const s=LSYM(t);if(!s)return;
if(s.includes(':')){const pc=lastClose(t);if(pc)LV[t]=Object.assign(LV[t]||{},{pc});return}
LQ.push(()=>fetch('https://finnhub.io/api/v1/quote?symbol='+encodeURIComponent(s)+'&token='+LKEY).then(r=>r.json()).then(q=>{if(q&&q.c){LV[t]=Object.assign(LV[t]||{},{p:LV[t]&&LV[t].live?LV[t].p:q.c,pc:q.pc,h:q.h,l:q.l});lDirty()}else if(q&&q.error){LSTAT='key not accepted';lStatus()}}).catch(()=>{}));lPump()}
const LQ=[];let LPT=0;function lPump(){if(LPT)return;LPT=setInterval(()=>{const j=LQ.shift();if(j)j();else{clearInterval(LPT);LPT=0}},150)}
function lConnect(){if(!LKEY||LWS)return;LSTAT='connecting';lStatus();const ws=new WebSocket('wss://ws.finnhub.io?token='+LKEY);LWS=ws;LSUB=new Set();
ws.onopen=()=>{LSTAT='live';lStatus();lSync()};ws.onclose=()=>{LWS=null;if(LSTAT!='off'){LSTAT='reconnecting';lStatus();setTimeout(lConnect,5000)}};ws.onerror=()=>{};
ws.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch(x){return}if(m.type!='trade')return;m.data.forEach(d=>{const t=LBACK[d.s];if(!t)return;LV[t]=Object.assign(LV[t]||{},{p:d.p,live:1,ts:d.t})});lDirty()}}
function lSync(){const want=lWanted();want.forEach(t=>{lSeed(t);const s=LSYM(t);LBACK[s]=t;if(LWS&&LWS.readyState==1&&!LSUB.has(s)){LWS.send(JSON.stringify({type:'subscribe',symbol:s}));LSUB.add(s)}});
if(LWS&&LWS.readyState==1)[...LSUB].forEach(s=>{if(!want.some(t=>LSYM(t)==s)){LWS.send(JSON.stringify({type:'unsubscribe',symbol:s}));LSUB.delete(s)}});lTape()}
function lDirty(){if(LDIRTY)return;LDIRTY=1;requestAnimationFrame(()=>{LDIRTY=0;lApply()})}
const lpc=(t,dg)=>{const v=LV[t];if(!v||v.p==null)return null;return{p:v.p,ch:v.pc?(v.p/v.pc-1)*100:null}};
function lApply(){document.querySelectorAll('[data-lp]').forEach(el=>{const t=el.dataset.lp,q=lpc(t);if(!q)return;const s=f(q.p,q.p<10?4:2);if(el.textContent!=s){el.textContent=s;el.style.transition='none';el.style.color='var(--am)';requestAnimationFrame(()=>{el.style.transition='color 1.2s';el.style.color=''})}});
document.querySelectorAll('[data-lc]').forEach(el=>{const q=lpc(el.dataset.lc);if(!q||q.ch==null)return;el.className=(q.ch>=0?'up':'dn')+' m';el.textContent=(q.ch>=0?'+':'')+f(q.ch)+'% '+(el.dataset.lw||'today')});
const pv=$('#lvpf');if(pv)pv.innerHTML=lPort()}
function lTape(){const el=$('#tape');if(!el)return;const syms=lWanted().filter(t=>TAPE.includes(t)||PF.some(h=>h.t==t));
el.innerHTML='<span class="m" style="color:'+(LSTAT=='live'?'var(--up)':'var(--mu)')+'">●</span> <span class="mu m">'+(lMarket()?'Market open':'Market closed')+' · '+(LKEY?LSTAT:'live prices off')+'</span>'+syms.map(t=>'<button data-a="open" data-v="'+t+'" style="background:none;border:0;cursor:pointer;padding:0 0 0 16px;font:inherit;color:var(--tx)" class="m">'+t+' <span data-lp="'+t+'">'+(lpc(t)?f(lpc(t).p):'–')+'</span> <span data-lc="'+t+'" data-lw=" " class="mu m"></span></button>').join('')+' <button data-a="lset" class="in" style="width:auto;cursor:pointer;margin-left:16px">'+(LKEY?'Live settings':'Turn on live prices')+'</button>';lApply()}
function lStatus(){lTape()}
function lPort(){let v=0,d=0,n=0;PF.forEach(h=>{const q=lpc(h.t),pc=LV[h.t]&&LV[h.t].pc;if(q&&pc){v+=h.n*q.p;d+=h.n*(q.p-pc);n++}});
return n?'<div style="display:flex;gap:32px;flex-wrap:wrap;align-items:baseline"><div><div class="big">$'+f(v,0)+'</div><div class="mu">live value of '+n+' of '+PF.length+' holdings</div></div><div><div class="big '+(d>=0?'up':'dn')+'">'+(d>=0?'+':'-')+'$'+f(Math.abs(d),0)+'</div><div class="mu">change since yesterday’s close</div></div></div>':'<p class="mu">Waiting for quotes…</p>'}
S.lset=()=>{const k=prompt('Paste your free Finnhub API key (from finnhub.io, Dashboard). It is saved only in this browser. Leave empty to turn live prices off.',LKEY);if(k===null)return 'skip';LKEY=k.trim();try{LKEY?localStorage.setItem('fhkey',LKEY):localStorage.removeItem('fhkey')}catch(e){}
if(LWS){LSTAT='off';LWS.close();LWS=null}Object.keys(LSEED).forEach(k=>delete LSEED[k]);if(LKEY){LSTAT='connecting';lConnect()}else LSTAT='off';lTape();return 'skip'};
// tape under the header
{const t=document.createElement('div');t.id='tape';t.style.cssText='padding:6px 14px;border-bottom:1px solid var(--ln);white-space:nowrap;overflow-x:auto;font-size:12px';$('header').after(t)}
// live quotes on Markets (stocks and other assets) and a live panel on Portfolio
const LRX=/<div class="big">([^<]*)<\/div><div class="(up|dn) m">([^<]*?)(today|last day)<\/div>/;
const _h0d=home0;home0=function(){return _h0d().replace(LRX,(m,a,b,c,w)=>'<div class="big" data-lp="'+cur+'">'+a+'</div><div class="'+b+' m" data-lc="'+cur+'" data-lw="'+w+'">'+c+w+'</div>')};
const _hx=homeX;homeX=function(){return _hx().replace(LRX,(m,a,b,c,w)=>'<div class="big" data-lp="'+ac+'">'+a+'</div><div class="'+b+' m" data-lc="'+ac+'" data-lw="'+w+'">'+c+w+'</div>')};
const _pfL=pf;pf=function(){return(LKEY?P('Live portfolio value','<div id="lvpf">'+lPort()+'</div><div class="mu" style="margin-top:6px">From live Finnhub quotes. The panels below use last night’s closing prices.</div>','c12'):'')+_pfL()};
const _r3=render0;render0=function(){_r3();lSync();lApply()};
if(LKEY)lConnect();render();
