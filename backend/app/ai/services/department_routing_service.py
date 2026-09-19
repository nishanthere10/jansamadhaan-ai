import logging
import os

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq

from app.ai.models.graph_state import ComplaintGraphState
from app.core.config import settings

logger = logging.getLogger(__name__)

class DepartmentRoutingService:
    def __init__(self):
        self.llm = ChatGroq(
            api_key=os.environ.get("GROQ_API_KEY"),
            model_name=settings.GROQ_MODEL,
            temperature=0.1
        )
        from app.ai.models.ai_response_models import DepartmentRoutingResponse
        self.structured_llm = self.llm.with_structured_output(DepartmentRoutingResponse)

    def process(self, state: ComplaintGraphState) -> dict:
        """
        LangGraph Node for routing a complaint to the correct municipal departments.
        """
        text_to_analyze = state.get("translated_text") or state.get("original_text")
        
        if not text_to_analyze:
            return {"status": "error", "error": "No text available for department routing"}

        system_prompt = (
            "You are a municipal dispatch AI. "
            "Determine the primary and secondary departments responsible for fixing the given complaint. "
            "Common departments include: 'Roads & Traffic', 'Water & Sanitation', 'Electricity', "
            "'Public Parks', 'Waste Management', 'Animal Control', 'Police/Security', 'Health'. "
            "Output strictly in the expected JSON format."
        )

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"COMPLAINT TEXT: {text_to_analyze}\nCATEGORY (if available): {state.get('category', 'Unknown')}\nSEVERITY: {state.get('severity', 'Unknown')}")
        ]

        try:
            response = self.structured_llm.invoke(messages)
            
            return {
                "primary_department": response.primary_department,
                # Force a list using python list comprehension or standard cast, the structured output should handle it
                "secondary_departments": response.secondary_departments,
                "escalation_level": response.escalation_level
            }
        except Exception as e:
            logger.exception("Department routing failed")
            return {"error": f"Department routing failed: {str(e)}"}
