// news.js — データ係。
// 役割は2つだけ： ① news-latest.json を読み込む  ② カードのHTMLを作って並べる。
// ページの見た目は news.css、データは news-latest.json が担当する。

async function loadNews() {
  // ?t=... を付けると、ブラウザの古いキャッシュではなく最新JSONを取りにいく
  // （ataquizdaily.html と同じやり方）
  const res = await fetch("news-latest.json?t=" + Date.now());
  const data = await res.json();

  document.getElementById("date-line").textContent =
    `${data.date} ｜ 過去24時間の主なニュースを、AIが5本にしぼって要約しました`;

  document.getElementById("list").innerHTML = data.articles.map(a => `
    <article class="card">
      ${a.img ? `<img class="thumb" src="${a.img}" alt="" loading="lazy" onerror="this.remove()">` : ""}
      <div class="meta">${a.cat} ｜ ${a.source} ｜ ${a.time}</div>
      <h2>${a.title}</h2>
      <p>${a.summary}</p>
      <a href="${a.url}" target="_blank" rel="noopener">記事全文を読む →</a>
    </article>`).join("");
}

loadNews().catch(err => {
  document.getElementById("list").innerHTML =
    "<p>ニュースを読み込めませんでした。時間をおいて再度お試しください。</p>";
  console.error(err);
});
