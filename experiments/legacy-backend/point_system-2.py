from flask import Flask, request, jsonify
from flask_cors import CORS
from math import sqrt

app = Flask(__name__)
CORS(app)

# Global variables to store positions
user_positions = {}
model_positions = {}

# Function to calculate Euclidean distance between two positions
def calculate_distance(pos1, pos2):
    return sqrt(
        (pos1['x'] - pos2['x']) ** 2 +
        (pos1['y'] - pos2['y']) ** 2 +
        (pos1['z'] - pos2['z']) ** 2
    )

# Function to award points based on distance
def award_points(distance):
    
    if distance < 1:
        return 100
    elif distance < 1.5:
        return 70
    elif distance < 2:
        return 40
    else:
        return 1

# Endpoint to receive user's bone positions
@app.route('/user_bone_positions', methods=['POST'])
def receive_user_positions():
    global user_positions
    try:
        user_positions = request.get_json()
        print("User positions received.")
        return jsonify({"message": "User positions received."}), 200
    except Exception as e:
        print(f"Error receiving user positions: {e}")
        return jsonify({"error": str(e)}), 500

# Endpoint to receive model's bone positions
@app.route('/model_bone_positions', methods=['POST'])
def receive_model_positions():
    global model_positions
    try:
        model_positions = request.get_json()
        print("Model positions received.")
        return jsonify({"message": "Model positions received."}), 200
    except Exception as e:
        print(f"Error receiving model positions: {e}")
        return jsonify({"error": str(e)}), 500

# Endpoint to calculate and return the total points
@app.route('/calculate_score', methods=['GET'])
def calculate_score():
    if not user_positions:
        return jsonify({"error": "User positions not available."}), 400
    if not model_positions:
        return jsonify({"error": "Model positions not available."}), 400

    try:
        total_points = compare_and_score(user_positions, model_positions)
        print(total_points)
        return jsonify({"total_points": total_points}), 200
    except Exception as e:
        print(f"Error calculating score: {e}")
        return jsonify({"error": str(e)}), 500

# Function to compare bone positions and calculate total points
def compare_and_score(user_positions, model_positions):
    results = {}
    total_points = 0

    # List of bones to compare
    bones_to_compare = [
        'hips', 'spine', 'chest', 'neck', 'head',
        'leftShoulder', 'leftUpperArm', 'leftLowerArm', 'leftHand',
        'rightShoulder', 'rightUpperArm', 'rightLowerArm', 'rightHand',
        'leftUpperLeg', 'leftLowerLeg', 'leftFoot',
        'rightUpperLeg', 'rightLowerLeg', 'rightFoot',
    ]

    for bone_name in bones_to_compare:
        user_pos = user_positions.get(bone_name)
        model_pos = model_positions.get(bone_name)

        if user_pos and model_pos:
            distance = calculate_distance(user_pos, model_pos)
            points = award_points(distance)
            total_points += points
            results[bone_name] = {
                "user_position": user_pos,
                "model_position": model_pos,
                "distance": distance,
                "points": points
            }
        else:
            # Handle missing bone positions
            results[bone_name] = {
                "user_position": user_pos,
                "model_position": model_pos,
                "points": 0
            }

    # For debugging purposes, you can print the results
    print("Comparison Results:")
    for bone_name, result in results.items():
        print(f"{bone_name}: {result}")

    return total_points

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
