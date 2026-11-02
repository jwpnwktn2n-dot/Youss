'use strict';
(()=>{
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const mad=x=>Number.isFinite(x)?new Intl.NumberFormat('fr-MA',{maximumFractionDigits:2}).format(x)+' MAD':'—';
  const pct=x=>Number.isFinite(x)?(x>=0?'+':'')+x.toFixed(1)+'%':'—';
  const arabic=()=>document.documentElement.lang==='ar';
  const tr=(en,ar)=>arabic()?ar:en;
  let report=null,filter='all',needle='',count=10,loading=false;
  const numeric=n=>typeof n==='number'&&Number.isFinite(n);
  const cleanURL=u=>typeof u==='string'&&/^https:\/\//i.test(u)&&u.length<1600?u:null;
  function status(st){
    return ({
      'Research':['Research further','للبحث المتعمق','positive'],
      'Watch':['Watch','المتابعة','warning'],
      'Caution':['Caution','الحذر','negative'],
      'Data stale':['Stale data','بيانات قديمة','warning'],
      'Insufficient data':['Insufficient data','بيانات غير كافية','warning']
    }[st]||['Review','مراجعة','warning']);
  }
  function fact(text){return '<li>'+esc(text)+'</li>'}
  function relatedNews(entries){
    const arr=Array.isArray(entries)?entries:[];
    if(!arr.length)return '<p class="muted">'+tr('No confidently matched recent issuer headlines.','لا توجد أخبار حديثة مؤكدة مرتبطة بالشركة.')+'</p>';
    return arr.slice(0,3).map(n=>{
      const url=cleanURL(n.url);
      return '<div class="deskLinkedNews"><span class="muted">'+esc(n.date)+' · '+esc(n.source)+'</span><div>'+
        (url?'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(n.title)+'</a>':esc(n.title))+
        '</div></div>';
    }).join('');
  }
  function card(stock){
    const [en,ar,cl]=status(stock.stance);
    const p=stock.positiveFacts||[],r=stock.riskFacts||[],c=stock.scoreComponents||{};
    const entries=Array.isArray(stock.headlines)?stock.headlines:[];
    return '<article class="deskCompany">'+
      '<div class="deskCompanyHeader"><div class="deskName"><span class="deskAvatar" aria-hidden="true">'+esc((stock.symbol||'?').slice(0,2))+'</span><div><strong>'+esc(stock.name)+'</strong><small>'+esc(stock.symbol)+' · '+esc(stock.sector)+'</small></div></div>'+
      '<span class="deskSignal '+cl+'">'+tr(en,ar)+'</span></div>'+
      '<div class="deskNumbers"><span>'+tr('Screen','النتيجة')+' <b>'+Number(stock.score||0)+'/100</b></span><span>'+tr('P/E','مضاعف الربح')+' <b>'+(numeric(stock.pe)?stock.pe.toFixed(1):'—')+'</b></span>'+
      '<span>'+tr('1 month','شهر')+' <b class="'+(stock.ret1m>=0?'positive':'negative')+'">'+pct(stock.ret1m)+'</b></span></div>'+
      '<details class="deskExpand"><summary>'+tr('Why this assessment?','لماذا هذا التقييم؟')+' <span>⌄</span></summary>'+
      '<div class="deskDetail"><div class="deskMetricLine">'+tr('Latest reference price','السعر المرجعي')+': <b>'+mad(stock.price)+'</b></div>'+
      '<div class="deskMetricLine">'+tr('Historical revenue growth','نمو الإيرادات التاريخي')+': <b>'+pct(stock.revenueCagr)+'</b></div>'+
      '<div class="deskMetricLine">'+tr('Historical profit growth','نمو الأرباح التاريخي')+': <b>'+pct(stock.profitCagr)+'</b></div>'+
      '<div class="deskMetricLine">'+tr('Reported volume','حجم التداول')+': <b>'+(numeric(stock.volume)?new Intl.NumberFormat('en-US').format(stock.volume):'—')+'</b></div>'+
      (p.length?'<h4>'+tr('Supporting signals','المؤشرات الإيجابية')+'</h4><ul>'+p.map(fact).join('')+'</ul>':'')+
      (r.length?'<h4>'+tr('Risk flags','مؤشرات الخطر')+'</h4><ul>'+r.map(fact).join('')+'</ul>':'')+
      '<p class="muted">'+tr('Missing: audited cash flow, leverage, dividend/corporate-action checks and comparable-company valuation. Scores are not investment orders.','البيانات الناقصة: التدفقات النقدية المدققة والديون والتوزيعات وتقييم الشركات المماثلة. النتيجة ليست أمر شراء.')+'</p>'+
      '<h4>'+tr('Related headlines','الأخبار ذات الصلة')+'</h4>'+relatedNews(entries)+'</div></details></article>';
  }
  function render(){
    if(!report)return;
    const stocks=Array.isArray(report.stocks)?report.stocks:[];
    const stale=report.stocks?.length&&stocks[0].stance==='Data stale';
    const reviewed=stocks.filter(x=>x.stance==='Research').length;
    const watch=stocks.filter(x=>x.stance==='Watch').length;
    const cautious=stocks.filter(x=>x.stance==='Caution').length;
    const updated=report.marketUpdated||'unknown';
    $('deskDataAge').textContent=tr('Market snapshot','لقطة السوق')+' '+updated+' · '+tr('News','الأخبار')+' '+(report.newsUpdated||'unknown')+' · '+tr('Not real-time','ليست مباشرة');
    $('deskSummary').innerHTML=[
      ['Reviewed',stocks.length],['Research',reviewed],['Watch',watch],['Caution',cautious]
    ].map(([name,value])=>'<div><strong>'+value+'</strong><span>'+tr(name,{Reviewed:'المغطاة',Research:'للبحث',Watch:'للمتابعة',Caution:'للحذر'}[name])+'</span></div>').join('');
    $('deskMode').textContent=report.llmActivated?tr('AI-assisted','بمساعدة الذكاء الاصطناعي'):tr('Rules-based','تقييم آلي بقواعد واضحة');
    $('deskModelStatus').textContent=report.llmActivated?tr('Model-generated context, source data may be delayed','ملخص نموذجي والبيانات قد تتأخر'):tr('Transparent scoring, no AI model activated','تنقيط واضح؛ نموذج الذكاء الاصطناعي غير مفعل');
    const ai=report.aiCommentary;
    $('deskExecutive').textContent=ai?.summary|| (stale?
      tr('Market data is too old for actionable research. Refresh the published sources and verify dates before decisions.','بيانات السوق قديمة جدًا لاتخاذ قرار. حدّث المصادر وتحقق من التواريخ.'):
      tr('The list highlights companies for deeper research, not stocks to purchase. Valuation and liquidity can outweigh recent price growth. Verify audited earnings, debt and sector comparisons.','تعرض القائمة شركات تستحق البحث، وليست توصيات شراء. يجب فحص التقييم والسيولة والحسابات المدققة والديون ومقارنتها بالقطاع.'));
    $('deskAIBullets').innerHTML=ai?(ai.risks?.length?'<h4>'+tr('Risks highlighted','مخاطر أساسية')+'</h4><ul>'+ai.risks.map(fact).join('')+'</ul>':'')+
      (ai.questions?.length?'<h4>'+tr('Questions before investing','أسئلة قبل الاستثمار')+'</h4><ul>'+ai.questions.map(fact).join('')+'</ul>':''):'';
    const visible=stocks.filter(s=>(filter==='all'||s.stance===filter)&&
       (s.name+' '+s.symbol+' '+s.sector).toLowerCase().includes(needle));
    $('deskCompanies').innerHTML=visible.length?visible.slice(0,count).map(card).join(''):'<p class="muted">'+tr('No stocks match this filter.','لا توجد أسهم مطابقة لهذا البحث.')+'</p>';
    $('deskCoverage').textContent=visible.length+' / '+stocks.length+' '+tr('covered','مغطاة');
    $('deskMore').classList.toggle('hide',visible.length<=count);
    $('deskMore').textContent=tr('Show 10 more','إظهار 10 أخرى')+' ('+(visible.length-count)+')';
    const stories=Array.isArray(report.topHeadlines)?report.topHeadlines:[];
    $('deskNews').innerHTML=stories.slice(0,8).map(n=>{
      const url=cleanURL(n.url);
      return '<div class="deskStory"><div><small>'+esc(n.source)+' · '+esc(n.date)+'</small><p>'+esc(n.title)+'</p></div>'+
        (url?'<a class="source" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+tr('Source ↗','المصدر ↗')+'</a>':'')+'</div>';
    }).join('')||'<p class="muted">'+tr('No verified news feed available.','لا تتوفر نشرة أخبار موثوقة.')+'</p>';
  }
  async function load(){
    if(loading)return;
    loading=true;$('deskRefresh').disabled=true;$('deskRefresh').textContent='↻';
    try{
      const r=await fetch('data/research.json?refresh='+Date.now(),{cache:'no-store'});
      if(!r.ok)throw Error('HTTP '+r.status);
      const doc=await r.json();
      if(!doc||!Array.isArray(doc.stocks))throw Error('Invalid report');
      report=doc;render();
    }catch(e){$('deskDataAge').textContent=tr('Research feed is unavailable. Try again when GitHub has published it.','نشرة التحليل غير متوفرة. حاول بعد نشر التحديث.');$('deskCompanies').innerHTML='<p class="muted">'+tr('Research data not loaded.','لم يتم تحميل بيانات التحليل.')+'</p>'}
    finally{loading=false;$('deskRefresh').disabled=false;$('deskRefresh').textContent=tr('↻ Refresh','↻ تحديث')}
  }
  $('deskRefresh').addEventListener('click',load);
  $('deskMore').addEventListener('click',()=>{count+=10;render()});
  $('deskSearch').addEventListener('input',e=>{needle=e.target.value.trim().toLowerCase();count=10;render()});
  document.querySelectorAll('[data-desk-filter]').forEach(b=>b.addEventListener('click',()=>{
    filter=b.dataset.deskFilter;count=10;
    document.querySelectorAll('[data-desk-filter]').forEach(el=>el.classList.toggle('selected',el===b));render();
  }));
  window.addEventListener('mymoney-market-sync',load);
  window.addEventListener('mymoney-language-changed',render);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&report){
    const age=Date.now()-Date.parse(report.generatedAt||'1970');
    if(age>30*60*1000)load();
  }});
  load();
})();
