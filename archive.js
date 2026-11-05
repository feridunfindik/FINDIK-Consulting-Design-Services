// archive.js — 過去のニュースとクイズ（アーカイブ）の動き
// データ元: archive/index.json（日付の目次）と archive/jp/<日付>.json（その日のニュース＋クイズ）
// アドレスに ?date=YYYY-MM-DD があれば、その日を直接開く。

const $ = (id) => document.getElementById(id);
const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

// ---------- カレンダー ----------
// アーカイブがある日はタップでき、クイズを解いた日には✓が付く。
// ✓の元データは、クイズ側が localStorage に残すスコア履歴（history）。
let archiveDates = [];   // "2026-11-05" のような文字列の配列（新しい順）
let played = {};         // { "2026-11-05": {score, total}, ... }
let calY = 0, calM = 0;  // 表示中の月

function playedMap() {
  try {
    const s = JSON.parse(localStorage.getItem("newsquest_quiz_jp")) || {};
    return s.history || {};
  } catch (e) { return {}; }
}
const ds = (y, m, d) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

function renderCalendar() {
  $("cal-title").textContent = `${calY}年${calM + 1}月`;
  const startOffset = new Date(calY, calM, 1).getDay();   // 日曜始まり
  const daysInMonth = new Date(calY, calM + 1, 0).getDate();
  const now = new Date();
  const todayStr = ds(now.getFullYear(), now.getMonth(), now.getDate());

  const box = $("cal-days");
  box.innerHTML = "";
  for (let i = 0; i < startOffset; i++) box.appendChild(document.createElement("span"));
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = ds(calY, calM, d);
    const has = archiveDates.includes(dateStr);
    const cell = document.createElement(has ? "button" : "span");
    cell.className = "cal-day" + (has ? " has" : "") + (dateStr === todayStr ? " today" : "");
    cell.textContent = d;
    if (played[dateStr]) {
      const c = document.createElement("span");
      c.className = "check";
      c.textContent = "✓";
      cell.appendChild(c);
    }
    if (has) cell.addEventListener("click", () => openDay(dateStr));
    box.appendChild(cell);
  }
  // 月の移動は、アーカイブがある一番古い月〜一番新しい月の間だけ
  const monthNum = (s) => Number(s.slice(0, 4)) * 12 + Number(s.slice(5, 7)) - 1;
  const cur = calY * 12 + calM;
  $("cal-prev").disabled = !archiveDates.length || cur <= monthNum(archiveDates[archiveDates.length - 1]);
  $("cal-next").disabled = !archiveDates.length || cur >= monthNum(archiveDates[0]);
}

$("cal-prev").addEventListener("click", () => { calM--; if (calM < 0) { calM = 11; calY--; } renderCalendar(); });
$("cal-next").addEventListener("click", () => { calM++; if (calM > 11) { calM = 0; calY++; } renderCalendar(); });

function fmtDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${WEEK[d.getDay()]}）`;
}

async function openDay(dateStr) {
  const res = await fetch(`archive/jp/${dateStr}.json?t=` + Date.now());
  const day = await res.json();
  const news = day.news;

  $("date-line").textContent = `${fmtDate(news.date)}のニュースTOP5`;
  $("list").innerHTML = news.articles.map(a => `
    <article class="card">
      ${a.img ? `<img class="thumb" src="${a.img}" alt="" loading="lazy" onerror="this.remove()">` : ""}
      <div class="meta">${a.cat} ｜ ${a.source} ｜ ${a.time}</div>
      <h2>${a.title}</h2>
      <p>${a.summary}</p>
      <a href="${a.url}" target="_blank" rel="noopener">記事全文を読む →</a>
    </article>`).join("");

  // その日のクイズがある時だけボタンを出す
  const hasQuiz = day.quiz && day.quiz.questions && day.quiz.questions.length > 0;
  $("quiz-link").classList.toggle("hidden", !hasQuiz);
  $("no-quiz").classList.toggle("hidden", hasQuiz);
  if (hasQuiz) $("quiz-link").href = `quiz.html?date=${news.date}`;

  $("days").classList.add("hidden");
  $("calendar").classList.add("hidden");
  $("day-view").classList.remove("hidden");
  window.scrollTo(0, 0);
}

async function init() {
  const res = await fetch("archive/index.json?t=" + Date.now());
  const index = await res.json();
  const dates = index.jp || [];
  archiveDates = dates;
  played = playedMap();
  const base = dates.length ? new Date(dates[0] + "T00:00:00") : new Date();
  calY = base.getFullYear(); calM = base.getMonth();
  renderCalendar();

  $("date-line").textContent = "日付を選ぶと、その日のニュースが読めて、クイズにも挑戦できます";
  $("days").innerHTML = "";
  dates.forEach((dateStr, i) => {
    const btn = document.createElement("button");
    btn.className = "day-btn";
    btn.innerHTML = `<span>${fmtDate(dateStr)}</span>` +
      (i === 0 ? `<span class="badge">最新</span>` : `<span class="arrow">→</span>`);
    btn.addEventListener("click", () => openDay(dateStr));
    $("days").appendChild(btn);
  });

  // ?date= が付いていたら、その日を直接開く
  const wanted = new URLSearchParams(location.search).get("date");
  if (wanted && dates.includes(wanted)) openDay(wanted).catch(console.error);
}

$("back-link").addEventListener("click", (e) => {
  e.preventDefault();
  $("day-view").classList.add("hidden");
  $("days").classList.remove("hidden");
  $("calendar").classList.remove("hidden");
  $("date-line").textContent = "日付を選ぶと、その日のニュースが読めて、クイズにも挑戦できます";
  window.scrollTo(0, 0);
});

init().catch(err => {
  $("date-line").textContent = "読み込めませんでした。時間をおいて再度お試しください。";
  console.error(err);
});
