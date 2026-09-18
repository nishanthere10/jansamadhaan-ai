"""Exercise the real matching algorithm and persistence with a stateful DB substitute."""
from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from test_resolution_flow import Database, Query

from app.ai.services.duplicate_detection_service import DuplicateDetectionService


class ClusterQuery(Query):
    def neq(self, key, value):
        self.predicates.append(lambda row: row.get(key) != value)
        return self

    def gte(self, key, value):
        self.predicates.append(lambda row: row.get(key, '') >= value)
        return self

    def or_(self, expression):
        category = expression.split('%')[1].lower()
        self.predicates.append(lambda row: any(category in str(row.get(key, '')).lower()
                                              for key in ('ai_category', 'category')))
        return self

    def limit(self, _count):
        return self

    def __init__(self, database, table):
        super().__init__(database, table)
        self.predicates = []

    def execute(self):
        result = super().execute()
        if self.operation == 'select':
            result.data = [row for row in result.data if all(test(row) for test in self.predicates)]
        return result


class ClusterDatabase(Database):
    def table(self, name):
        return ClusterQuery(self, name)


def report(incident_id, lat=28.61, category='Pothole'):
    return {'id': incident_id, 'status': 'pending', 'category': category, 'ai_category': category,
            'location_lat': lat, 'location_lng': 77.2, 'created_at': datetime.now(timezone.utc).isoformat(),
            'cluster_id': None, 'is_primary_incident': False, 'duplicate_count': 0,
            'ai_severity': 'Low Risk', 'ai_structured_data': {'extracted_keywords': ['pothole', 'road']}}


async def process(row):
    return await DuplicateDetectionService.process({
        'incident_id': row['id'], 'category': row['category'],
        'location_lat': row['location_lat'], 'location_lng': row['location_lng'],
        'keywords': ['pothole', 'road'],
    })


@pytest.mark.asyncio
async def test_three_reports_one_primary_and_repeat_processing_does_not_increment():
    a = report('A')
    db = ClusterDatabase(a)
    with patch('app.ai.services.duplicate_detection_service.get_supabase', return_value=db):
        await process(a)
        b = report('B', 28.6115)
        db.rows['incidents'].append(b)
        b_result = await process(b)
        c = report('C', 28.612)
        db.rows['incidents'].append(c)
        await process(c)
        rows = db.rows['incidents']
        assert len({row['cluster_id'] for row in rows}) == 1
        assert [row['id'] for row in rows if row['is_primary_incident']] == ['A']
        assert rows[0]['duplicate_count'] == 2
        assert db.rows['duplicate_complaints'][0]['similarity_score'] == b_result['cluster_match_score']
        before = [row.copy() for row in rows]
        await process(c)
        assert rows == before
        assert len(db.rows['duplicate_complaints']) == 2


@pytest.mark.asyncio
@pytest.mark.parametrize('lat, category', [(29.0, 'Pothole'), (28.6101, 'Water Supply')])
async def test_unrelated_reports_stay_separate(lat, category):
    a = report('A')
    db = ClusterDatabase(a)
    with patch('app.ai.services.duplicate_detection_service.get_supabase', return_value=db):
        await process(a)
        b = report('B', lat, category)
        db.rows['incidents'].append(b)
        await process(b)
    assert db.rows['incidents'][0]['cluster_id'] != db.rows['incidents'][1]['cluster_id']
    assert all(row['is_primary_incident'] for row in db.rows['incidents'])
