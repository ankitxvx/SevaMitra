import json
import requests
import whisper
import os

# Append FFmpeg to PATH programmatically so VS Code doesn't need a full restart
FFMPEG_PATH = r"C:\Users\ankit\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0-full_build\bin"
os.environ["PATH"] += os.pathsep + FFMPEG_PATH

OLLAMA_URL = "http://localhost:11434/api/generate"
LLAMA_MODEL = "llama3.2"
WHISPER_MODEL = "base"

# Load Whisper lazily to avoid blocking startup
_whisper_model = None

def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        print("Loading Whisper model...")
        _whisper_model = whisper.load_model(WHISPER_MODEL)
    return _whisper_model

def ask_llama(prompt: str) -> str:
    print("Using HuggingFace Open Source API...")
    API_URL = "https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta"
    
    payload = {
        "inputs": prompt,
        "parameters": {"max_new_tokens": 150, "return_full_text": False}
    }
    
    try:
        response = requests.post(API_URL, json=payload, timeout=15)
        response.raise_for_status()
        result = response.json()
        if isinstance(result, list) and len(result) > 0 and 'generated_text' in result[0]:
            return result[0]['generated_text']
        else:
            raise ValueError("Unexpected API response format")
    except Exception as e:
        print(f"Open Source API failed or rate limited. Using MVP fallback. Error: {e}")
        # MVP Fallback so the UI continues to work flawlessly
        form_name = prompt.split("FORM NAME: ")[1].split("\n")[0] if "FORM NAME: " in prompt else "this form"
        return json.dumps([
            f"What is your full legal name for the {form_name}?",
            "What is your date of birth?",
            "What is your current residential address?",
            "What is your Aadhaar or ID number?"
        ])

def generate_questions(form_name: str) -> list:
    prompt = f"""
You are an intelligent assistant that helps people fill government forms in India.

The user wants to fill this form:
FORM NAME: {form_name}

Your task is to determine what information should be collected from the user in order to fill this form.
Generate the questions that should be asked to the user.

IMPORTANT RULES:
1. Ask only information relevant to this form.
2. Do not ask unnecessary questions.
3. Avoid duplicate questions.
4. Questions must be simple and easy for an ordinary person to understand.
5. Ask one piece of information per question whenever possible.
6. Include important personal, address, family, financial, employment or other information only if relevant to the form.
7. Do not provide explanations.
8. Do not provide answers.
9. Do not provide markdown.
10. Return ONLY a valid JSON array.
11. Every item in the array must be a string.

Example:
[
    "What is your full name?",
    "What is your father's name?",
    "What is your date of birth?"
]

Now generate the questions for:
{form_name}
"""
    response = ask_llama(prompt)
    response = response.strip()
    if response.startswith("```json"):
        response = response[7:]
    elif response.startswith("```"):
        response = response[3:]
    if response.endswith("```"):
        response = response[:-3]
    response = response.strip()
    
    try:
        questions = json.loads(response)
        if not isinstance(questions, list):
            return ["Could not generate specific questions. What is your name?", "What is your address?"]
        return questions
    except json.JSONDecodeError:
        print(f"Failed to parse JSON: {response}")
        return ["What is your full name?", "What is your current residential address?"]

def speech_to_english(audio_file_path: str) -> str:
    model = get_whisper_model()
    result = model.transcribe(
        audio_file_path,
        task="translate",
        language=None,
        fp16=False
    )
    return result["text"].strip()
