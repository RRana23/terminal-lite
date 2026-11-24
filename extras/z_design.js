// Cleanup for a portfolio-ready site: drop fully simulated screens, point placeholders at the real ones.
{const cut=(s,title)=>s.replace(new RegExp('<section class="p[^"]*"><h3>'+title.replace(/[()]/g,'\\$&')+'</h3>[\\s\\S]*?</section>'),'');
const bi=JOBS.findIndex(j=>j[0]=='Bond trader');if(bi>=0)JOBS.splice(bi,1);
const J=n=>JOBS.find(j=>j[0]==n);
const ib_=J('Investment banker'),eq_=J('Equity analyst'),sa_=J('Stock analyst');
if(ib_){const f0=ib_[1];ib_[1]=()=>cut(f0(),'Deal database (simulated)');ib_[2]='Comps, multiples and possible acquirers from Yahoo Finance.';ib_[3]='Comps and possible acquirers'}
if(eq_){const f0=eq_[1];eq_[1]=()=>cut(f0(),'Transcript search and tone flags (demo)');eq_[2]='Financials and consensus from Yahoo Finance.';eq_[3]='Financials, consensus and a model builder'}
if(sa_){const f0=sa_[1];sa_[1]=()=>f0().replace(/<h3>Ownership, insiders and events<\/h3>[\s\S]*?<\/section>/,'<h3>Ownership, insiders and events</h3><p class="mu">On the Company tab for each stock.</p><p><button class="in" data-a="co" data-v="'+cur+'">Open '+cur+' company page</button></p></section>');sa_[2]='Screener and factor scores from Yahoo Finance and price data.';sa_[3]='Screener and factor scores'}
if(JOB>=JOBS.length)JOB=0}
// equity analyst: model builder spans the row once the demo panel is gone
{const _eq=JOBS.find(j=>j[0]=='Equity analyst');if(_eq){const g=_eq[1];_eq[1]=()=>g().replace('<section class="p c8"><h3>Model builder','<section class="p c12"><h3>Model builder')}}
// the transcript panel is gone, so its search box may be missing
const _aiZ=ai;ai=function(v){if($('#ai'))_aiZ(v)};
render();
