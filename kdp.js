(()=>{
'use strict';
const $=id=>document.getElementById(id);
const KEY='mymoney-kdp-v1',CORE='mymoney-personal-v1';
const money=n=>new Intl.NumberFormat('fr-MA',{maximumFractionDigits:2,minimumFractionDigits:2}).format(Number(n)||0)+' MAD';
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const valid=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
let state;try{state=JSON.parse(localStorage.getItem(KEY)||'{}')}catch{state={}}
if(!state||typeof state!=='object'||!Array.isArray(state.payouts)||!Array.isArray(state.buys))state={payouts:[],buys:[]};
let market=null;
const persist=()=>{localStorage.setItem(KEY,JSON.stringify(state));render()};
const purchases=()=>state.buys.reduce((a,b)=>a+b.qty*b.price+b.fees,0);
const royalties=()=>state.payouts.reduce((a,p)=>a+p.mad,0);
function render(){
  const total=royalties(),cost=purchases(),cash=total-cost;
  $('kdpTotal').textContent=money(total);$('kdpInvested').textContent=money(cost);$('kdpCash').textContent=money(cash);
  $('kdpCash').classList.toggle('kdpBalanceNegative',cash<0);
  const by=new Map();
  for(const b of state.buys){let v=by.get(b.symbol)||{symbol:b.symbol,qty:0,cost:0};v.qty+=b.qty;v.cost+=b.qty*b.price+b.fees;by.set(b.symbol,v)}
  const items=[...by.values()].sort((a,b)=>b.cost-a.cost);
  let knownTotal=0,knownCost=0,missing=0;
  $('kdpHoldings').innerHTML=items.length?items.map(x=>{
    let quote=market?.stocks?.find(t=>t.symbol===x.symbol);
    let pr=Number(quote?.price),hasPrice=Number.isFinite(pr)&&pr>0;
    let value=hasPrice?pr*x.qty:null;if(hasPrice){knownTotal+=value;knownCost+=x.cost}else missing++;
    let diff=hasPrice?value-x.cost:null;
    return '<div class="kdpHolding"><div class="row wrap"><strong>'+esc(quote?.name||x.symbol)+' <span class="ticker">'+esc(x.symbol)+'</span></strong><b>'+money(x.cost)+'</b></div><div class="kdpDetails">'+x.qty+' shares · average cost '+money(x.cost/x.qty)+' / share</div><div class="kdpDetails">'+(hasPrice?'Snapshot value '+money(value)+' · estimated '+(diff>=0?'+':'')+money(diff):'No verified snapshot price for this holding')+'</div></div>'
  }).join(''):'<p class="muted">No Casablanca shares recorded yet. Add a purchase above after you actually buy shares through your broker.</p>';
  $('kdpValuationDate').textContent=market?.updated?'Prices '+market.updated:'Prices not synced';
  $('kdpPortfolioNote').textContent=items.length&&missing===0?'Indicative market value '+money(knownTotal)+' · unrealized change '+money(knownTotal-knownCost)+' (before dividends, taxes and sale fees).':missing?missing+' holding(s) have no available reference price; no total portfolio valuation shown.':'Record actual purchases; prices are reference estimates, not executable quotes.';
  const records=[...state.payouts.map(p=>({kind:'payout',...p})),...state.buys.map(b=>({kind:'buy',...b}))].sort((a,b)=>b.date.localeCompare(a.date));
  $('kdpActivity').innerHTML=records.length?records.map(r=>{
    let title=r.kind==='payout'?'Amazon KDP · '+r.amount+' '+esc(r.currency):'Purchase · '+esc(r.symbol)+' × '+r.qty;
    let amount=r.kind==='payout'?'+ '+money(r.mad):'− '+money(r.qty*r.price+r.fees);
    return '<div class="transaction"><div class="tleft"><div class="tname">'+title+'</div><div class="tmeta">'+esc(r.date)+'</div></div><div class="tright"><strong>'+amount+'</strong><button type="button" class="trash" data-kdp-delete="'+r.kind+':'+esc(r.id)+'" aria-label="Delete record">×</button></div></div>';
  }).join(''):'<p class="muted">Your KDP payouts and Casablanca purchases will appear here.</p>';
  if(market?.stocks?.length)$('kdpSymbols').innerHTML=market.stocks.map(t=>'<option value="'+esc(t.symbol)+'">'+esc(t.name)+'</option>').join('');
}
async function updateMarket(snapshot){if(!snapshot||!Array.isArray(snapshot.stocks))return;market=snapshot;render()}
window.addEventListener('mymoney-market-sync',e=>updateMarket(e.detail?.market));
fetch('data/market.json?v='+Date.now(),{cache:'no-store'}).then(r=>r.ok?r.json():null).then(updateMarket).catch(()=>{});
$('kdpRoyaltyDate').value=today();$('kdpTradeDate').value=today();
$('kdpRoyaltyCurrency').addEventListener('change',()=>{if($('kdpRoyaltyCurrency').value==='MAD'&&!$('kdpCredited').value)$('kdpCredited').value=$('kdpRoyaltyAmount').value});
$('kdpRoyaltyForm').addEventListener('submit',e=>{
  e.preventDefault();const amount=Number($('kdpRoyaltyAmount').value),mad=Number($('kdpCredited').value);
  const currency=$('kdpRoyaltyCurrency').value,date=$('kdpRoyaltyDate').value;
  if(!valid(amount)||!valid(mad)||amount<=0||mad<=0||!['EUR','USD','MAD'].includes(currency)||!(/^\d{4}-\d{2}-\d{2}$/).test(date)){$('kdpRoyaltyError').textContent='Enter a valid payout, currency, net dirhams and date.';return}
  state.payouts.push({id:'r'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),amount,currency,mad,date});
  $('kdpRoyaltyForm').reset();$('kdpRoyaltyDate').value=today();$('kdpRoyaltyError').textContent='';persist();
});
$('kdpTradeForm').addEventListener('submit',e=>{
  e.preventDefault();const symbol=$('kdpTicker').value.toUpperCase().trim(),qty=Number($('kdpQty').value),price=Number($('kdpPrice').value),fees=Number($('kdpFees').value),date=$('kdpTradeDate').value;
  if(!/^[A-Z0-9.]{2,12}$/.test(symbol)||!Number.isInteger(qty)||qty<=0||!valid(price)||price<=0||!valid(fees)||!(/^\d{4}-\d{2}-\d{2}$/).test(date)){$('kdpTradeError').textContent='Enter a valid symbol, number of shares, price, fees and date.';return}
  state.buys.push({id:'b'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),symbol,qty,price,fees,date});
  $('kdpTradeForm').reset();$('kdpTradeDate').value=today();$('kdpFees').value='0';$('kdpTradeError').textContent='';persist();
});
$('kdpActivity').addEventListener('click',e=>{
  const button=e.target.closest('[data-kdp-delete]');if(!button)return;const [kind,id]=button.dataset.kdpDelete.split(':');
  if(!confirm('Delete this recorded item?'))return;
  if(kind==='payout')state.payouts=state.payouts.filter(v=>v.id!==id);
  if(kind==='buy')state.buys=state.buys.filter(v=>v.id!==id);
  persist();
});
$('exportData').addEventListener('click',e=>{
  e.preventDefault();e.stopImmediatePropagation();
  const core=JSON.parse(localStorage.getItem(CORE)||'{}');core.kdpTracker=state;
  const url=URL.createObjectURL(new Blob([JSON.stringify(core,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='mymoney-full-backup-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
},true);
$('importFile').addEventListener('change',async e=>{
  e.stopImmediatePropagation();const file=e.target.files?.[0];if(!file)return;
  try{
    const raw=JSON.parse(await file.text());
    if(!raw||!Array.isArray(raw.categories)||!Array.isArray(raw.goals)||!raw.months||typeof raw.months!=='object')throw Error('Not a MyMoney backup');
    if(!confirm('Replace your saved budget with this backup?'+(raw.kdpTracker?' KDP entries will also be restored.':' Your existing KDP entries will be preserved.')))return;
    localStorage.setItem(CORE,JSON.stringify(raw));
    if(raw.kdpTracker&&Array.isArray(raw.kdpTracker.payouts)&&Array.isArray(raw.kdpTracker.buys))localStorage.setItem(KEY,JSON.stringify(raw.kdpTracker));
    location.reload();
  }catch(err){alert('Import failed: '+err.message)}finally{e.target.value=''}
},true);
render();
})();