#!/bin/bash
# Input arguments
MUSIC_DIR="./EDGE/custom_music/"
MOTION_DIR="GeneratedLandmarks"

# Ensure required directories exist
mkdir -p "$MUSIC_DIR" "$MOTION_DIR"

# Run the Python script
python ./EDGE/test.py --music_dir "$MUSIC_DIR" --save_motions --motion_save_dir "$MOTION_DIR"

# Check if the script executed successfully
if [ $? -eq 0 ]; then
    # Assume the Python script creates a file in the MOTION_DIR
    created_file="$MOTION_DIR/output.txt"  # Replace with the actual filename
    if [ -f "$created_file" ]; then
        # Print the contents of the created file to stdout
        cat "$created_file"
    else
        echo "Error: Expected file '$created_file' not found" >&2
        exit 1
    fi
else
    echo "Error: Python script failed" >&2
    exit 1
fi
