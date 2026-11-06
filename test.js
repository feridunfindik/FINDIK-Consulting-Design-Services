// test.js — Günün Haber Testi'nin işleyişi
// Veri kaynağı: test-latest.json (her sabah haberlerle birlikte güncellenir)
// Seri (üst üste oynama) kaydı yalnızca tarayıcının localStorage'ında tutulur.
// Hesap yok, sunucuya gönderim yok.

const $ = (id) => document.getElementById(id);
const STORE_KEY = "newsquest_quiz_tr";

let quiz = null;      // { date, questions: [...] }
let current = 0;      // Şu anki soru numarası
let score = 0;        // Doğru sayısı

// ---------- Arşivden oynama ----------
// Adreste ?date=YYYY-MM-DD varsa, o günün testi (archive/tr/<tarih>.json) yüklenir.
// Arşiv testleri seriye (üst üste oynama) sayılmaz.
const ARCHIVE_DATE = new URLSearchParams(location.search).get("date");
const IS_ARCHIVE = !!ARCHIVE_DATE;

// ---------- Seri (üst üste oynama) kaydı ----------
function loadStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
  catch (e) { return {}; }
}
function streakText(store) {
  if (store.streak) return `🔥 ${store.streak} gündür üst üste oynuyorsun!`;
  return "Her gün oyna, serini başlat!";
}
// Test sonuna kadar çözüldüğünde bir kez çağrılır
function recordPlay(dateStr) {
  const store = loadStore();
  store.best = Math.max(store.best || 0, score);
  // Skor geçmişi: O günün en iyi skorunu tarih bazında sakla
  // (arşiv takvimindeki ✓ işaretleri ve ilerideki "İlerleme" ekranı için)
  store.history = store.history || {};
  const prev = store.history[dateStr];
  if (!prev || score > prev.score) {
    store.history[dateStr] = { score: score, total: quiz.questions.length };
  }
  // Seri: Bugünden geriye doğru, oynanmış günleri sayarak hesapla.
  // Tarih anahtarları yerel saatle üretilir. Eskiden toISOString()
  // kullanılıyordu; o, tarihi UTC'ye çevirdiği için UTC+ saat dilimlerinde
  // (Türkiye +3, Japonya +9) "dün"ü bir gün eksik hesaplıyor ve seri
  // hiç uzamıyordu — hata buydu.
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

// ---------- Ziyaret ölçümü (Google Analytics) ----------
// gtag yüklü değilse (reklam engelleyici vb.) hiçbir şey yapma.
function track(event, params) {
  if (typeof gtag === "function") gtag("event", event, params || {});
}

// ---------- Ekran geçişleri ----------
function show(id) {
  ["start-screen", "quiz-screen", "result-screen", "empty-screen"]
    .forEach((s) => $(s).classList.toggle("hidden", s !== id));
}

// ---------- Testin kendisi ----------
function renderQuestion() {
  const q = quiz.questions[current];
  const total = quiz.questions.length;
  $("progress-text").textContent = `Soru ${current + 1} / ${total}`;
  $("progress-fill").style.width = `${(current / total) * 100}%`;
  $("score-text").textContent = `⭐ ${score}`;
  $("q-source").textContent = `Kaynak: ${q.source}`;
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
  mark.textContent = ok ? "⭕ Doğru!" : `❌ Maalesef… Doğru cevap: "${q.options[q.answer]}"`;
  mark.className = ok ? "ok" : "ng";
  $("feedback-exp").textContent = q.explanation;
  $("article-link").href = q.url;
  $("next-btn").textContent =
    current + 1 < quiz.questions.length ? "Sonraki soru" : "Sonucu gör";
  $("feedback").classList.remove("hidden");
}

function showResult() {
  const total = quiz.questions.length;
  track("quiz_complete", { quiz_date: quiz.date, score: score, total: total });
  const store = IS_ARCHIVE ? null : recordPlay(quiz.date);
  $("progress-fill").style.width = "100%";
  $("result-score").textContent = `${total} soruda ${score} doğru!`;
  const shareText = IS_ARCHIVE
    ? `NewsQuest arşiv testinde (${quiz.date}) ${total} soruda ${score} doğru yaptım! 🔥 Sen kaç doğru yapabilirsin? #NewsQuest`
    : `NewsQuest günün haber testinde ${total} soruda ${score} doğru yaptım! 🔥 Sen kaç doğru yapabilirsin? #NewsQuest #GününHaberleri`;
  $("share-btn").href = "https://twitter.com/intent/tweet?text=" +
    encodeURIComponent(shareText) + "&url=" + encodeURIComponent("https://design.feridun.info/test.html");
  const ratio = score / total;
  $("result-emoji").textContent = ratio === 1 ? "🏆" : ratio >= 0.7 ? "🎉" : ratio >= 0.4 ? "😊" : "💪";
  $("result-msg").textContent =
    ratio === 1 ? "Hepsini bildin! Günün haberlerine tamamen hakimsin." :
    ratio >= 0.7 ? "Harika! Haberleri dikkatli okumuşsun." :
    ratio >= 0.4 ? "İyi gidiyorsun! Merak ettiğin haberleri bir kez daha oku." :
                   "Sorun değil! Haberleri tekrar okursan puanını artırırsın.";
  $("result-streak").textContent = IS_ARCHIVE
    ? "📚 Geçmiş gün testleri seriye sayılmaz"
    : `🔥 Üst üste oynama: ${store.streak}. gün (en iyi skor: ${store.best} soru)`;
  show("result-screen");
}

// ---------- Başlatma ----------
async function init() {
  try {
    if (IS_ARCHIVE) {
      const res = await fetch(`archive/tr/${ARCHIVE_DATE}.json?t=` + Date.now());
      if (!res.ok) throw new Error(res.status);
      quiz = (await res.json()).quiz;   // Günün arşiv dosyasından test bölümünü al
    } else {
      const res = await fetch("test-latest.json?t=" + Date.now());
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
  $("date-line").textContent =
    d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long" }) +
    " haberlerinden";
  $("q-count").textContent = quiz.questions.length;
  $("streak-line").textContent = IS_ARCHIVE
    ? "📚 Geçmiş günün testini çözüyorsun (seriye sayılmaz)"
    : streakText(loadStore());
  if (IS_ARCHIVE) {
    const link = $("result-home-link");
    link.href = `arsiv.html?date=${quiz.date}`;
    link.textContent = "📚 Bu günün haberlerine dön";
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
