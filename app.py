import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess;

UPLOAD_FOLDER = "EDGE/custom_music"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)  # Ensure the uploads folder exists

app = Flask(__name__)
CORS(app)  # Enable CORS for communication with React

@app.route("/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400
    if file and file.filename.endswith(".wav"):
        filepath = os.path.join(UPLOAD_FOLDER, file.filename)
        file.save(filepath)

        # Run the Bash script
        try:
            command = ["bash", "your_script.sh"]
            result = subprocess.run(command, text=True, capture_output=True, check=True)

            # Return the stdout from the Bash script
            return jsonify({"message": "File processed successfully", "output": result.stdout.strip()}), 200
        except subprocess.CalledProcessError as e:
            return jsonify({"error": "Bash script failed", "details": e.stderr.strip()}), 500
    return jsonify({"error": "Invalid file type. Only WAV files are allowed"}), 400



@app.route("/coordinates", methods=["POST"])
def receive_coordinates():
    try:
        # Parse JSON data from the request
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400

        landmarks = data.get("landmarks", [])
        if not landmarks:
            return jsonify({"error": "No landmarks provided"}), 400

        # Debug: Print received landmarks
        print("Received landmarks:", landmarks)

        # Process landmarks (if needed)
        # Example: Calculate the average visibility
        avg_visibility = sum(l["visibility"] for l in landmarks) / len(landmarks)
        print("Average visibility:", avg_visibility)

        # Return success response
        return jsonify({"message": "Coordinates received successfully!", "avg_visibility": avg_visibility}), 200
    except Exception as e:
        print("Error in receive_coordinates:", str(e))
        return jsonify({"error": "An error occurred", "details": str(e)}), 500
    
if __name__ == "__main__":
    app.run(debug=True)