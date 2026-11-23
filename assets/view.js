(function(){
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const point=score=>score?.display==null?'尚未登錄':esc(score.display);
  const date=value=>new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));
  function render(data){
    const a=data.attendance,s=data.student;
    const sourceValues=data.snapshot.attendance_basis==='source';
    const rate=a.rate==null?'—':(sourceValues?a.main_score.display:Number(a.rate).toLocaleString('zh-TW',{maximumFractionDigits:2}))+'%';
    const total=data.semester_total?.value;
    const exams=data.exams.map(exam=>`<article class="exam-card"><div class="exam-heading"><span class="exam-label">${esc(exam.label)}</span><span class="small-tag">${exam.raw.value==null?'未登錄':'已登錄'}</span></div><div class="exam-score ${exam.raw.value==null?'unrecorded':''}">${point(exam.raw)}${exam.raw.value==null?'':'<span>分</span>'}</div><div class="exam-weight"><span>折合學期分數</span><strong>${point(exam.weighted)}${exam.weighted.value==null?'':' <small>分</small>'}</strong></div></article>`).join('');
    const records=a.records.map(record=>{
      const state=record.status==='已到'?'present':record.status?'unmarked':'empty';
      return `<tr><th scope="row"><time datetime="${esc(record.date)}">${esc(record.date.replaceAll('-',' / '))}</time></th><td><span class="attendance-status ${state}">${esc(record.status||'尚未登錄')}</span></td></tr>`;
    }).join('');
    const extra=data.extra_points?.value;
    return `<div class="results-heading"><div><p class="eyebrow">YOUR GRADE REPORT</p><h1 id="result-title">${esc(s.name)}，這是你的目前紀錄</h1><p class="student-meta">${esc(s.class_label)}<span>·</span>${esc(s.student_id)}</p></div><button type="button" class="secondary-button" data-reset-query>清除並重新查詢</button></div>
      <div class="summary-grid"><article class="semester-card"><p>目前學期累計分數</p><div class="semester-score ${total==null?'unrecorded':''}">${point(data.semester_total)}${total==null?'':'<span>分</span>'}</div><p class="semester-note">依目前總表已登錄的學期分數呈現</p>${extra!=null&&extra!==0?`<div class="extra-points"><span>含其他已登錄加分</span><strong>${point(data.extra_points)} 分</strong></div>`:''}</article>
      <article class="attendance-summary"><div class="attendance-summary-top"><span class="exam-label">實際出席率</span><span class="small-tag">${esc(a.basis_label)}</span></div><div class="attendance-rate">${esc(rate)}</div><p class="attendance-count">已到 <strong>${a.numerator}</strong> 次／共 <strong>${a.denominator}</strong> 次點名</p><progress max="100" value="${a.rate==null?0:a.rate}" aria-label="出席率">${esc(rate)}</progress><div class="attendance-registered"><div><span>總表出席成績</span><strong>${point(a.main_score)}${a.main_score.value==null?'':' 分'}</strong></div><div><span>折合學期分數</span><strong>${point(a.weighted)}${a.weighted.value==null?'':' 分'}</strong></div></div></article></div>
      <section class="exams-section" aria-labelledby="exams-title"><div class="section-heading"><h2 id="exams-title">各次測驗成績</h2><p>原始成績與折合學期分數</p></div><div class="exam-grid">${exams}</div></section>
      <section class="attendance-panel" aria-labelledby="attendance-title"><div class="section-heading"><div><h2 id="attendance-title">每次點名紀錄</h2><p>僅呈現資料更新日以前的點名日期</p></div><span class="small-tag">共 ${a.records.length} 次</span></div><div class="attendance-table-wrap"><table class="attendance-table"><thead><tr><th scope="col">點名日期</th><th scope="col">登錄情形</th></tr></thead><tbody>${records||'<tr><td colspan="2">目前沒有點名紀錄。</td></tr>'}</tbody></table></div></section>
      <aside class="result-note"><strong>關於這份初步成績</strong><p>${sourceValues?'出席率、出席成績、各次換算分數與學期累計分數，均依教師總表的登錄值呈現。顯示值如有四捨五入差異，累計分數以總表為準。':'出席率依已發生的點名計算；出席成績、各次換算分數與學期累計分數依總表登錄值呈現，因此可能與出席率不同。顯示值如有四捨五入差異，累計分數以總表為準。'}</p><p>${data.snapshot.published_at?'上次發布':'資料更新'}：${esc(date(data.snapshot.published_at||data.snapshot.captured_at))}。若有疑問，請向授課教師確認。</p></aside>`;
  }
  window.GRADE_PORTAL_VIEW=Object.freeze({render,date});
})();
