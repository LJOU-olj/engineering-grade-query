(function(){
  'use strict';
  const form=document.getElementById('query-form'),button=document.getElementById('submit-query');
  const query=document.getElementById('query-section'),result=document.getElementById('result-section');
  const message=document.getElementById('query-message');
  const base=(window.GRADE_PORTAL_CONFIG?.apiBase||'').replace(/\/$/,'');
  const classSelect=document.getElementById('class-code');
  let generation=0,controller=null,idleTimer=null,metaPromise=null,metaReady=false;
  function status(text,error=false){message.textContent=text;message.classList.toggle('error',error);}
  function clearResult(){result.hidden=true;result.innerHTML='';}
  function reset(){++generation;controller?.abort();controller=null;clearTimeout(idleTimer);clearResult();form.reset();query.hidden=false;button.disabled=!metaReady;button.textContent='查詢我的成績';status('');classSelect.focus();window.scrollTo({top:0,behavior:'instant'});refreshMeta();}
  function keepPrivate(){clearTimeout(idleTimer);idleTimer=setTimeout(()=>{reset();status('閒置較久，個人成績已清除，請重新查詢。');},5*60*1000);}
  async function json(path,options={}){
    const response=await fetch(base+path,{...options,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',headers:{'Accept':'application/json',...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});
    let data;try{data=await response.json();}catch{throw new Error('查詢服務暫時無法使用，請稍後再試。');}if(!response.ok){const error=new Error(typeof data.detail==='string'?data.detail:'查詢暫時無法完成。');error.status=response.status;throw error;}return data;
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(!form.reportValidity())return;
    const selectedClass=classSelect.value;
    if(!await refreshMeta())return;
    if(classSelect.value!==selectedClass){status('班級開放設定已更新，請重新選擇班級。',true);return;}
    const person={class_code:document.getElementById('class-code').value,student_id:document.getElementById('student-id').value.trim(),student_name:document.getElementById('student-name').value.trim()};
    if(!person.student_id||!person.student_name){status('請完整填寫班級、學號與姓名。',true);return;}
    const request=++generation;controller?.abort();controller=new AbortController();const activeController=controller;
    const timeout=setTimeout(()=>activeController.abort(),12000);clearResult();status('正在確認資料…');button.disabled=true;button.textContent='查詢中…';
    try{
      const data=await json('/api/lookup',{method:'POST',body:JSON.stringify(person),signal:controller.signal});
      if(request!==generation)return;
      result.innerHTML=window.GRADE_PORTAL_VIEW.render(data);result.hidden=false;query.hidden=true;form.reset();status('');result.focus();window.scrollTo({top:0,behavior:'instant'});keepPrivate();
    }catch(error){if(request!==generation)return;clearResult();status(error.name==='AbortError'?'連線逾時，請稍後再試。':error instanceof TypeError?'目前無法連接查詢服務，請稍後再試。':error.message,true);if(error.status===404)refreshMeta();}
    finally{clearTimeout(timeout);if(request===generation){button.disabled=!metaReady;button.textContent='查詢我的成績';}}
  });
  result.addEventListener('click',event=>{if(event.target.closest('[data-reset-query]'))reset();else keepPrivate();});
  result.addEventListener('keydown',keepPrivate);
  window.addEventListener('pagehide',()=>{++generation;controller?.abort();form.reset();clearResult();query.hidden=false;});
  window.addEventListener('pageshow',event=>{if(event.persisted)reset();});
  function refreshMeta(){
    if(metaPromise)return metaPromise;
    metaPromise=json('/api/meta').then(meta=>{
      if(!Array.isArray(meta.classes)||meta.classes.some(c=>!['A','B'].includes(c.code))||new Set(meta.classes.map(c=>c.code)).size!==meta.classes.length)throw new Error('班級設定不正確');
      const previous=classSelect.value,options=[new Option('請選擇班級','')];
      for(const cls of meta.classes)options.push(new Option(cls.code==='A'?'營建三甲':'營建三乙',cls.code));
      classSelect.replaceChildren(...options);if(meta.classes.some(c=>c.code===previous))classSelect.value=previous;
      const manual=meta.sync?.mode==='manual',stamp=meta.published_at||meta.captured_at;
      document.getElementById('snapshot-date').textContent=stamp?window.GRADE_PORTAL_VIEW.date(stamp):manual?'老師尚未發布資料':'資料尚未匯入';
      document.getElementById('snapshot-date').previousElementSibling.textContent=manual?'上次發布':'資料更新';
      metaReady=!!meta.ready&&meta.classes.length>0;classSelect.disabled=!metaReady;button.disabled=!metaReady;
      if(!meta.ready)status(manual?'老師尚未發布成績，請稍後再查詢。':'成績資料尚未準備完成，請稍後再查詢。');
      else if(!meta.classes.length)status('目前暫未開放成績查詢。');
      else if(message.textContent==='目前暫未開放成績查詢。'||message.textContent.startsWith('無法確認目前開放班級'))status('');
      return metaReady;
    }).catch(()=>{metaReady=false;button.disabled=true;classSelect.disabled=true;document.getElementById('snapshot-date').textContent='暫時無法取得更新時間';status('無法確認目前開放班級，請重新整理後再查詢。',true);return false;}).finally(()=>{metaPromise=null;});
    return metaPromise;
  }
  window.addEventListener('focus',()=>{if(!query.hidden)refreshMeta();});
  refreshMeta();
})();
