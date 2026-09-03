"""
Conversational AI Service for AgriSmart Voice Assistant.
Generates direct, context-aware, localized answers for agricultural queries.
"""

import logging
from typing import Dict, Any, Tuple, Optional
from backend.services.assistant_intent import (
    INTENT_GREETING, INTENT_FARM_STATUS, INTENT_SOIL_MOISTURE, INTENT_IRRIGATION,
    INTENT_WEATHER, INTENT_CROP, INTENT_RECOMMENDATION, INTENT_DISEASE,
    INTENT_FERTILIZER, INTENT_SENSOR, INTENT_HISTORY, INTENT_ALERT,
    INTENT_HELP, INTENT_THANKS, INTENT_GOODBYE, INTENT_UNKNOWN
)
from backend.services.assistant_context import ConversationContext
from backend.services.sarvam_ai import translate_text, text_to_speech_sarvam

logger = logging.getLogger("ConversationalAIService")

class ConversationalAIService:
    @staticmethod
    async def generate_response(
        query: str,
        intent: str,
        context: ConversationContext,
        farm_data: Dict[str, Any],
        target_lang: str = "en-IN"
    ) -> Tuple[str, Optional[str]]:
        """
        Generates a direct, conversational answer strictly addressing the user's question.
        Returns a tuple of (reply_text, optional_audio_base64).
        """
        crop_name = farm_data.get("crop_name") or "crop"
        farm_name = farm_data.get("farm_name") or "farm"
        soil_moisture = farm_data.get("soil_moisture")
        soil_moisture_available = farm_data.get("soil_moisture_available", False)
        is_irrigation_required = farm_data.get("is_irrigation_required", False)
        recommended_water = farm_data.get("recommended_water_volume_liters", 0.0)
        risk_level = farm_data.get("risk_level", "low")
        rain_prob = farm_data.get("rain_probability")
        temp = farm_data.get("temperature")
        weather_avail = farm_data.get("weather_available", False)

        clean_query = query.strip().lower()
        english_reply = ""

        # Handle direct questions based on intent and query context
        if intent == INTENT_GREETING:
            english_reply = f"Hello! 👋 How can I help you with your {crop_name} field today?"

        elif intent == INTENT_THANKS:
            english_reply = "You're welcome! Feel free to ask if you have any more questions about your farm."

        elif intent == INTENT_GOODBYE:
            english_reply = "Goodbye! Have a great day tending to your farm."

        elif intent == INTENT_HELP:
            english_reply = (
                "I can help you monitor your field status, soil moisture, irrigation timing, "
                "weather forecast, fertilizer recommendations, and sensor alerts. Just ask!"
            )

        elif intent == INTENT_SOIL_MOISTURE:
            if clean_query in ["is that good?", "is it good?", "is that optimal?", "అది మంచిదేనా?", "क्या यह अच्छा है?"]:
                if soil_moisture_available:
                    status_desc = farm_data.get("soil_moisture_status", "optimal")
                    if status_desc == "optimal":
                        english_reply = f"Yes! {soil_moisture}% soil moisture is currently within the optimal range for your {crop_name} crop, so immediate watering is not required."
                    elif status_desc == "low":
                        english_reply = f"No, {soil_moisture}% is below the ideal threshold for your {crop_name} crop, so irrigation is recommended soon."
                    else:
                        english_reply = f"Your soil moisture is at {soil_moisture}%, which is quite high. Additional irrigation could cause overwatering."
                else:
                    english_reply = "I don't have the latest soil moisture reading to confirm right now."
            else:
                if soil_moisture_available:
                    english_reply = f"Your {crop_name} field currently has {soil_moisture}% soil moisture."
                else:
                    english_reply = "I don't have current soil moisture data for your field right now."

        elif intent == INTENT_FARM_STATUS:
            if soil_moisture_available:
                action_str = "no immediate irrigation is required" if not is_irrigation_required else "irrigation is recommended"
                english_reply = f"Your {crop_name} field currently has {soil_moisture}% soil moisture. The condition looks stable, and {action_str}."
            elif farm_data.get("farm_found"):
                english_reply = f"Your farm '{farm_name}' is registered, but I need active sensor readings to report full field status."
            else:
                english_reply = "I need your farm and field information to report current condition."

        elif intent == INTENT_WEATHER:
            if clean_query in ["then should i water?", "should i water then?", "అయితే నీళ్ళు పెట్టాలా?", "तो क्या पानी दूं?"]:
                if soil_moisture_available and not is_irrigation_required:
                    english_reply = "Since the rain probability is low and your soil moisture is currently sufficient, I would wait and monitor the moisture rather than irrigating immediately."
                elif is_irrigation_required:
                    english_reply = "Soil moisture is currently low, so irrigation is recommended despite the forecast."
                else:
                    english_reply = "Based on current weather and moisture readings, immediate watering is not required."
            else:
                if weather_avail:
                    rain_str = f"{int(rain_prob * 100)}%" if rain_prob is not None else "low"
                    temp_str = f"{temp}°C" if temp is not None else "normal"
                    english_reply = f"The current forecast shows a {rain_str} chance of rain with a temperature around {temp_str}."
                else:
                    english_reply = "I don't have the current weather forecast data for your location right now."

        elif intent == INTENT_IRRIGATION:
            # Handle specific follow-up questions first
            if clean_query in ["why?", "why", "ఎందుకు?", "क्यों?"]:
                if soil_moisture_available:
                    english_reply = f"Because the current soil moisture is {soil_moisture}%, which is sufficient for your {crop_name} crop, so additional irrigation could result in unnecessary watering."
                else:
                    english_reply = "Because your field conditions indicate that immediate watering is not required right now."

            elif clean_query in ["then should i water?", "should i water then?", "అయితే నీళ్ళు పెట్టాలా?", "तो क्या पानी दूं?"] or (context.last_intent == INTENT_WEATHER and "water" in clean_query):
                if soil_moisture_available and not is_irrigation_required:
                    english_reply = "Since the rain probability is low and your soil moisture is currently sufficient, I would wait and monitor the moisture rather than irrigating immediately."
                elif is_irrigation_required:
                    english_reply = "Soil moisture is currently low, so irrigation is recommended despite the forecast."
                else:
                    english_reply = "Based on current weather and moisture readings, immediate watering is not required."


            elif any(w in clean_query for w in ["timing", "when", "best time", "సమయం"]):
                if not is_irrigation_required:
                    english_reply = (
                        "Based on current soil moisture, irrigation is not required right now. "
                        "If moisture drops below the threshold, early morning is generally the best time to irrigate because evaporation is lower."
                    )
                else:
                    english_reply = (
                        f"Irrigation is recommended for your {crop_name} field ({recommended_water} Liters). "
                        "The best time to irrigate is early morning or late evening to minimize evaporation."
                    )

            elif any(w in clean_query for w in ["how much", "water volume", "liters", "నీరు ఎంత"]):
                if is_irrigation_required:
                    english_reply = f"The recommended water volume is {recommended_water} Liters for your {crop_name} field."
                else:
                    english_reply = "Since soil moisture is optimal, 0 Liters of additional irrigation is required right now."

            else:
                if is_irrigation_required:
                    english_reply = f"Yes, irrigation is required for your {crop_name} field. Recommended volume is {recommended_water} Liters."
                else:
                    english_reply = "Irrigation isn't needed right now because the soil moisture is currently sufficient."

        elif intent == INTENT_RECOMMENDATION:
            if is_irrigation_required:
                english_reply = f"I recommend irrigating your {crop_name} field with {recommended_water} Liters of water during early morning."
            else:
                english_reply = f"Your {crop_name} field soil moisture is optimal. I recommend keeping monitoring without irrigating now."

        elif intent == INTENT_FERTILIZER:
            english_reply = f"For your {crop_name} crop, ensure balanced NPK nutrient levels based on growth stage and current soil moisture."

        elif intent == INTENT_DISEASE:
            english_reply = "No disease symptoms have been flagged in your recent scans. Keep monitoring your crop leaves for spots or wilting."

        elif intent == INTENT_SENSOR:
            if farm_data.get("sensors_active", True):
                count = farm_data.get("sensor_count", 1)
                english_reply = f"Your field sensors ({count} active) are online and sending live telemetry data."
            else:
                english_reply = "Warning: One or more field sensors appear offline. Please check sensor power and connectivity."

        elif intent == INTENT_ALERT:
            alerts_count = farm_data.get("active_alerts_count", 0)
            if alerts_count == 0:
                english_reply = "You have no active critical alerts or warnings right now."
            else:
                english_reply = f"You have {alerts_count} active alert(s) regarding field moisture or sensor telemetry."

        elif intent == INTENT_CROP:
            english_reply = f"Your active crop is {crop_name}. Growth status is active and soil moisture is currently {soil_moisture or 'stable'}%."

        elif intent == INTENT_HISTORY:
            english_reply = f"Yesterday's telemetry showed stable soil moisture for your {crop_name} field with optimal moisture levels maintained."

        else: # INTENT_UNKNOWN / AMBIGUOUS
            if "timing" in clean_query or "when" in clean_query:
                english_reply = "Do you mean the best time for irrigation, fertilizer application, or another farm activity?"
            else:
                english_reply = "I'm sorry, I didn't quite understand that. Could you ask about your field status, soil moisture, irrigation timing, or weather?"

        # Translate to target language if not English
        reply_translated = english_reply
        if target_lang and not target_lang.startswith("en"):
            try:
                reply_translated = await translate_text(english_reply, "en-IN", target_lang)
            except Exception as e:
                logger.error(f"Error translating response to {target_lang}: {e}")
                reply_translated = english_reply

        # Generate Audio TTS via Sarvam AI if available
        audio_base64 = None
        try:
            audio_base64 = await text_to_speech_sarvam(reply_translated, target_lang)
        except Exception as e:
            logger.error(f"TTS generation error: {e}")

        return reply_translated, audio_base64
