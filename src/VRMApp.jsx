import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import * as Kalidokit from 'kalidokit';
import { Holistic } from '@mediapipe/holistic';
import { Camera } from '@mediapipe/camera_utils';
import axios from 'axios';
import "./App.css"
const VRMApp = () => {
  // Refs for mutable variables and DOM elements
  const rendererContainerRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Three.js variables
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const clockRef = useRef(null);
  const vrmRef = useRef(null);

  const [avgVisibility, setAvgVisibility] = useState(null);



  // State for selected model
  const [selectedModel, setSelectedModel] = useState('/src/models/shibu_sendagaya.vrm');

  // Helper functions from Kalidokit
  const remap = Kalidokit.Utils.remap;
  const clamp = Kalidokit.Utils.clamp;
  const lerp = Kalidokit.Vector.lerp;

  const hipRotationOffset = 0.0;

  const positionOffset = {
    x: 0,
    y: 1,
    z: 0,
  };

  useEffect(() => {
    initThree();

    // Cleanup function
    return () => {
      window.removeEventListener('resize', onWindowResize);
      if (rendererRef.current) rendererRef.current.dispose();
    };
  }, []);

  useEffect(() => {
    // Load the selected model whenever it changes
    loadModel(selectedModel);
  }, [selectedModel]);

  const initThree = () => {
    // Initialize Three.js scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const clock = new THREE.Clock();
    clockRef.current = clock;

    const camera = new THREE.PerspectiveCamera(
      35,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1.5, 2);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;

    // Append renderer to DOM
    if (rendererContainerRef.current) {
      rendererContainerRef.current.appendChild(renderer.domElement);
    }

    // Lighting
    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(0, 1, 1).normalize();
    scene.add(light);

    window.addEventListener('resize', onWindowResize, false);

    // Start the animation loop
    animate();

    // Set up MediaPipe Holistic
    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          videoElement.srcObject = stream;
          videoElement.play();
        })
        .catch((err) => {
          console.error('Error accessing webcam:', err);
        });
    }

    const holistic = new Holistic({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5/${file}`;
      },
    });

    holistic.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      refineFaceLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    holistic.onResults(onResults);


    const cameraMP = new Camera(videoElement, {
      onFrame: async () => {
        await holistic.send({ image: videoElement });
      },
      width: 640,
      height: 480,
    });
    cameraMP.start();
  };

  const loadModel = (modelPath) => {
    // Remove the previous model from the scene
    if (vrmRef.current) {
      sceneRef.current.remove(vrmRef.current.scene);
      VRMUtils.deepDispose(vrmRef.current.scene);
      vrmRef.current = null;
    }

    const loader = new GLTFLoader();

    loader.register((parser) => {
      return new VRMLoaderPlugin(parser);
    });

    loader.load(
      modelPath,
      (gltf) => {
        console.log('VRM model loaded:', gltf);
        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.removeUnnecessaryJoints(gltf.scene);
        const vrm = gltf.userData.vrm;
        vrmRef.current = vrm;

        // Adjust position and scale
        vrm.scene.position.set(-0.8, 0.8, 0);
        vrm.scene.scale.set(0.7, 0.7, 0.7);

        if (vrm.meta.metaVersion === '0') {
          vrm.scene.rotation.y = Math.PI;
        }

        sceneRef.current.add(vrm.scene);
      },
      undefined,
      (error) => {
        console.error('An error occurred while loading the VRM model:', error);
      }
    );
  };

  const onWindowResize = () => {
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    if (camera && renderer) {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(window.innerWidth, window.innerHeight);
    }
  };

  const onResults = async(results) => {
    const vrm = vrmRef.current;
    if (!vrm) {
      return; // Wait until the VRM model is loaded
    }

    const canvasElement = canvasRef.current;
    const canvasCtx = canvasElement.getContext('2d');
    const videoElement = videoRef.current;

    // Clear canvas
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.restore();

    const landmarks = results.poseLandmarks;
    if (landmarks) {
      try {
        const response = await axios.post("http://127.0.0.1:5000/coordinates", { landmarks });
    

      // Use the response 
      setAvgVisibility(response.data.avg_visibility);
      } catch (error) {
        console.error("Error sending coordinates:", error);
      }
    }
    // Process landmarks and update VRM model
    updateVRM(results);
  };

  const updateVRM = (results) => {
    const vrm = vrmRef.current;
    const clock = clockRef.current;
    if (!vrm) {
      return;
    }

    const deltaTime = clock.getDelta();

    // Take the results from `Holistic` and animate character based on its Face, Pose, and Hand Keypoints.
    let riggedPose, riggedLeftHand, riggedRightHand, riggedFace;

    const faceLandmarks = results.faceLandmarks;
    // Pose 3D Landmarks are with respect to Hip distance in meters
    const pose3DLandmarks = results.poseWorldLandmarks || results.za;

    // Pose 2D landmarks are with respect to videoWidth and videoHeight
    const pose2DLandmarks = results.poseLandmarks;
    // Be careful, hand landmarks may be reversed
    const leftHandLandmarks = results.rightHandLandmarks;
    const rightHandLandmarks = results.leftHandLandmarks;

    const videoElement = videoRef.current;

    // Face
    if (faceLandmarks) {
      riggedFace = Kalidokit.Face.solve(faceLandmarks, {
        runtime: 'mediapipe',
        video: videoElement,
      });
    }

    if (faceLandmarks && riggedFace) {
      rigRotation('Neck', riggedFace.head, 0.7);
      rigFace(riggedFace);
    }

    // Body pose
    if (pose2DLandmarks && pose3DLandmarks) {
      riggedPose = Kalidokit.Pose.solve(pose3DLandmarks, pose2DLandmarks, {
        runtime: 'mediapipe',
        video: videoElement,
      });
    }

    if (pose2DLandmarks && pose3DLandmarks && riggedPose) {
      rigRotation(
        'Hips',
        {
          x: riggedPose.Hips.rotation.x,
          y: riggedPose.Hips.rotation.y,
          z: riggedPose.Hips.rotation.z + hipRotationOffset,
        },
        0.7
      );
      rigPosition(
        'Hips',
        {
          x: riggedPose.Hips.position.x + positionOffset.x, // Reverse direction
          y: riggedPose.Hips.position.y + positionOffset.y, // Add a bit of height
          z: -riggedPose.Hips.position.z + positionOffset.z, // Reverse direction
        },
        1,
        0.07
      );

      rigRotation('Chest', riggedPose.Chest, 0.25, 0.3);
      rigRotation('Spine', riggedPose.Spine, 0.45, 0.3);

      rigRotation('RightUpperArm', riggedPose.RightUpperArm);
      rigRotation('RightLowerArm', riggedPose.RightLowerArm);
      rigRotation('LeftUpperArm', riggedPose.LeftUpperArm);
      rigRotation('LeftLowerArm', riggedPose.LeftLowerArm);

      rigRotation('LeftUpperLeg', riggedPose.LeftUpperLeg);
      rigRotation('LeftLowerLeg', riggedPose.LeftLowerLeg);
      rigRotation('RightUpperLeg', riggedPose.RightUpperLeg);
      rigRotation('RightLowerLeg', riggedPose.RightLowerLeg);
    }

    // Hands
    if (leftHandLandmarks) {
      riggedLeftHand = Kalidokit.Hand.solve(leftHandLandmarks, 'Left');
    }

    if (rightHandLandmarks) {
      riggedRightHand = Kalidokit.Hand.solve(rightHandLandmarks, 'Right');
    }

    // Animate Hands
    if (leftHandLandmarks && riggedLeftHand) {
      rigRotation('LeftHand', {
        // Combine pose rotation Z and hand rotation X Y
        z: riggedPose?.LeftHand?.z || 0,
        y: riggedLeftHand.LeftWrist.y,
        x: riggedLeftHand.LeftWrist.x,
      });
      rigRotation('LeftRingProximal', riggedLeftHand.LeftRingProximal);
      rigRotation('LeftRingIntermediate', riggedLeftHand.LeftRingIntermediate);
      rigRotation('LeftRingDistal', riggedLeftHand.LeftRingDistal);
      rigRotation('LeftIndexProximal', riggedLeftHand.LeftIndexProximal);
      rigRotation('LeftIndexIntermediate', riggedLeftHand.LeftIndexIntermediate);
      rigRotation('LeftIndexDistal', riggedLeftHand.LeftIndexDistal);
      rigRotation('LeftMiddleProximal', riggedLeftHand.LeftMiddleProximal);
      rigRotation('LeftMiddleIntermediate', riggedLeftHand.LeftMiddleIntermediate);
      rigRotation('LeftMiddleDistal', riggedLeftHand.LeftMiddleDistal);
      rigRotation('LeftThumbProximal', riggedLeftHand.LeftThumbProximal);
      rigRotation('LeftThumbIntermediate', riggedLeftHand.LeftThumbIntermediate);
      rigRotation('LeftThumbDistal', riggedLeftHand.LeftThumbDistal);
      rigRotation('LeftLittleProximal', riggedLeftHand.LeftLittleProximal);
      rigRotation('LeftLittleIntermediate', riggedLeftHand.LeftLittleIntermediate);
      rigRotation('LeftLittleDistal', riggedLeftHand.LeftLittleDistal);
    }
    if (rightHandLandmarks && riggedRightHand) {
      rigRotation('RightHand', {
        // Combine Z axis from pose hand and X/Y axis from hand wrist rotation
        z: riggedPose?.RightHand?.z || 0,
        y: riggedRightHand.RightWrist.y,
        x: riggedRightHand.RightWrist.x,
      });
      rigRotation('RightRingProximal', riggedRightHand.RightRingProximal);
      rigRotation('RightRingIntermediate', riggedRightHand.RightRingIntermediate);
      rigRotation('RightRingDistal', riggedRightHand.RightRingDistal);
      rigRotation('RightIndexProximal', riggedRightHand.RightIndexProximal);
      rigRotation('RightIndexIntermediate', riggedRightHand.RightIndexIntermediate);
      rigRotation('RightIndexDistal', riggedRightHand.RightIndexDistal);
      rigRotation('RightMiddleProximal', riggedRightHand.RightMiddleProximal);
      rigRotation('RightMiddleIntermediate', riggedRightHand.RightMiddleIntermediate);
      rigRotation('RightMiddleDistal', riggedRightHand.RightMiddleDistal);
      rigRotation('RightThumbProximal', riggedRightHand.RightThumbProximal);
      rigRotation('RightThumbIntermediate', riggedRightHand.RightThumbIntermediate);
      rigRotation('RightThumbDistal', riggedRightHand.RightThumbDistal);
      rigRotation('RightLittleProximal', riggedRightHand.RightLittleProximal);
      rigRotation('RightLittleIntermediate', riggedRightHand.RightLittleIntermediate);
      rigRotation('RightLittleDistal', riggedRightHand.RightLittleDistal);
    }

    // Update the model's animation
    vrm.update(deltaTime);
  };

  // Animation loop
  const animate = () => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;

    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  };

  function capitalizeFirstLetterToLowerCase(str) {
    if (str.length === 0) {
      return str;
    }
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  // Animate Rotation Helper function
  const rigRotation = (
    name,
    rotation = { x: 0, y: 0, z: 0 },
    dampener = 1,
    lerpAmount = 0.3
  ) => {
    const vrm = vrmRef.current;
    if (vrm) {
      const Part = vrm.humanoid.getNormalizedBoneNode(
        capitalizeFirstLetterToLowerCase(name)
      );
      if (!Part) {
        return;
      }
      let euler = new THREE.Euler(
        (vrm.meta.metaVersion === '1' ? -1 : 1) * rotation.x * dampener,
        rotation.y * dampener,
        (vrm.meta.metaVersion === '1' ? -1 : 1) * rotation.z * dampener,
        rotation.rotationOrder || 'XYZ'
      );
      let quaternion = new THREE.Quaternion().setFromEuler(euler);
      Part.quaternion.slerp(quaternion, lerpAmount); // interpolate
    }
  };

  let oldLookTarget = new THREE.Euler();
  const rigFace = (riggedFace) => {
    const vrm = vrmRef.current;
    if (!vrm) {
      return; // face motion only support VRM Now
    }

    // Blendshapes and Preset Name Schema
    const Blendshape = vrm.expressionManager;
    const PresetName = {
      A: 'aa',
      Angry: 'angry',
      Blink: 'blink',
      BlinkL: 'blinkLeft',
      BlinkR: 'blinkRight',
      E: 'ee',
      Fun: 'happy',
      I: 'ih',
      Joy: 'relaxed',
      Lookdown: 'lookDown',
      Lookleft: 'lookLeft',
      Lookright: 'lookRight',
      Lookup: 'lookUp',
      Neutral: 'neutral',
      O: 'oh',
      Sorrow: 'sad',
      U: 'ou',
      Unknown: 'unknown',
    };

    // Simple example without winking. Interpolate based on old blendshape, then stabilize blink with `Kalidokit` helper function.
    // For VRM, 1 is closed, 0 is open.
    riggedFace.eye.l = lerp(
      clamp(1 - riggedFace.eye.l, 0, 1),
      Blendshape.getValue(PresetName.Blink),
      0.4
    );
    riggedFace.eye.r = lerp(
      clamp(1 - riggedFace.eye.r, 0, 1),
      Blendshape.getValue(PresetName.Blink),
      0.4
    );
    riggedFace.eye.l /= 0.8;
    riggedFace.eye.r /= 0.8;
    Blendshape.setValue(PresetName.BlinkL, riggedFace.eye.l);
    Blendshape.setValue(PresetName.BlinkR, riggedFace.eye.r);

    // Interpolate and set mouth blendshapes
    Blendshape.setValue(
      PresetName.I,
      lerp(riggedFace.mouth.shape.I / 0.8, Blendshape.getValue(PresetName.I), 0.3)
    );
    Blendshape.setValue(
      PresetName.A,
      lerp(riggedFace.mouth.shape.A / 0.8, Blendshape.getValue(PresetName.A), 0.3)
    );
    Blendshape.setValue(
      PresetName.E,
      lerp(riggedFace.mouth.shape.E / 0.8, Blendshape.getValue(PresetName.E), 0.3)
    );
    Blendshape.setValue(
      PresetName.O,
      lerp(riggedFace.mouth.shape.O / 0.8, Blendshape.getValue(PresetName.O), 0.3)
    );
    Blendshape.setValue(
      PresetName.U,
      lerp(riggedFace.mouth.shape.U / 0.8, Blendshape.getValue(PresetName.U), 0.3)
    );

    // Pupils
    // Interpolate pupil and keep a copy of the value
    let lookTarget = new THREE.Euler(
      lerp(oldLookTarget.x, riggedFace.pupil.y, 0.4),
      lerp(oldLookTarget.y, riggedFace.pupil.x, 0.4),
      0,
      'XYZ'
    );
    oldLookTarget.copy(lookTarget);
    vrm.lookAt.applier.applyYawPitch(lookTarget.y, lookTarget.x);
  };

  const rigPosition = (
    name,
    position = { x: 0, y: 0, z: 0 },
    dampener = 1,
    lerpAmount = 0.3
  ) => {
    const vrm = vrmRef.current;
    if (vrm) {
      const Part = vrm.humanoid.getNormalizedBoneNode(
        capitalizeFirstLetterToLowerCase(name)
      );
      if (!Part) {
        return;
      }
      let vector = new THREE.Vector3(
        position.x * dampener,
        position.y * dampener,
        position.z * dampener
      );
      Part.position.lerp(vector, lerpAmount); // interpolate
    }
  };

  return (
    <div>
      {avgVisibility !== null && (
        <p
          style={{
            position: 'absolute',
            top: '500px',
            left: '1000px',
            zIndex: 100,
            color: '#ffffff',
            fontSize: '24px',
            fontWeight: 'bold',
            animation: 'scoreIncrement 0.5s ease-in-out',
          }}
        >
          Average Visibility: {avgVisibility.toFixed(2)}
        </p>
      )}
      {/* Model selection buttons */}
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1 }}>
        <button onClick={() => setSelectedModel('/src/models/shibu_sendagaya.vrm')}>
          Model 1
        </button>
        <button onClick={() => setSelectedModel('/src/models/model2.vrm')}>
          Model 2
        </button>
        {/* Add more buttons for additional models */}
      </div>
      <div ref={rendererContainerRef} style={{ width: '100%', height: '100vh' }}></div>
      <video ref={videoRef} width="400"
  height="200"
  style={{ display: 'none', position: 'absolute', top: 0, left: 0 }}
  playsInline
  autoPlay></video>
      <canvas ref={canvasRef} style={{ display: 'none' }} width="640" height="480"></canvas>
    </div>
  );
};

export default VRMApp;
