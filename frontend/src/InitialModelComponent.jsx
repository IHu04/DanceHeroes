import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import * as Kalidokit from 'kalidokit';
import { Holistic } from '@mediapipe/holistic';
import { Camera } from '@mediapipe/camera_utils';
import axios from 'axios';
import { getBonePositions } from "./pose.js";
import "./App.css"


const InitialModelComponent = ({ isGameStarted, sessionId, getTargetPose, updateScore }) => {

  // Refs for mutable variables and DOM elements
  const rendererContainerRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const gameRef = useRef({ isGameStarted, sessionId, getTargetPose, updateScore });
  gameRef.current = { isGameStarted, sessionId, getTargetPose, updateScore };
  const frameRef = useRef(null);
  const aliveRef = useRef(true);
  const lastScoreRef = useRef(0);
  const pendingScoreRef = useRef(false);
  const [message, setMessage] = useState('');

  // Three.js variables
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const clockRef = useRef(null);
  const vrmRef = useRef(null);

  const [totalPoints, setTotalPoints] = useState(0);
  const [isModelLoaded, setIsModelLoaded] = useState(false);



  // State for selected model
  const selectedModel = '/models/shibu_sendagaya.vrm';

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
    aliveRef.current = true;
    initThree();

    // Cleanup function
    return () => {
      aliveRef.current = false;
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', onWindowResize);
      if (vrmRef.current) VRMUtils.deepDispose(vrmRef.current.scene);
      rendererRef.current?.domElement.remove();
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
      rendererContainerRef.current.clientWidth / rendererContainerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1.2, 3.2);
    camera.lookAt(0, 1, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    //renderer.setSize(rendererContainerRef.current.clientWidth, rendererContainerRef.current.clientHeight);
    renderer.setSize(rendererContainerRef.current.clientWidth, rendererContainerRef.current.clientHeight);
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



  }
  // Set up MediaPipe Holistic
  const initMediaPipe = () => {
    const videoElement = videoRef.current;
    const holistic = new Holistic({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1675471629/${file}`;
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
    let active = true;
    cameraMP.start().then(() => {
      if (!active) { cameraMP.stop(); videoElement.srcObject?.getTracks().forEach(track => track.stop()); videoElement.srcObject = null; }
    }).catch(() => { if (active) setMessage('Camera unavailable. Allow camera access, or connect a webcam and restart the game.'); });
    return () => {
      active = false;
      cameraMP.stop();
      const stream = videoElement.srcObject;
      stream?.getTracks().forEach(track => track.stop());
      videoElement.srcObject = null;
      holistic.close();
    };
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
        if (!aliveRef.current) { VRMUtils.deepDispose(gltf.scene); return; }
        const vrm = gltf.userData.vrm;
        vrmRef.current = vrm;

        // Adjust position and scale
        vrm.scene.position.set(0, 0, 0);
        vrm.scene.scale.set(1, 1, 1);

        if (vrm.meta.metaVersion === '0') {
          vrm.scene.rotation.y = Math.PI;
        }

        sceneRef.current.add(vrm.scene);
        setIsModelLoaded(true);
      },
      undefined,
      (error) => {
        console.error('Unable to load the avatar:', error);
        if (aliveRef.current) setMessage('Unable to load the avatar. Refresh the page and try again.');
      }
    );
  };

  const onWindowResize = () => {
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    if (camera && renderer) {
      camera.aspect = rendererContainerRef.current.clientWidth / rendererContainerRef.current.clientHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(rendererContainerRef.current.clientWidth, rendererContainerRef.current.clientHeight);
    }
  };

  const onResults = async(results) => {
    const vrm = vrmRef.current;
    if (!aliveRef.current || !vrm) {
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
    if (!aliveRef.current) return;
    updateVRM(results);
    const game = gameRef.current;
    const target = game.getTargetPose?.();
    if (results.poseLandmarks && game.isGameStarted && target && !pendingScoreRef.current && performance.now() - lastScoreRef.current >= 250) {
      lastScoreRef.current = performance.now();
      pendingScoreRef.current = true;
      try {
        const { data } = await axios.post(`/api/sessions/${game.sessionId}/score`, {
          user: getBonePositions(vrm), model: target,
        });
        if (aliveRef.current) { setTotalPoints(data.total_points); game.updateScore(data.total_points); }
      } catch {
        if (aliveRef.current) setMessage('Scoring is unavailable. Check the backend and start a new game.');
      } finally { pendingScoreRef.current = false; }
    }

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

    frameRef.current = requestAnimationFrame(animate);
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
  useEffect(() => {
    if (isGameStarted && isModelLoaded) {
      return initMediaPipe();
    }
  }, [isGameStarted, isModelLoaded]);
  return (

    <div>

      <p aria-live="polite">Score: {totalPoints}</p>
      {message && <p role="alert">{message}</p>}
      {/* Model selection buttons */}
      <div ref={rendererContainerRef} style={{ width: '100%', height: '55vh' }}></div>
      <video ref={videoRef} width="400"
  height="200"
  style={{ display: 'none', position: 'absolute', visibility: 'hidden', top: 150, left: 150 }}
  playsInline
  autoPlay></video>
      <canvas ref={canvasRef} style={{ display: 'none', visibility: 'hidden'}} width="640" height="480"></canvas>
    </div>
  );
};

export default InitialModelComponent;
