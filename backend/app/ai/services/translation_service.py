from langchain_core.messages import SystemMessage, HumanMessage
from langchain_groq import ChatGroq
from app.ai.models.graph_state import ComplaintGraphState
import os
import logging

logger = logging.getLogger(__name__)

class TranslationService:
    def __init__(self):
        # We will use llama-3.1-8b-instant for simple and fast translations/normalization
        self.llm = ChatGroq(
            api_key=os.environ.get("GROQ_API_KEY"),
            model_name="llama-3.1-8b-instant", 
            temperature=0.0
        )
        # Use Structured output model from our response models
        from app.ai.models.ai_response_models import TranslationResponse
        self.structured_llm = self.llm.with_structured_output(TranslationResponse)

    def process(self, state: ComplaintGraphState) -> dict:
        """
        LangGraph Node for translation.
        Translates the given text into English if it's not already.
        Returns a dictionary to partially update the LangGraph state.
        """
        if not state.get("original_text"):
            return {"status": "error", "error": "No original_text provided"}
        
        system_prompt = (
            "You are a professional, civic-response translation assistant. "
            "Your job is to read user complaints. Identify the language. "
            "If the complaint is not in English, translate it to clear, professional English. "
            "If the original text is ALREADY in English, YOU MUST return an empty string ('') for the translated text. Do not rewrite or translate English to English. "
            "Output strictly in the expected JSON format."
        )

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"COMPLAINT TEXT: {state['original_text']}")
        ]

        try:
            response = self.structured_llm.invoke(messages)
            
            return {
                "translated_text": response.translated_text,
                "detected_language": response.detected_language,
                "translation_status": "completed"
            }
        except Exception as e:
            logger.exception("Translation failed")
            return {
                "translated_text": state['original_text'], # Fallback
                "detected_language": "unknown",
                "translation_status": "failed",
                "error": str(e)
            }
