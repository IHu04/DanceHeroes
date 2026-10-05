"""Local game API. Choreography generation is an optional external adapter."""
import math
import os
from pathlib import Path
import subprocess
import time
import uuid
import wave

from flask import Flask, jsonify, request, send_from_directory
from werkzeug.exceptions import RequestEntityTooLarge

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024
UPLOADS = Path(__file__).resolve().parent / "uploads"
SESSIONS = {}
BONES = (
    "hips", "spine", "chest", "neck", "head",
    "leftShoulder", "leftUpperArm", "leftLowerArm", "leftHand",
    "rightShoulder", "rightUpperArm", "rightLowerArm", "rightHand",
    "leftUpperLeg", "leftLowerLeg", "leftFoot",
    "rightUpperLeg", "rightLowerLeg", "rightFoot",
)


def validate_pose(pose):
    if not isinstance(pose, dict) or not pose or "hips" not in pose:
        raise ValueError("A pose must include hips and body coordinates.")
    for bone, point in pose.items():
        if bone not in BONES or not isinstance(point, dict):
            raise ValueError("Invalid bone coordinates.")
        if any(not isinstance(point.get(axis), (float, int))
               or isinstance(point.get(axis), bool)
               or not math.isfinite(point[axis]) for axis in ("x", "y", "z")):
            raise ValueError("Coordinates must be finite numbers.")
    return pose


def normalize_pose(pose):
    hips = pose["hips"]
    relative = {bone: tuple(point[axis] - hips[axis] for axis in ("x", "y", "z"))
                for bone, point in pose.items()}
    scale = max((math.dist((0, 0, 0), point) for point in relative.values()), default=0)
    if scale < 1e-6:
        raise ValueError("Pose coordinates must describe a body with nonzero size.")
    return {bone: tuple(value / scale for value in point) for bone, point in relative.items()}


def compare_and_score(user, model):
    user = normalize_pose(validate_pose(user))
    model = normalize_pose(validate_pose(model))
    common = (set(user) & set(model)) - {"hips"}
    if len(common) < 3:
        raise ValueError("At least three matching body bones are required.")
    total = 0
    for bone in common:
        distance = math.dist(user[bone], model[bone])
        total += 100 if distance < 0.15 else 70 if distance < 0.3 else 40 if distance < 0.5 else 0
    return round(total / len(common))


@app.get("/api/health")
def health():
    script = os.environ.get("DANCE_GENERATOR_SCRIPT")
    return jsonify(status="ok", generation_available=bool(script and Path(script).is_file()))


@app.post("/api/sessions")
def create_session():
    now = time.monotonic()
    for key in list(SESSIONS):
        if now - SESSIONS[key]["updated"] > 3600:
            del SESSIONS[key]
    session_id = uuid.uuid4().hex
    SESSIONS[session_id] = {"score": 0, "updated": now, "last_sample": None}
    return jsonify(session_id=session_id), 201


@app.post("/api/sessions/<session_id>/score")
def score(session_id):
    session = SESSIONS.get(session_id)
    if session is None:
        return jsonify(error="Game session expired. Start a new game."), 404
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error="A JSON object with user and model poses is required."), 400
    try:
        points = compare_and_score(data.get("user"), data.get("model"))
    except ValueError as error:
        return jsonify(error=str(error)), 400
    now = time.monotonic()
    if session["last_sample"] is None or now - session["last_sample"] >= 0.25:
        session["score"] += points
        session["last_sample"] = now
    session["updated"] = now
    return jsonify(total_points=session["score"], accuracy=points)


@app.post("/api/upload")
def upload():
    file = request.files.get("file")
    if file is None or not file.filename:
        return jsonify(error="Choose a WAV file."), 400
    if not file.filename.lower().endswith(".wav"):
        return jsonify(error="Only WAV files are supported."), 400
    script = os.environ.get("DANCE_GENERATOR_SCRIPT")
    if not script or not Path(script).is_file():
        return jsonify(error="Custom choreography requires an EDGE generation adapter. Try the bundled dance demo."), 501
    job_id = uuid.uuid4().hex
    folder = UPLOADS / job_id
    folder.mkdir(parents=True)
    audio = folder / "music.wav"
    animation = folder / "dance.fbx"
    file.save(audio)
    try:
        with wave.open(str(audio)) as recording:
            if recording.getnframes() == 0:
                raise ValueError("Empty audio")
    except (wave.Error, EOFError, ValueError):
        audio.unlink(missing_ok=True)
        return jsonify(error="The file must contain valid PCM WAV audio."), 400
    try:
        subprocess.run(["bash", str(Path(script).resolve()), str(audio), str(animation)],
                       check=True, capture_output=True, text=True, timeout=600)
        if not animation.is_file() or not animation.stat().st_size:
            return jsonify(error="The generator did not produce dance.fbx."), 502
    except subprocess.TimeoutExpired:
        return jsonify(error="Dance generation timed out after 10 minutes."), 504
    except (subprocess.CalledProcessError, OSError):
        app.logger.exception("Dance generation failed")
        return jsonify(error="Dance generation failed. Check the backend terminal."), 502
    return jsonify(audio_url=f"/api/files/{job_id}/music.wav",
                   animation_url=f"/api/files/{job_id}/dance.fbx")


@app.get("/api/files/<job_id>/<filename>")
def generated_file(job_id, filename):
    if len(job_id) != 32 or any(char not in "0123456789abcdef" for char in job_id):
        return jsonify(error="Unknown generation job."), 404
    if filename not in ("music.wav", "dance.fbx"):
        return jsonify(error="Unknown generated file."), 404
    return send_from_directory(UPLOADS / job_id, filename)


@app.errorhandler(RequestEntityTooLarge)
def too_large(_error):
    return jsonify(error="Upload must be smaller than 50 MB."), 413


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", "5001")))
