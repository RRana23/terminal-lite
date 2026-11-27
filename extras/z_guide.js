// Guide tab: every command with what it shows and a Try button, the tickers you can type, shortcuts, tabs and data sources.
TABS.push('Guide');const GTAB=TABS.length-1;
FN.GUIDE=['This guide',0,()=>{tab=GTAB}];
S.run=v=>{$('#q').value=v;cmd(v);return 'skip'};
const GUIDE=[
 ['Charts and quotes',[['GP','NVDA','Candlestick chart (daily, weekly, monthly, up to 10 years) with 20, 50, 100 and 200-day averages, key indicators, a fundamentals panel and the market monitor. A ticker on its own does the same.']]],
 ['Company research',[
  ['DES','NVDA DES','Business description, sector, headquarters, employees, website, plus five years of headline financials.'],
  ['FA','NVDA FA','Five years of income statement, cash flow and balance sheet with growth and margins, a revenue and profit chart, and Copy for Excel.'],
  ['CF','NVDA CF','Recent filings (10-K, 10-Q, 8-K, proxies, Form 4 insider filings, 13D/G) with links to each document.'],
  ['HDS','NVDA HDS','Insider and institutional ownership, the top 10 institutions and top 10 mutual funds, and each one’s latest change.'],
  ['INS','NVDA INS','Recent insider trades: who, their role, buy or sell, shares and value, with total purchases and sales.'],
  ['CN','NVDA CN','The latest headlines for the company, each linking to the article.'],
  ['ERN','NVDA ERN','Next earnings date with EPS and revenue estimates, ex-dividend and pay dates, and recent 8-K filings.']]],
 ['Trading and analysis',[
  ['OMON','SPY OMON','Real options chains for every stock, ETF and index on the site with listed options (4 weekly, 6 monthly and 2 long-dated expirations): calls and puts with bid, ask, volume, open interest and IV; expected move, skew, max pain, volatility smile and term structure; a strategy builder with payoff chart.'],
  ['RV','NVDA RV','Comparable companies in the same industry with EV/EBITDA, EV/Sales, P/E, growth and margins; implied value at the peer median; possible acquirers.'],
  ['EE','NVDA EE','Trailing financials, consensus EPS, price target and rating, and a model builder seeded with real growth and margins.'],
  ['EQS','EQS','Screener across the S&P 900 (S&P 500 plus MidCap 400) by index, sector, P/E, growth, margin, size and dividend yield, plus factor scores for the selected stock.'],
  ['QUANT','QUANT','Momentum leaders and laggards and the most overbought and oversold stocks by RSI.'],
  ['RISK','RISK','VIX, the yield curve spread, the most volatile and highest-beta stocks, and the deepest drawdowns.']]],
 ['Markets and the economy',[
  ['TOP','TOP','Market headlines and headlines for the stocks in your portfolio.'],
  ['EVTS','EVTS','Earnings calendar for the last week and next four, grouped by day, filterable to your portfolio or large caps.'],
  ['ECO','ECO','Economic releases for the next 60 days, upcoming Fed meetings and 12 key indicators with their latest change.'],
  ['DVD','DVD','Ex-dividend dates for the next 30 days with pay dates and yields.'],
  ['ECON','ECON','Inflation (headline and core CPI) and housing: prices by class, supply and demand, mortgage rates.'],
  ['GC','GC','Treasury yields and curve, the market monitor and inflation.'],
  ['FX','FX','Ten currency pairs with moves, volatility and a conversion calculator.'],
  ['CRYP','CRYP','Ten major cryptocurrencies with returns, volatility and drawdowns.']]],
 ['Your tools',[
  ['G','NVDA AMD AVGO','Several tickers at once open Grouping: one chart with every line, the VIX overlay, zoom, and the five scenarios each group is most exposed to.'],
  ['PORT','PORT','Your holdings with value, profit and loss, risk, allocation and stress tests (plus live value if live prices are on).'],
  ['HELP','HELP','A quick pop-up list of commands and shortcuts.'],
  ['GUIDE','GUIDE','This page.']]]];
