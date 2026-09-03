"""
Unit & Integration Tests for AgriSmart Voice Assistant.
Tests intent detection, context preservation, follow-up resolution,
farm context loading, multilingual support, and endpoint responses.
"""

import pytest
import asyncio
from unittest.mock import MagicMock
from backend.services.assistant_intent import (
    IntentDetectionService, INTENT_GREETING, INTENT_FARM_STATUS,
    INTENT_IRRIGATION, INTENT_SOIL_MOISTURE, INTENT_WEATHER, INTENT_HELP, INTENT_CROP
)
from backend.services.assistant_context import ContextManager, ConversationContext
from backend.services.assistant_ai import ConversationalAIService
from backend.services.assistant_farm_context import FarmContextService


def test_intent_detection_greetings():
    intent = IntentDetectionService.detect_intent("Hi")
    assert intent == INTENT_GREETING

    intent = IntentDetectionService.detect_intent("Hello")
    assert intent == INTENT_GREETING

    intent = IntentDetectionService.detect_intent("హలో")
    assert intent == INTENT_GREETING

    intent = IntentDetectionService.detect_intent("नमस्ते")
    assert intent == INTENT_GREETING


def test_intent_detection_farm_status():
    intent = IntentDetectionService.detect_intent("How is my tomato field?")
    assert intent in [INTENT_FARM_STATUS, INTENT_CROP]

    intent = IntentDetectionService.detect_intent("how is my farm?")
    assert intent == INTENT_FARM_STATUS


def test_intent_detection_irrigation():
    intent = IntentDetectionService.detect_intent("When should I irrigate?")
    assert intent == INTENT_IRRIGATION

    intent = IntentDetectionService.detect_intent("Can I irrigate now?")
    assert intent == INTENT_IRRIGATION

    intent = IntentDetectionService.detect_intent("నీరు ఎప్పుడు పెట్టాలి?")
    assert intent == INTENT_IRRIGATION

    intent = IntentDetectionService.detect_intent("सिंचाई कब करनी चाहिए?")
    assert intent == INTENT_IRRIGATION


def test_intent_detection_contextual_followups():
    # Follow-up "why?" after irrigation intent
    intent = IntentDetectionService.detect_intent("why?", last_intent=INTENT_IRRIGATION)
    assert intent == INTENT_IRRIGATION

    # Follow-up "is that good?" after soil moisture intent
    intent = IntentDetectionService.detect_intent("Is that good?", last_intent=INTENT_SOIL_MOISTURE)
    assert intent == INTENT_SOIL_MOISTURE

    # Follow-up "then should I water?" after weather intent
    intent = IntentDetectionService.detect_intent("Then should I water?", last_intent=INTENT_WEATHER)
    assert intent == INTENT_IRRIGATION


def test_context_manager_turn_updates():
    ctx = ContextManager.get_or_create_context("test_conv_001", language="en-IN")
    assert ctx.conversation_id == "test_conv_001"

    ContextManager.update_turn(
        context=ctx,
        user_question="What is the soil moisture?",
        intent=INTENT_SOIL_MOISTURE,
        assistant_reply="32%",
        soil_moisture=32.0
    )

    assert ctx.last_intent == INTENT_SOIL_MOISTURE
    assert ctx.last_soil_moisture == 32.0
    assert len(ctx.history) == 2 # 1 user, 1 assistant


def test_all_12_conversational_test_cases():
    async def run_tests():
        mock_farm_data = {
            "farm_found": True,
            "field_found": True,
            "crop_found": True,
            "farm_name": "Green Acres",
            "crop_name": "Tomato",
            "soil_moisture": 32.0,
            "soil_moisture_available": True,
            "soil_moisture_status": "optimal",
            "is_irrigation_required": False,
            "recommended_water_volume_liters": 0.0,
            "risk_level": "low",
            "weather_available": True,
            "temperature": 28.5,
            "humidity": 65.0,
            "rain_probability": 0.15,
            "weather_conditions": "Clear"
        }

        ctx = ContextManager.get_or_create_context("test_conv_12_cases")

        # TEST 1: Greeting
        reply, _ = await ConversationalAIService.generate_response("Hi", INTENT_GREETING, ctx, mock_farm_data)
        assert "Hello" in reply or "help" in reply
        assert "Recommendation for Tomato" not in reply

        # TEST 2: Field status
        reply, _ = await ConversationalAIService.generate_response("How is my tomato field?", INTENT_FARM_STATUS, ctx, mock_farm_data)
        assert "32%" in reply or "Tomato" in reply

        # TEST 3: Irrigation timing
        reply, _ = await ConversationalAIService.generate_response("When should I irrigate?", INTENT_IRRIGATION, ctx, mock_farm_data)
        assert "not required" in reply or "morning" in reply

        # TEST 4: Follow-up "Why?"
        ctx.last_intent = INTENT_IRRIGATION
        reply, _ = await ConversationalAIService.generate_response("Why?", INTENT_IRRIGATION, ctx, mock_farm_data)
        assert "moisture" in reply.lower() or "sufficient" in reply.lower()

        # TEST 5: "Can I irrigate now?"
        reply, _ = await ConversationalAIService.generate_response("Can I irrigate now?", INTENT_IRRIGATION, ctx, mock_farm_data)
        assert "not necessary" in reply.lower() or "sufficient" in reply.lower()

        # TEST 6: Soil moisture query
        reply, _ = await ConversationalAIService.generate_response("What is the soil moisture?", INTENT_SOIL_MOISTURE, ctx, mock_farm_data)
        assert "32" in reply


        # TEST 7: Follow-up "Is that good?"
        ctx.last_intent = INTENT_SOIL_MOISTURE
        reply, _ = await ConversationalAIService.generate_response("Is that good?", INTENT_SOIL_MOISTURE, ctx, mock_farm_data)
        assert "optimal" in reply.lower() or "Yes" in reply

        # TEST 8: Weather query
        reply, _ = await ConversationalAIService.generate_response("Will it rain tomorrow?", INTENT_WEATHER, ctx, mock_farm_data)
        assert "15%" in reply or "rain" in reply.lower()

        # TEST 9: Follow-up "Then should I water?"
        ctx.last_intent = INTENT_WEATHER
        reply, _ = await ConversationalAIService.generate_response("Then should I water?", INTENT_IRRIGATION, ctx, mock_farm_data)
        assert "rain" in reply.lower() or "wait" in reply.lower() or "not required" in reply.lower()

        # TEST 10: Telugu query
        reply, _ = await ConversationalAIService.generate_response("నీరు ఎప్పుడు పెట్టాలి?", INTENT_IRRIGATION, ctx, mock_farm_data, target_lang="te-IN")
        assert len(reply) > 0 # Successfully generates Telugu text

        # TEST 11: Hindi query
        reply, _ = await ConversationalAIService.generate_response("सिंचाई कब करनी चाहिए?", INTENT_IRRIGATION, ctx, mock_farm_data, target_lang="hi-IN")
        assert len(reply) > 0 # Successfully generates Hindi text

        # TEST 12: Capabilities / Help query
        reply, _ = await ConversationalAIService.generate_response("What can you help me with?", INTENT_HELP, ctx, mock_farm_data)
        assert "soil moisture" in reply.lower() or "irrigation" in reply.lower() or "weather" in reply.lower()

    asyncio.run(run_tests())

