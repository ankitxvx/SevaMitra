import json
import requests
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
        try:
            import whisper
            print("Loading Whisper model...")
            _whisper_model = whisper.load_model(WHISPER_MODEL)
        except ImportError:
            print("Notice: 'openai-whisper' package is not installed. Using browser speech recognition.")
            return None
        except Exception as e:
            print(f"Warning: Could not load Whisper model: {e}")
            return None
    return _whisper_model

# BCP-47 → Whisper ISO-639-1 language code mapping
BCP47_TO_WHISPER = {
    'en-IN': 'en',
    'hi-IN': 'hi',
    'mr-IN': 'mr',
    'ta-IN': 'ta',
    'te-IN': 'te',
    'kn-IN': 'kn',
    'ml-IN': 'ml',
    'bn-IN': 'bn',
    'gu-IN': 'gu',
    'pa-IN': 'pa',
    'or-IN': 'or',
}

# MVP fallback questions per language (used when LLM API fails)
MVP_FALLBACK = {
    'hi-IN': [
        "इस फॉर्म के लिए आपका पूरा कानूनी नाम क्या है?",
        "आपकी जन्म तिथि क्या है?",
        "आपका वर्तमान स्थायी पता क्या है?",
        "आपका 12 अंकों का आधार नंबर क्या है?"
    ],
    'mr-IN': [
        "या फॉर्मसाठी तुमचे पूर्ण कायदेशीर नाव काय आहे?",
        "तुमची जन्मतारीख काय आहे?",
        "तुमचा सध्याचा कायमचा पत्ता काय आहे?",
        "तुमचा 12 अंकी आधार क्रमांक काय आहे?"
    ],
    'ta-IN': [
        "இந்த படிவத்திற்கான உங்கள் முழு சட்டப்பூர்வ பெயர் என்ன?",
        "உங்கள் பிறந்த தேதி என்ன?",
        "உங்கள் தற்போதைய நிரந்தர முகவரி என்ன?",
        "உங்கள் 12 இலக்க ஆதார் எண் என்ன?"
    ],
    'te-IN': [
        "ఈ ఫారమ్ కోసం మీ పూర్తి చట్టపరమైన పేరు ఏమిటి?",
        "మీ పుట్టిన తేదీ ఏమిటి?",
        "మీ ప్రస్తుత శాశ్వత చిరునామా ఏమిటి?",
        "మీ 12 అంకెల ఆధార్ నంబర్ ఏమిటి?"
    ],
    'bn-IN': [
        "এই ফর্মের জন্য আপনার পূর্ণ আইনি নাম কী?",
        "আপনার জন্ম তারিখ কী?",
        "আপনার বর্তমান স্থায়ী ঠিকানা কী?",
        "আপনার ১২ সংখ্যার আধার নম্বর কী?"
    ],
    'gu-IN': [
        "આ ફોર્મ માટે તમારું પૂરું કાયદેસર નામ શું છે?",
        "તમારી જન્મ તારીખ શું છે?",
        "તમારું હાલનું કાયમી સરનામું શું છે?",
        "તમારો 12 અંકનો આધાર નંબર શું છે?"
    ],
}

def ask_llama(prompt: str, language: str = None) -> str:
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
        # MVP Fallback — use language-specific questions if available
        if language and language in MVP_FALLBACK:
            return json.dumps(MVP_FALLBACK[language])
        form_name = prompt.split("FORM NAME: ")[1].split("\n")[0] if "FORM NAME: " in prompt else "this form"
        return json.dumps([
            f"What is your full legal name for the {form_name}?",
            "What is your date of birth?",
            "What is your current residential address?",
            "What is your Aadhaar or ID number?"
        ])

def generate_questions(form_name: str, language: str = None) -> list:
    # Map BCP-47 language codes to human-readable names for the prompt
    LANG_NAMES = {
        'hi-IN': 'Hindi',
        'mr-IN': 'Marathi',
        'ta-IN': 'Tamil',
        'te-IN': 'Telugu',
        'kn-IN': 'Kannada',
        'ml-IN': 'Malayalam',
        'bn-IN': 'Bengali',
        'gu-IN': 'Gujarati',
        'pa-IN': 'Punjabi',
        'or-IN': 'Odia',
    }
    lang_name = LANG_NAMES.get(language, 'English') if language else 'English'
    lang_instruction = f"Generate all questions in {lang_name} language." if lang_name != 'English' else "Generate all questions in English."

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
12. {lang_instruction}

Example:
[
    "What is your full name?",
    "What is your father's name?",
    "What is your date of birth?"
]

Now generate the questions for:
{form_name}
"""
    response = ask_llama(prompt, language=language)
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

def speech_to_text(audio_file_path: str, language: str = None) -> str:
    """Transcribe audio in the original language (not translate to English)."""
    try:
        model = get_whisper_model()
        if model is None:
            return ""
        # Convert BCP-47 code (e.g. 'hi-IN') to Whisper's ISO-639-1 code (e.g. 'hi')
        whisper_lang = BCP47_TO_WHISPER.get(language) if language else None
        result = model.transcribe(
            audio_file_path,
            task="transcribe",  # preserve original language instead of translating to English
            language=whisper_lang,  # hint so Whisper knows which language to expect
            fp16=False
        )
        return result["text"].strip()
    except Exception as e:
        print(f"Whisper transcription error: {e}")
        return ""
