/* JLPT N3 日語水平考官 V2.3
   完整教學式解析版
   - 保留 V2.2.1：跨模式去重、舊 localStorage 兼容、Settings
   - 新增：結構化「為甚麼？」及「其他選項」教學解析
*/
const S={p:"n3_progress",m:"n3_mastery",w:"n3_wrong_answers",r:"n3_review_schedule",h:"n3_question_history",e:"n3_examiner_history",c:"n3_saved_cards"};
const $=s=>document.querySelector(s);
const esc=x=>String(x??"").replace(/[&<>"']/g,a=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[a]));
const get=(k,d)=>{try{const x=localStorage.getItem(k);return x===null?d:(JSON.parse(x)??d)}catch{return d}};
const put=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const obj=(x,d={})=>x&&typeof x==="object"&&!Array.isArray(x)?x:d;
const arr=(x,d=[])=>Array.isArray(x)?x:d;
const n=(x,d)=>Number.isFinite(Number(x))?Number(x):d;

function normProgress(x){x=obj(x,{});x.ability=Math.max(0,Math.min(100,n(x.ability,50)));x.answered=n(x.answered,0);x.correct=n(x.correct,0);x.cat=obj(x.cat,{});x.concept=obj(x.concept,{});x.confusions=obj(x.confusions,{});return x}
function normMastery(x){const out={};for(const [id,raw] of Object.entries(obj(x,{}))){const m=obj(raw,{}),d=obj(m.d,{});out[id]={a:n(m.a,0),c:n(m.c,0),d:{辨認:n(d.辨認,.5),意思:n(d.意思,.5),辨析:n(d.辨析,.5),語境:n(d.語境,.5),主動使用:n(d.主動使用,.2)},s:["new","learning","unstable","familiar","mastered"].includes(m.s)?m.s:"new"}}return out}
let P=normProgress(get(S.p,{})),M=normMastery(get(S.m,{})),W=obj(get(S.w,{})),R=obj(get(S.r,{})),H=arr(get(S.h,[])),E=arr(get(S.e,[])),C=obj(get(S.c,{}));
let Q=[],mode="examiner",round=[],ri=0,cur=null,results=[],before=50;

function save(){put(S.p,P);put(S.m,M);put(S.w,W);put(S.r,R);put(S.h,H);put(S.e,E);put(S.c,C)}
function band(x){return x<40?"N4 基礎仍需鞏固":x<55?"N3 入門階段":x<70?"N3 基礎":x<80?"N3 中段":x<90?"N3 中後段":"N3 高熟練度"}
function view(id){document.querySelectorAll(".view").forEach(x=>x.classList.remove("active"));const e=$("#"+id);if(e)e.classList.add("active");scrollTo(0,0)}
function mastery(id){const m=obj(M[id],null);if(m){const d=obj(m.d,{});m.a=n(m.a,0);m.c=n(m.c,0);m.d={辨認:n(d.辨認,.5),意思:n(d.意思,.5),辨析:n(d.辨析,.5),語境:n(d.語境,.5),主動使用:n(d.主動使用,.2)};return m}return M[id]={a:0,c:0,d:{辨認:.5,意思:.5,辨析:.5,語境:.5,主動使用:.2},s:"new"}}
function weakness(q){const m=M[q.id],c=P.concept?.[q.conceptGroup];let v=.12;if(m){const d=obj(m.d,{});v+=(1-(n(d.辨析,.5)+n(d.語境,.5)+n(d.辨認,.5))/3)*.45;if(m.s==="unstable")v+=.12;if(m.s==="learning")v+=.08}if(c?.a)v+=(1-n(c.c,0)/c.a)*.30;if(R[q.id]&&new Date(R[q.id])<=new Date())v+=.45;if(W[q.id])v+=.20;return v}
function recentIds(k=24){return new Set(H.slice(0,k).map(x=>x?.id).filter(Boolean))}
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function candidate(q,target,recent,used,concepts){let s=weakness(q)-Math.abs((Number(q.difficulty)||3)-target)*.18;if(recent.has(q.id))s-=3;if(used.has(q.id))s-=100;if(concepts.has(q.conceptGroup))s-=.18;if(!M[q.id])s+=.1;return s+Math.random()*.12}
function choose(){const valid=Q.filter(q=>q.validity!=="ambiguous");if(valid.length<10)return shuffle(valid);const target=Math.max(1,Math.min(5,Math.round(P.ability/20)+1)),recent=recentIds(24),used=new Set(),concepts=new Set(),out=[];const due=valid.filter(q=>R[q.id]&&new Date(R[q.id])<=new Date());for(let i=0;i<10;i++){let pool=valid.filter(q=>!used.has(q.id));if(mode==="review"&&due.length){const dp=pool.filter(q=>due.some(d=>d.id===q.id));if(dp.length)pool=dp}const fresh=pool.filter(q=>!recent.has(q.id));if(fresh.length>=10-i)pool=fresh;const varied=pool.filter(q=>!concepts.has(q.conceptGroup));if(varied.length)pool=varied;const cats=out.slice(-3).map(q=>q.category);const cv=pool.filter(q=>!(cats.length===3&&cats.every(c=>c===q.category)));if(cv.length)pool=cv;pool.sort((a,b)=>candidate(b,target,recent,used,concepts)-candidate(a,target,recent,used,concepts));if(!pool[0])break;const q=pool[0];out.push(q);used.add(q.id);if(q.conceptGroup)concepts.add(q.conceptGroup)}if(out.length<10)for(const q of shuffle(valid.filter(q=>!used.has(q.id)))){if(out.length>=10)break;out.push(q)}return out}

function start(m){mode=m;round=choose();ri=0;results=[];before=P.ability;if(round.length<10){alert("目前有效題目不足 10 題，無法開始完整一輪。");return}view("quiz");renderQ()}
function renderQ(){cur=round[ri];$("#counter").textContent=`第 ${ri+1} / ${round.length} 題`;$("#bar").style.width=(ri/round.length*100)+"%";$("#cat").textContent={grammar:"文法",vocabulary:"詞彙",kanji:"漢字",meaning:"語意",usage:"用法"}[cur.category]||cur.category||"綜合";$("#diff").textContent=`難度 ${cur.difficulty??3}`;$("#question").textContent=cur.question;$("#feedback").innerHTML="";$("#options").innerHTML=Object.entries(cur.options||{}).sort(()=>Math.random()-.5).map(([k,v])=>`<button class="option" data-k="${esc(k)}"><b>${esc(k)}.</b> ${esc(v)}</button>`).join("");document.querySelectorAll(".option").forEach(b=>b.onclick=()=>answer(b.dataset.k));$("#why").onclick=why;$("#explain").onclick=other;$("#next").onclick=next}

function answer(k){if(results[ri])return;const ok=k===cur.answer;document.querySelectorAll(".option").forEach(b=>{b.disabled=true;if(b.dataset.k===cur.answer)b.classList.add("correct");if(b.dataset.k===k&&!ok)b.classList.add("wrong")});$("#feedback").className="feedback "+(ok?"good":"bad");$("#feedback").innerHTML=`<b>${ok?"✓ 正確！":"✕ 不正確"}</b><br>`+(ok?"答對了。":`你的答案：${esc(k)}。正確答案：${esc(cur.answer)}。`);record(ok,k)}

function record(ok,k){results[ri]={q:cur,ok,k};P.answered++;if(ok)P.correct++;P.cat[cur.category]??={a:0,c:0};P.cat[cur.category].a++;if(ok)P.cat[cur.category].c++;P.concept[cur.conceptGroup]??={a:0,c:0};P.concept[cur.conceptGroup].a++;if(ok)P.concept[cur.conceptGroup].c++;const m=mastery(cur.id);m.a++;if(ok)m.c++;Object.keys(m.d).forEach(x=>m.d[x]=Math.max(0,Math.min(1,m.d[x]+(ok?.10:-.14))));const avg=Object.values(m.d).reduce((a,b)=>a+b,0)/5;m.s=avg>.88&&m.a>=6?"mastered":avg>.68?"familiar":avg>.42?"unstable":"learning";const d=new Date();d.setDate(d.getDate()+({new:1,learning:3,unstable:2,familiar:7,mastered:21}[m.s]??3));R[cur.id]=d.toISOString();if(ok)delete W[cur.id];else W[cur.id]={error:errType(cur),at:new Date().toISOString()};P.ability=Math.max(0,Math.min(100,Math.round(P.ability+(ok?2.5+(Number(cur.difficulty||3)-3)*1.2:-3-(Number(cur.difficulty||3)-3)*.5))));H.unshift({id:cur.id,ok,k,mode,time:new Date().toISOString()});H=H.slice(0,300);save()}
function errType(q){if(q.category==="kanji")return"漢字讀音";if(q.category==="vocabulary")return"詞彙混淆";if(q.category==="meaning")return"意思理解";if(q.skill==="grammar_distinction")return"文法混淆";return"語境判斷"}

/* ===== V2.3 教學式解析 ===== */
function normalizeExplanation(q){
  const ex=obj(q.explanation,{});
  const correct=typeof ex.correct==="object"&&ex.correct?ex.correct:{};
  const options=obj(ex.options,{});
  return {correct,options};
}
function fieldText(v){
  if(Array.isArray(v))return v.join("；");
  if(v&&typeof v==="object")return Object.entries(v).map(([k,x])=>`${k}：${x}`).join("；");
  return v??"";
}
function explanationHTML(x,isCorrect=false){
  if(!x||typeof x!=="object")return `<p>${isCorrect?"✓ 正確答案。":"✕ 這個選項不適合本題。"}</p>`;
  let h="";
  if(x.meaning)h+=`<div class="teach-row"><b>意思</b><span>${esc(fieldText(x.meaning))}</span></div>`;
  if(x.connection)h+=`<div class="teach-row"><b>接續</b><span>${esc(fieldText(x.connection))}</span></div>`;
  if(x.partOfSpeech)h+=`<div class="teach-row"><b>詞性</b><span>${esc(fieldText(x.partOfSpeech))}</span></div>`;
  if(x.usage)h+=`<div class="teach-row"><b>用法</b><span>${esc(fieldText(x.usage))}</span></div>`;
  if(x.nuance)h+=`<div class="teach-row"><b>語感／語氣</b><span>${esc(fieldText(x.nuance))}</span></div>`;
  if(x.why)h+=`<div class="teach-row"><b>${isCorrect?"為甚麼正確":"為甚麼不適合"}</b><span>${esc(fieldText(x.why))}</span></div>`;
  if(x.example)h+=`<div class="teach-example"><b>例句</b><br>${esc(fieldText(x.example))}${x.translation?`<br><span>${esc(fieldText(x.translation))}</span>`:""}</div>`;
  return h||`<p>${isCorrect?"✓ 正確答案。":"✕ 這個選項不適合本題。"}</p>`;
}
function why(){
  const {correct}=normalizeExplanation(cur);
  let h=`<p><b>本題考點：</b>${esc(cur.grammarPoint||cur.conceptGroup||"綜合")}</p>`;
  if(correct&&Object.keys(correct).length)h+=explanationHTML(correct,true);
  else h+=`<p>${esc(cur.explanation?.correct||"請留意本題的接續、意思及使用情境。")}</p>`;
  openDialog("📖 文法／詞彙解析",h);
}
function other(){
  const {options}=normalizeExplanation(cur);
  let h="";
  for(const [k,v] of Object.entries(cur.options||{})){
    const x=options[k];
    h+=`<section class="option-teach"><h4>${esc(k)}. ${esc(v)} ${k===cur.answer?"✓ 正確":"✕ 不適合"}</h4>`;
    h+=x?explanationHTML(x,k===cur.answer):`<p>${k===cur.answer?"這是本題正確答案。":"本題中不能表達所需意思或句型關係。"}</p>`;
    h+="</section>";
  }
  openDialog("🔍 逐項解析：每個答案是甚麼意思？",h);
}
function openDialog(t,b){$("#dtitle").textContent=t;$("#dbody").innerHTML=b;$("#dialog").showModal()}

function next(){if(!results[ri])return;if(ri<round.length-1){ri++;renderQ()}else finish()}
function finish(){const score=results.filter(x=>x.ok).length;E.unshift({time:new Date().toISOString(),mode,score,before,after:P.ability});E=E.slice(0,50);save();$("#score").textContent=score+"/10";$("#summary").textContent=`本輪答對 ${score} 題。`;$("#before").textContent=before;$("#after").textContent=P.ability;$("#rg").textContent=fmt("grammar");$("#rv").textContent=fmt("vocabulary");$("#rk").textContent=fmt("kanji");const o=results.filter(x=>["meaning","usage"].includes(x.q.category));$("#ro").textContent=o.length?`${o.filter(x=>x.ok).length}/${o.length}`:"-";const bad=results.filter(x=>!x.ok);$("#obs").innerHTML=bad.length?`<p>• 本輪有 ${bad.length} 題錯誤；下一輪會增加相關弱點及相似概念的選題權重。</p>`:`<p>• 本輪全部答對；下一輪會逐步提高難度。</p>`;$("#conf").innerHTML=bad.map(x=>`<span class="chip orange">${esc(errType(x.q))}</span>`).join("")||"暫未形成明顯混淆。";view("result")}
function fmt(c){const a=results.filter(x=>x.q.category===c);return a.length?`${a.filter(x=>x.ok).length}/${a.length}`:"-"}
function home(){const ms=Object.values(M),av=ms.length?Math.round(ms.reduce((s,m)=>s+Object.values(obj(m.d,{})).reduce((a,b)=>a+n(b,0),0)/5,0)/ms.length*100):0;$("#ability").textContent=P.ability;$("#band").textContent=band(P.ability);$("#mastery").textContent=av+"%";$("#wrong").textContent=Object.keys(W).length;$("#answered").textContent=P.answered;const w=Object.entries(obj(P.concept,{})).filter(([,v])=>n(v?.a,0)>0).sort((a,b)=>(1-n(b[1].c,0)/b[1].a)-(1-n(a[1].c,0)/a[1].a)).slice(0,7);$("#homeWeak").innerHTML=w.length?w.map(([k,v])=>`<span class="chip ${n(v.c,0)/v.a<.5?"red":"orange"}">${esc(k)} · ${Math.round((1-n(v.c,0)/v.a)*100)}%</span>`).join(""):"暫未有足夠數據。"}
function progress(){home();$("#pa").textContent=P.ability;$("#pb").textContent=band(P.ability);$("#pc").textContent=P.correct;$("#pt").textContent=P.answered;$("#pm").textContent=$("#mastery").textContent;const w=Object.entries(obj(P.concept,{})).filter(([,v])=>n(v?.a,0)>0).sort((a,b)=>(1-n(b[1].c,0)/b[1].a)-(1-n(a[1].c,0)/a[1].a));$("#weakmap").innerHTML=w.length?w.map(([k,v])=>`<div class="weakrow"><span>${esc(k)}</span><div class="meter"><i style="width:${Math.max(4,(1-n(v.c,0)/v.a)*100)}%"></i></div><b>${Math.round((1-n(v.c,0)/v.a)*100)}%</b></div>`).join(""):"暫無數據";$("#matrix").innerHTML=Object.entries(obj(P.confusions,{})).map(([k,v])=>`<span class="chip orange">${esc(k)} · ${esc(v)}</span>`).join("")||"答錯相似概念後會在此顯示。";const qm=Object.fromEntries(Q.map(q=>[q.id,q]));$("#cards").innerHTML=Object.entries(M).filter(([,m])=>["familiar","mastered"].includes(m.s)).slice(0,12).map(([id,m])=>`<div class="knowledge"><b>${esc(qm[id]?.grammarPoint||id)}</b><br>熟練度：${Math.round(Object.values(obj(m.d,{})).reduce((a,b)=>a+n(b,0),0)/5*100)}%</div>`).join("")||"暫未形成知識卡";$("#hist").innerHTML=H.slice(0,10).map(x=>`<div class="history">${x.ok?"✓":"✕"} ${esc(x.id)} · ${new Date(x.time).toLocaleString("zh-HK",{hour12:false})}</div>`).join("")||"暫無紀錄"}
function ensureSettingsUI(){let d=$("#settingsDialog");if(!d){d=document.createElement("dialog");d.id="settingsDialog";d.innerHTML=`<div class="dhead"><h3>⚙️ 設定</h3><button id="closeSettings" type="button">✕</button></div><div style="padding:0 20px 20px"><p>學習紀錄只會儲存在此瀏覽器，不會上傳到遠端伺服器。</p><p><b>題目重複控制：</b>不同模式共用最近作答紀錄；一般模式會優先避開最近題目，到期複習則按複習安排抽取。</p><button id="clearData" class="secondary" type="button">清除所有學習紀錄</button></div>`;document.body.appendChild(d)}return d}
function bind(){const sd=ensureSettingsUI();document.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>start(b.dataset.mode));document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>{view(b.dataset.go);if(b.dataset.go==="progress")progress()});if($("#quit"))$("#quit").onclick=()=>view("home");if($("#again"))$("#again").onclick=()=>start(mode);if($("#close"))$("#close").onclick=()=>$("#dialog").close();const s=$("#settings");if(s)s.onclick=e=>{e.preventDefault();if(sd.showModal)sd.showModal();else sd.setAttribute("open","")};const cs=$("#closeSettings");if(cs)cs.onclick=()=>sd.close();const cd=$("#clearData");if(cd)cd.onclick=()=>{if(confirm("確定要清除所有學習紀錄嗎？題庫不會被刪除。")){Object.values(S).forEach(k=>localStorage.removeItem(k));location.reload()}}}
async function boot(){bind();try{const r=await fetch("./questions.json",{cache:"no-store"});if(!r.ok)throw new Error(`HTTP ${r.status}`);const x=await r.json();Q=Array.isArray(x)?x:(x.questions||[]);const valid=Q.filter(q=>q.validity!=="ambiguous");if(valid.length<10)throw new Error("有效題目不足 10 題");P=normProgress(P);M=normMastery(M);W=obj(W);R=obj(R);H=arr(H);E=arr(E);C=obj(C);save();home()}catch(err){console.error(err);const box=$("#bootError");if(box){box.hidden=false;box.textContent="題庫載入失敗："+err.message+"。這通常不是題庫位置問題，請查看瀏覽器主控台。"}else alert("題庫載入失敗："+err.message)}}
document.addEventListener("DOMContentLoaded",boot);
