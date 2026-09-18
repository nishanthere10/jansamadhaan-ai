"""Resolution transaction contract tests using simulated persistence."""
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from test_resolution_flow import Database, Query

from app.core.security import get_current_user
from app.main import app


class FailingAuditQuery(Query):
    def execute(self):
        if self.table == 'incident_updates' and self.operation == 'insert':
            raise RuntimeError('Simulated audit write failure')
        return super().execute()


class FailingAuditDatabase(Database):
    def table(self, name):
        return FailingAuditQuery(self, name)


@pytest.mark.parametrize('outcome', ['verified', 'rejected', 'error'])
def test_audit_failure_preserves_pending_attempt_and_previous_state(outcome):
    db = FailingAuditDatabase({
        'id': 'incident', 'assigned_to': 'worker-1', 'status': 'assigned',
        'image_url': 'https://storage.example/before.png', 'title': 'Pothole',
        'citizen_id': 'citizen-1',
    })
    proof = db.storage.from_('grievance_images').get_public_url(
        'resolution/incident/worker-1/00000000-0000-4000-8000-000000000001.png'
    )
    previous_overrides = dict(app.dependency_overrides)
    app.dependency_overrides[get_current_user] = lambda: {'id': 'worker-1', 'role': 'worker'}
    try:
        with patch('app.api.incident.get_supabase', return_value=db), patch(
            'app.services.resolution_service.ResolutionVerificationService.verify_resolution',
            return_value={'status': outcome, 'confidence': 0.9},
        ), TestClient(app) as client:
            response = client.put('/api/v1/incidents/incident/status', json={
                'status': 'resolved', 'resolution_image_url': proof,
            })
        assert response.status_code == 503
        assert db.rows['incidents'][0]['status'] == 'assigned'
        attempt = db.rows['resolution_verifications'][0]
        assert attempt['verification_status'] == 'pending'
        assert attempt['verification_score'] == 0.0
        assert attempt['manual_review_required'] is True
        assert not db.rows.get('incident_updates')
        assert not db.rows.get('notifications')
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous_overrides)
