// feedback.js — アンケートの仕組み係。
//
//
// このページ自体は回答を保存できません（静的ページの限界）。
// 送信ボタンが押されたら、回答を Google フォームへ POST し、
// 結果は自動で Google フォームの「回答」タブとスプレッドシートにたまります。
// つまり「見た目は自分のページ、集計は Google」がこの仕組みです。
//
// 下の2つが接続情報。Google フォームを作り直したらここだけ直す。
const FORM_ACTION = "https://docs.google.com/forms/d/e/1FAIpQLSdnEdXmpJH6_VsD_fyufDcKVFFdyxzdckdgNspoiGnYjPWT9Q/formResponse";
const ENTRY_IDS = ["entry.1917944125", "entry.1518243491", "entry.888616546", "entry.1318812784",
  "entry.786744507", "entry.414833868", "entry.1225625831", "entry.2095054369"];

// 質問を変えるならここ。required: true は必須。
const QUESTIONS = [
{ text: "あなたはどの年代ですか？", options: ["中学生", "高校生", "大学生", "社会人", "その他"]},
{ text: "このニュースページを、どのくらい見たいですか？", required: true,
options: ["毎日見たい", "週に数回", "たまに", "あまり見ない"]},
{ text: "ニュースの本数（5本）はどうですか？", options: ["少ない", "ちょうどよい", "多い"]},
{ text: "要約の分かりやすさはどうですか？", required: true,
options: ["とても分かりやすい", "分かりやすい", "ふつう", "分かりにくい"]},
{ text: "もっと読みたい分野はどれですか？",
options: ["政治・国際", "経済", "天気・防災", "テクノロジー", "スポーツ", "エンタメ", "くらし・健康"]},
{ text: "ニュースから作るクイズがあったら、やってみたいですか？",
options: ["やってみたい", "どちらでもよい", "いらない"]},
{ text: "全体の満足度を教えてください", options: ["とても満足", "満足", "ふつう", "不満"]},
{ text: "ご意見・ご要望があれば自由に書いてください", comment: true},
];

// ---- ここから下は仕組み（触らなくてよい） ----

const form = document.getElementById("survey");

form.innerHTML =
QUESTIONS.map((q, i) => `
<div class="card q">
<h3>Q${i + 1}. ${q.text}${q.required? '<span class="req">必須</span>': ""}</h3>
${q.comment
? `<textarea name="q${i}" placeholder="自由に書いてください（任意）"></textarea>`
: q.options.map(o => `
<label class="opt"><input type="radio" name="q${i}" value="${o}">${o}</label>`).join("")}
</div>`).join("") +
`<button type="submit" class="submit-btn">送信する</button>
<p class="error" id="err"></p>`;

form.addEventListener("submit", async (e) => {
e.preventDefault();
const err = document.getElementById("err");

// 必須チェック
for (let i = 0; i < QUESTIONS.length; i++) {
if (QUESTIONS[i].required &&!form.querySelector(`input[name="q${i}"]:checked`)) {
err.textContent = `Q${i + 1} に答えてください`;
return;
}
}

// Google フォームの形式に合わせて送る
const body = new FormData();
QUESTIONS.forEach((q, i) => {
const v = q.comment
? form.querySelector(`textarea[name="q${i}"]`).value
: (form.querySelector(`input[name="q${i}"]:checked`) || {}).value || "";
if (ENTRY_IDS[i]) body.append(ENTRY_IDS[i], v);
});

const btn = form.querySelector(".submit-btn");
btn.disabled = true;
btn.textContent = "送信中…";
try {
// mode:"no-cors" = Google側の確認画面を読まずに送る定番の方法。
// 送信できたかどうかはブラウザからは見えないので、エラー以外は成功扱いにする。
await fetch(FORM_ACTION, { method: "POST", mode: "no-cors", body});
form.hidden = true;
document.getElementById("thanks").hidden = false;
window.scrollTo(0, 0);
} catch {
btn.disabled = false;
btn.textContent = "送信する";
err.textContent = "送信できませんでした。通信環境を確認してもう一度お試しください。";
}
});