function guide(){const ex=v=>'<button class="in" data-a="run" data-v="'+v+'" style="width:auto">'+v+'</button>';
const cmdT=GUIDE.map(([g,rows])=>'<h4>'+g+'</h4>'+T(['Code','Try it','What it shows'],rows.map(r=>['<code>'+r[0]+'</code>',ex(r[1]),r[2]])).replace('<table','<table class="cmds"')).join('');
const ali=Object.entries(ALIAS).map(([k,v])=>'<code>'+k+'</code> '+(EXT[v]?EXT[v].n:v)).join(', ');
return P('Commands','<p style="max-width:80ch">Type in the command bar at the top (press <kbd>/</kbd> to jump there) and press Enter. Put the ticker first, then the function, like a Bloomberg terminal: <code>NVDA FA</code>. A ticker on its own opens its chart. Click any example below to run it.</p>'+cmdT,'c12')
+P('What you can type','<p>'+Object.keys(CO).filter(t=>!RAW[t].x).length+' S&amp;P 500 stocks, '+Object.keys(CO).filter(t=>RAW[t].x).length+' S&amp;P MidCap 400 stocks and '+Object.keys(EXT).length+' other assets: '+[['ETF','ETFs','ETF'],['Fund','mutual funds','mutual fund'],['Index','indexes','index'],['Currency','currency pairs','currency pair'],['Crypto','cryptocurrencies','cryptocurrency'],['Bond','bond funds and Treasury yields','bond fund or Treasury yield']].map(([g,l,l1])=>{const n=Object.values(EXT).filter(x=>x.g==g).length;return n+' '+(n==1?l1:l)}).join(', ')+'.</p><p class="mu">Short names: '+ali+'.</p>','c6')
+P('Keyboard shortcuts',T(['Key','Does'],[['<kbd>/</kbd> or <kbd>⌘K</kbd>','Jump to the command bar'],['<kbd>1</kbd> to <kbd>9</kbd>','Switch tabs, left to right'],['<kbd>?</kbd>','Quick list of commands'],['<kbd>Esc</kbd>','Close the list or leave the command bar']]),'c6')
+P('Tabs',T(['Tab','What it shows'],[['Markets','Chart, indicators, fundamentals and the market monitor for the selected ticker'],['Company','Profile, financials, filings, ownership, insiders, news and events'],['Options','Real chains, volatility and the strategy builder'],['News & Events','Headlines, earnings, the economic calendar and dividends'],['Economy','Inflation and housing'],['Desks','Views built for nine finance jobs, from banker to treasurer'],['Grouping','Compare up to 10 tickers and see shared scenario risks'],['Portfolio','Your holdings, risk and stress tests'],['Guide','This page']]),'c6')
+P('Where the data comes from',T(['Data','Source','Refreshed'],[['Prices, fundamentals, options, news, holders','Yahoo Finance','Each weeknight, 6 to 7 pm ET'],['Financial statements and filings','SEC EDGAR, or Yahoo Finance when SEC is unavailable','Each weeknight'],['Inflation, housing, economic calendar','FRED (St. Louis Fed), Zillow, Realtor.com','Each weeknight'],['Fed meeting dates','federalreserve.gov','With each update'],['Live prices (optional)','Finnhub, with your own free key','Live during market hours']])+'<p class="mu" style="margin-top:8px">Built with Python and GitHub Actions. Not investment advice.</p>','c6')}
const _r4=render0;
render0=function(){if(tab!=GTAB){_r4();const n=$('#nav');if(n&&!n.querySelector('[data-v="'+GTAB+'"]'))n.insertAdjacentHTML('beforeend','<button data-a="tab" data-v="'+GTAB+'">Guide</button>');return}
Q=[];$('#hd').textContent=ac+' '+(CO[ac]?CO[ac][0]:EXT[ac].n);$('#v').innerHTML='<div class="mu m" style="margin-bottom:8px">Every command and tab, with examples you can run.</div><div class="grid guide">'+guide()+'</div>';
$('#nav').innerHTML=[0,CT,OP,NE,1,2,3,4,GTAB].map(i=>'<button data-a="tab" data-v="'+i+'" class="'+(i==tab?'on':'')+'">'+TABS[i]+'</button>').join('');if(typeof lSync=='function'){lSync();lApply()}};
render();
