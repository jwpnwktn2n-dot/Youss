'use strict';
(()=>{
  const $=id=>document.getElementById(id);
  const USER_SHA='f8f0b5008d9c60ad507c33ca801be759fe0aaac9817d5459f999e91f35132460';
  const SALT='e652bca3eebd9a1992e9a9fa1a80a40b';
  const PASS_PBKDF2='735d514c506768932c41b87b6678fb2fe47b8ffe99700680d6a67a6dd058b97b';
  const ITERATIONS=240000;
  let failures=0,blockedUntil=0,lastHidden=0,idleTimer;
  const bytes=hex=>Uint8Array.from(hex.match(/../g),x=>parseInt(x,16));
  const hex=a=>Array.from(a,b=>b.toString(16).padStart(2,'0')).join('');
  const isArabic=()=>document.documentElement.lang==='ar';
  function message(en,ar){$('loginError').textContent=isArabic()?ar:en}
  function clearSensitive(){$('loginPassword').value='';$('loginError').textContent=''}
  function unlocked(){return document.documentElement.classList.contains('auth-ok')}
  function lock(){
    document.documentElement.classList.remove('auth-ok');
    clearSensitive();
    $('loginUsername').value='';
    $('loginPassword').type='password';
    $('togglePassword').setAttribute('aria-pressed','false');
    $('loginUsername').focus({preventScroll:true});
    window.scrollTo(0,0);
  }
  function resetIdle(){
    clearTimeout(idleTimer);
    if(unlocked())idleTimer=setTimeout(lock,15*60*1000);
  }
  window.addEventListener('pagehide',()=>{lastHidden=Date.now()});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){lastHidden=Date.now();clearTimeout(idleTimer)}
    else if(unlocked()){
      if(lastHidden&&Date.now()-lastHidden>5*60*1000)lock();
      else resetIdle();
    }
  });
  for(const event of ['pointerdown','keydown'])document.addEventListener(event,()=>{if(unlocked())resetIdle()},{passive:true});
  $('lockApp')?.addEventListener('click',lock);
  $('togglePassword').addEventListener('click',()=>{
    const show=$('loginPassword').type==='password';
    $('loginPassword').type=show?'text':'password';
    $('togglePassword').setAttribute('aria-pressed',String(show));
    $('togglePassword').textContent=show?'Hide':'Show';
  });
  async function verify(username,password){
    const encoder=new TextEncoder();
    const usernameHash=await crypto.subtle.digest('SHA-256',encoder.encode(username));
    const userOk=hex(new Uint8Array(usernameHash))===USER_SHA;
    const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
    const derived=await crypto.subtle.deriveBits({name:'PBKDF2',salt:bytes(SALT),iterations:ITERATIONS,hash:'SHA-256'},key,256);
    let diff=0;const expected=bytes(PASS_PBKDF2),actual=new Uint8Array(derived);
    for(let i=0;i<expected.length;i++)diff|=expected[i]^actual[i];
    return userOk&&diff===0;
  }
  $('loginForm').addEventListener('submit',async event=>{
    event.preventDefault();
    if(Date.now()<blockedUntil){
      message('Too many attempts. Try again shortly.','محاولات كثيرة. أعد المحاولة بعد قليل.');
      return;
    }
    const username=$('loginUsername').value.trim(),password=$('loginPassword').value;
    const btn=$('loginSubmit');
    btn.disabled=true;btn.textContent=isArabic()?'جارٍ التحقق…':'Checking…';
    try{
      if(await verify(username,password)){
        failures=0;
        clearSensitive();
        document.documentElement.classList.add('auth-ok');
        resetIdle();
        $('menuTrigger')?.focus({preventScroll:true});
      }else{
        failures++;
        if(failures>=5){blockedUntil=Date.now()+30000;failures=0}
        $('loginPassword').value='';
        message('Incorrect username or password.','اسم المستخدم أو كلمة المرور غير صحيحة.');
        $('loginPassword').focus();
      }
    }catch(error){
      message('Secure login is unavailable in this browser.','تعذر التحقق في هذا المتصفح.');
    }finally{
      btn.disabled=false;btn.textContent=isArabic()?'دخول':'Sign in';
    }
  });
})();
