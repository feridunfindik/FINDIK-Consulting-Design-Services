// arsiv.js — Geçmiş Günler (arşiv) sayfasının işleyişi
// Veri kaynağı: archive/index.json (tarih listesi) ve archive/tr/<tarih>.json (o günün haberleri + testi)
// Adreste ?date=YYYY-MM-DD varsa, o gün doğrudan açılır.

const $ = (id) => document.getElementById(id);

// ---------- Takvim ----------
// Arşivi olan günler tıklanabilir; testi çözülen günlerde ✓ görünür.
// ✓ verisi, test sayfasının localStorage'a kaydettiği skor geçmişinden (history) gelir.
let archiveDates = [];   // "2026-11-05" biçiminde tarihler (yeniden eskiye)
let played = {};         // { "2026-11-05": {score, total}, ... }
let calY = 0, calM = 0;  // Gösterilen ay

function playedMap() {
  try {
    const s = JSON.parse(localStorage.getItem("newsquest_quiz_tr")) || {};
    return s.history || {};
  } catch (e) { return {}; }
}
const ds = (y, m, d) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

function renderCalendar() {
  $("cal-title").textContent =
    new Date(calY, calM, 1).toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
  const startOffset = (new Date(calY, calM, 1).getDay() + 6) % 7;   // Hafta Pazartesi başlar
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
  // Ay geçişi, arşivin olduğu en eski ve en yeni ay arasında
  const monthNum = (s) => Number(s.slice(0, 4)) * 12 + Number(s.slice(5, 7)) - 1;
  const cur = calY * 12 + calM;
  $("cal-prev").disabled = !archiveDates.length || cur <= monthNum(archiveDates[archiveDates.length - 1]);
  $("cal-next").disabled = !archiveDates.length || cur >= monthNum(archiveDates[0]);
}

$("cal-prev").addEventListener("click", () => { calM--; if (calM < 0) { calM = 11; calY--; } renderCalendar(); });
$("cal-next").addEventListener("click", () => { calM++; if (calM > 11) { calM = 0; calY++; } renderCalendar(); });

function fmtDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long" });
}

async function openDay(dateStr) {
  const res = await fetch(`archive/tr/${dateStr}.json?t=` + Date.now());
  const day = await res.json();
  const news = day.news;

  $("date-line").textContent = `${fmtDate(news.date)} haberleri TOP5`;
  $("list").innerHTML = news.articles.map(a => `
    <article class="card">
      ${a.img ? `<img class="thumb" src="${a.img}" alt="" loading="lazy" onerror="this.remove()">` : ""}
      <div class="meta">${a.cat} ｜ ${a.source} ｜ ${a.time}</div>
      <h2>${a.title}</h2>
      <p>${a.summary}</p>
      <a href="${a.url}" target="_blank" rel="noopener">Haberin tamamını oku →</a>
    </article>`).join("");

  // O günün testi varsa butonu göster
  const hasQuiz = day.quiz && day.quiz.questions && day.quiz.questions.length > 0;
  $("quiz-link").classList.toggle("hidden", !hasQuiz);
  $("no-quiz").classList.toggle("hidden", hasQuiz);
  if (hasQuiz) $("quiz-link").href = `test.html?date=${news.date}`;

  $("days").classList.add("hidden");
  $("calendar").classList.add("hidden");
  $("day-view").classList.remove("hidden");
  window.scrollTo(0, 0);
}

async function init() {
  const res = await fetch("archive/index.json?t=" + Date.now());
  const index = await res.json();
  const dates = index.tr || [];
  archiveDates = dates;
  played = playedMap();
  const base = dates.length ? new Date(dates[0] + "T00:00:00") : new Date();
  calY = base.getFullYear(); calM = base.getMonth();
  renderCalendar();

  $("date-line").textContent = "Bir tarih seçin; o günün haberlerini okuyup testini çözebilirsiniz";
  $("days").innerHTML = "";
  dates.forEach((dateStr, i) => {
    const btn = document.createElement("button");
    btn.className = "day-btn";
    btn.innerHTML = `<span>${fmtDate(dateStr)}</span>` +
      (i === 0 ? `<span class="badge">En yeni</span>` : `<span class="arrow">→</span>`);
    btn.addEventListener("click", () => openDay(dateStr));
    $("days").appendChild(btn);
  });

  // ?date= verilmişse o günü doğrudan aç
  const wanted = new URLSearchParams(location.search).get("date");
  if (wanted && dates.includes(wanted)) openDay(wanted).catch(console.error);
}

$("back-link").addEventListener("click", (e) => {
  e.preventDefault();
  $("day-view").classList.add("hidden");
  $("days").classList.remove("hidden");
  $("calendar").classList.remove("hidden");
  $("date-line").textContent = "Bir tarih seçin; o günün haberlerini okuyup testini çözebilirsiniz";
  window.scrollTo(0, 0);
});

init().catch(err => {
  $("date-line").textContent = "Yüklenemedi. Lütfen biraz sonra tekrar deneyin.";
  console.error(err);
});
