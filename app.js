/* JLPT N3 日語水平考官 V2.2
   - 跨模式／跨輪次避免短期重複
   - 同一概念可重溫，但優先使用不同題目
   - 到期複習可優先抽取 due 題
   - 保留原有 localStorage 資料
   - 純前端、無遠端 AI
*/
const S = {
  p:"n3_progress", m:"n3_mastery", w:"n3_wrong_answers",
  r:"n3_review_schedule", h:"n3_question_history",
  e:"n3_examiner_history", c:"n3_saved_cards"
};

const get = (k,d) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? d; }
  catch { return d; }
};
const put = (k,v) => localStorage.setItem(k, JSON.stringify(v));

let P = get(S.p,{ability:50,answered:0,correct:0,cat:{},concept:{},confusions:{}});
let M = get(S.m,{});
let W = get(S.w,{});
let R = get(S.r,{});
let H = get(S.h,[]);
let E = get(S.e,[]);
let C = get(S.c,{});
let Q = [];
let mode = "examiner";
let round = [];
let ri = 0;
let cur = null;
let results = [];
let before = 50;

const $ = x => document.querySelector(x);
const esc = x => String(x ?? "").replace(/[&<>"']/g,a=>({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
}[a]));

function save(){
  Object.entries({
    [S.p]:P,[S.m]:M,[S.w]:W,[S.r]:R,[S.h]:H,
    [S.e]:E,[S.c]:C
  }).forEach(([k,v])=>put(k,v));
}

function band(n){
  return n<40?"N4 基礎仍需鞏固":
    n<55?"N3 入門階段":
    n<70?"N3 基礎":
    n<80?"N3 中段":
    n<90?"N3 中後段":"N3 高熟練度";
}

function view(id){
  document.querySelectorAll(".view").forEach(x=>x.classList.remove("active"));
  const el=$("#"+id);
  if(el) el.classList.add("active");
  scrollTo(0,0);
}

function mastery(id){
  return M[id] ?? (M[id]={
    a:0,c:0,
    d:{辨認:.5,意思:.5,辨析:.5,語境:.5,主動使用:.2},
    s:"new"
  });
}

function weakness(q){
  const m=M[q.id];
  const c=P.concept?.[q.conceptGroup];
  let v=.12;

  if(m){
    v += (1-(m.d.辨析+m.d.語境+m.d.辨認)/3)*.45;
    if(m.s==="unstable") v += .12;
    if(m.s==="learning") v += .08;
  }
  if(c?.a) v += (1-c.c/c.a)*.30;
  if(R[q.id] && new Date(R[q.id])<=new Date()) v += .45;
  if(W[q.id]) v += .20;
  return v;
}

/* 最近做過的題目：
   H 是跨模式共用，所以普通／考官／每日／複習都會看到同一份歷史。
*/
function recentIds(limit=24){
  return new Set(
    H.slice(0,limit)
      .map(x=>x.id)
      .filter(Boolean)
  );
}

function recentConcepts(limit=8){
  const s = new Set();
  for(const x of H.slice(0,limit)){
    const q = Q.find(q=>q.id===x.id);
    if(q?.conceptGroup) s.add(q.conceptGroup);
  }
  return s;
}

