# This file contains the placeholder classes for future LangGraph agent implementation.
# In Phase 1, we do not execute these agents, but we structure the codebase to be ready for them.

from typing import Dict, Any

class State(dict):
    """
    Placeholder for LangGraph State definitions.
    Future implementation will use TypedDict with Annotated reducers 
    to manage the ongoing incident analysis state.
    """
    pass

class IncidentAgentOrchestrator:
    """
    Orchestrator meant to compile and run the LangGraph StateGraph.
    Currently returns mock values for Phase 1.
    """
    def __init__(self):
        # future: self.graph = builder.compile()
        pass

    def invoke(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Mock extraction of incident details from a raw WhatsApp payload.
        """
        return {
            "category": "other",
            "severity": "medium",
            "department": "General",
            "summary": "Report received pending manual review (AI disabled in Phase 1)",
            "is_duplicate": False,
            "trust_score": 50
        }

class AgentNodes:
    """
    Placeholder for specific LangGraph nodes (Translation, Routing, Severity).
    """
    @staticmethod
    def translation_node(state: State) -> dict:
        return {}

    @staticmethod
    def classification_node(state: State) -> dict:
        return {}
