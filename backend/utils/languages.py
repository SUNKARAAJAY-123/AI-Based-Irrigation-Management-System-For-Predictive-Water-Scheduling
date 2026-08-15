# Supported languages config for Sarvam AI Integration

SUPPORTED_LANGUAGES = {
    "en-IN": {
        "name": "English (India)",
        "native": "English 🇮🇳",
        "speaker": "meera",
        "flag": "🇮🇳"
    },
    "hi-IN": {
        "name": "Hindi",
        "native": "हिन्दी",
        "speaker": "meera",
        "flag": "हिन्दी"
    },
    "te-IN": {
        "name": "Telugu",
        "native": "తెలుగు",
        "speaker": "meera",
        "flag": "తెలుగు"
    },
    "ta-IN": {
        "name": "Tamil",
        "native": "தமிழ்",
        "speaker": "meera",
        "flag": "தமிழ்"
    },
    "kn-IN": {
        "name": "Kannada",
        "native": "ಕನ್ನಡ",
        "speaker": "sapna",
        "flag": "ಕನ್ನಡ"
    },
    "ml-IN": {
        "name": "Malayalam",
        "native": "മലയാളം",
        "speaker": "meera",
        "flag": "മലയാളം"
    },
    "mr-IN": {
        "name": "Marathi",
        "native": "मराठी",
        "speaker": "meera",
        "flag": "मराठी"
    },
    "bn-IN": {
        "name": "Bengali",
        "native": "বাংলা",
        "speaker": "meera",
        "flag": "বাংলা"
    },
    "gu-IN": {
        "name": "Gujarati",
        "native": "ગુજરાતી",
        "speaker": "meera",
        "flag": "ગુજરાતી"
    },
    "pa-IN": {
        "name": "Punjabi",
        "native": "ਪੰਜਾਬੀ",
        "speaker": "meera",
        "flag": "ਪੰਜਾਬੀ"
    },
    "od-IN": {
        "name": "Odia",
        "native": "ଓଡ଼ିଆ",
        "speaker": "meera",
        "flag": "ଓଡ଼ିଆ"
    }
}

DEFAULT_LANGUAGE = "en-IN"

def get_valid_language(lang_code: str) -> str:
    """Validate language code; fallback to DEFAULT_LANGUAGE if unsupported."""
    if not lang_code:
        return DEFAULT_LANGUAGE
    # Check exact match
    if lang_code in SUPPORTED_LANGUAGES:
        return lang_code
    # Check prefix matching (e.g. 'en' -> 'en-IN', 'hi' -> 'hi-IN')
    prefix = lang_code.split("-")[0].lower()
    for code in SUPPORTED_LANGUAGES.keys():
        if code.split("-")[0].lower() == prefix:
            return code
    return DEFAULT_LANGUAGE
