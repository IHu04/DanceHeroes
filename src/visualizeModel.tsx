import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { VRM, VRMUtils } from "@pixiv/three-vrm";
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import { Pose } from "@mediapipe/pose";
import { Camera } from "@mediapipe/camera_utils";
import * as Kalidokit from "kalidokit";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const VisualizeModel: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mountRef.current || !videoRef.current) {
      console.error("Missing required refs: mountRef or videoRef");
      return;
    }

    // Three.js Scene Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 16 / 9, 0.1, 1000);
    camera.position.set(0.0, 1.4, 2.5);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    // Orbit Controls
    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.target.set(0.0, 1.4, 0.0);
    orbitControls.update();

    // Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5).normalize();
    scene.add(directionalLight);

    // Load VRM Model
    let currentVrm: VRM | null = null;
    const loader = new GLTFLoader();
    loader.load(
      "/src/assets/my_model.vrm", // Update to the actual VRM model path
      (gltf) => {
        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.removeUnnecessaryJoints(gltf.scene);

        VRM.createFromGLTF(gltf).then((vrm) => {
          scene.add(vrm.scene);
          currentVrm = vrm;
          console.log("VRM model loaded successfully:", vrm);
        });
      },
      undefined,
      (error) => {
        console.error("Failed to load VRM model:", error);
      }
    );

    // Helper Functions for Rigging
    const rigRotation = (
      boneName: string,
      rotation: any,
      dampener = 1,
      lerpAmount = 0.3
    ) => {
      if (!currentVrm) return;
      const bone = currentVrm.humanoid.getNormalizedBoneNode(boneName);
      if (bone) {
        const euler = new THREE.Euler(
          rotation.x * dampener,
          rotation.y * dampener,
          rotation.z * dampener,
          "XYZ"
        );
        const quaternion = new THREE.Quaternion().setFromEuler(euler);
        bone.quaternion.slerp(quaternion, lerpAmount);
      }
    };

    const rigPosition = (
      boneName: string,
      position: any,
      dampener = 1,
      lerpAmount = 0.3
    ) => {
      if (!currentVrm) return;
      const bone = currentVrm.humanoid.getNormalizedBoneNode(boneName);
      if (bone) {
        const vector = new THREE.Vector3(
          position.x * dampener,
          position.y * dampener,
          position.z * dampener
        );
        bone.position.lerp(vector, lerpAmount);
      }
    };

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
      if (!results.poseLandmarks || !results.poseWorldLandmarks) return;

      const riggedPose = Kalidokit.Pose.solve(
        results.poseWorldLandmarks,
        results.poseLandmarks,
        { runtime: "mediapipe", video: videoRef.current! }
      );

      if (riggedPose) {
        rigRotation("Hips", riggedPose.Hips.rotation, 0.7);
        rigPosition("Hips", riggedPose.Hips.position, 1, 0.07);

        rigRotation("Chest", riggedPose.Chest, 0.25, 0.3);
        rigRotation("Spine", riggedPose.Spine, 0.45, 0.3);

        rigRotation("RightUpperArm", riggedPose.RightUpperArm);
        rigRotation("RightLowerArm", riggedPose.RightLowerArm);
        rigRotation("LeftUpperArm", riggedPose.LeftUpperArm);
        rigRotation("LeftLowerArm", riggedPose.LeftLowerArm);

        rigRotation("LeftUpperLeg", riggedPose.LeftUpperLeg);
        rigRotation("LeftLowerLeg", riggedPose.LeftLowerLeg);
        rigRotation("RightUpperLeg", riggedPose.RightUpperLeg);
        rigRotation("RightLowerLeg", riggedPose.RightLowerLeg);
      }
    });

    // Video Feed Setup
    const video = videoRef.current!;
    const cameraInput = new Camera(video, {
      onFrame: async () => {
        await pose.send({ image: video });
      },
      width: 1280,
      height: 720,
    });
    cameraInput.start();

    // Animation Loop
    const clock = new THREE.Clock();
    const animate = () => {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();
      if (currentVrm) currentVrm.update(delta);
      renderer.render(scene, camera);
    };
    animate();

    // Clean-Up Function
    return () => {
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      currentVrm = null;
    };
  }, []);

  return (
    <div style={styles.container}>
      {/* Video Feed */}
      <video
        ref={videoRef}
        style={styles.video}
        autoPlay
        muted
        playsInline
      />
      {/* 3D Scene */}
      <div
        ref={mountRef}
        style={styles.scene}
      />
    </div>
  );
};

// Styling Object
const styles = {
  container: {
    display: "flex",
    width: "100vw",
    height: "100vh",
  },
  video: {
    width: "50%",
    height: "100%",
    objectFit: "cover",
    transform: "scaleX(-1)", // Mirror the video feed
  },
  scene: {
    width: "50%",
    height: "100%",
    backgroundColor: "#000",
  },
};

export default VisualizeModel;
