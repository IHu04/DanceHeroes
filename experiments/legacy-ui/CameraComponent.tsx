import React, { useRef, useEffect } from "react";
import { Pose, POSE_CONNECTIONS } from "@mediapipe/pose"; // Import connections
import { Camera } from "@mediapipe/camera_utils";
import axios from "axios";

const CameraFeed: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const setupMediaPipe = async () => {
      if (!videoRef.current || !canvasRef.current) return;

      const pose = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });

      pose.setOptions({
        modelComplexity: 2,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      pose.onResults(async (results) => {
        if (!canvasRef.current) return;

        const landmarks = results.poseLandmarks;
        const canvasCtx = canvasRef.current.getContext("2d");

        if (canvasCtx) {
          canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

          if (landmarks) {
            // Draw connections
            drawConnections(canvasCtx, landmarks, POSE_CONNECTIONS);

            // Draw individual landmarks
            landmarks.forEach(({ x, y }) => {
              canvasCtx.beginPath();
              canvasCtx.arc(x * canvasRef.current.width, y * canvasRef.current.height, 5, 0, 2 * Math.PI);
              canvasCtx.fillStyle = "red";
              canvasCtx.fill();
            });
          }
        }

        // Send coordinates to the backend
        if (landmarks) {
          try {
            await axios.post("http://127.0.0.1:5000/coordinates", { landmarks });
          } catch (error) {
            console.error("Error sending coordinates:", error);
          }
        }
      });

      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          await pose.send({ image: videoRef.current! });
        },
        width: 640,
        height: 480,
      });

      camera.start();
    };

    setupMediaPipe();
  }, []);

  const drawConnections = (ctx: CanvasRenderingContext2D, landmarks: any[], connections: any[]) => {
    ctx.strokeStyle = "rgba(0, 255, 0, 0.7)"; // Line color
    ctx.lineWidth = 3;

    connections.forEach(([startIdx, endIdx]: [number, number]) => {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];

      // Draw only if both points are visible
      if (start.visibility > 0.5 && end.visibility > 0.5) {
        ctx.beginPath();
        ctx.moveTo(start.x * canvasRef.current!.width, start.y * canvasRef.current!.height);
        ctx.lineTo(end.x * canvasRef.current!.width, end.y * canvasRef.current!.height);
        ctx.stroke();
      }
    });
  };

  return (
    <div style={{ position: "relative", width: "50vw", height: "100vh" }}>
      <video ref={videoRef} style={{ display: "none" }} />
      <canvas
        ref={canvasRef}
        width="640"
        height="480"
        style={{ width: "100%", height: "100%", position: "absolute" }}
      />
    </div>
  );
};

export default CameraFeed;
