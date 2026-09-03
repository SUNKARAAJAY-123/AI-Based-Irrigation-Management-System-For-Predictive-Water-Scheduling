"""
Intent Detection Service for AgriSmart Voice Assistant.
Detects user conversational intent using multilingual keyword/phrase matching,
contextual indicators, and fallback classification.
"""

import re
from typing import Optional, Dict, Any, List

# Standard intents enum/constants
INTENT_GREETING = "GREETING"
INTENT_FARM_STATUS = "FARM_STATUS"
INTENT_SOIL_MOISTURE = "SOIL_MOISTURE"
INTENT_IRRIGATION = "IRRIGATION"
INTENT_WEATHER = "WEATHER"
INTENT_CROP = "CROP"
INTENT_RECOMMENDATION = "RECOMMENDATION"
INTENT_DISEASE = "DISEASE"
INTENT_FERTILIZER = "FERTILIZER"
INTENT_SENSOR = "SENSOR"
INTENT_HISTORY = "HISTORY"
INTENT_ALERT = "ALERT"
INTENT_HELP = "HELP"
INTENT_THANKS = "THANKS"
INTENT_GOODBYE = "GOODBYE"
INTENT_UNKNOWN = "UNKNOWN"

# Multilingual pattern dictionary for robust intent detection
INTENT_PATTERNS: Dict[str, List[str]] = {
    INTENT_GREETING: [
        r"\b(hi|hello|hey|namaste|namaskar|good morning|good afternoon|good evening)\b",
        r"హలో|నమస్తే|నమస్కారం",
        r"नमस्ते|नमस्कार|हेलो",
        r"வணக்கம்",
        r"ನಮಸ್ಕಾರ|ಹಲೋ",
        r"ഹലോ|നമസ്കാരം",
        r"नमस्कार",
        r"হ্যালো|নমস্কার",
    ],
    INTENT_THANKS: [
        r"\b(thanks|thank you|thankyou|thx|great thanks|many thanks)\b",
        r"ధన్యవాదాలు|థాంక్స్",
        r"धन्यवाद|शुक्रिया",
        r"நன்றி",
        r"ಧನ್ಯವಾದಗಳು",
        r"നന്ദി",
        r"धन्यवाद",
        r"ধন্যবাদ",
    ],
    INTENT_GOODBYE: [
        r"\b(bye|goodbye|see you|ta ta|take care)\b",
        r"వీడ్కోలు|బై",
        r"अलविदा|बाय",
        r"பிரியாவிடை",
        r"ವಿದಾಯ",
    ],
    INTENT_HELP: [
        r"\b(help|what can you do|features|available features|how to use|capabilities|what features)\b",
        r"సహాయం|ఏమి చేయగలవు|ఫీచర్లు",
        r"मदद|क्या कर सकते हो|सुविधाएं",
        r"உதவி",
        r"ಸಹಾಯ",
    ],
    INTENT_SOIL_MOISTURE: [
        r"\b(soil moisture|moisture level|moisture|is my soil dry|how dry|water content in soil|soil condition)\b",
        r"మట్టి తేమ|తేమ ఎంత|తేమ పరిమాణం",
        r"मिट्टी की नमी|नमी का स्तर|नमी कितनी है",
        r"மண் ஈரம்",
        r"ಮಣ್ಣಿನ ತೇವಾಂಶ",
    ],
    INTENT_WEATHER: [
        r"\b(weather|rain|raining|rainfall|temperature|humidity|will it rain|forecast|climate|rain tomorrow|weather forecast)\b",
        r"వాతావరణం|వర్షం పడుతుందా|వర్షం|ఉష్ణోగ్రత|తేమ",
        r"मौसम|बारिश|वर्षा|तापमान|क्या बारिश होगी",
        r"வானிலை|மழை",
        r"ಹವಾಮಾನ|ಮಳೆ",
    ],
    INTENT_DISEASE: [
        r"\b(disease|diseased|pest|symptoms|infection|fungus|crop health problem|leaf damage|spots|blight)\b",
        r"వ్యాధి|తెగులు|చీడ|వ్యాధి లక్షణాలు",
        r"बीमारी|रोग|कीट|लक्षण",
        r"நோய்",
        r"ರೋಗ",
    ],
    INTENT_FERTILIZER: [
        r"\b(fertilizer|npk|nitrogen|phosphorus|potassium|manure|nutrients|which fertilizer|fertilizer recommendation)\b",
        r"ఎరువు|ఎరువులు|ఎన్ పీ కే|పోషకాలు",
        r"उर्वरक|खाद|एनपीके|पोषक तत्व",
        r"உரம்",
        r"ಗೊಬ್ಬರ",
    ],
    INTENT_SENSOR: [
        r"\b(sensor|sensor working|sensor status|sensor offline|telemetry|iot device|node)\b",
        r"సెన్సార్|సెన్సార్లు పని చేస్తున్నాయా|సెన్సార్ స్థితి",
        r"सेंसर|सेंसर स्थिति|सेंसर काम कर रहा है",
    ],
    INTENT_ALERT: [
        r"\b(alert|alerts|warning|warnings|critical|issues|notifications|any problem)\b",
        r"హెచ్చరికలు|అలర్ట్లు|సమస్యలు",
        r"चेतावनी|अलर्ट|समस्याएं",
    ],
    INTENT_HISTORY: [
        r"\b(history|yesterday|previous irrigation|past waterings|last week|past records)\b",
        r"చరిత్ర|నిన్న|గత నీటి పారుదల",
        r"इतिहास|कल क्या हुआ|पिछली सिंचाई",
    ],
    INTENT_CROP: [
        r"\b(tomato crop|crop condition|my crop|growing crop|variety|planted)\b",
        r"పంట|పంట పరిస్థితి|టమోటా పంట",
        r"फसल|फसल की स्थिति|टमाटर",
    ],
    INTENT_FARM_STATUS: [
        r"\b(how is my farm|how is my field|farm condition|field status|overall status|farm status|field condition)\b",
        r"నా పొలం ఎలా ఉంది|పొలం పరిస్థితి|చేను పరిస్థితి",
        r"मेरा खेत कैसा है|खेत की स्थिति|फार्म की स्थिति",
    ],
    INTENT_IRRIGATION: [
        r"\b(irrigate|irrigation|water|watering|should i irrigate|do i need irrigation|when should i irrigate|how much water|irrigation timing|best time to water|water now|timing)\b",
        r"నీరు పెట్టాలా|నీరు ఎప్పుడు పెట్టాలి|సిंचाई|సమయం|నీటి పారుదల|ఎప్పుడు నీళ్ళు పోయాలి|నీరు ఎప్పుడు",
        r"सिंचाई|पानी देना|पानी कब दें|कब सिंचाई करें|सिंचाई कब करनी चाहिए|क्या पानी देना चाहिए",
        r"நீர் பாய்ச்சுதல்",
        r"ನೀರಾವರಿ|ನೀರು ಉಣಿಸುವುದು",
    ],
    INTENT_RECOMMENDATION: [
        r"\b(recommendation|what do you recommend|advice|what should i do|suggestion|guidance)\b",
        r"సలహా|సూచన|ఏం చేయాలి",
        r"सलाह|सुझाव|क्या करना चाहिए",
    ]
}


