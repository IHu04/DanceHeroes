import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess;

UPLOAD_FOLDER = "EDGE/custom_music"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)  # Ensure the uploads folder exists

app = Flask(__name__)
CORS(app)


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
            command = ["bash", "create_dance.sh"]
            result = subprocess.run(command, text=True)

            if result.returncode == 0:
                # The script executed successfully
                output = result.stdout
                return jsonify({"message": "Success", "output": output}), 200
            else:
                # The script failed
                error_output = result.stderr
                return jsonify({"error": "Bash script failed", "details": error_output.strip()}), 500
        except Exception as e:
            return jsonify({"error": "An error occurred while running the script", "details": str(e)}), 500
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
