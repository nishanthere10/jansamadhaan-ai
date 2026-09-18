from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from test_resolution_flow import Database

from app.core.security import get_current_user
from app.main import app


@pytest.mark.parametrize('outcome, expected', [('verified', 'resolved'), ('rejected', 'in-progress'), ('error', 'assigned')])
def test_resolution_outcome_preserves_operational_state(outcome, expected):
    db = Database({'id': 'inc-1', 'assigned_to': 'worker-1', 'status': 'assigned',
                   'image_url': 'https://example.com/before.jpg', 'title': 'Pothole',
                   'citizen_id': 'citizen-1', 'tracking_id': 'CIV-1'})
    proof = db.storage.from_('grievance_images').get_public_url(
        'resolution/inc-1/worker-1/00000000-0000-4000-8000-000000000001.jpg'
    )
    app.dependency_overrides[get_current_user] = lambda: {'id': 'worker-1', 'role': 'worker'}
    try:
        with patch('app.api.incident.get_supabase', return_value=db), patch(
            'app.ai.services.resolution_verification_service.ResolutionVerificationService.verify_resolution',
            return_value={'status': outcome, 'confidence': 0.9, 'notes': 'Test decision'},
        ) as verify:
            response = TestClient(app).put('/api/v1/incidents/inc-1/status', json={
                'status': 'resolved', 'resolution_image_url': proof,
            })
        assert response.status_code == 200, response.text
        verify.assert_called_once()
        assert db.rows['incidents'][0]['status'] == expected
        if outcome != 'verified':
            assert all(data.get('status') != 'resolved' for table, _, data in db.writes if table == 'incidents')
        records = [data for table, operation, data in db.writes
                   if table == 'resolution_verifications' and operation == 'insert']
        assert records
        assert records[-1]['verification_status'] == 'pending'
        final_record = db.rows['resolution_verifications'][0]
        assert final_record['verification_status'] == ('pending' if outcome == 'error' else outcome)
        assert response.json()['data']['verification_status'] == outcome
        assert db.rows['incident_updates'][0]['resolution_verification_id'] == final_record['id']
    finally:
        app.dependency_overrides.clear()
