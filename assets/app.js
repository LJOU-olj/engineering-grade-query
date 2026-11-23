(function(){
  'use strict';
  const form=document.getElementById('query-form'),button=document.getElementById('submit-query');
  const query=document.getElementById('query-section'),result=document.getElementById('result-section');
  const message=document.getElementById('query-message');
  const base=(window.GRADE_PORTAL_CONFIG?.apiBase||'').replace(/\/$/,'');
  let generation=0,controller=null,idleTimer=null;
  function status(text,error=false){message.textContent=text;message.classList.toggle('error',error);}
  function clearResult(){result.hidden=true;result.innerHTML='';}
  function reset(){++generation;controller?.abort();controller=null;clearTimeout(idleTimer);clearResult();form.reset();query.hidden=false;button.disabled=false;button.textContent='查詢我的成績';status('');document.getElementById('class-code').focus();window.scrollTo({top:0,behavior:'instant'});}
  function keepPrivate(){clearTimeout(idleTimer);idleTimer=setTimeout(()=>{reset();status('閒置較久，個人成績已清除，請重新查詢。');},5*60*1000);}
  async function json(path,options={}){
    const response=await fetch(base+path,{...options,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',headers:{'Accept':'application/json',...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});
    let data;try{data=await response.json();}catch{throw new Error('查詢服務暫時無法使用，請稍後再試。');}if(!response.ok){const error=new Error(typeof data.detail==='string'?data.detail:'查詢暫時無法完成。');error.status=response.status;throw error;}return data;
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(!form.reportValidity())return;
    const person={class_code:document.getElementById('class-code').value,student_id:document.getElementById('student-id').value.trim(),student_name:document.getElementById('student-name').value.trim()};
    if(!person.student_id||!person.student_name){status('請完整填寫班級、學號與姓名。',true);return;}
    const request=++generation;controller?.abort();controller=new AbortController();const activeController=controller;
    const timeout=setTimeout(()=>activeController.abort(),12000);clearResult();status('正在確認資料…');button.disabled=true;button.textContent='查詢中…';
    try{
      const data=await json('/api/lookup',{method:'POST',body:JSON.stringify(person),signal:controller.signal});
      if(request!==generation)return;
      result.innerHTML=window.GRADE_PORTAL_VIEW.render(data);result.hidden=false;query.hidden=true;form.reset();status('');result.focus();window.scrollTo({top:0,behavior:'instant'});keepPrivate();
    }catch(error){if(request!==generation)return;clearResult();status(error.name==='AbortError'?'連線逾時，請稍後再試。':error instanceof TypeError?'目前無法連接查詢服務，請稍後再試。':error.message,true);}
    finally{clearTimeout(timeout);if(request===generation){button.disabled=false;button.textContent='查詢我的成績';}}
  });
  result.addEventListener('click',event=>{if(event.target.closest('[data-reset-query]'))reset();else keepPrivate();});
  result.addEventListener('keydown',keepPrivate);
  window.addEventListener('pagehide',()=>{++generation;controller?.abort();form.reset();clearResult();query.hidden=false;});
  window.addEventListener('pageshow',event=>{if(event.persisted)reset();});
  function refreshMeta(){return json('/api/meta').then(meta=>{const manual=meta.sync?.mode==='manual';const stamp=meta.published_at||meta.captured_at;document.getElementById('snapshot-date').textContent=stamp?window.GRADE_PORTAL_VIEW.date(stamp):manual?'老師尚未發布資料':'資料尚未匯入';document.getElementById('snapshot-date').previousElementSibling.textContent=manual?'上次發布':'資料更新';document.getElementById('sync-status').textContent=manual?'手動發布模式；顯示老師最近一次發布的資料。':meta.sync?.fresh?'資料自動更新中；重新查詢可取得最新紀錄。':'目前顯示上次成功更新的資料。';if(!meta.ready){button.disabled=true;status(manual?'老師尚未發布成績，請稍後再查詢。':'成績資料尚未準備完成，請稍後再查詢。');}else button.disabled=false;}).catch(()=>{document.getElementById('snapshot-date').textContent='暫時無法取得更新時間';});}
  refreshMeta();
})();
