#!/usr/bin/env python3
"""
archive_day.py — 1日分のアーカイブを作る係（日本語版・トルコ語版 共通）

使い方:
  python3 archive_day.py jp                      # news-latest.json + quiz-latest.json を梱包
  python3 archive_day.py tr                      # haberler-latest.json + test-latest.json を梱包
  python3 archive_day.py jp A.json B.json        # 任意の2ファイルで作る（過去分の復元用）

やること:
  1. その日の「ニュースJSON」と「クイズJSON」を1つにまとめて
     archive/<言語>/<日付>.json に保存する（例: archive/jp/2026-11-05.json）
  2. archive/index.json の日付リストに、その日付を先頭（新しい順）へ追加する

毎朝の自動更新（cron）から呼ばれる前提。失敗しても、その日のニュース公開
そのものは止めない（cron側でそう扱う）。
"""
import json
import sys
from pathlib import Path

BASE = Path(__file__).parent

# 言語ごとの「いつもの入力ファイル」
DEFAULTS = {
    "jp": ("news-latest.json", "quiz-latest.json"),
    "tr": ("haberler-latest.json", "test-latest.json"),
}


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in DEFAULTS:
        print("usage: archive_day.py jp|tr [news.json quiz.json]")
        return 1
    lang = sys.argv[1]
    if len(sys.argv) == 4:
        news_path, quiz_path = Path(sys.argv[2]), Path(sys.argv[3])
    else:
        n, q = DEFAULTS[lang]
        news_path, quiz_path = BASE / n, BASE / q

    news = load_json(news_path)
    quiz = load_json(quiz_path)
    date = news["date"]
    if quiz.get("date") != date:
        print(f"warning: quiz date {quiz.get('date')} != news date {date}; keeping both as-is")

    # 1) その日を1ファイルに梱包して保存
    day = {"date": date, "news": news, "quiz": quiz}
    day_path = BASE / "archive" / lang / f"{date}.json"
    save_json(day_path, day)

    # 2) 目次（index.json）に日付を追加（新しい順・重複なし）
    index_path = BASE / "archive" / "index.json"
    index = load_json(index_path) if index_path.exists() else {"jp": [], "tr": []}
    dates = [d for d in index.get(lang, []) if d != date]
    dates.insert(0, date)
    dates.sort(reverse=True)
    index[lang] = dates
    save_json(index_path, index)

    print(f"archived {lang} {date}: {len(news.get('articles', []))} stories, "
          f"{len(quiz.get('questions', []))} questions -> {day_path.relative_to(BASE)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
