// Tab bar: sets the order of every tab in one place and redraws it after each screen. Loads last.
const NAVO=[0,CT,OP,NE,1,typeof RT!='undefined'?RT:-1,2,3,4,GTAB,ATAB].filter(i=>i>=0&&TABS[i]);
const _rN=render0;
render0=function(){_rN();const n=$('#nav');if(n)n.innerHTML=NAVO.map(i=>'<button data-a="tab" data-v="'+i+'" class="'+(i==tab?'on':'')+'">'+TABS[i]+'</button>').join('')};
render();
