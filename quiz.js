// quiz.js — 今日のニュースクイズの動き
// データ元: quiz-latest.json（毎朝、ニュースと一緒に更新される）
// 連続記録（ストリーク）はブラウザの localStorage にだけ保存する。
// アカウントもサーバー送信もありません。

const $ = (id) => document.getElementById(id);
const STORE_KEY = "newsquest_quiz_jp";

let quiz = null;      // { date, questions: [...] }
let current = 0;      // 今の問題番号
let score = 0;        // 正解数

// ---------- アーカイブ再生 ----------
// アドレスに ?date=YYYY-MM-DD があれば、その日のクイズ（archive/jp/<日付>.json）を読み込む。
// アーカイブのプレイは連続記録（ストリーク）に数えない。
const ARCHIVE_DATE = new URLSearchParams(location.search).get("date");
const IS_ARCHIVE = !!ARCHIVE_DATE;

// ---------- ストリーク（連続プレイ記録） ----------
function loadStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
  catch (e) { return {}; }
}
function streakText(store) {
  if (store.streak) return `🔥 ${store.streak}日連続でプレイ中！`;
  return "毎日続けて、連続記録を作ろう！";
}
// クイズを最後まで解いたときに1回だけ呼ぶ
function recordPlay(dateStr) {
  const store = loadStore();
  store.best = Math.max(store.best || 0, score);
  // スコア履歴：その日のベストスコアを日付ごとに残す
  // （アーカイブのカレンダーの✓印と、将来の「進み具合」画面の材料）
  store.history = store.history || {};
  const prev = store.history[dateStr];
  if (!prev || score > prev.score) {
    store.history[dateStr] = { score: score, total: quiz.questions.length };
  }
  // 連続記録：今日からさかのぼって、遊んだ日を数えて求める。
  // 日付キーはローカル時刻で作る。以前は toISOString() を使っていたが、
  // UTCに変換されるため UTC+の地域（日本など）では「昨日」が1日ずれて
  // 連続記録が永遠に伸びないバグがあった。
  const pad = (n) => String(n).padStart(2, "0");
  const keyOf = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  const d = new Date(dateStr + "T00:00:00");
  let streak = 0;
  while (store.history[keyOf(d)]) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  store.streak = streak;
  store.last = dateStr;
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
  return store;
}

// ---------- アクセス計測（Google Analytics） ----------
// gtag が読み込まれていない環境（広告ブロッカー等）では何もしない。
function track(event, params) {
  if (typeof gtag === "function") gtag("event", event, params || {});
}

// ---------- 画面の切り替え ----------
function show(id) {
  ["start-screen", "quiz-screen", "result-screen", "empty-screen"]
    .forEach((s) => $(s).classList.toggle("hidden", s !== id));
}

// ---------- クイズ本体 ----------
function renderQuestion() {
  const q = quiz.questions[current];
  const total = quiz.questions.length;
  $("progress-text").textContent = `${current + 1} / ${total} 問`;
  $("progress-fill").style.width = `${(current / total) * 100}%`;
  $("score-text").textContent = `⭐ ${score}`;
  $("q-source").textContent = `出典：${q.source}`;
  $("q-text").textContent = q.question;
  $("feedback").classList.add("hidden");

  const box = $("options");
  box.innerHTML = "";
  q.options.forEach((text, i) => {
    const btn = document.createElement("button");
    btn.className = "opt-btn";
    btn.textContent = text;
    btn.addEventListener("click", () => answer(i));
    box.appendChild(btn);
  });
}

