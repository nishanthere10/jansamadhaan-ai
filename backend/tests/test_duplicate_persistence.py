from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.ai.services.duplicate_detection_service import DuplicateDetectionService
from app.ai.tasks import process_incident_ai_background


@pytest.mark.asyncio
async def test_orchestrator_persists_cluster_result():
    db = MagicMock()
    pipeline = MagicMock()
    pipeline.ainvoke = AsyncMock(return_value={'incident_id': 'incident', 'category': 'Pothole'})
    metadata = {'cluster_id': 'cluster', 'is_primary_incident': False,
                'duplicate_count': 0, 'cluster_match_score': 0.91}
    with patch('app.ai.tasks.get_supabase', return_value=db), patch(
        'app.ai.tasks.get_pipeline', return_value=pipeline
    ), patch.object(DuplicateDetectionService, 'process', AsyncMock(return_value=metadata)):
        await process_incident_ai_background('incident', 'Pothole')
    final = db.table.return_value.update.call_args.args[0]
    assert final['cluster_id'] == 'cluster'
    assert final['is_primary_incident'] is False
    assert final['duplicate_count'] == 0
    assert 'cluster_match_score' not in final  # no unmigrated column
    assert final['ai_structured_data']['cluster_match_score'] == 0.91
