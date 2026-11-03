import json
import os
from datetime import datetime
from openai import OpenAI

# Initialize the OpenAI client pointing to Z.AI's API base URL
client = OpenAI(
    api_key=os.environ["ZAI_API_KEY"],
    base_url="https://open.bigmodel.cn/api/paas/v4/" # Standard Z.AI API endpoint
)

def generate_daily_quiz():
    today_str = datetime.now().strftime("%Y-%m-%d")
    
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

    response = client.chat.completions.create(
        model="glm-4", # Or whichever GLM model version you prefer (e.g., glm-4-flash, glm-4-plus)
        messages=[
            {"role": "user", "content": prompt}
        ],
        temperature=0.7
    )
    
    # Clean up output formatting if needed
    raw_text = response.choices[0].message.content.strip()
    if raw_text.startswith("```json"):
        raw_text = raw_text[7:]
    if raw_text.endswith("```"):
        raw_text = raw_text[:-3]
        
    # Save to file
    with open("questions-latest.json", "w", encoding="utf-8") as f:
        f.write(raw_text.strip())
        
    print(f"Successfully generated questions for {today_str} using GLM")

if __name__ == "__main__":
    generate_daily_quiz()
    
