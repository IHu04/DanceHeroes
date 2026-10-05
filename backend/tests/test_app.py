import io
import sys
from pathlib import Path
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import app, SESSIONS, compare_and_score

POSE = {
    'hips': {'x': 0, 'y': 1, 'z': 0},
    'head': {'x': 0, 'y': 2, 'z': 0},
    'leftHand': {'x': -1, 'y': 1.5, 'z': 0},
    'rightHand': {'x': 1, 'y': 1.5, 'z': 0},
    'leftFoot': {'x': -.2, 'y': 0, 'z': 0},
    'rightFoot': {'x': .2, 'y': 0, 'z': 0},
}


class GameTests(unittest.TestCase):
    def setUp(self):
        SESSIONS.clear()
        self.client = app.test_client()

    def session(self):
        return self.client.post('/api/sessions').json['session_id']

    def test_matching_pose_is_invariant_to_placement_and_scale(self):
        shifted = {bone: {axis: value * 2 + 4 for axis, value in point.items()}
                   for bone, point in POSE.items()}
        self.assertEqual(compare_and_score(shifted, POSE), 100)

    def test_different_pose_scores_lower(self):
        changed = {bone: dict(point) for bone, point in POSE.items()}
        changed['leftHand']['y'] = -.5
        changed['rightHand']['y'] = -.5
        self.assertLess(compare_and_score(changed, POSE), 100)

    def test_sessions_are_independent_and_rate_limited(self):
        first, second = self.session(), self.session()
        payload = {'user': POSE, 'model': POSE}
        with patch('app.time.monotonic', return_value=10):
            response = self.client.post(f'/api/sessions/{first}/score', json=payload)
            self.assertEqual(response.json['total_points'], 100)
            self.assertEqual(self.client.post(f'/api/sessions/{first}/score', json=payload).json['total_points'], 100)
        with patch('app.time.monotonic', return_value=10.3):
            self.assertEqual(self.client.post(f'/api/sessions/{first}/score', json=payload).json['total_points'], 200)
        self.assertEqual(SESSIONS[second]['score'], 0)

    def test_invalid_poses_do_not_award_points(self):
        session = self.session()
        for pose in (None, [], {}, {'hips': {'x': 'bad', 'y': 0, 'z': 0}},
                     {'hips': {'x': float('nan'), 'y': 0, 'z': 0}}):
            response = self.client.post(f'/api/sessions/{session}/score', json={'user': pose, 'model': POSE})
            self.assertEqual(response.status_code, 400)
        self.assertEqual(SESSIONS[session]['score'], 0)

    def test_missing_or_expired_session(self):
        self.assertEqual(self.client.post('/api/sessions/missing/score', json={}).status_code, 404)

    def test_upload_validation_and_missing_generator(self):
        self.assertEqual(self.client.post('/api/upload').status_code, 400)
        self.assertEqual(self.client.post('/api/upload', data={'file': (io.BytesIO(b'bad'), 'test.mp3')}).status_code, 400)
        with patch.dict('app.os.environ', {}, clear=True):
            self.assertFalse(self.client.get('/api/health').json['generation_available'])
            response = self.client.post('/api/upload', data={'file': (io.BytesIO(b'fake'), '../song.WAV')})
            self.assertEqual(response.status_code, 501)
            self.assertIn('bundled dance demo', response.json['error'])

    def test_generated_file_path_restrictions(self):
        self.assertEqual(self.client.get('/api/files/not-a-job/music.wav').status_code, 404)
        self.assertEqual(self.client.get('/api/files/' + 'a' * 32 + '/secrets.txt').status_code, 404)


if __name__ == '__main__':
    unittest.main()
