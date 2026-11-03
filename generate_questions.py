import json
from datetime import datetime
from ai_service import generate_quiz_questions

def generate_daily_quiz():
    today_str = datetime.now().strftime("%Y-%m-%d")
    print(f"Generating questions for {today_str}...")
    
    # Call the modular AI service to fetch fresh questions
    questions_json_str = generate_quiz_questions(today_str)
        
    # Save or overwrite the output into the questions file
    with open("questions-latest.json", "w", encoding="utf-8") as f:
        f.write(questions_json_str)
        
    print(f"Successfully generated and saved questions for {today_str}!")

if __name__ == "__main__":
    generate_daily_quiz()
    
