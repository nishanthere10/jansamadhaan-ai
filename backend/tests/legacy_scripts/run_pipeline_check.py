"""Direct test of the AI pipeline to find the exact crash point."""
import asyncio
import logging
import sys

# Setup logging to see everything
logging.basicConfig(level=logging.DEBUG, format='%(name)s - %(levelname)s - %(message)s')

# Load env
from dotenv import load_dotenv

load_dotenv('backend/.env')

# Add backend to path
sys.path.insert(0, 'backend')

async def test():
    print("=" * 60)
    print("TESTING AI PIPELINE NODE BY NODE")
    print("=" * 60)
    
    state = {
        "incident_id": "test-123",
        "original_text": "huge car accident near Tilak Nagar station very dangerous for the nearby people please take immediate action.",
        "audio_path": None,
        "image_url": None,
        "keywords": [],
        "secondary_departments": []
    }
    
    # Test each node individually
    print("\n--- 1. TranscriptionService ---")
    try:
        from app.ai.services.transcription_service import TranscriptionService
        result = TranscriptionService().process(state)
        state.update(result)
        print(f"  OK: {result}")
    except Exception as e:
        print(f"  FAILED: {e}")
    
    print("\n--- 2. VisionAnalysisService ---")
    try:
        from app.ai.services.vision_service import VisionAnalysisService
        result = VisionAnalysisService().process(state)
        state.update(result)
        print(f"  OK: {result}")
    except Exception as e:
        print(f"  FAILED: {e}")
    
    print("\n--- 3. TranslationService ---")
    try:
        from app.ai.services.translation_service import TranslationService
        result = TranslationService().process(state)
        state.update(result)
        print(f"  OK: {result}")
    except Exception as e:
        print(f"  FAILED: {e}")
    
    print("\n--- 4. ClassificationService ---")
    try:
        from app.ai.services.classification_service import ClassificationService
        result = ClassificationService().process(state)
        state.update(result)
        print(f"  OK: {result}")
    except Exception as e:
        print(f"  FAILED: {e}")
    
    print("\n--- 5. SeverityScoringService ---")
    try:
        from app.ai.services.severity_scoring_service import SeverityScoringService
        result = SeverityScoringService().process(state)
        state.update(result)
        print(f"  OK: {result}")
    except Exception as e:
        print(f"  FAILED: {e}")
    
    print("\n--- 6. DepartmentRoutingService ---")
    try:
        from app.ai.services.department_routing_service import DepartmentRoutingService
        result = DepartmentRoutingService().process(state)
        state.update(result)
        print(f"  OK: {result}")
    except Exception as e:
        print(f"  FAILED: {e}")
    
    print("\n" + "=" * 60)
    print("FINAL STATE:")
    for k, v in state.items():
        if v is not None and k not in ("incident_id", "keywords", "secondary_departments"):
            print(f"  {k}: {v}")

asyncio.run(test())
