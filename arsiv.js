// arsiv.js — Geçmiş Günler (arşiv) sayfasının işleyişi
// Veri kaynağı: archive/index.json (tarih listesi) ve archive/tr/<tarih>.json (o günün haberleri + testi)
// Adreste ?date=YYYY-MM-DD varsa, o gün doğrudan açılır.

const $ = (id) => document.getElementById(id);

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
  $("day-view").classList.remove("hidden");
  window.scrollTo(0, 0);
}

async function init() {
  const res = await fetch("archive/index.json?t=" + Date.now());
  const index = await res.json();
  const dates = index.tr || [];

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
  $("date-line").textContent = "Bir tarih seçin; o günün haberlerini okuyup testini çözebilirsiniz";
  window.scrollTo(0, 0);
});

init().catch(err => {
  $("date-line").textContent = "Yüklenemedi. Lütfen biraz sonra tekrar deneyin.";
  console.error(err);
});
