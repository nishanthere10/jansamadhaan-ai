import logging
import os

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq

from app.ai.models.graph_state import ComplaintGraphState
from app.core.config import settings

logger = logging.getLogger(__name__)

class ClassificationService:
    def __init__(self):
        self.llm = ChatGroq(
            api_key=os.environ.get("GROQ_API_KEY"),
            model_name=settings.GROQ_MODEL,
            temperature=0.1
        )
        from app.ai.models.ai_response_models import ClassificationResponse
        self.structured_llm = self.llm.with_structured_output(ClassificationResponse)

    def process(self, state: ComplaintGraphState) -> dict:
        """
        LangGraph Node for Complaint Classification.
        Reads the translated text (or original if skipped) and determines category, keywords, title, etc.
        """
        text_to_analyze = state.get("translated_text") or state.get("original_text")
        vision_analysis = state.get("vision_analysis")
        structured_vision = state.get("structured_visionData", {})
        is_relevant = structured_vision.get("is_relevant") if structured_vision else True
        
        system_prompt = (
            "You are an expert municipal triage assistant and data integrity gatekeeper. "
            "Analyze the following citizen complaint and output a strictly formatted JSON response. "
            "1. INTEGRITY CHECK: Determine if the report is likely spam, gibberish (e.g., 'asdf', 'test test'), "
            "or clearly fake. *CRITICAL*: If there is NO VISION ANALYSIS provided AND the description is extremely vague, brief, or lacks proper details, you MUST flag it as spam. "
            "If the VISION ANALYSIS states the image is irrelevant (e.g. a selfie, a rose, out-of-context), you MUST flag the report as spam/invalid image, and explicitly say what was exactly in the image in the spam_reason. "
            "If so, set is_spam to true, provide a spam_score, and give a spam_reason explicitly. "
            "2. CLASSIFY: If it is a legitimate report, categorize it into: "
            "'Pothole', 'Garbage', 'Streetlight', 'Water Leak', 'Noise', 'Parking', or 'Other'. "
            "Generate a professional, concise title and summary. Extract up to 5 critical keywords. "
            "If 'VISION ANALYSIS' is provided, cross-reference it with the user's text to ensure accuracy."
        )

        content = f"COMPLAINT TEXT: {text_to_analyze}\n"
        if vision_analysis:
            content += f"VISION ANALYSIS (Objective visual evidence): {vision_analysis}\n"
            if is_relevant is False:
                content += "**SYSTEM ALERT**: The vision model flagged this image as IRRELEVANT. You MUST mark this as spam and specify the exact image content in the reason."

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=content)
        ]

        try:
            response = self.structured_llm.invoke(messages)
            if not response:
                raise ValueError("Structured LLM returned None")
                
            return {
                "category": response.category,
                "generated_title": response.generated_title,
                "generated_summary": response.generated_summary,
                "keywords": response.keywords,
                "is_spam": response.is_spam,
                "spam_score": response.spam_score,
                "spam_reason": response.spam_reason
            }
        except Exception:
            logger.exception("Classification failed")
            # Crash-resistant fallback so the rest of the application doesn't break
            return {
                "category": "Other",
                "generated_title": "Incident Log (AI Fallback)",
                "generated_summary": "System was unable to automatically categorize this incident. Manual review required.",
                "keywords": ["fallback", "manual-review"],
                "is_spam": False,
                "spam_score": 0.0,
                "spam_reason": "Fallback - Unable to verify"
            }