function answer(chosen) {
  const q = quiz.questions[current];
  const buttons = $("options").querySelectorAll(".opt-btn");
  buttons.forEach((b, i) => {
    b.disabled = true;
    if (i === q.answer) b.classList.add("correct");
    else if (i === chosen) b.classList.add("wrong");
    else b.classList.add("dim");
  });
  const ok = chosen === q.answer;
  if (ok) score++;
  $("score-text").textContent = `⭐ ${score}`;

  const mark = $("feedback-mark");
  mark.textContent = ok ? "⭕ 正解！" : `❌ ざんねん… 正解は「${q.options[q.answer]}」`;
  mark.className = ok ? "ok" : "ng";
  $("feedback-exp").textContent = q.explanation;
  $("article-link").href = q.url;
  $("next-btn").textContent =
    current + 1 < quiz.questions.length ? "次の問題へ" : "結果を見る";
  $("feedback").classList.remove("hidden");
}

function showResult() {
  const total = quiz.questions.length;
  track("quiz_complete", { quiz_date: quiz.date, score: score, total: total });
  const store = IS_ARCHIVE ? null : recordPlay(quiz.date);
  $("progress-fill").style.width = "100%";
  $("result-score").textContent = `${total}問中 ${score}問 正解！`;
  const shareText = IS_ARCHIVE
    ? `NewsQuest ${quiz.date}のニュースクイズで${total}問中${score}問正解！🔥 君は何問正解できる？ #NewsQuest #クイズ`
    : `NewsQuest 今日のニュースクイズで${total}問中${score}問正解！🔥 君は何問正解できる？ #NewsQuest #今日のニュース #クイズ`;
  $("share-btn").href = "https://twitter.com/intent/tweet?text=" +
    encodeURIComponent(shareText) + "&url=" + encodeURIComponent("https://design.feridun.info/quiz.html");
  const ratio = score / total;
  $("result-emoji").textContent = ratio === 1 ? "🏆" : ratio >= 0.7 ? "🎉" : ratio >= 0.4 ? "😊" : "💪";
  $("result-msg").textContent =
    ratio === 1 ? "全問正解！今日のニュースを完璧に覚えましたね。" :
    ratio >= 0.7 ? "すごい！ニュースをよく読めています。" :
    ratio >= 0.4 ? "いい調子！気になったニュースをもう一度読んでみよう。" :
                   "おつかれさま！ニュースを読み返すと、もっと点が取れるよ。";
  $("result-streak").textContent = IS_ARCHIVE
    ? "📚 過去のクイズは連続記録に含まれません"
    : `🔥 連続プレイ ${store.streak}日目（最高スコア：${store.best}問）`;
  show("result-screen");
}

// ---------- 起動 ----------
async function init() {
  try {
    if (IS_ARCHIVE) {
      const res = await fetch(`archive/jp/${ARCHIVE_DATE}.json?t=` + Date.now());
      if (!res.ok) throw new Error(res.status);
      quiz = (await res.json()).quiz;   // その日のまとめファイルからクイズ部分を取り出す
    } else {
      const res = await fetch("quiz-latest.json?t=" + Date.now());
      if (!res.ok) throw new Error(res.status);
      quiz = await res.json();
    }
  } catch (e) {
    quiz = null;
  }
  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    $("date-line").textContent = "";
    show("empty-screen");
    return;
  }
  const d = new Date(quiz.date + "T00:00:00");
  const week = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  $("date-line").textContent =
    `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${week}）のニュースから`;
  $("q-count").textContent = quiz.questions.length;
  $("streak-line").textContent = IS_ARCHIVE
    ? "📚 過去のクイズに挑戦中（連続記録には含まれません）"
    : streakText(loadStore());
  if (IS_ARCHIVE) {
    const link = $("result-home-link");
    link.href = `archive.html?date=${quiz.date}`;
    link.textContent = "📚 この日のニュースへ戻る";
  }
  show("start-screen");
}

$("start-btn").addEventListener("click", () => {
  current = 0; score = 0;
  track("quiz_start", { quiz_date: quiz.date, questions: quiz.questions.length });
  show("quiz-screen");
  renderQuestion();
});
$("next-btn").addEventListener("click", () => {
  current++;
  if (current < quiz.questions.length) renderQuestion();
  else showResult();
});
$("retry-btn").addEventListener("click", () => {
  current = 0; score = 0;
  show("quiz-screen");
  renderQuestion();
});

init();
