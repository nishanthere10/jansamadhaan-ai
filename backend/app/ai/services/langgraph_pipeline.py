from langgraph.graph import END, START, StateGraph

from app.ai.models.graph_state import ComplaintGraphState


class CivicAIPipeline:
    def __init__(self):
        # Lazy-import services so they are only instantiated when the pipeline runs,
        # NOT at module import time (which would fail if GROQ_API_KEY isn't set yet).
        from app.ai.services.classification_service import ClassificationService
        from app.ai.services.department_routing_service import DepartmentRoutingService
        from app.ai.services.severity_scoring_service import SeverityScoringService
        from app.ai.services.transcription_service import TranscriptionService
        from app.ai.services.translation_service import TranslationService
        from app.ai.services.vision_service import VisionAnalysisService

        self.transcriber = TranscriptionService()
        self.vision = VisionAnalysisService()
        self.translator = TranslationService()
        self.classifier = ClassificationService()
        self.scorer = SeverityScoringService()
        self.router = DepartmentRoutingService()

        self.graph = self._build_graph()

    def _build_graph(self):
        workflow = StateGraph(ComplaintGraphState)

        workflow.add_node("transcribe", self.transcriber.process)
        workflow.add_node("vision_analysis", self.vision.process)
        workflow.add_node("translate", self.translator.process)
        workflow.add_node("classify", self.classifier.process)
        workflow.add_node("score_severity", self.scorer.process)
        workflow.add_node("route_department", self.router.process)

        workflow.add_edge(START, "transcribe")
        workflow.add_edge("transcribe", "vision_analysis")
        workflow.add_edge("vision_analysis", "translate")
        workflow.add_edge("translate", "classify")
        workflow.add_edge("classify", "score_severity")
        workflow.add_edge("score_severity", "route_department")
        workflow.add_edge("route_department", END)

        return workflow.compile()

    def invoke(self, state_input: dict):
        """Executes the pipeline synchronously."""
        return self.graph.invoke(state_input)

    async def ainvoke(self, state_input: dict):
        """Executes the pipeline asynchronously."""
        return await self.graph.ainvoke(state_input)


def get_pipeline() -> CivicAIPipeline:
    """Factory function — creates a new pipeline instance on demand (after env is loaded)."""
    return CivicAIPipeline()
