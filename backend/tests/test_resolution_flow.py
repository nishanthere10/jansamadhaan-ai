"""Route integration using stateful simulated persistence; no live data modified."""
import base64
from copy import deepcopy
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.core.security import get_current_user
from app.main import app


class Query:
    def __init__(self, database, table):
        self.database = database
        self.table = table
        self.filters = []
        self.operation = 'select'
        self.payload = None

    def select(self, _columns):
        return self

    def eq(self, key, value):
        self.filters.append((key, value))
        return self

    def is_(self, key, _value):
        return self.eq(key, None)

    def insert(self, payload):
        self.operation, self.payload = 'insert', payload.copy()
        return self

    def update(self, payload):
        self.operation, self.payload = 'update', payload.copy()
        return self

    def execute(self):
        rows = self.database.rows.setdefault(self.table, [])
        if self.operation == 'insert':
            rows.append(self.payload.copy())
            result = [self.payload.copy()]
        else:
            matches = [row for row in rows if all(row.get(k) == v for k, v in self.filters)]
            if self.operation == 'update':
                for row in matches:
                    row.update(self.payload)
            result = [row.copy() for row in matches]
        if self.operation != 'select':
            self.database.writes.append((self.table, self.operation, self.payload.copy()))
        return SimpleNamespace(data=result)


class Database:
    def __init__(self, incident):
        self.rows = {'incidents': [incident.copy()]}
        self.writes = []
        self.storage = MagicMock()
        self.storage.from_.return_value.get_public_url.side_effect = (
            lambda key: 'https://storage.example/storage/v1/object/public/grievance_images/' + key
        )

    def table(self, name):
        return Query(self, name)

    def rpc(self, name, params):
        """Simulated RPC contract; this does NOT execute or validate PostgreSQL SQL."""
        assert name == 'finalize_resolution'

        def execute():
            snapshot = deepcopy(self.rows)
            writes = list(self.writes)
            incident = self.rows['incidents'][0]
            if (incident['status'] != params['p_previous_status']
                    or incident.get('assigned_to') != params['p_assigned_to']):
                return SimpleNamespace(data={'applied': False})
            try:
                outcome = params['p_outcome']
                status = {'verified': 'resolved', 'rejected': 'in-progress',
                          'error': incident['status']}[outcome]
                if outcome != 'error':
                    self.table('incidents').update({'status': status}).eq('id', params['p_incident_id']).execute()
                attempt = next(row for row in self.rows['resolution_verifications']
                               if row['id'] == params['p_verification_id'])
                self.table('resolution_verifications').update({
                    'verification_status': 'pending' if outcome == 'error' else outcome,
                    'verification_score': 0 if outcome == 'error' else params['p_confidence'],
                    'manual_review_required': outcome != 'verified',
                }).eq('id', attempt['id']).execute()
                self.table('incident_updates').insert({
                    'incident_id': incident['id'], 'updated_by': params['p_actor_id'],
                    'status': status, 'note': params['p_note'],
                    'before_image_url': attempt['before_image_url'],
                    'after_image_url': attempt['after_image_url'],
                    'resolution_verification_id': attempt['id'],
                }).execute()
                return SimpleNamespace(data={'applied': True})
            except Exception:
                self.rows = snapshot
                self.writes = writes
                raise

        return SimpleNamespace(execute=execute)


