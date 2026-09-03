"""
Context Manager for AgriSmart Voice Assistant.
Manages short-term conversation context, user entity references,
and history windows per conversation session.
"""

import time
import uuid
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field

@dataclass
class ConversationContext:
    conversation_id: str
    user_id: Optional[str] = None
    farm_id: Optional[str] = None
    field_id: Optional[str] = None
    crop_id: Optional[str] = None
    selected_language: str = "en-IN"
    last_intent: Optional[str] = None
    last_question: Optional[str] = None
    last_answer: Optional[str] = None
    last_recommendation: Optional[Dict[str, Any]] = None
    last_soil_moisture: Optional[float] = None
    last_weather: Optional[Dict[str, Any]] = None
    history: List[Dict[str, Any]] = field(default_factory=list)
    updated_at: float = field(default_factory=time.time)

    def add_message(self, role: str, text: str, intent: Optional[str] = None):
        self.history.append({
            "role": role,
            "text": text,
            "intent": intent,
            "timestamp": time.time()
        })
        # Keep maximum 10 messages context window
        if len(self.history) > 10:
            self.history = self.history[-10:]
        self.updated_at = time.time()


class ContextManager:
    _sessions: Dict[str, ConversationContext] = {}

    @classmethod
    def get_or_create_context(
        cls,
        conversation_id: Optional[str],
        user_id: Optional[str] = None,
        language: str = "en-IN",
        farm_id: Optional[str] = None,
        field_id: Optional[str] = None,
        crop_id: Optional[str] = None
    ) -> ConversationContext:
        """
        Retrieves an existing conversation context or creates a new one.
        """
        if not conversation_id:
            conversation_id = f"conv_{uuid.uuid4().hex[:12]}"

        ctx = cls._sessions.get(conversation_id)
        if not ctx:
            ctx = ConversationContext(
                conversation_id=conversation_id,
                user_id=user_id,
                farm_id=farm_id,
                field_id=field_id,
                crop_id=crop_id,
                selected_language=language
            )
            cls._sessions[conversation_id] = ctx
        else:
            # Update entity bindings if explicitly passed
            if user_id:
                ctx.user_id = user_id
            if farm_id:
                ctx.farm_id = farm_id
            if field_id:
                ctx.field_id = field_id
            if crop_id:
                ctx.crop_id = crop_id
            if language:
                ctx.selected_language = language

        # Clean up stale sessions older than 2 hours (7200 seconds)
        now = time.time()
        stale_keys = [k for k, v in cls._sessions.items() if now - v.updated_at > 7200]
        for k in stale_keys:
            del cls._sessions[k]

        return ctx

    @classmethod
    def update_turn(
        cls,
        context: ConversationContext,
        user_question: str,
        intent: str,
        assistant_reply: str,
        recommendation: Optional[Dict[str, Any]] = None,
        soil_moisture: Optional[float] = None,
        weather: Optional[Dict[str, Any]] = None
    ):
        """
        Updates context after a conversation turn.
        """
        context.add_message("user", user_question, intent)
        context.add_message("assistant", assistant_reply, intent)
        context.last_intent = intent
        context.last_question = user_question
        context.last_answer = assistant_reply

        if recommendation is not None:
            context.last_recommendation = recommendation
        if soil_moisture is not None:
            context.last_soil_moisture = soil_moisture
        if weather is not None:
            context.last_weather = weather

        context.updated_at = time.time()
