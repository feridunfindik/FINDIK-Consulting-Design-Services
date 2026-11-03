import os
from openai import OpenAI

def generate_quiz_questions(today_str):
    # Read which provider to use from environment variables (defaults to 'groq')
    provider = os.environ.get("AI_PROVIDER", "groq").lower()
    
    prompt = f"""
    You are an expert Japanese junior high school social studies teacher.
    Generate 10 multiple-choice questions for 8th grade (2nd year) students in Japanese.
    Link them to modern 2026 current events and news (such as economic updates, environmental policies, tax changes, tech regulations, world heritage updates, or legal revisions) connected to core geography, history, and civics.
    
    Return ONLY a valid JSON object with this exact structure:
    {{
      "date": "{today_str}",
      "questions": [
        {{
          "category": "公民",
          "topic": "topic name",
          "question": "question text...",
          "options": ["option 1", "option 2", "option 3", "option 4"],
          "correct": 0,
          "explanation": "detailed explanation..."
        }}
      ]
    }}
    Ensure "correct" is an integer index from 0 to 3. Do not include markdown code blocks like ```json in the output, just raw JSON text.
    """

    raw_text = ""

    # --- 1. GROQ PROVIDER ---
    if provider == "groq":
        client = OpenAI(
            api_key=os.environ["GROQ_API_KEY"],
            base_url="[https://api.groq.com/openai/v1](https://api.groq.com/openai/v1)"
        )
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )
        raw_text = response.choices[0].message.content.strip()

    # --- 2. Z.AI (GLM) PROVIDER ---
    elif provider == "zai":
        client = OpenAI(
            api_key=os.environ["ZAI_API_KEY"],
            base_url="[https://open.bigmodel.cn/api/paas/v4/](https://open.bigmodel.cn/api/paas/v4/)"
        )
        response = client.chat.completions.create(
            model="glm-4-flash",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )
        raw_text = response.choices[0].message.content.strip()

    # --- 3. GEMINI PROVIDER (direct REST API) ---
    # The google.generativeai library is deprecated and hangs with newer
    # models, so call the Gemini API directly over HTTPS instead.
    elif provider == "gemini":
        import json
        import urllib.request
        import urllib.error

        api_key = [redacted]
        url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.7}
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": api_key
            },
            method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                result = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            raise RuntimeError(f"Gemini API error {e.code}: {e.read().decode('utf-8', 'replace')}")
        raw_text = result["candidates"][0]["content"]["parts"][0]["text"].strip()

    else:
        raise ValueError(f"Unknown AI_PROVIDER: {provider}")

    # Clean up formatting
    if raw_text.startswith("```json"):
        raw_text = raw_text[7:]
    if raw_text.endswith("```"):
        raw_text = raw_text[:-3]
        
    return raw_text.strip()
    