@pytest.mark.parametrize('role', ['worker', 'authority'])
@pytest.mark.parametrize('outcome, expected', [
    ('verified', 'resolved'), ('rejected', 'in-progress'), ('error', 'assigned'),
])
def test_upload_resolution_and_worker_response(role, outcome, expected):
    incident_id = '00000000-0000-4000-8000-000000000001'
    incident = {'id': incident_id, 'assigned_to': 'worker-1', 'status': 'assigned',
                'image_url': 'https://storage.example/before.png', 'title': 'Pothole',
                'citizen_id': 'citizen-1', 'tracking_id': 'CIV-1'}
    db = Database(incident)
    user_id = 'worker-1' if role == 'worker' else 'authority-1'
    png = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=')
    app.dependency_overrides[get_current_user] = lambda: {'id': user_id, 'role': role}
    try:
        with patch('app.api.incident.get_supabase', return_value=db), patch(
            'app.services.resolution_service.ResolutionVerificationService.verify_resolution',
            return_value={'status': outcome, 'confidence': 0.9, 'notes': 'Model decision'},
        ) as verify, TestClient(app) as client:
            uploaded = client.post('/api/v1/incidents/upload', params={'incident_id': incident_id},
                                   files={'file': ('repair.png', png, 'image/png')})
            assert uploaded.status_code == 200, uploaded.text
            proof = uploaded.json()['data']['image_url']
            assert f'/resolution/{incident_id}/{user_id}/' in proof
            response = client.put(f'/api/v1/incidents/{incident_id}/status', json={
                'status': 'resolved', 'resolution_image_url': proof,
            })
            assert response.status_code == 200, response.text
            verify.assert_called_once_with(incident['image_url'], proof, incident['title'])
        assert db.rows['incidents'][0]['status'] == expected
        payload = response.json()['data']
        assert payload['status'] == expected
        assert payload['verification_status'] == outcome
        assert payload['manual_review_required'] is (outcome != 'verified')
        records = db.rows['resolution_verifications']
        assert len(records) == 1
        assert records[0]['verification_status'] == ('pending' if outcome == 'error' else outcome)
        assert db.rows['incident_updates'][0]['status'] == expected
        if outcome != 'verified':
            assert not any(table == 'incidents' and data.get('status') == 'resolved'
                           for table, _, data in db.writes)
        assert {row['user_id'] for row in db.rows['notifications']} == {'citizen-1', 'worker-1', user_id}
        assert all(row['message'] == response.json()['message'] for row in db.rows['notifications'])
    finally:
        app.dependency_overrides.clear()


@pytest.mark.parametrize('role', ['worker', 'authority'])
@pytest.mark.parametrize('proof', [None, '', '   '])
def test_resolve_without_proof_rejected_before_writes(role, proof):
    db = Database({})
    app.dependency_overrides[get_current_user] = lambda: {'id': 'worker-1', 'role': role}
    try:
        with patch('app.api.incident.get_supabase', return_value=db), TestClient(app) as client:
            response = client.put('/api/v1/incidents/incident/status', json={
                'status': 'resolved', 'resolution_image_url': proof,
            })
        assert response.status_code == 422
        assert db.writes == []
    finally:
        app.dependency_overrides.clear()


@pytest.mark.parametrize('change, expected', [
    ({'image_url': None}, 422), ({'assigned_to': None}, 403),
    ({'assigned_to': 'another-worker'}, 403), ({'status': 'closed'}, 409),
])
def test_invalid_resolution_context_rejected_before_writes(change, expected):
    incident = {'id': 'incident', 'assigned_to': 'worker-1', 'status': 'assigned',
                'image_url': 'https://storage.example/before.png', 'title': 'Pothole'}
    db = Database({**incident, **change})
    app.dependency_overrides[get_current_user] = lambda: {'id': 'worker-1', 'role': 'worker'}
    try:
        with patch('app.api.incident.get_supabase', return_value=db), TestClient(app) as client:
            response = client.put('/api/v1/incidents/incident/status', json={
                'status': 'resolved', 'resolution_image_url': 'https://storage.example/other-incident.png',
            })
        assert response.status_code == expected
        assert db.writes == []
    finally:
        app.dependency_overrides.clear()


def test_other_incident_proof_rejected_before_provider_call():
    db = Database({'id': 'incident', 'assigned_to': 'worker-1', 'status': 'assigned',
                   'image_url': 'https://storage.example/before.png', 'title': 'Pothole'})
    app.dependency_overrides[get_current_user] = lambda: {'id': 'worker-1', 'role': 'worker'}
    try:
        with patch('app.api.incident.get_supabase', return_value=db), patch(
            'app.services.resolution_service.ResolutionVerificationService.verify_resolution'
        ) as verify, TestClient(app) as client:
            response = client.put('/api/v1/incidents/incident/status', json={
                'status': 'resolved', 'resolution_image_url': 'https://storage.example/other-incident.png',
            })
        assert response.status_code == 422
        assert db.writes == []
        verify.assert_not_called()
    finally:
        app.dependency_overrides.clear()