class IntentDetectionService:
    @staticmethod
    def detect_intent(message: str, last_intent: Optional[str] = None) -> str:
        """
        Classifies the intent of a user message.
        Considers short follow-up phrases and previous conversation context.
        """
        clean_text = message.strip().lower()
        if not clean_text:
            return INTENT_UNKNOWN

        # 1. Check direct short follow-ups with context
        if last_intent:
            if clean_text in ["why?", "why", "эందుకని?", "ఎందుకు?", "क्यों?", "ஏன்?", "ಏಕೆ?"]:
                return INTENT_IRRIGATION if last_intent in [INTENT_IRRIGATION, INTENT_SOIL_MOISTURE, INTENT_WEATHER, INTENT_FARM_STATUS] else last_intent

            if clean_text in ["when?", "when", "эప్పుడు?", "ఎప్పుడు?", "कब?", "எப்போது?", "ಯಾವಾಗ?"]:
                return INTENT_IRRIGATION

            if clean_text in ["is it good?", "is that good?", "is it optimal?", "అది మంచిదేనా?", "क्या यह अच्छा है?"]:
                return INTENT_SOIL_MOISTURE if last_intent == INTENT_SOIL_MOISTURE else last_intent

            if clean_text in ["then should i water?", "can i water now?", "should i water?", "అయితే నీళ్ళు పెట్టాలా?", "तो क्या पानी दूं?"]:
                return INTENT_IRRIGATION

        # 2. Check ambiguous timing queries without prior context
        if clean_text in ["timing", "which timing", "best timing", "which timing?", "సమయం ఏది?", "कौन सा समय?"]:
            if not last_intent or last_intent not in [INTENT_IRRIGATION, INTENT_FARM_STATUS, INTENT_SOIL_MOISTURE, INTENT_WEATHER]:
                return INTENT_UNKNOWN # Triggers clarification question

        # 3. Explicit Greeting check
        for pattern in INTENT_PATTERNS[INTENT_GREETING]:
            if re.search(pattern, clean_text, re.IGNORECASE):
                # Ensure it's not a long sentence starting with hi
                words = clean_text.split()
                if len(words) <= 4 or clean_text in ["hi", "hello", "namaste", "good morning", "good evening", "హలో", "నమస్తే", "नमस्ते"]:
                    return INTENT_GREETING

        # 4. Pattern matching order: Order matters for specificity
        for intent in [
            INTENT_THANKS,
            INTENT_GOODBYE,
            INTENT_HELP,
            INTENT_SOIL_MOISTURE,
            INTENT_WEATHER,
            INTENT_DISEASE,
            INTENT_FERTILIZER,
            INTENT_SENSOR,
            INTENT_ALERT,
            INTENT_HISTORY,
            INTENT_FARM_STATUS,
            INTENT_IRRIGATION,
            INTENT_CROP,
            INTENT_RECOMMENDATION
        ]:
            patterns = INTENT_PATTERNS.get(intent, [])
            for pattern in patterns:
                if re.search(pattern, clean_text, re.IGNORECASE):
                    return intent

        # 5. Fallback heuristics
        if any(w in clean_text for w in ["irrigate", "water", "timing", " litres", "liter", "लीटर", "లీటర్లు", "సిंचाई"]):
            return INTENT_IRRIGATION

        if any(w in clean_text for w in ["moisture", "dry", "wet", "నమి", "తేమ"]):
            return INTENT_SOIL_MOISTURE

        if any(w in clean_text for w in ["farm", "field", "crop", "పొలం", "చేను"]):
            return INTENT_FARM_STATUS

        return INTENT_UNKNOWN
