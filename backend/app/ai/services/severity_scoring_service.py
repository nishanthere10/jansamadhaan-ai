import logging
import os

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq

from app.ai.models.graph_state import ComplaintGraphState
from app.core.config import settings

logger = logging.getLogger(__name__)

class SeverityScoringService:
    def __init__(self):
        self.llm = ChatGroq(
            api_key=os.environ.get("GROQ_API_KEY"),
            model_name=settings.GROQ_MODEL,
            temperature=0.1
        )
        from app.ai.models.ai_response_models import SeverityResponse
        self.structured_llm = self.llm.with_structured_output(SeverityResponse)

    def process(self, state: ComplaintGraphState) -> dict:
        """
        LangGraph Node for assigning a severity/priority score to a municipal complaint.
        """
        text_to_analyze = state.get("translated_text") or state.get("original_text")
        vision_analysis = state.get("vision_analysis")
        
        if not text_to_analyze and not vision_analysis:
            return {"status": "error", "error": "No text available for severity scoring"}

        system_prompt = (
            "You are a municipal risk assessment AI. "
            "Evaluate the following citizen complaint and determine its severity. "
            "Output strictly in the expected JSON format. "
            "Severity logic: \n"
            "- 'Critical': Immediate danger to life or huge infrastructure damage (e.g. active water main break, exposed live wires).\n"
            "- 'High': Significant disruption to daily life (e.g. major pothole on main road, prolonged power outage).\n"
            "- 'Medium': Localized nuisance but no immediate danger (e.g. uncollected garbage, broken streetlight).\n"
            "- 'Low': Minor aesthetic issues or long-term requests (e.g. overgrown park grass, faded paint).\n"
            "Score from 0.0 (Low) to 1.0 (Critical).\n"
            "If VISION ANALYSIS is provided, use it to accurately assess the physical risk."
        )

        content = f"COMPLAINT TEXT: {text_to_analyze}\n"
        if vision_analysis:
            content += f"VISION ANALYSIS: {vision_analysis}\n"

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=content)
        ]

        try:
            response = self.structured_llm.invoke(messages)
            
            return {
                "severity": response.severity,
                "severity_score": response.severity_score,
                "severity_explanation": response.severity_explanation
            }
        except Exception as e:
            logger.exception("Severity scoring failed")
            return {"error": f"Severity scoring failed: {str(e)}"}
