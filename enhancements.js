'use strict';
(()=>{
 const $=id=>document.getElementById(id);
 const ids=['quickSync','syncSettings'];
 let busy=false,timeout;
 const message=(s,error=false)=>{
   if($('syncStatus'))$('syncStatus').textContent=s;
   const t=$('syncToast');t.textContent=s;t.style.background=error?'#5b2432':'#163a35';
   t.classList.add('show');clearTimeout(timeout);
   timeout=setTimeout(()=>t.classList.remove('show'),3500);
 };
 async function getJSON(path){
   const res=await fetch(path+'?t='+Date.now(),{cache:'no-store'});
   if(!res.ok)throw new Error('HTTP '+res.status);
   return res.json();
 }
 async function sync(){
   if(busy)return;
   busy=true;for(const id of ids){$(id).disabled=true;$(id).classList.add('syncing')}
   message(document.documentElement.lang==='ar'?'جارٍ جلب أحدث بيانات بورصة الدار البيضاء…':'Checking published Casablanca market data…');
   try{
     const [market,news]=await Promise.all([getJSON('data/market.json'),getJSON('data/news.json')]);
     if(!Array.isArray(market.stocks)||!Array.isArray(news.articles))throw new Error('Bad data');
     dispatchEvent(new CustomEvent('mymoney-market-sync',{detail:{market,news}}));
     $('refreshNews').click();
     message((document.documentElement.lang==='ar'?'تم تحديث البيانات المنشورة · السوق: ':'Updated published snapshots · Market: ')+market.updated+(document.documentElement.lang==='ar'?' · الأخبار: ':' · News: ')+news.updated);
   }catch(error){message(document.documentElement.lang==='ar'?'تعذّر التحديث. تحقق من الاتصال وحاول مجددًا.':'Sync unavailable. Check your connection and try again.',true)}
   finally{busy=false;for(const id of ids){$(id).disabled=false;$(id).classList.remove('syncing')}}
 }
 for(const id of ids)$(id).addEventListener('click',sync);
})();
