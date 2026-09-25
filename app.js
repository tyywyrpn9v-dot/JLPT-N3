(() => {
"use strict";

const STORAGE = {
  progress: "n3_progress",
  mastery: "n3_mastery",
  wrong: "n3_wrong_answers",
  review: "n3_review_schedule",
  history: "n3_question_history",
  examiner: "n3_examiner_history",
  cards: "n3_saved_cards",
  settings: "n3_settings"
};

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

function read(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

let P = read(STORAGE.progress, {
  ability: 50, answered: 0, correct: 0, cat: {}, concept: {}, confusions: {}
});
let M = read(STORAGE.mastery, {});
let W = read(STORAGE.wrong, {});
let R = read(STORAGE.review, {});
let H = read(STORAGE.history, []);
let E = read(STORAGE.examiner, []);
let C = read(STORAGE.cards, {});
let settings = read(STORAGE.settings, { sound: false });

let Q = [];
let mode = "examiner";
let round = [];
let index = 0;
let current = null;
let results = [];
let beforeAbility = P.ability;

function saveAll() {
  write(STORAGE.progress, P);
  write(STORAGE.mastery, M);
  write(STORAGE.wrong, W);
  write(STORAGE.review, R);
  write(STORAGE.history, H);
  write(STORAGE.examiner, E);
  write(STORAGE.cards, C);
  write(STORAGE.settings, settings);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[ch]));
}

function band(score) {
  if (score < 40) return "N4 基礎仍需鞏固";
  if (score < 55) return "N3 入門階段";
  if (score < 70) return "N3 基礎";
  if (score < 80) return "N3 中段";
  if (score < 90) return "N3 中後段";
  return "N3 高熟練度";
}

function showView(id) {
  $$(".view").forEach(v => v.classList.remove("active"));
  const target = $("#" + id);
  if (target) target.classList.add("active");
  window.scrollTo(0, 0);
}

function mastery(id) {
  if (!M[id]) {
    M[id] = {
      attempts: 0,
      correct: 0,
      dimensions: { 辨認: .5, 意思: .5, 辨析: .5, 語境: .5, 主動使用: .2 },
      state: "new"
    };
  }
  return M[id];
}

function weakness(q) {
  const m = M[q.id];
  const concept = P.concept[q.conceptGroup];
  let score = .15;
  if (m) {
    const d = m.dimensions;
    score += (1 - (d.辨認 + d.辨析 + d.語境) / 3) * .5;
  }
  if (concept?.attempts) score += (1 - concept.correct / concept.attempts) * .35;
  if (R[q.id] && new Date(R[q.id]) <= new Date()) score += .4;
  if (W[q.id]) score += .25;
  return score;
}

function validQuestions() {
  return Q.filter(q => q && q.validity !== "ambiguous");
}

function chooseQuestions() {
  const pool = validQuestions();
  if (pool.length < 10) throw new Error(`有效題目只有 ${pool.length} 題，至少需要 10 題。`);

  const target = Math.max(1, Math.min(5, Math.round(P.ability / 20) + 1));
  const selected = [];
  const used = new Set();

  const pickFrom = (candidates) => {
    const sorted = [...candidates].sort((a, b) => {
      const sa = weakness(a) - Math.abs(a.difficulty - target) * .15;
      const sb = weakness(b) - Math.abs(b.difficulty - target) * .15;
      return sb - sa;
    });
    return sorted[0];
  };

  while (selected.length < 10) {
    let candidates = pool.filter(q => !used.has(q.id));

    if (mode === "review") {
      const due = candidates.filter(q => R[q.id] && new Date(R[q.id]) <= new Date());
      if (due.length) candidates = due;
    }

    if (mode === "daily") {
      const n = selected.length;
      if (n < 3) {
        const wrong = candidates.filter(q => W[q.id]);
        if (wrong.length) candidates = wrong;
      } else if (n < 6) {
        const weak = candidates.filter(q => weakness(q) >= .55);
        if (weak.length) candidates = weak;
      } else if (n < 9) {
        const fresh = candidates.filter(q => !M[q.id]);
        if (fresh.length) candidates = fresh;
      } else {
        candidates = candidates.filter(q => q.difficulty >= 4);
        if (!candidates.length) candidates = pool.filter(q => !used.has(q.id));
      }
    }

    if (!candidates.length) break;

    const recentCats = selected.slice(-3).map(q => q.category);
    let q = pickFrom(candidates);
    const diversified = candidates.filter(x =>
      !(recentCats.length === 3 && recentCats.every(c => c === x.category))
    );
    if (diversified.length) q = pickFrom(diversified);

    selected.push(q);
    used.add(q.id);
  }

  return selected;
}

function start(selectedMode) {
  mode = selectedMode;
  try {
    round = chooseQuestions();
    if (round.length !== 10) throw new Error("無法組成完整 10 題。");
  } catch (err) {
    showBootError("⚠️ 題目初始化失敗：" + err.message);
    return;
  }

  index = 0;
  results = [];
  beforeAbility = P.ability;
  showView("quiz");
  renderQuestion();
}

function renderQuestion() {
  current = round[index];

  $("#counter").textContent = `第 ${index + 1} / 10 題`;
  $("#bar").style.width = `${(index / 10) * 100}%`;
  $("#cat").textContent = {
    grammar: "文法", vocabulary: "詞彙", kanji: "漢字",
    meaning: "語意", usage: "用法"
  }[current.category] || current.category;
  $("#diff").textContent = `難度 ${current.difficulty}`;
  $("#question").textContent = current.question;
  $("#feedback").innerHTML = "";
  $("#feedback").className = "";

  const entries = Object.entries(current.options || {});
  for (let i = entries.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [entries[i], entries[j]] = [entries[j], entries[i]];
  }

  $("#options").innerHTML = entries.map(([key, value]) =>
    `<button class="option" type="button" data-key="${escapeHTML(key)}"><b>${escapeHTML(key)}.</b> ${escapeHTML(value)}</button>`
  ).join("");

  $$(".option").forEach(btn => {
    btn.addEventListener("click", () => answer(btn.dataset.key), { once: true });
  });

  $("#why").onclick = explainWhy;
  $("#explain").onclick = explainOptions;
  $("#next").onclick = nextQuestion;
  $("#next").disabled = true;
}

function answer(key) {
  if (results[index]) return;

  const correct = key === current.answer;

  $$(".option").forEach(btn => {
    btn.disabled = true;
    if (btn.dataset.key === current.answer) btn.classList.add("correct");
    if (btn.dataset.key === key && !correct) btn.classList.add("wrong");
  });

  $("#feedback").className = "feedback " + (correct ? "good" : "bad");

  if (correct) {
    $("#feedback").innerHTML = `<b>✓ 正確！</b><br>答案 ${escapeHTML(current.answer)} 正確。`;
  } else {
    $("#feedback").innerHTML =
      `<b>✕ 不正確</b><br>你的答案：${escapeHTML(key)}　正確答案：${escapeHTML(current.answer)}`;
  }

  record(correct, key);
  $("#next").disabled = false;
}

function record(correct, chosenKey) {
  results[index] = { q: current, correct, chosenKey };

  P.answered++;
  if (correct) P.correct++;

  P.cat[current.category] ??= { attempts: 0, correct: 0 };
  P.cat[current.category].attempts++;
  if (correct) P.cat[current.category].correct++;

  P.concept[current.conceptGroup] ??= { attempts: 0, correct: 0 };
  P.concept[current.conceptGroup].attempts++;
  if (correct) P.concept[current.conceptGroup].correct++;

  const m = mastery(current.id);
  m.attempts++;
  if (correct) m.correct++;

  Object.keys(m.dimensions).forEach(k => {
    m.dimensions[k] = Math.max(0, Math.min(1, m.dimensions[k] + (correct ? .08 : -.12)));
  });

  const avg = Object.values(m.dimensions).reduce((a, b) => a + b, 0) / 5;
  if (avg > .88 && m.attempts >= 6) m.state = "mastered";
  else if (avg > .68) m.state = "familiar";
  else if (avg > .42) m.state = "unstable";
  else m.state = "learning";

  const days = { new: 1, learning: 2, unstable: 1, familiar: 7, mastered: 21 };
  const due = new Date();
  due.setDate(due.getDate() + (days[m.state] ?? 2));
  R[current.id] = due.toISOString();

  if (correct) {
    delete W[current.id];
  } else {
    W[current.id] = {
      error: errorType(current),
      time: new Date().toISOString(),
      chosen: chosenKey
    };
  }

  // Record a simple confusion relationship when two options belong to the same concept family.
  if (!correct) {
    const wrongText = current.options?.[chosenKey] ?? chosenKey;
    const correctText = current.options?.[current.answer] ?? current.answer;
    const label = `${current.grammarPoint || current.id}: ${wrongText} ↔ ${correctText}`;
    P.confusions[label] = (P.confusions[label] || 0) + 1;
  }

  P.ability = Math.max(0, Math.min(100,
    Math.round(P.ability + (correct
      ? 2.5 + (current.difficulty - 3) * 1.2
      : -3 - (current.difficulty - 3) * .5))
  ));

  H.unshift({
    id: current.id, correct, chosenKey,
    time: new Date().toISOString(),
    category: current.category
  });
  H = H.slice(0, 300);

  saveAll();
  renderHomeStats();
}

function errorType(q) {
  if (q.category === "kanji") return "漢字讀音";
  if (q.category === "vocabulary") return "詞彙混淆";
  if (q.category === "meaning") return "意思理解";
  if (q.skill === "grammar_distinction") return "文法混淆";
  return "語境判斷";
}

function explainWhy() {
  const ex = current.explanation || {};
  const keyPoint = ex.keyPoint || ex.correct || "本題考查句子中的語境及文法功能。";
  openDialog("📖 文法解析",
    `<p>${escapeHTML(ex.correct || "請根據前後文判斷。")}</p>
     <p><b>💡 記憶重點</b><br>${escapeHTML(keyPoint)}</p>
     ${current.grammarPoint ? `<p>考點：<b>${escapeHTML(current.grammarPoint)}</b></p>` : ""}`);
}

function explainOptions() {
  const ex = current.explanation?.options || {};
  const html = Object.entries(current.options || {}).map(([key, value]) =>
    `<p><b>${escapeHTML(key)}. ${escapeHTML(value)}</b><br>${key === current.answer ? "✓ 正確" : "✕ 不適合"}：${escapeHTML(ex[key] || "不符合本題語境。")}</p>`
  ).join("");
  openDialog("🔍 其他選項", html);
}

function openDialog(title, body) {
  $("#dtitle").textContent = title;
  $("#dbody").innerHTML = body;
  const dialog = $("#dialog");
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function closeDialog() {
  const dialog = $("#dialog");
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
}

function nextQuestion() {
  if (!results[index]) return;
  if (index < round.length - 1) {
    index++;
    renderQuestion();
  } else {
    finishRound();
  }
}

function finishRound() {
  const score = results.filter(x => x.correct).length;

  E.unshift({
    time: new Date().toISOString(),
    score,
    total: 10,
    before: beforeAbility,
    after: P.ability,
    mode
  });
  E = E.slice(0, 50);
  saveAll();

  $("#score").textContent = `${score} / 10`;
  $("#summary").textContent = `本輪有效作答 10 題，答對 ${score} 題。`;
  $("#before").textContent = beforeAbility;
  $("#after").textContent = P.ability;

  $("#rg").textContent = categoryResult("grammar");
  $("#rv").textContent = categoryResult("vocabulary");
  $("#rk").textContent = categoryResult("kanji");
  $("#ro").textContent = categoryResult("meaning", "usage");

  const wrong = results.filter(x => !x.correct);
  $("#obs").innerHTML = wrong.length
    ? `<p>• 本輪有 ${wrong.length} 題錯誤；相關概念會提高日後複習權重。</p>`
    : "<p>• 本輪全部答對；下一輪會逐步提高難度。</p>";

  const counts = {};
  wrong.forEach(x => {
    const type = errorType(x.q);
    counts[type] = (counts[type] || 0) + 1;
  });
  $("#conf").innerHTML = Object.entries(counts)
    .map(([k, v]) => `<span class="chip orange">${escapeHTML(k)} × ${v}</span>`).join(" ")
    || "暫未形成明顯混淆。";

  showView("result");
}

function categoryResult(...categories) {
  const arr = results.filter(x => categories.includes(x.q.category));
  return arr.length ? `${arr.filter(x => x.correct).length}/${arr.length}` : "-";
}

function renderHomeStats() {
  const masteryValues = Object.values(M);
  const avg = masteryValues.length
    ? masteryValues.reduce((sum, m) =>
        sum + Object.values(m.dimensions).reduce((a, b) => a + b, 0) / 5, 0
      ) / masteryValues.length
    : 0;

  $("#ability").textContent = P.ability;
  $("#band").textContent = band(P.ability);
  $("#mastery").textContent = `${Math.round(avg * 100)}%`;
  $("#wrong").textContent = Object.keys(W).length;
  $("#answered").textContent = P.answered;

  const concepts = Object.entries(P.concept)
    .filter(([, v]) => v.attempts)
    .sort((a, b) => (1 - b[1].correct / b[1].attempts) - (1 - a[1].correct / a[1].attempts))
    .slice(0, 7);

  $("#homeWeak").innerHTML = concepts.length
    ? concepts.map(([k, v]) => {
        const rate = v.correct / v.attempts;
        return `<span class="chip ${rate < .5 ? "red" : "orange"}">${escapeHTML(k)} · ${Math.round((1-rate)*100)}%</span>`;
      }).join(" ")
    : "暫未有足夠數據。";
}

function renderProgress() {
  renderHomeStats();

  $("#pa").textContent = P.ability;
  $("#pb").textContent = band(P.ability);
  $("#pc").textContent = P.correct;
  $("#pt").textContent = P.answered;
  $("#pm").textContent = $("#mastery").textContent;

  const concepts = Object.entries(P.concept)
    .filter(([, v]) => v.attempts)
    .sort((a, b) => (1 - b[1].correct / b[1].attempts) - (1 - a[1].correct / a[1].attempts));

  $("#weakmap").innerHTML = concepts.length
    ? concepts.map(([k, v]) => {
        const weaknessRate = Math.max(0, Math.min(1, 1 - v.correct / v.attempts));
        return `<div class="weakrow"><span>${escapeHTML(k)}</span><div class="meter"><i style="width:${Math.max(4, weaknessRate*100)}%"></i></div><b>${Math.round(weaknessRate*100)}%</b></div>`;
      }).join("")
    : "暫無數據";

  $("#matrix").innerHTML = Object.entries(P.confusions)
    .sort((a,b) => b[1]-a[1]).slice(0, 12)
    .map(([k,v]) => `<span class="chip orange">${escapeHTML(k)} × ${v}</span>`).join(" ")
    || "答錯相似概念後會在此顯示。";

  const qmap = Object.fromEntries(Q.map(q => [q.id, q]));
  $("#cards").innerHTML = Object.entries(M)
    .filter(([, m]) => m.state === "familiar" || m.state === "mastered")
    .slice(0, 12)
    .map(([id, m]) => {
      const q = qmap[id];
      const value = Math.round(Object.values(m.dimensions).reduce((a,b)=>a+b,0)/5*100);
      return `<div class="knowledge"><b>${escapeHTML(q?.grammarPoint || id)}</b><br>綜合掌握度：${value}%<br>狀態：${escapeHTML(m.state)}</div>`;
    }).join("")
    || "暫未形成知識卡";

  $("#hist").innerHTML = H.slice(0, 10)
    .map(x => `<div class="history">${x.correct ? "✓" : "✕"} ${escapeHTML(x.id)} · ${new Date(x.time).toLocaleString("zh-HK",{hour12:false})}</div>`)
    .join("") || "暫無紀錄";
}

function showBootError(message) {
  const box = $("#bootError");
  box.hidden = false;
  box.innerHTML = `<b>${escapeHTML(message)}</b><br><small>請確認 index.html、app.js、questions.json、knowledge.json 均位於 GitHub repository 的根目錄，並重新整理頁面。</small>`;
}

async function init() {
  // All event handlers are registered before the data request.
  $$("[data-mode]").forEach(btn => btn.addEventListener("click", () => start(btn.dataset.mode)));
  $$("[data-go]").forEach(btn => btn.addEventListener("click", () => {
    const target = btn.dataset.go;
    showView(target);
    if (target === "progress") renderProgress();
  }));

  $("#settings").addEventListener("click", () => {
    openDialog("⚙️ 設定",
      `<label class="setting-row"><input id="soundSetting" type="checkbox" ${settings.sound ? "checked" : ""}> 答題後提示音（目前為簡易版）</label>
       <p class="muted">學習紀錄只儲存在這個瀏覽器的 localStorage。</p>
       <button id="clearData" class="danger" type="button">清除本機學習紀錄</button>`);
    $("#soundSetting").onchange = e => {
      settings.sound = e.target.checked;
      saveAll();
    };
    $("#clearData").onclick = () => {
      if (!confirm("確定要清除所有本機學習紀錄嗎？")) return;
      Object.values(STORAGE).forEach(k => localStorage.removeItem(k));
      location.reload();
    };
  });

  $("#quit").onclick = () => showView("home");
  $("#again").onclick = () => start(mode);
  $("#close").onclick = closeDialog;

  $("#dialog").addEventListener("click", e => {
    if (e.target === $("#dialog")) closeDialog();
  });

  try {
    const response = await fetch("./questions.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`questions.json HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("questions.json 不是陣列格式");

    Q = data.filter(q => q.validity !== "ambiguous");
    if (Q.length < 10) throw new Error(`有效題目只有 ${Q.length} 題`);

    renderHomeStats();
    showView("home");
  } catch (error) {
    console.error("JLPT N3 初始化失敗：", error);
    showBootError("⚠️ 題庫載入失敗：" + error.message);
  }
}

document.addEventListener("DOMContentLoaded", init);
})();