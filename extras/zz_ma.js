// Moving averages on the Markets chart: adds 1, 5 and 10-day lines next to 20/50/100/200, plus custom periods the
// viewer types in. Choices are remembered in this browser. On weekly or monthly candles the periods count candles.
const MAPAL=['#e9c46a','#f472b6','#38bdf8','#a3e635','#fb923c','#c084fc','#2dd4bf','#f87171'];
const maGet=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}},maSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
Object.assign(MAC,{1:'--mu',5:'#ff7a59',10:'#2ec4b6'});
let MAX=maGet('maCustom',[]).filter(p=>p>=1&&p<=500);
{const base={1:0,5:0,10:0,...MA};MAX.forEach((p,i)=>{base[p]=1;if(!MAC[p])MAC[p]=MAPAL[i%MAPAL.length]});Object.keys(base).forEach(k=>MA[k]=base[k]);
const on=maGet('maOn',null);if(on)Object.keys(MA).forEach(k=>MA[k]=on.includes(+k)?1:0)}
const maSave=()=>{maSet('maCustom',MAX);maSet('maOn',Object.keys(MA).filter(k=>MA[k]).map(Number))};
S.ma=v=>{MA[v]^=1;maSave()};
S.maadd=()=>{const el=$('#mai'),p=Math.round(+((el||{}).value||0));if(!(p>=1&&p<=500)){if(el){el.value='';el.placeholder='1 to 500'}return'skip'}
if(MA[p]==null){MAX.push(p);MAC[p]=MAPAL[(MAX.length-1)%MAPAL.length]}MA[p]=1;maSave()};
S.madel=v=>{v=+v;MAX=MAX.filter(p=>p!=v);if(![1,5,10,20,50,100,200].includes(v)){delete MA[v];delete MAC[v]}maSave()};
S.manone=()=>{Object.keys(MA).forEach(k=>MA[k]=0);maSave()};
FN.MA=['Moving averages on the chart',1,()=>{tab=0;setTimeout(()=>{const i=$('#mai');if(i)i.focus()},50)}];
if(typeof GUIDE!='undefined'){const g=GUIDE.find(x=>x[0]=='Markets and the economy')||GUIDE[0];g[1].splice(1,0,['MA','NVDA MA','Moving averages on the price chart: 1, 5, 10, 20, 50, 100 and 200 days, plus any custom period you type in (1 to 500). Your choices are remembered.'])}
function maLegend(){const cl=(RAW[cur]||{}).c||[],on=Object.keys(MA).filter(k=>MA[k]).map(Number);if(!cl.length||!on.length)return'';const L=cl.length,v=p=>L>=p?cl.slice(L-p).reduce((a,b)=>a+b,0)/p:null,px=cl[L-1];
return'<div class="mal">'+on.map(p=>{const a=v(p),d=a?(px/a-1)*100:null,c=MAC[p][0]=='#'?MAC[p]:'var('+MAC[p]+')';return'<span><i style="background:'+c+'"></i>'+p+'d '+(a==null?'–':f(a))+(d==null||p==1?'':' <em class="'+(d>=0?'up':'dn')+'">'+(d>=0?'+':'')+f(d,1)+'%</em>')+'</span>'}).join('')+'</div>'}
const _homeMA=home0;
home0=function(){const h=_homeMA();if(!h.includes('<canvas id="ch"></canvas>'))return h;
const cus=MAX.length?'<span class="mu" style="margin-left:4px">Custom:</span>'+MAX.map(p=>'<button class="mx" data-a="madel" data-v="'+p+'" title="Remove the '+p+'-day average">'+p+'d ×</button>').join(''):'';
const ctl='<div class="mac"><label class="mu" for="mai">Add a moving average</label><input id="mai" class="in" type="number" min="1" max="500" step="1" placeholder="Days" onkeydown="if(event.key==\'Enter\'){if(S.maadd()!==\'skip\')render()}"><button class="in" data-a="maadd">Add</button><button class="in" data-a="manone">Clear all</button>'+cus+'</div>';
return h.replace('<canvas id="ch"></canvas>',ctl+maLegend()+'<canvas id="ch"></canvas>'+(iv!='1D'?'<div class="mu" style="font-size:11.5px;margin-top:4px">On '+(iv=='1W'?'weekly':'monthly')+' candles, a 20 line averages 20 '+(iv=='1W'?'weeks':'months')+'.</div>':''))};
render();
