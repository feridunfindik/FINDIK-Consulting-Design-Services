#!/usr/bin/env python3
"""
validate_quiz.py — クイズ検査係 (the quiz checker)

What it does:
  Takes the raw quiz the AI generated (quiz-raw.json, format per
  PROMPT-QUIZ.md) plus the day's news-latest.json, and produces the
  publishable quiz-latest.json — or refuses.

  Checks (a question that fails any check is DROPPED, with a reason):
    1. Structure: question text, exactly 4 options, one answer letter.
    2. The 4 options are all different and non-empty.
    3. No duplicate questions.
    4. Novel-number check: every number appearing in the CORRECT option
       or in the explanation must also appear in that article's summary.
       (Invented numbers are how AI quizzes fabricate facts — the wrong
       options are allowed to contain altered numbers, because they are
       presented as options, never as facts.)
    5. The article index must point at a real article of the day.

  Then it SHUFFLES each question's options (and recomputes the answer),
  so correct answers can never cluster on one letter — a failure mode
  seen in past AI quiz sets (5 of 10 answers on "A").

  If fewer than MIN_QUESTIONS questions survive, it exits with an error
  and writes nothing: no quiz that day is better than a bad quiz.

Run:  python3 validate_quiz.py            (quiz-raw.json -> quiz-latest.json)
Only Python's standard library is used.
"""

import json
import random
import re
import sys
from datetime import datetime, timedelta, timezone

HERE = __file__.rsplit("/", 1)[0]
JST = timezone(timedelta(hours=9))
MIN_QUESTIONS = 5


def numbers_in(text):
    """All digit runs in a text, full-width digits normalized to half-width.
    '16万件' -> ['16'], '6万1000円' -> ['6', '1000'], '7NOW' -> ['7']."""
    t = (text or "").translate(str.maketrans("０１２３４５６７８９", "0123456789"))
    return re.findall(r"\d+", t)


def number_supported(num, summary):
    """A number counts as supported if it appears in the summary as a
    digit run, or as part of one ('1000' inside '6万1000円')."""
    runs = numbers_in(summary)
    return any(num == r or num in r or r in num for r in runs)


def main():
    raw_file = sys.argv[1] if len(sys.argv) > 1 else "quiz-raw.json"
    news_file = sys.argv[2] if len(sys.argv) > 2 else "news-latest.json"
    out_file = sys.argv[3] if len(sys.argv) > 3 else "quiz-latest.json"

    with open(f"{HERE}/{news_file}", encoding="utf-8") as f:
        news = json.load(f)
    with open(f"{HERE}/{raw_file}", encoding="utf-8") as f:
        raw = json.load(f)

    articles = news["articles"]
    kept, dropped, seen_q = [], [], set()

    for i, q in enumerate(raw):
        label = f"Q{i + 1}"
        try:
            idx = int(q["article"])
            art = articles[idx]
            question = str(q["question"]).strip()
            opts_in = q["options"]
            options = [str(opts_in[k]).strip() for k in ("A", "B", "C", "D")]
            answer_letter = str(q["answer"]).strip().upper()
            explanation = str(q["explanation"]).strip()
        except Exception:
            dropped.append(f"{label}: malformed entry")
            continue

        if not question or answer_letter not in ("A", "B", "C", "D"):
            dropped.append(f"{label}: missing question or bad answer letter")
            continue
        if len(set(options)) != 4 or any(not o for o in options):
            dropped.append(f"{label}: options are not 4 distinct non-empty texts")
            continue
        if question in seen_q:
            dropped.append(f"{label}: duplicate question")
            continue
        correct_text = options["ABCD".index(answer_letter)]
        bad_nums = [n for n in numbers_in(correct_text) + numbers_in(explanation)
                    if not number_supported(n, art["summary"])]
        if bad_nums:
            dropped.append(f"{label}: numbers not in the summary: {bad_nums}")
            continue
        if not explanation:
            dropped.append(f"{label}: empty explanation")
            continue

        seen_q.add(question)
        # Shuffle the options in code (never trust the generator's order)
        order = list(range(4))
        random.shuffle(order)
        shuffled = [options[j] for j in order]
        kept.append({
            "question": question,
            "options": shuffled,
            "answer": order.index("ABCD".index(answer_letter)),
            "explanation": explanation,
            "source": art["source"],
            "url": art["url"],
        })

    for d in dropped:
        print("DROP ", d)
    print(f"kept {len(kept)} / {len(raw)} questions")

    if len(kept) < MIN_QUESTIONS:
        print(f"ERROR: only {len(kept)} valid questions (< {MIN_QUESTIONS}). "
              "Not publishing a quiz today.")
        sys.exit(1)

    out = {
        "date": news["date"],
        "generated": datetime.now(JST).strftime("%Y-%m-%d %H:%M JST"),
        "questions": kept,
    }
    with open(f"{HERE}/{out_file}", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    letters = ["ABCD"[q["answer"]] for q in kept]
    print("answer positions after shuffle:", " ".join(letters))
    print(f"Wrote {out_file}")


if __name__ == "__main__":
    main()
