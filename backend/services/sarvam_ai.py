import httpx
import logging
import base64
from typing import Dict, Any, Optional
from backend.utils.config import settings

logger = logging.getLogger("SarvamAIService")

# Local dictionary for common irrigation recommendations to act as offline translation fallback
LOCAL_TRANSLATIONS = {
    "hi-IN": {
        "Irrigation is required.": "सिंचाई की आवश्यकता है।",
        "Irrigation is not required.": "सिंचाई की आवश्यकता नहीं है।",
        "Watering now is recommended.": "अभी पानी देने की सिफारिश की जाती है।",
        "Watering at night is recommended.": "रात में पानी देने की सिफारिश की जाती है।",
        "Watering early morning is recommended.": "सुबह जल्दी पानी देने की सिफारिश की जाती है।",
        "Risk level is high. Please irrigate immediately.": "जोखिम स्तर उच्च है। कृपया तुरंत सिंचाई करें।",
        "Risk level is medium. Keep monitoring.": "जोखिम स्तर मध्यम है। निगरानी रखें।",
        "Risk level is low. Soil moisture is optimal.": "जोखिम स्तर निम्न है। मिट्टी की नमी अनुकूल है।",
        "Wheat": "गेहूं",
        "Rice": "चावल",
        "Cotton": "कपास",
        "Maize": "मक्का",
        "Tomato": "टमाटर"
    },
    "kn-IN": {
        "Irrigation is required.": "ನೀರಾವರಿ ಅಗತ್ಯವಿದೆ.",
        "Irrigation is not required.": "ನೀರಾವರಿ ಅಗತ್ಯವಿಲ್ಲ.",
        "Watering now is recommended.": "ಈಗ ನೀರುಣಿಸಲು ಶಿಫಾರಸು ಮಾಡಲಾಗಿದೆ.",
        "Watering at night is recommended.": "ರಾತ್ರಿಯಲ್ಲಿ ನೀರುಣಿಸಲು ಶಿಫಾರಸು ಮಾಡಲಾಗಿದೆ.",
        "Watering early morning is recommended.": "ಮುಂಜಾನೆ ನೀರುಣಿಸಲು ಶಿಫಾರಸು ಮಾಡಲಾಗಿದೆ.",
        "Risk level is high. Please irrigate immediately.": "ಅಪಾಯದ ಮಟ್ಟ ಹೆಚ್ಚಾಗಿದೆ. ದಯವಿಟ್ಟು ತಕ್ಷಣ ನೀರಾವರಿ ಮಾಡಿ.",
        "Risk level is medium. Keep monitoring.": "ಅಪಾಯದ ಮಟ್ಟ ಮಧ್ಯಮವಾಗಿದೆ. ಗಮನಿಸುತ್ತಿರಿ.",
        "Risk level is low. Soil moisture is optimal.": "ಅಪಾಯದ ಮಟ್ಟ ಕಡಿಮೆಯಾಗಿದೆ. ಮಣ್ಣಿನ ತೇವಾಂಶವು ಸೂಕ್ತವಾಗಿದೆ.",
        "Wheat": "ಗೋಧಿ",
        "Rice": "ಅಕ್ಕಿ",
        "Cotton": "ಹತ್ತಿ",
        "Maize": "ಮೆಕ್ಕೆಜೋಳ",
        "Tomato": "ಟೊಮೆಟೊ"
    }
}

def translate_offline(text: str, target_lang: str) -> str:
    """Translate typical recommendation text offline using a local dictionary."""
    if target_lang == "en-IN" or target_lang.startswith("en"):
        return text
        
    translations = LOCAL_TRANSLATIONS.get(target_lang, {})
    
    # Try direct match
    if text in translations:
        return translations[text]
        
    # Try translating segments/words in the text
    translated_text = text
    for eng_phrase, target_phrase in translations.items():
        translated_text = translated_text.replace(eng_phrase, target_phrase)
        
    return translated_text

async def translate_text(text: str, source_lang: str, target_lang: str) -> str:
    """
    Translate text using Sarvam AI translation API.
    Falls back to offline translation dictionary if key is missing or API fails.
    """
    api_key = settings.SARVAM_AI_API_KEY
    if not api_key or api_key == "your_sarvam_ai_api_key_here":
        return translate_offline(text, target_lang)
        
    url = f"{settings.SARVAM_AI_BASE_URL}/translate"
    headers = {
        "api-subscription-key": api_key,
        "Content-Type": "application/json"
    }
    payload = {
        "input": text,
        "source_language_code": source_lang,
        "target_language_code": target_lang,
        "speaker_gender": "Female",
        "mode": "formal"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(url, json=payload, headers=headers, timeout=5.0)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("translated_text", translate_offline(text, target_lang))
            else:
                logger.error(f"Sarvam AI Translation API returned status code {resp.status_code}")
                return translate_offline(text, target_lang)
        except Exception as err:
            logger.error(f"Error communicating with Sarvam AI Translation: {err}")
            return translate_offline(text, target_lang)

async def text_to_speech_sarvam(text: str, language_code: str) -> Optional[str]:
    """
    Generate speech audio for text using Sarvam AI Text-to-Speech.
    Returns base64 encoded audio string, or None if fallback is needed.
    """
    api_key = settings.SARVAM_AI_API_KEY
    if not api_key or api_key == "your_sarvam_ai_api_key_here":
        logger.warning("Sarvam AI API key is missing. Speech synthesis will fallback to client-side SpeechSynthesis.")
        return None
        
    url = f"{settings.SARVAM_AI_BASE_URL}/text-to-speech"
    headers = {
        "api-subscription-key": api_key,
        "Content-Type": "application/json"
    }
    
    # Choose voice based on language
    speaker = "meera"
    if language_code == "kn-IN":
        speaker = "sapna" # Example kannada speaker name in Sarvam AI
        
    payload = {
        "inputs": [text],
        "target_language_code": language_code,
        "speaker": speaker,
        "pitch": 0.0,
        "pace": 1.0,
        "loudness": 1.5,
        "speech_sample_rate": 8000
    }
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(url, json=payload, headers=headers, timeout=10.0)
            if resp.status_code == 200:
                data = resp.json()
                audios = data.get("audios", [])
                if audios:
                    return audios[0]
            logger.error(f"Sarvam AI TTS API returned status code {resp.status_code}: {resp.text}")
            return None
        except Exception as err:
            logger.error(f"Error communicating with Sarvam AI TTS: {err}")
            return None
