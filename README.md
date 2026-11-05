# 今日の日本ニュース TOP5 — プロジェクト構成（README）

AIが毎朝、日本のニュースから5本を選んで要約するページ。
学習用に、役割ごとにファイルを分けています。

## 全体の流れ（パイプライン）

```
sources.json ──► fetch_news.py ──► candidates.json ──► AI（PROMPT.md） ──► news-latest.json ──► fetch_images.py（写真を付ける）
 （出典リスト）    （収集係）        （候補リスト）      （選定＋要約）        （今日の5本）
                                                                                  │
news.html ──► news.css（見た目）                                                    ▼
    └──────► news.js（読み込み＋表示） ◄──────────────────────────── news-latest.json
                                                                                  │
                                          news-latest.json の要約だけを材料に        ▼
                                          AI（PROMPT-QUIZ.md） ──► quiz-raw.json ──► validate_quiz.py（検査＋シャッフル） ──► quiz-latest.json
                                                                                                                              │
quiz.html ──► quiz.css / quiz.js ◄────────────────────────────────────────────────────────────────────────────────────────────┘
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
| `fetch_images.py` | 各記事の写真を集める係。記事ページの og:image を読み、実際に読み込めるか検証して `img` を付ける | 画像の仕組みを変えたいとき |
| `candidates.json` | AIへの入力（候補リスト）。自動生成 | 触らない（デバッグ時に見る） |
| `PROMPT.md` | AIへの指示書（選定・要約ルール） | 選ばせ方を変えたいとき |
| `feedback.html` / `feedback.css` / `feedback.js` | 読者アンケート。送信すると Google フォームに記録される | 質問を変えたいとき |
| `quiz.html` / `quiz.css` / `quiz.js` | 今日のニュースクイズ。1問ずつ出題し、その場で正解表示。連続記録はブラウザの localStorage に保存 | クイズの見た目・動きを変えたいとき |
| `quiz-latest.json` | 今日のクイズ（10問）。検証を通ったものだけが入る | AI＋検査が毎日書き換える |
| `PROMPT-QUIZ.md` | クイズ作成AIへの指示書（材料は要約だけ・2問/記事・やさしい日本語） | 問題の作り方を変えたいとき |
| `validate_quiz.py` | クイズ検査係。形式・選択肢の重複・解説の数字を検査し、選択肢をシャッフルして正解位置の偏りを消す。5問未満なら公開しない | 検査ルールを変えたいとき |
| `quiz-raw.json` | 検査前の生クイズ。自動生成 | 触らない（デバッグ時に見る） |
| `archive.html` / `archive.css` / `archive.js` | 過去のニュースとクイズ（日本語アーカイブ）。日付一覧から、その日のニュース表示とクイズへ | アーカイブの見た目・動きを変えたいとき |
| `arsiv.html` / `arsiv.css` / `arsiv.js` | トルコ語アーカイブ（Geçmiş Günler）。役割は archive と同じ | 同上 |
| `archive_day.py` | 1日分を梱包する係。その日のニュース＋クイズを `archive/<言語>/<日付>.json` に保存し、`archive/index.json` の日付一覧を更新する。毎朝の自動更新の中で呼ばれる | 梱包の仕方を変えたいとき |
| `archive/index.json` | アーカイブの日付一覧（言語別・新しい順）。アーカイブページがこれだけ読んで一覧を作る | 自動生成（触らない） |
| `archive/jp/*.json` / `archive/tr/*.json` | 1日分のまとめファイル（`{date, news, quiz}`）。クイズページは `?date=YYYY-MM-DD` でこのファイルのクイズを読む | 自動生成（触らない） |

## アーカイブ（過去の日々）

- 仕組み：毎朝の更新で、その日の `news-latest.json`＋`quiz-latest.json`（トルコ語版は haberler/test）を
  `archive_day.py` が1ファイルにまとめ、`archive/jp/<日付>.json` に残す。最新ファイルの「上書き」で消えない。
- 読者側：archive.html（トルコ語は arsiv.html）が `archive/index.json` から日付ボタンを作り、
  選んだ日のファイルを読み込んでニュースカードを表示。クイズは `quiz.html?date=<日付>`（test.html も同様）で再挑戦できる。
- ルール：過去のクイズのプレイは連続記録（ストリーク）に数えない（quiz.js / test.js の IS_ARCHIVE 分岐）。
- 2026-11-04 分はリポジトリのコミット履歴から復元して収録済み（ニュース側 227142be、クイズ側 2497b41e / 0fde7739）。

## アクセス計測（Google Analytics）

- GA4 プロパティ「NewsQuest」（測定ID: G-JNGTF5K7F8）。対象は design.feridun.info 全体。
- タグは news.html / quiz.html / haberler.html / test.html / archive.html / arsiv.html の6ページに入っている（アンケートページには入れていない）。
- クイズのカスタムイベント（quiz.js / test.js の track() 経由）：
  `quiz_start`（開始時。quiz_date と問題数つき）、`quiz_complete`（結果画面。score と total つき）。
- 「何人が来て、何人が最後まで解いたか」は GA のレポートで見る。リアルタイムで動作確認もできる。
- 検証済み（2026-11-04）：page_view / quiz_start / quiz_complete の3つともリアルタイムで受信を確認。
  ※ GA はイベントをまとめて送るため、ページを一瞬で閉じると quiz_start が届かないことがある（人間ペースでは正常）。

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

## トルコ版（Günün Haberleri TOP5）

日本版とまったく同じ仕組みで、トルコの読者向けに同じファイルを一式用意した。

```
sources-tr.json ──► fetch_news.py ──► candidates-tr.json ──► AI（PROMPT-TR.md） ──► haberler-latest.json
haberler.html ──► haberler.css / haberler.js ──► haberler-latest.json を表示
anket.html ──► anket.css / anket.js ──► Google フォーム「Günün Haberleri TOP5 Anketi」へ送信
```

| ファイル | 役割 |
|---|---|
| `haberler.html` / `.css` / `.js` | トルコ版ページ（骨組み・見た目・表示） |
| `haberler-latest.json` | 今日の5本（トルコ語・時刻は TSİ 表示） |
| `sources-tr.json` | トルコの出典リスト（Anadolu Ajansı、TRT Haber、BBC Türkçe、DW Türkçe など） |
| `PROMPT-TR.md` | トルコ版の選定・要約ルール（Hürriyet の公式公告は除外など） |
| `anket.html` / `.css` / `.js` | トルコ版アンケート。質問は日本版と同じ8問 |
| `test.html` / `.css` / `.js` | トルコ版クイズ（Günün Haber Testi）。仕組みは日本版と同じ。連続記録は localStorage（キー newsquest_quiz_tr） |
| `test-latest.json` | 今日のトルコ版クイズ（10問）。検証は日本版と共通： `validate_quiz.py test-raw.json haberler-latest.json test-latest.json` |
| `PROMPT-QUIZ-TR.md` | トルコ版クイズ作成AIへの指示書（PROMPT-QUIZ.md のトルコ語版） |
| `test-raw.json` | 検査前の生クイズ（トルコ版）。自動生成 |

収集は引数で切り替える： `python3 fetch_news.py sources-tr.json candidates-tr.json`
（引数なしだと日本版 `sources.json` → `candidates.json` がデフォルト）。

## 拡張アイデア

- 出典を増やす → `sources.json` に1件足すだけ（feed があれば自動で候補に入る）
- カテゴリ別ページ（スポーツだけ等） → `news-latest.json` を分けるか、catで絞る表示を追加
- ~~クイズ化 → 5本からクイズを作る = NewsQuest の原型（ataquiz と同じ発想）~~ → **実装済み（2026-11-04）**：日本版 quiz.html ＋ トルコ版 test.html（同日フェーズ2で追加）
- クイズの本格ゲーム化 → スコア・連続記録の先に、XP・バッジ・ランキング（NewsQuest 本体）
- 自動化 → 毎朝の定期実行が fetch → AI選定 → JSON保存 → GitHubへ push を担当
