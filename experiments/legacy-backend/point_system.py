from flask import Flask, request, jsonify
from flask_cors import CORS
from math import sqrt

app = Flask(__name__)
CORS(app)

# Function to calculate Euclidean distance between two positions
def calculate_distance(pos1, pos2): 
    return sqrt((pos1['x'] - pos2['x'])**2 +
                (pos1['y'] - pos2['y'])**2 +
                (pos1['z'] - pos2['z'])**2) 

# Function to award points based on distance
def award_points(distance):
    if distance < 0.1:
        return 100
    elif distance < 0.3:
        return 70
    elif distance < 0.5:
        return 40
    else:
        return 0

# Example choreography positions (target positions for comparison)
choreography_positions = {
    "hips": {"x": 0.1, "y": 1.4, "z": -0.5},
    "chest": {"x": 0.2, "y": 1.8, "z": -0.55},
    "neck": {"x": 0.25, "y": 2.0, "z": -0.6},
    "head": {"x": 0.3, "y": 2.2, "z": -0.65},
    # Add more target positions as needed
}

@app.route('/endpoint', methods=['POST'])
def receive_positions():
    try:
        # Get the JSON data from the request
        bone_positions = request.get_json()
        print(f"Received bone positions: {bone_positions}")

        # Extract and compare positions
        results = {}
        total_points = 0  # Track total points
        for bone in bone_positions.get('bones', []):
            bone_name = bone['boneName']
            player_pos = bone['position']
            choreography_pos = choreography_positions.get(bone_name)

            if choreography_pos:
                distance = calculate_distance(player_pos, choreography_pos)
                points = award_points(distance)  # Award points based on distance
                total_points += points  # Add to total score
                results[bone_name] = {
                    "player_position": player_pos,
                    "choreography_position": choreography_pos,
                    "distance": distance,
                    "points": points
                }
            else:
                results[bone_name] = {
                    "player_position": player_pos,
                    "choreography_position": None,
                    "points": 0
                }

        # Log the results for debugging
        print("Comparison Results:")
        for bone_name, result in results.items():
            print(f"{bone_name}: {result}")

        return jsonify({
            "message": "Bone positions processed successfully!",
            "results": results,
            "total_points": total_points  # Send total score to the frontend
        }), 200

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port='5001')
