// anket.js — Anketin çalışma mantığı (Japonca baskıdaki feedback.js ile aynı yapı).
//
// [Sonuçlar nasıl toplanır?]
// Bu sayfa cevapları kendisi saklayamaz (statik sayfa). Gönder düğmesine
// basıldığında cevaplar Google Form'a POST edilir; sonuçlar formun
// "Yanıtlar" sekmesinde ve bağlı e-tabloda otomatik birikir.
//
// [Bağlantı ayarları] Google Form yenilenirse sadece bu iki satır değişir.
const FORM_ACTION = "https://docs.google.com/forms/d/e/1FAIpQLSe0jeR6fXlCHY13DDmKZpNGMIT67vhJkJaNYqAgBt2PPKSCxw/formResponse";
const ENTRY_IDS   = ["entry.958022116", "entry.397432648", "entry.363653064", "entry.1403552857",
                     "entry.554288909", "entry.43411799", "entry.1770339238", "entry.1301125233"];

// [Sorular] Soruları değiştirmek için burayı düzenleyin. required: true = zorunlu.
const QUESTIONS = [
  { text: "Yaş grubunuz nedir?", options: ["Ortaokul öğrencisi", "Lise öğrencisi", "Üniversite öğrencisi", "Çalışan", "Diğer"] },
  { text: "Bu haber sayfasını ne sıklıkla okumak istersiniz?", required: true,
    options: ["Her gün", "Haftada birkaç kez", "Ara sıra", "Pek okumam"] },
  { text: "Haber sayısı (5 haber) nasıl?", options: ["Az", "Tam kararında", "Çok"] },
  { text: "Özetlerin anlaşılırlığı nasıl?", required: true,
    options: ["Çok anlaşılır", "Anlaşılır", "Normal", "Anlaşılması zor"] },
  { text: "Hangi alanda daha çok haber istersiniz? (En fazla 3 tanesini seçebilirsiniz)", multi: true, max: 3,
    options: ["Siyaset ve Dünya", "Ekonomi", "Hava durumu ve Afet", "Teknoloji", "Spor", "Eğlence", "Yaşam ve Sağlık"] },
  { text: "Haberlerden hazırlanan bir bilgi yarışması olsa dener miydiniz?",
    options: ["Denerdim", "Fark etmez", "İstemezdim"] },
  { text: "Genel memnuniyetiniz?", options: ["Çok memnunum", "Memnunum", "Normal", "Memnun değilim"] },
  { text: "Görüş ve önerileriniz varsa buraya yazabilirsiniz", comment: true },
];

// ---- Buradan sonrası mekanizma (dokunmanıza gerek yok) ----

const form = document.getElementById("survey");

form.innerHTML =
  QUESTIONS.map((q, i) => `
    <div class="card q">
      <h3>S${i + 1}. ${q.text}${q.required ? '<span class="req">Zorunlu</span>' : ""}</h3>
      ${q.comment
        ? `<textarea name="q${i}" placeholder="Serbestçe yazabilirsiniz (isteğe bağlı)"></textarea>`
        : q.options.map(o => `
          <label class="opt"><input type="${q.multi ? "checkbox" : "radio"}" name="q${i}" value="${o}">${o}</label>`).join("")}
    </div>`).join("") +
  `<button type="submit" class="submit-btn">Gönder</button>
   <p class="error" id="err"></p>`;

// Çoklu seçim (multi) üst sınırı: max adet seçilince, seçili olmayan diğer kutular kilitlenir
QUESTIONS.forEach((q, i) => {
  if (!q.multi) return;
  const boxes = form.querySelectorAll(`input[name="q${i}"]`);
  boxes.forEach(b => b.addEventListener("change", () => {
    const checked = form.querySelectorAll(`input[name="q${i}"]:checked`);
    boxes.forEach(x => { if (!x.checked) x.disabled = checked.length >= q.max; });
  }));
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = document.getElementById("err");

  for (let i = 0; i < QUESTIONS.length; i++) {
    if (QUESTIONS[i].required && !form.querySelector(`input[name="q${i}"]:checked`)) {
      err.textContent = `Lütfen S${i + 1} sorusunu cevaplayın`;
      return;
    }
  }

  const body = new FormData();
  QUESTIONS.forEach((q, i) => {
    if (!ENTRY_IDS[i]) return;
    if (q.comment) {
      body.append(ENTRY_IDS[i], form.querySelector(`textarea[name="q${i}"]`).value);
    } else if (q.multi) {
      // Çoklu seçimde aynı entry ID, seçilen her seçenek için bir kez gönderilir (Google onay kutusu biçimi)
      form.querySelectorAll(`input[name="q${i}"]:checked`)
        .forEach(b => body.append(ENTRY_IDS[i], b.value));
    } else {
      body.append(ENTRY_IDS[i], (form.querySelector(`input[name="q${i}"]:checked`) || {}).value || "");
    }
  });

  const btn = form.querySelector(".submit-btn");
  btn.disabled = true;
  btn.textContent = "Gönderiliyor…";
  try {
    await fetch(FORM_ACTION, { method: "POST", mode: "no-cors", body });
    form.hidden = true;
    document.getElementById("thanks").hidden = false;
    window.scrollTo(0, 0);
  } catch {
    btn.disabled = false;
    btn.textContent = "Gönder";
    err.textContent = "Gönderilemedi. Bağlantınızı kontrol edip tekrar deneyin.";
  }
});
