(()=>{
'use strict';
const dictionary=window.MyMoneyArabic||{};
const originals=new WeakMap(),attributeOriginals=new WeakMap();
const $=id=>document.getElementById(id);
let current='en',pending=false;
function translated(en){
 const raw=en.trim();
 if(dictionary[raw])return en.replace(raw,dictionary[raw]);
 const names={January:'يناير',February:'فبراير',March:'مارس',April:'أبريل',May:'مايو',June:'يونيو',July:'يوليو',August:'أغسطس',September:'سبتمبر',October:'أكتوبر',November:'نوفمبر',December:'ديسمبر'};
 const match=raw.match(/^([A-Za-z]+)\s+(\d{4})$/);
 if(match&&names[match[1]])return en.replace(raw,names[match[1]]+' '+match[2]);
 return en;
}
function updateText(node){
 const value=node.nodeValue||'';if(!value.trim())return;
 let en=originals.get(node);
 if(!en||(value!==en&&value!==translated(en)))en=value;
 originals.set(node,en);
 const next=current==='ar'?translated(en):en;
 if(value!==next)node.nodeValue=next;
}
function update(root){
 if(root.nodeType===Node.TEXT_NODE){updateText(root);return}
 if(root.nodeType!==Node.ELEMENT_NODE)return;
 if(['SCRIPT','STYLE','TEXTAREA','CODE','NOSCRIPT'].includes(root.tagName))return;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 let text;
 while((text=walker.nextNode())){
   const parent=text.parentElement;
   if(parent&&!['SCRIPT','STYLE','TEXTAREA','CODE','NOSCRIPT'].includes(parent.tagName))updateText(text);
 }
 for(const el of [root,...root.querySelectorAll('[placeholder],[aria-label],[title]')]){
   if(!el.getAttribute)return;
   let cache=attributeOriginals.get(el)||{};
   for(const attr of ['placeholder','aria-label','title']){
     let value=el.getAttribute(attr);if(!value)continue;
     let en=cache[attr];
     if(!en||(value!==en&&value!==translated(en)))en=value;
     cache[attr]=en;
     const next=current==='ar'?translated(en):en;
     if(value!==next)el.setAttribute(attr,next);
   }
   attributeOriginals.set(el,cache);
 }
}
function refresh(){pending=false;update(document.body)}
function schedule(){if(pending)return;pending=true;requestAnimationFrame(refresh)}
function change(lang){
 current=lang==='ar'?'ar':'en';
 document.documentElement.lang=current;document.documentElement.dir=current==='ar'?'rtl':'ltr';
 for(const id of ['langQuick','langSettings'])if($(id))$(id).value=current;
 try{localStorage.setItem('mymoney-language-v1',current)}catch{}
 schedule();
}
for(const id of ['langQuick','langSettings'])$(id)?.addEventListener('change',e=>change(e.target.value));
new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,characterData:true});
try{change(localStorage.getItem('mymoney-language-v1')||'en')}catch{change('en')}
})();