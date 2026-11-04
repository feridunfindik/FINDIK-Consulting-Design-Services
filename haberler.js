// haberler.js — Veri görevlisi.
// İki işi var: ① haberler-latest.json dosyasını yüklemek  ② kartları oluşturup dizmek.
// Görünüm haberler.css'de, veriler haberler-latest.json'dadır.

async function loadNews() {
  // ?t=... eklemek, tarayıcının eski önbelleği yerine en güncel JSON'u almasını sağlar
  const res = await fetch("haberler-latest.json?t=" + Date.now());
  const data = await res.json();

  document.getElementById("date-line").textContent =
    `${data.date} | Son 24 saatin öne çıkan 5 haberi, yapay zeka tarafından özetlendi`;

  document.getElementById("list").innerHTML = data.articles.map(a => `
    <article class="card">
      <div class="meta">${a.cat} | ${a.source} | ${a.time}</div>
      <h2>${a.title}</h2>
      <p>${a.summary}</p>
      <a href="${a.url}" target="_blank" rel="noopener">Haberin tamamını oku →</a>
    </article>`).join("");
}

loadNews().catch(err => {
  document.getElementById("list").innerHTML =
    "<p>Haberler yüklenemedi. Lütfen daha sonra tekrar deneyin.</p>";
  console.error(err);
});
