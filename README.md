# 今日の日本ニュース TOP5 — プロジェクト構成（README）

AIが毎朝、日本のニュースから5本を選んで要約するページ。
学習用に、役割ごとにファイルを分けています。

## 全体の流れ（パイプライン）

```
sources.json ──► fetch_news.py ──► candidates.json ──► AI（PROMPT.md） ──► news-latest.json
 （出典リスト）    （収集係）        （候補リスト）      （選定＋要約）        （今日の5本）
                                                                                  │
news.html ──► news.css（見た目）                                                    ▼
    └──────► news.js（読み込み＋表示） ◄──────────────────────────── news-latest.json
```

## ファイルの役割

| ファイル | 役割 | 誰が触る？ |
|---|---|---|
| `news.html` | ページの骨組みだけ。中身は空で、JSが埋める | ほぼ触らない |
| `news.css` | 見た目（色・余白・カード） | デザインを変えたいとき |
| `news.js` | JSONを読み込んでカードを並べる | 表示の仕組みを変えたいとき |
| `news-latest.json` | 今日の5本（データ） | AIが毎日書き換える |
| `sources.json` | 出典の登録リスト（名前・RSS・分野・言語） | 出典を足す/消すとき |
| `fetch_news.py` | RSSを集めて24時間以内の候補にする | 収集の仕組みを変えたいとき |
| `candidates.json` | AIへの入力（候補リスト）。自動生成 | 触らない（デバッグ時に見る） |
| `PROMPT.md` | AIへの指示書（選定・要約ルール） | 選ばせ方を変えたいとき |

## 手動で動かす（学習用）

```bash
cd ~/workspace/news-page
python3 fetch_news.py        # 候補を集める → candidates.json ができる
# 次に PROMPT.md のプロンプトに candidates.json を貼ってAIに渡す
# → 返ってきたJSONを news-latest.json に保存する
python3 -m http.server 8000  # ローカルでページ確認（ブラウザで localhost:8000/news.html）
```

※ `news.html` をファイルとして直接開くと、ブラウザの安全ルールでJSONを読み込めません。
　必ず http.server 経由か、公開サーバー（GitHub Pagesなど）で開くこと。

## デバッグの考え方

- ページが空 → `news.js` のエラーか、JSONの形式崩れ。まず `news-latest.json` を目視。
- 記事が古い/少ない → `candidates.json` を見る。収集（fetch）段階の問題。
- 変な要約・作り話っぽい → PROMPT.md のルールと、出典記事そのものを照合する。

## 拡張アイデア

- 出典を増やす → `sources.json` に1件足すだけ（feed があれば自動で候補に入る）
- カテゴリ別ページ（スポーツだけ等） → `news-latest.json` を分けるか、catで絞る表示を追加
- クイズ化 → 5本からクイズを作る = NewsQuest の原型（ataquiz と同じ発想）
- 自動化 → 毎朝の定期実行が fetch → AI選定 → JSON保存 → GitHubへ push を担当
