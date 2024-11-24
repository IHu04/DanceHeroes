import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { Pose, POSE_CONNECTIONS } from "@mediapipe/pose";
import { Camera } from "@mediapipe/camera_utils";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const VisualizeModel: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mountRef.current || !videoRef.current) return;

    // Three.js setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1, 3);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth / 2, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(2, 2, 2);
    scene.add(directionalLight);

    // Landmark Points
    const pointsGeometry = new THREE.BufferGeometry();
    const pointsMaterial = new THREE.PointsMaterial({ color: 0xff0000, size: 0.05 });
    const points = new THREE.Points(pointsGeometry, pointsMaterial);
    scene.add(points);

    // Connections
    const linesGeometry = new THREE.BufferGeometry();
    const linesMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
    const lines = new THREE.LineSegments(linesGeometry, linesMaterial);
    scene.add(lines);

    // Background Plane for MediaPipe Image
    const planeGeometry = new THREE.PlaneGeometry(1.92, 1.08); // Adjust for video aspect ratio
    const planeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const backgroundPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    scene.add(backgroundPlane);

    // Function to map landmarks to Three.js coordinates
    const mapLandmarksToThreeJS = (landmarks, width, height) => {
      return landmarks.map(({ x, y, z }) => {
        return {
          x: (x - 0.5) * width,
          y: -(y - 0.5) * height,
          z: -z * width,
        };
      });
    };

    // Function to smooth landmarks
    const smoothLandmarks = (prevLandmarks, newLandmarks, alpha = 0.5) => {
      return newLandmarks.map((newPoint, i) => {
        const prevPoint = prevLandmarks[i] || { x: 0, y: 0, z: 0 };
        return {
          x: prevPoint.x * alpha + newPoint.x * (1 - alpha),
          y: prevPoint.y * alpha + newPoint.y * (1 - alpha),
          z: prevPoint.z * alpha + newPoint.z * (1 - alpha),
        };
      });
    };

    let previousLandmarks = [];

    // Function to update the Three.js model
    const updateModel = (landmarks) => {
      const pointsArray = [];
      const linesArray = [];

      landmarks.forEach(({ x, y, z }) => {
        pointsArray.push(x, y, z);
      });

      POSE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
        const start = landmarks[startIdx];
        const end = landmarks[endIdx];
        if (start && end) {
          linesArray.push(start.x, start.y, start.z, end.x, end.y, end.z);
        }
      });

      pointsGeometry.setAttribute("position", new THREE.Float32BufferAttribute(pointsArray, 3));
      linesGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linesArray, 3));
      pointsGeometry.attributes.position.needsUpdate = true;
      linesGeometry.attributes.position.needsUpdate = true;
    };

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // MediaPipe Pose Setup
    const pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    pose.onResults((results) => {
      const newLandmarks = results.poseLandmarks;

      // Set MediaPipe image texture to background plane
      if (results.image) {
        const texture = new THREE.Texture(results.image);
        texture.needsUpdate = true;
        planeMaterial.map = texture;
      }

      // Smooth and update landmarks
      if (newLandmarks) {
        const threeJSLandmarks = mapLandmarksToThreeJS(newLandmarks, 1.92, 1.08);
        const smoothedLandmarks = smoothLandmarks(previousLandmarks, threeJSLandmarks);
        previousLandmarks = smoothedLandmarks;
        updateModel(smoothedLandmarks);
      }
    });

    // Camera feed setup
    const cameraInput = new Camera(videoRef.current, {
      onFrame: async () => {
        await pose.send({ image: videoRef.current! });
      },
      width: 640,
      height: 480,
    });

    cameraInput.start();

    return () => {
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh" }}>
      {/* Left panel: Camera feed */}
      <div style={{ width: "50%", height: "100%", position: "relative" }}>
        <video ref={videoRef} style={{ display: "none" }} />
      </div>

      {/* Right panel: Three.js visualization */}
      <div ref={mountRef} style={{ width: "50%", height: "100%", backgroundColor: "#000" }}></div>
    </div>
  );
};

export default VisualizeModel;
