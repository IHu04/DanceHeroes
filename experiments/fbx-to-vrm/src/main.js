// src/main.js

import * as THREE from 'three';

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { VRMLoaderPlugin, VRM, VRMUtils } from '@pixiv/three-vrm';


let scene, camera, renderer, clock, mixer;

const boneMapping = {
  // FBX Bone Name        : VRM Bone Name
  'm_avg_Pelvis': 'J_Bip_C_Hips',
  'm_avg_Spine1': 'J_Bip_C_Spine',
  'm_avg_Spine2': 'J_Bip_C_Chest',
  'm_avg_Spine3': 'J_Bip_C_UpperChest', // If available
  'm_avg_Neck': 'J_Bip_C_Neck',
  'm_avg_Head': 'J_Bip_C_Head',
  // // Left Leg
  // 'm_avg_L_Hip': 'J_Bip_L_UpperLeg',
  // 'm_avg_L_Knee': 'J_Bip_L_LowerLeg',
  // 'm_avg_L_Ankle': 'J_Bip_L_Foot',
  // 'm_avg_L_Foot': 'J_Bip_L_ToeBase',
  // // Right Leg
  // 'm_avg_R_Hip': 'J_Bip_R_UpperLeg',
  // 'm_avg_R_Knee': 'J_Bip_R_LowerLeg',
  // 'm_avg_R_Ankle': 'J_Bip_R_Foot',
  // 'm_avg_R_Foot': 'J_Bip_R_ToeBase',

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
  // End bones (optional to map or ignore)
  // 'm_avg_L_Foot_end': '',
  // 'm_avg_R_Foot_end': '',
  // 'm_avg_Head_end': '',
  // 'm_avg_L_Hand_end': '',
  // 'm_avg_R_Hand_end': '',
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
    'J_Bip_L_UpperLeg', // left upper leg
    'J_Bip_R_UpperLeg', // right upper leg
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


function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    45, window.innerWidth / window.innerHeight, 0.1, 1000
  );

  // Adjust the camera to face the front of the character
  camera.position.set(0, 1.6, -3);
  camera.lookAt(new THREE.Vector3(0, 1.6, 0));

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xcccccc, 0.8);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(0, 1, 0);
  scene.add(directionalLight);

  clock = new THREE.Clock();

  // Load VRM Model
  loadVRMModel();
}

const loader = new GLTFLoader();

loader.register((parser) => {
  return new VRMLoaderPlugin(parser);
});

function loadVRMModel() {
  loader.load(
    'models/shibu_sendagaya.vrm',
    (vrm) => {
      console.log('VRM model loaded:', vrm);
      scene.add(vrm.scene);
      loadFBXAnimation(vrm);
    },
    undefined,
    (error) => {
      console.error('An error occurred while loading the VRM model:', error);
    }
  );
}
function loadFBXAnimation(vrm) {
  const loader = new FBXLoader();
  loader.load(
    'test_ascii.fbx',
    (fbx) => {
      const animation = fbx.animations[0];
      applyAnimation(vrm, animation);
    },
    undefined,
    (error) => {
      console.error('An error occurred while loading the FBX animation:', error);
    }
  );
}

function applyAnimation(vrm, fbxAnimation) {
  mixer = new THREE.AnimationMixer(vrm.scene);

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
      // Invert rotations for knees and elbows
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

        // Adjust rotations for knees and elbows
        adjustQuaternion(vrmBoneName, quaternion);

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

  const clip = new THREE.AnimationClip(fbxAnimation.name, fbxAnimation.duration, vrmTracks);
  const action = mixer.clipAction(clip);
  action.play();

  animate();
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);

  renderer.render(scene, camera);
}

init();