function shuffle(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function scoreCandidate(q,target,recent,used,usedConcepts){
  let s = weakness(q);
  s -= Math.abs((Number(q.difficulty)||3)-target)*.18;

  if(recent.has(q.id)) s -= 3.0;
  if(used.has(q.id)) s -= 100;
  if(usedConcepts.has(q.conceptGroup)) s -= .18;

  // 新題優先，但唔會永遠避開弱項。
  if(!M[q.id]) s += .10;

  // 只在普通／考官／每日模式中鼓勵變化；
  // review 模式仍以到期題為主。
  if(mode!=="review" && R[q.id] && new Date(R[q.id])<=new Date()) s += .20;

  return s + Math.random()*.12;
}

function choose(){
  const valid = Q.filter(q=>q.validity!=="ambiguous");
  if(valid.length<10) return shuffle(valid);

  const target = Math.max(1,Math.min(5,Math.round(P.ability/20)+1));
  const recent = recentIds(24);
  const used = new Set();
  const usedConcepts = new Set();
  const out = [];

  // 到期複習：只在有足夠題目時優先使用 due pool。
  const due = valid.filter(q=>R[q.id] && new Date(R[q.id])<=new Date());

  for(let n=0;n<10;n++){
    let pool = valid.filter(q=>!used.has(q.id));

    if(mode==="review" && due.length){
      const duePool = pool.filter(q=>due.some(d=>d.id===q.id));
      if(duePool.length) pool=duePool;
    }

    // 第一優先：未在最近 24 題出現過。
    let fresh = pool.filter(q=>!recent.has(q.id));
    if(fresh.length >= (10-n)) pool=fresh;

    // 避免同一 concept 連續堆疊，但唔會為此犧牲到期／弱項題。
    const varied = pool.filter(q=>!usedConcepts.has(q.conceptGroup));
    if(varied.length) pool=varied;

    // 類別避免連續超過 3 題。
    const lastCats=out.slice(-3).map(q=>q.category);
    const catVaried=pool.filter(q=>!(
      lastCats.length===3 &&
      lastCats.every(c=>c===q.category)
    ));
    if(catVaried.length) pool=catVaried;

    pool.sort((a,b)=>scoreCandidate(b,target,recent,used,usedConcepts)-scoreCandidate(a,target,recent,used,usedConcepts));
    const q=pool[0];
    if(!q) break;

    out.push(q);
    used.add(q.id);
    if(q.conceptGroup) usedConcepts.add(q.conceptGroup);
  }

  // 題庫較細時，確保仍然湊到 10 題；只有真的無法避免時才回用舊題。
  if(out.length<10){
    const fallback=shuffle(valid.filter(q=>!used.has(q.id)));
    for(const q of fallback){
      if(out.length>=10) break;
      out.push(q);
      used.add(q.id);
    }
  }

  return out;
}

function start(m){
  mode=m;
  round=choose();
  ri=0;
  results=[];
  before=P.ability;

  if(round.length<10){
    alert("目前有效題目不足 10 題，無法開始完整一輪。");
    return;
  }

  view("quiz");
  renderQ();
}

function renderQ(){
  cur=round[ri];
  $("#counter").textContent=`第 ${ri+1} / ${round.length} 題`;
  $("#bar").style.width=(ri/round.length*100)+"%";
  $("#cat").textContent={
    grammar:"文法",vocabulary:"詞彙",kanji:"漢字",
    meaning:"語意",usage:"用法"
  }[cur.category] || cur.category || "綜合";
  $("#diff").textContent=`難度 ${cur.difficulty ?? 3}`;
  $("#question").textContent=cur.question;
  $("#feedback").innerHTML="";

  const es=Object.entries(cur.options||{}).sort(()=>Math.random()-.5);
  $("#options").innerHTML=es.map(([k,v])=>
    `<button class="option" data-k="${esc(k)}"><b>${esc(k)}.</b> ${esc(v)}</button>`
  ).join("");

  document.querySelectorAll(".option").forEach(b=>b.onclick=()=>answer(b.dataset.k));
  $("#why").onclick=why;
  $("#explain").onclick=other;
  $("#next").onclick=next;
}

function answer(k){
  if(results[ri]) return;

  const ok=k===cur.answer;
  document.querySelectorAll(".option").forEach(b=>{
    b.disabled=true;
    if(b.dataset.k===cur.answer) b.classList.add("correct");
    if(b.dataset.k===k && !ok) b.classList.add("wrong");
  });

  $("#feedback").className="feedback "+(ok?"good":"bad");
  $("#feedback").innerHTML=
    `<b>${ok?"✓ 正確！":"✕ 不正確"}</b><br>`+
    (ok?"答對了。":`你的答案：${esc(k)}。正確答案：${esc(cur.answer)}。`);

  record(ok,k);
}

function record(ok,k){
  results[ri]={q:cur,ok,k};

  P.answered++;
  if(ok) P.correct++;

  P.cat[cur.category]??={a:0,c:0};
  P.cat[cur.category].a++;
  if(ok) P.cat[cur.category].c++;

  P.concept[cur.conceptGroup]??={a:0,c:0};
  P.concept[cur.conceptGroup].a++;
  if(ok) P.concept[cur.conceptGroup].c++;

  const m=mastery(cur.id);
  m.a++;
  if(ok)m.c++;

  Object.keys(m.d).forEach(x=>{
    m.d[x]=Math.max(0,Math.min(1,m.d[x]+(ok?.10:-.14)));
  });

  const avg=Object.values(m.d).reduce((a,b)=>a+b,0)/5;
  m.s=avg>.88&&m.a>=6?"mastered":
      avg>.68?"familiar":
      avg>.42?"unstable":"learning";

  const days={new:1,learning:3,unstable:2,familiar:7,mastered:21}[m.s] ?? 3;
  const d=new Date();
  d.setDate(d.getDate()+days);
  R[cur.id]=d.toISOString();

  if(ok) delete W[cur.id];
  else W[cur.id]={
    error:errType(cur),
    at:new Date().toISOString()
  };

  // 保留原有能力分計法。
  P.ability=Math.max(0,Math.min(100,
    Math.round(P.ability+(ok
      ?2.5+(Number(cur.difficulty||3)-3)*1.2
      :-3-(Number(cur.difficulty||3)-3)*.5))
  ));

  // 只記錄「題目已做」，供跨模式去重。
  H.unshift({
    id:cur.id,
    ok,
    k,
    mode,
    time:new Date().toISOString()
  });
  H=H.slice(0,300);

  save();
}

function errType(q){
  if(q.category==="kanji")return"漢字讀音";
  if(q.category==="vocabulary")return"詞彙混淆";
  if(q.category==="meaning")return"意思理解";
  if(q.skill==="grammar_distinction")return"文法混淆";
  return"語境判斷";
}

function why(){
  const ex=cur.explanation||{};
  open("📖 為甚麼？",
    `<p>${esc(ex.correct||"此題考查相關日語用法。")}</p>`+
    `<p><b>💡 記憶重點</b><br>${esc(ex.keyPoint||"請留意本題的接續、語意及使用情境。")}</p>`+
    `<p>考點：${esc(ex.grammarPoint||cur.conceptGroup||"綜合")}</p>`
  );
}

function other(){
  const ex=cur.explanation?.options||{};
  open("🔍 其他選項",
    Object.entries(cur.options||{}).map(([k,v])=>
      `<p><b>${esc(k)}. ${esc(v)}</b><br>`+
      `${k===cur.answer?"✓ 正確":"✕ 不適合"}：${esc(ex[k]||"此選項不符合本句語境。")}</p>`
    ).join("")
  );
}

function open(t,b){
  $("#dtitle").textContent=t;
  $("#dbody").innerHTML=b;
  $("#dialog").showModal();
}

function next(){
  if(!results[ri])return;
  if(ri<round.length-1){
    ri++;
    renderQ();
  }else finish();
}

function finish(){
  const score=results.filter(x=>x.ok).length;
  E.unshift({
    time:new Date().toISOString(),
    mode,
    score,
    before,
    after:P.ability
  });
  E=E.slice(0,50);
  save();

  $("#score").textContent=score+"/10";
  $("#summary").textContent=`本輪答對 ${score} 題。`;
  $("#before").textContent=before;
  $("#after").textContent=P.ability;
  $("#rg").textContent=fmt("grammar");
  $("#rv").textContent=fmt("vocabulary");
  $("#rk").textContent=fmt("kanji");

  const o=results.filter(x=>x.q.category==="meaning"||x.q.category==="usage");
  $("#ro").textContent=o.length?`${o.filter(x=>x.ok).length}/${o.length}`:"-";

  const bad=results.filter(x=>!x.ok);
  $("#obs").innerHTML=bad.length
    ?`<p>• 本輪有 ${bad.length} 題錯誤；下一輪會增加相關弱點及相似概念的選題權重。</p>`
    :`<p>• 本輪全部答對；下一輪會逐步提高難度。</p>`;

  $("#conf").innerHTML=bad.map(x=>
    `<span class="chip orange">${esc(errType(x.q))}</span>`
  ).join("")||"暫未形成明顯混淆。";

  view("result");
}

function fmt(c){
  const a=results.filter(x=>x.q.category===c);
  return a.length?`${a.filter(x=>x.ok).length}/${a.length}`:"-";
}

function home(){
  const ms=Object.values(M);
  const av=ms.length
    ?Math.round(ms.reduce((s,m)=>
      s+Object.values(m.d).reduce((a,b)=>a+b,0)/5,0
    )/ms.length*100)
    :0;

  $("#ability").textContent=P.ability;
  $("#band").textContent=band(P.ability);
  $("#mastery").textContent=av+"%";
  $("#wrong").textContent=Object.keys(W).length;
  $("#answered").textContent=P.answered;

  const w=Object.entries(P.concept||{})
    .filter(([,v])=>v.a)
    .sort((a,b)=>(1-b[1].c/b[1].a)-(1-a[1].c/a[1].a))
    .slice(0,7);

  $("#homeWeak").innerHTML=w.length
    ?w.map(([k,v])=>
      `<span class="chip ${v.c/v.a<.5?"red":"orange"}">`+
      `${esc(k)} · ${Math.round((1-v.c/v.a)*100)}%</span>`
    ).join("")
    :"暫未有足夠數據。";
}

function progress(){
  home();

  $("#pa").textContent=P.ability;
  $("#pb").textContent=band(P.ability);
  $("#pc").textContent=P.correct;
  $("#pt").textContent=P.answered;
  $("#pm").textContent=$("#mastery").textContent;

  const w=Object.entries(P.concept||{})
    .filter(([,v])=>v.a)
    .sort((a,b)=>(1-b[1].c/b[1].a)-(1-a[1].c/a[1].a));

  $("#weakmap").innerHTML=w.length
    ?w.map(([k,v])=>
      `<div class="weakrow"><span>${esc(k)}</span>`+
      `<div class="meter"><i style="width:${Math.max(4,(1-v.c/v.a)*100)}%"></i></div>`+
      `<b>${Math.round((1-v.c/v.a)*100)}%</b></div>`
    ).join("")
    :"暫無數據";

  $("#matrix").innerHTML=Object.entries(P.confusions||{})
    .map(([k,v])=>`<span class="chip orange">${esc(k)} · ${v}</span>`)
    .join("")||"答錯相似概念後會在此顯示。";

  const qmap=Object.fromEntries(Q.map(q=>[q.id,q]));
  $("#cards").innerHTML=Object.entries(M)
    .filter(([,m])=>m.s==="familiar"||m.s==="mastered")
    .slice(0,12)
    .map(([id,m])=>
      `<div class="knowledge"><b>${esc(qmap[id]?.grammarPoint||id)}</b><br>`+
      `熟練度：${Math.round(Object.values(m.d).reduce((a,b)=>a+b,0)/5*100)}%</div>`
    ).join("")||"暫未形成知識卡";

  $("#hist").innerHTML=H.slice(0,10).map(x=>
    `<div class="history">${x.ok?"✓":"✕"} ${esc(x.id)} · `+
    `${new Date(x.time).toLocaleString("zh-HK",{hour12:false})}</div>`
  ).join("")||"暫無紀錄";
}

function bind(){
  document.querySelectorAll("[data-mode]").forEach(b=>{
    b.onclick=()=>start(b.dataset.mode);
  });

  document.querySelectorAll("[data-go]").forEach(b=>{
    b.onclick=()=>{
      view(b.dataset.go);
      if(b.dataset.go==="progress")progress();
    };
  });

  if($("#quit"))$("#quit").onclick=()=>view("home");
  if($("#again"))$("#again").onclick=()=>start(mode);
  if($("#close"))$("#close").onclick=()=>$("#dialog").close();

  // Settings：舊版本曾漏掉 click handler，這裡一併保留。
  const settings=$("#settings");
  const dialog=$("#settingsDialog");
  if(settings && dialog) settings.onclick=()=>dialog.showModal();

  const closeSettings=$("#closeSettings");
  if(closeSettings && dialog) closeSettings.onclick=()=>dialog.close();

  const clear=$("#clearData");
  if(clear) clear.onclick=()=>{
    if(confirm("確定要清除所有學習紀錄嗎？題庫不會被刪除。")){
      Object.values(S).forEach(k=>localStorage.removeItem(k));
      location.reload();
    }
  };
}

async function boot(){
  bind();

  try{
    const r=await fetch("./questions.json",{cache:"no-store"});
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    const x=await r.json();
    Q=Array.isArray(x)?x:x.questions||[];

    const valid=Q.filter(q=>q.validity!=="ambiguous");
    if(valid.length<10) throw new Error("有效題目不足 10 題");

    home();
  }catch(err){
    console.error(err);
    const box=$("#bootError");
    if(box){
      box.hidden=false;
      box.textContent="題庫載入失敗："+err.message+
        "。請確認 questions.json 與 index.html 位於 repository root。";
    }else{
      alert("題庫載入失敗，請確認 questions.json 與 index.html 在同一目錄。");
    }
  }
}

document.addEventListener("DOMContentLoaded",boot);
