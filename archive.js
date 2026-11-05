// archive.js — 過去のニュースとクイズ（アーカイブ）の動き
// データ元: archive/index.json（日付の目次）と archive/jp/<日付>.json（その日のニュース＋クイズ）
// アドレスに ?date=YYYY-MM-DD があれば、その日を直接開く。

const $ = (id) => document.getElementById(id);
const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

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
  $("day-view").classList.remove("hidden");
  window.scrollTo(0, 0);
}

async function init() {
  const res = await fetch("archive/index.json?t=" + Date.now());
  const index = await res.json();
  const dates = index.jp || [];

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
  $("date-line").textContent = "日付を選ぶと、その日のニュースが読めて、クイズにも挑戦できます";
  window.scrollTo(0, 0);
});

init().catch(err => {
  $("date-line").textContent = "読み込めませんでした。時間をおいて再度お試しください。";
  console.error(err);
});
