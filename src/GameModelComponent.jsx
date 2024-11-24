// GameModelComponent.jsx

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

const GameModelComponent = ({ isGameStarted }) => {
  const rendererContainerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const clockRef = useRef(null);
  const mixerRef = useRef(null);
  const vrmRef = useRef(null);

  useEffect(() => {
    if (isGameStarted) {
      console.log('Initializing Three.js in GameModelComponent');
      initThree();
    } else {
      console.log('GameModelComponent is not initialized because isGameStarted is false');
    }

    // Cleanup on unmount or when game ends
    return () => {
      window.removeEventListener('resize', onWindowResize);
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (vrmRef.current) {
        VRMUtils.deepDispose(vrmRef.current.scene);
        vrmRef.current = null;
      }
    };
  }, [isGameStarted]);

  const initThree = () => {
    console.log('initThree called');

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const clock = new THREE.Clock();
    clockRef.current = clock;

    const container = rendererContainerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1.5, 2);
    camera.lookAt(new THREE.Vector3(0, 1.5, 0));
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0, 1, 1);
    scene.add(directionalLight);

    // Helpers
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);

    window.addEventListener('resize', onWindowResize);

    // Load VRM Model
    loadVRMModel();

    // Start the animation loop
    animate();
  };

  const onWindowResize = () => {
    const container = rendererContainerRef.current;
    if (!container) return;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    if (camera && renderer) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
    }
  };

  // Define boneMapping here
  const boneMapping = {
    // FBX Bone Name        : VRM Bone Name
    'm_avg_Pelvis': 'J_Bip_C_Hips',
    'm_avg_Spine1': 'J_Bip_C_Spine',
    'm_avg_Spine2': 'J_Bip_C_Chest',
    'm_avg_Spine3': 'J_Bip_C_UpperChest', // If available
    'm_avg_Neck': 'J_Bip_C_Neck',
    'm_avg_Head': 'J_Bip_C_Head',
    // Left Leg
    'm_avg_L_Hip': 'J_Bip_R_UpperLeg',
    'm_avg_L_Knee': 'J_Bip_R_LowerLeg',
    'm_avg_L_Ankle': 'J_Bip_R_Foot',
    'm_avg_L_Foot': 'J_Bip_R_ToeBase',
    // Right Leg
    'm_avg_R_Hip': 'J_Bip_L_UpperLeg',
    'm_avg_R_Knee': 'J_Bip_L_LowerLeg',
    'm_avg_R_Ankle': 'J_Bip_L_Foot',
    'm_avg_R_Foot': 'J_Bip_L_ToeBase',
    // Left Arm
    'm_avg_L_Collar': 'J_Bip_L_Shoulder',
    'm_avg_L_Shoulder': 'J_Bip_L_UpperArm',
    'm_avg_L_Elbow': 'J_Bip_L_LowerArm',
    'm_avg_L_Wrist': 'J_Bip_L_Hand',
    // Right Arm
    'm_avg_R_Collar': 'J_Bip_R_Shoulder',
    'm_avg_R_Shoulder': 'J_Bip_R_UpperArm',
    'm_avg_R_Elbow': 'J_Bip_R_LowerArm',
    'm_avg_R_Wrist': 'J_Bip_R_Hand',
  };

  function adjustRotationValues(boneName, values) {
    const adjustedValues = values.slice(); // Clone the array

    // Bones that need rotation inversion
    const invertBones = [
      'J_Bip_L_LowerLeg', // Left Knee
      'J_Bip_R_LowerLeg', // Right Knee
      'J_Bip_L_LowerArm', // Left Elbow
      'J_Bip_R_LowerArm',  // Right Elbow
      'J_Bip_L_Shoulder', // Left Shoulder
      'J_Bip_R_Shoulder',  // Right shoulder
      'J_Bip_C_Neck', // Neck
      'J_Bip_C_Head', // Head
      'J_Bip_L_UpperLeg', // Left upper leg
      'J_Bip_R_UpperLeg', // Right upper leg
    ];

    if (invertBones.includes(boneName)) {
      for (let i = 0; i < values.length; i += 4) {
        // Invert the necessary axis (e.g., X-axis)
        adjustedValues[i] = -adjustedValues[i]; // Invert X component
        // If other axes need inversion, adjust accordingly
      }
    }

    return adjustedValues;
  }

  const loadVRMModel = () => {
    console.log('loadVRMModel called');
    const loader = new GLTFLoader();

    loader.register((parser) => {
      return new VRMLoaderPlugin(parser);
    });

    loader.load(
      '/models/shibu_sendagaya.vrm',
      (gltf) => {
        const vrm = gltf.userData.vrm;
        console.log('VRM model loaded:', vrm);
        vrmRef.current = vrm;

        vrm.scene.position.set(0, -1, 0);
        vrm.scene.scale.set(1, 1, 1);
        sceneRef.current.add(vrm.scene);

        loadFBXAnimation(vrm);
      },
      (progress) => {
        console.log(`VRM model loading progress: ${(progress.loaded / progress.total) * 100}%`);
      },
      (error) => {
        console.error('An error occurred while loading the VRM model:', error);
      }
    );
  };

  const loadFBXAnimation = (vrm) => {
    console.log('loadFBXAnimation called');
    const loader = new FBXLoader();
    loader.load(
      '/models/test_ascii.fbx',
      (fbx) => {
        console.log('FBX animation loaded:', fbx);
        const animation = fbx.animations[0];
        applyAnimation(vrm, animation);
      },
      (progress) => {
        console.log(`FBX animation loading progress: ${(progress.loaded / progress.total) * 100}%`);
      },
      (error) => {
        console.error('An error occurred while loading the FBX animation:', error);
      }
    );
  };

  const applyAnimation = (vrm, fbxAnimation) => {
    const mixer = new THREE.AnimationMixer(vrm.scene);
    mixerRef.current = mixer;

    const vrmTracks = [];
    const euler = new THREE.Euler(0, 0, 0, 'XYZ'); // Adjust rotation order if necessary
    const quaternion = new THREE.Quaternion();

    for (let i = 0; i < fbxAnimation.tracks.length; i++) {
      const fbxTrack = fbxAnimation.tracks[i];
      const [fbxBoneName, propertyName] = fbxTrack.name.split('.');

      const vrmBoneName = boneMapping[fbxBoneName];
      if (!vrmBoneName) continue;

      const vrmBoneNode = vrm.scene.getObjectByName(vrmBoneName);
      if (!vrmBoneNode) continue;

      let vrmTrack;

      if (propertyName === 'quaternion') {
        // Invert rotations for specific bones
        const adjustedValues = adjustRotationValues(
          vrmBoneName,
          fbxTrack.values
        );

        vrmTrack = new THREE.QuaternionKeyframeTrack(
          `${vrmBoneNode.name}.quaternion`,
          fbxTrack.times,
          adjustedValues
        );
      } else if (propertyName === 'rotation') {
        const quaternionValues = [];

        for (let j = 0; j < fbxTrack.values.length; j += 3) {
          euler.set(
            fbxTrack.values[j],
            fbxTrack.values[j + 1],
            fbxTrack.values[j + 2]
          );

          // Convert Euler to Quaternion
          quaternion.setFromEuler(euler);

          // Adjust rotations if needed
          // adjustQuaternion(vrmBoneName, quaternion); // Implement if necessary

          quaternionValues.push(
            quaternion.x,
            quaternion.y,
            quaternion.z,
            quaternion.w
          );
        }

        vrmTrack = new THREE.QuaternionKeyframeTrack(
          `${vrmBoneNode.name}.quaternion`,
          fbxTrack.times,
          quaternionValues
        );
      } else if (propertyName === 'position') {
        // Adjust positions if necessary
        vrmTrack = new THREE.VectorKeyframeTrack(
          `${vrmBoneNode.name}.position`,
          fbxTrack.times,
          fbxTrack.values
        );
      } else {
        continue; // Skip unsupported properties
      }

      vrmTracks.push(vrmTrack);
    }

    const clip = new THREE.AnimationClip(
      fbxAnimation.name,
      fbxAnimation.duration,
      vrmTracks
    );
    const action = mixer.clipAction(clip);
    action.play();
  };

  const animate = () => {
    requestAnimationFrame(animate);
    // console.log('animate called');

    const delta = clockRef.current.getDelta();
    if (mixerRef.current) mixerRef.current.update(delta);

    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  };

  // Remove the condition for testing
  // if (!isGameStarted) {
  //   return null; // Don't render anything if the game hasn't started
  // }

  return (
    <div
      ref={rendererContainerRef}
      style={{ width: '100%', height: '100%', position: 'relative' }}
    ></div>
  );
};

export default GameModelComponent;