import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import axios from 'axios';

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

let scene, camera, renderer, clock, mixer;
let vrm;
let buffer = 0;

function Testing({ isGameStarted }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const clockRef = useRef(null);
  const mixerRef = useRef(null);
  const animationFrameIdRef = useRef(null);

  useEffect(() => {
    if (isGameStarted) {
      console.log('Game started. Initializing Three.js scene.');
      // Initialize Three.js scene
      

      // Define boneMapping and adjustRotationValues here
      const boneMapping = {
        // FBX Bone Name        : VRM Bone Name
        'm_avg_Pelvis': 'J_Bip_C_Hips',
        'm_avg_Spine1': 'J_Bip_C_Spine',
        'm_avg_Spine2': 'J_Bip_C_Chest',
        'm_avg_Spine3': 'J_Bip_C_UpperChest', // If available
        'm_avg_Neck': 'J_Bip_C_Neck',
        'm_avg_Head': 'J_Bip_C_Head',
        // Left Leg
        'm_avg_L_Hip': 'J_Bip_L_UpperLeg',
        'm_avg_L_Knee': 'J_Bip_L_LowerLeg',
        'm_avg_L_Ankle': 'J_Bip_L_Foot',
        'm_avg_L_Foot': 'J_Bip_L_ToeBase',
        // Right Leg
        'm_avg_R_Hip': 'J_Bip_R_UpperLeg',
        'm_avg_R_Knee': 'J_Bip_R_LowerLeg',
        'm_avg_R_Ankle': 'J_Bip_R_Foot',
        'm_avg_R_Foot': 'J_Bip_R_ToeBase',
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
          'J_Bip_R_LowerArm', // Right Elbow
          'J_Bip_L_Shoulder', // Left Shoulder
          'J_Bip_R_Shoulder', // Right shoulder
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

      function init() {
        scene = new THREE.Scene();
        sceneRef.current = scene;

        camera = new THREE.PerspectiveCamera(
          45,
          window.innerWidth / window.innerHeight,
          0.1,
          1000
        );
        camera.position.set(0, 1.6, -3);
        camera.lookAt(new THREE.Vector3(0, 1.6, 0));
        cameraRef.current = camera;

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
        // renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x000000, 0);
        rendererRef.current = renderer;
        mountRef.current.appendChild(renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xcccccc, 0.8);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 1, 0);
        scene.add(directionalLight);

        clock = new THREE.Clock();
        clockRef.current = clock;

        // Load VRM Model
        loadVRMModel();

        

        // Start the animation loop
        animate();
      }

      
            
        const loader = new GLTFLoader();

        loader.register((parser) => {
        return new VRMLoaderPlugin(parser);
        });

        function loadVRMModel() {
        loader.load(
            'models/shibu_sendagaya.vrm',
            (gltf) => {
                console.log('VRM model loaded:', gltf);
                
                // VRMUtils.removeUnnecessaryVertices(gltf.scene);
                // VRMUtils.removeUnnecessaryJoints(gltf.scene);
                vrm = gltf.userData.vrm;

                vrm.scene.position.set(1, .3, 0);
                vrm.scene.scale.set(.7, .7, .7);

                
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
            'models/beethoven.fbx',
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
        mixerRef.current = mixer;

        const vrmTracks = [];
        const euler = new THREE.Euler(0, 0, 0, 'XYZ');
        const quaternion = new THREE.Quaternion();

        console.log('Processing FBX tracks:', fbxAnimation.tracks.length);

        for (let i = 0; i < fbxAnimation.tracks.length; i++) {
          const fbxTrack = fbxAnimation.tracks[i];
          const [fbxBoneName, propertyName] = fbxTrack.name.split('.');

          const vrmBoneName = boneMapping[fbxBoneName];
          if (!vrmBoneName) {
            console.warn(`No mapping for bone: ${fbxBoneName}`);
            continue;
          }

          const vrmBoneNode = vrm.scene.getObjectByName(vrmBoneName);
          if (!vrmBoneNode) {
            console.warn(`Bone not found in VRM model: ${vrmBoneName}`);
            continue;
          }

          let vrmTrack;

          if (propertyName === 'quaternion') {
            const adjustedValues = adjustRotationValues(vrmBoneName, fbxTrack.values);
            vrmTrack = new THREE.QuaternionKeyframeTrack(
              `${vrmBoneNode.name}.quaternion`,
              fbxTrack.times,
              adjustedValues
            );
          } else if (propertyName === 'rotation') {
            // Handle rotation if necessary
          } else if (propertyName === 'position') {
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

        if (vrmTracks.length === 0) {
          console.warn('No VRM tracks were created from FBX animation.');
          return;
        }

        const clip = new THREE.AnimationClip(fbxAnimation.name, fbxAnimation.duration, vrmTracks);
        const action = mixer.clipAction(clip);
        action.play();
        console.log('Animation action started.');
      }

      function getAllBonePositions(vrm) {
        const bones = [
          'hips',
          'spine',
          'chest',
          'neck',
          'head',
          'leftShoulder',
          'leftUpperArm',
          'leftLowerArm',
          'leftHand',
          'rightShoulder',
          'rightUpperArm',
          'rightLowerArm',
          'rightHand',
          'leftUpperLeg',
          'leftLowerLeg',
          'leftFoot',
          'rightUpperLeg',
          'rightLowerLeg',
          'rightFoot',
        ];
      
        const positions = {};
      
        bones.forEach((bone) => {
    
          if (!vrm.humanoid) {
            console.error('vrm.humanoid is undefined');
            return;
          }
    
          // console.log(vrm);
          const boneNode = vrm.humanoid.getBoneNode(bone);
          if (boneNode) {
            const worldPosition = new THREE.Vector3();
            boneNode.getWorldPosition(worldPosition);
      
            positions[bone] = {
              x: worldPosition.x,
              y: worldPosition.y,
              z: worldPosition.z,
            };
          }
        });
        // console.log(positions);
        return positions;
      }
    
    
      function sendAllBonePositions(vrm) {
        const bonePositions = getAllBonePositions(vrm);
      
        axios.post('http://localhost:5001/model_bone_positions', bonePositions)
          .then((response) => {
            console.log('Model bone positions sent.');
          })
          .catch((error) => {
            console.error('Error sending model bone positions:', error);
          });
      }
      
      
      
      
      
      function animate() {
        animationFrameIdRef.current = requestAnimationFrame(animate);

        const delta = clock.getDelta();
        if (mixer) {
          mixer.update(delta);
        }

        
        buffer += 1;
        if (buffer >= 10){
            buffer = 0;
            console.log("sent", vrm);
            sendAllBonePositions(vrm);
        }

        renderer.render(scene, camera);
      }

      // Initialize the scene
      init();

      // Clean up when isGameStarted changes or component unmounts
      return () => {
        console.log('Cleaning up Three.js resources.');
        if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current);
          animationFrameIdRef.current = null;
        }
        if (rendererRef.current) {
          if (mountRef.current && rendererRef.current.domElement) {
            if (mountRef.current.contains(rendererRef.current.domElement)) {
              mountRef.current.removeChild(rendererRef.current.domElement);
            }
          }
          rendererRef.current.dispose();
          rendererRef.current = null;
        }
      };
    } else {
      console.log('Game not started. Skipping Three.js initialization.');
      // Clean up if needed when isGameStarted becomes false
      return () => {
        // Ensure resources are cleaned up when isGameStarted changes
        console.log('Cleaning up Three.js resources.');
        if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current);
          animationFrameIdRef.current = null;
        }
        if (rendererRef.current) {
          if (mountRef.current && rendererRef.current.domElement) {
            if (mountRef.current.contains(rendererRef.current.domElement)) {
              mountRef.current.removeChild(rendererRef.current.domElement);
            }
          }
          rendererRef.current.dispose();
          rendererRef.current = null;
        }
      };
    }
  }, [isGameStarted]); // Add isGameStarted to the dependency array

  // Conditional rendering based on isGameStarted
  if (!isGameStarted) {
    return null; // Do not render anything when the game is not started
  }

  return (
    <div
      ref={mountRef}
      style={{ width: '100vw', height: '100vh', zIndex: '0' }}
    />
  );
}

export default Testing;