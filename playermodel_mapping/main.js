// main.js

// Import the FBXLoader from Three.js examples
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
// import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
// import Stats from "three/addons/libs/stats.module.js";
// import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

let scene, camera, renderer, clock;
let vrm;

// import Helper Functions from Kalidokit
const remap = Kalidokit.Utils.remap;
const clamp = Kalidokit.Utils.clamp;
const lerp = Kalidokit.Vector.lerp;

var hipRotationOffset = 0.0;

var positionOffset = {
  x: 0,
  y: 1,
  z: 0,
};

initThree();

function initThree() {
  scene = new THREE.Scene();
  clock = new THREE.Clock();

  camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.5, 2);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  // Lighting
  const light = new THREE.DirectionalLight(0xffffff);
  light.position.set(0, 1, 1).normalize();
  scene.add(light);

  // Load VRM Model
  const loader = new GLTFLoader();

  loader.register((parser) => {
    return new VRMLoaderPlugin(parser);
  });

  loader.load('models/shibu_sendagaya.vrm', (gltf) => {
    console.log(gltf);
    VRMUtils.removeUnnecessaryVertices(gltf.scene);
    VRMUtils.removeUnnecessaryJoints(gltf.scene);
    // THREE.VRM.from(gltf).then((vrmModel) => {
    //   vrm = vrmModel;
    //   scene.add(vrm.scene);
    // });
    vrm = gltf.userData.vrm;
    scene.add(vrm.scene);
    if (vrm.meta.metaVersion === "0") {
        vrm.scene.rotation.y = Math.PI; // Rotate model 180deg to face camera
    }
  });

  window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Set up MediaPipe Holistic
const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('canvas');
const canvasCtx = canvasElement.getContext('2d');

const holistic = new Holistic({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5/${file}`;
  }
});

holistic.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  enableSegmentation: false,
  smoothSegmentation: false,
  refineFaceLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

holistic.onResults(onResults);

const cameraMP = new Camera(videoElement, {
  onFrame: async () => {
    await holistic.send({ image: videoElement });
  },
  width: 640,
  height: 480
});
cameraMP.start();

function onResults(results) {
  // console.log(results);
  // console.log(vrm);
  if (!vrm) { return; } // Wait until the VRM model is loaded

  // Clear canvas
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(
    results.image, 0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.restore();

  // Process landmarks and update VRM model
  updateVRM(results);
}

function updateVRM(results) {
  if (!vrm) { return; }

  const deltaTime = clock.getDelta();

  // Take the results from `Holistic` and animate character based on its Face, Pose, and Hand Keypoints.
  let riggedPose, riggedLeftHand, riggedRightHand, riggedFace;

  const faceLandmarks = results.faceLandmarks;
  // Pose 3D Landmarks are with respect to Hip distance in meters
  const pose3DLandmarks = results.za;
  // Pose 2D landmarks are with respect to videoWidth and videoHeight
  const pose2DLandmarks = results.poseLandmarks;
  // Be careful, hand landmarks may be reversed
  const leftHandLandmarks = results.rightHandLandmarks;
  const rightHandLandmarks = results.leftHandLandmarks;

  //face 
  if (faceLandmarks) {
    riggedFace = Kalidokit.Face.solve(faceLandmarks, {
        runtime: "mediapipe",
        video: videoElement,
    });
  }

  if (faceLandmarks) {
    rigRotation("Neck", riggedFace.head, 0.7);
    rigFace(riggedFace);
  }

  //body pose
  if (pose2DLandmarks && pose3DLandmarks) {
    riggedPose = Kalidokit.Pose.solve(pose3DLandmarks, pose2DLandmarks, {
        runtime: "mediapipe",
        video: videoElement,
    });
  }

  if (pose2DLandmarks && pose3DLandmarks) {
    rigRotation("Hips", {
        x: riggedPose.Hips.rotation.x ,
        y: riggedPose.Hips.rotation.y ,
        z: riggedPose.Hips.rotation.z + hipRotationOffset,
    }, 0.7);
    rigPosition(
        "Hips",
        {
            x: riggedPose.Hips.position.x + positionOffset.x, // Reverse direction
            y: riggedPose.Hips.position.y + positionOffset.y, // Add a bit of height
            z: -riggedPose.Hips.position.z + positionOffset.z, // Reverse direction
        },
        1,
        0.07
    );

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

  //hands
  if (leftHandLandmarks) {
    riggedLeftHand = Kalidokit.Hand.solve(leftHandLandmarks, "Left");
  }

  if (rightHandLandmarks) {
      riggedRightHand = Kalidokit.Hand.solve(rightHandLandmarks, "Right");
  }

  // Animate Hands
  if (leftHandLandmarks) {
    rigRotation("LeftHand", {
        // Combine pose rotation Z and hand rotation X Y
        z: riggedPose.LeftHand.z,
        y: riggedLeftHand.LeftWrist.y,
        x: riggedLeftHand.LeftWrist.x,
    });
    rigRotation("LeftRingProximal", riggedLeftHand.LeftRingProximal);
    rigRotation(
        "LeftRingIntermediate",
        riggedLeftHand.LeftRingIntermediate
    );
    rigRotation("LeftRingDistal", riggedLeftHand.LeftRingDistal);
    rigRotation("LeftIndexProximal", riggedLeftHand.LeftIndexProximal);
    rigRotation(
        "LeftIndexIntermediate",
        riggedLeftHand.LeftIndexIntermediate
    );
    rigRotation("LeftIndexDistal", riggedLeftHand.LeftIndexDistal);
    rigRotation("LeftMiddleProximal", riggedLeftHand.LeftMiddleProximal);
    rigRotation(
        "LeftMiddleIntermediate",
        riggedLeftHand.LeftMiddleIntermediate
    );
    rigRotation("LeftMiddleDistal", riggedLeftHand.LeftMiddleDistal);
    rigRotation("LeftThumbProximal", riggedLeftHand.LeftThumbProximal);
    rigRotation(
        "LeftThumbIntermediate",
        riggedLeftHand.LeftThumbIntermediate
    );
    rigRotation("LeftThumbDistal", riggedLeftHand.LeftThumbDistal);
    rigRotation("LeftLittleProximal", riggedLeftHand.LeftLittleProximal);
    rigRotation(
        "LeftLittleIntermediate",
        riggedLeftHand.LeftLittleIntermediate
    );
    rigRotation("LeftLittleDistal", riggedLeftHand.LeftLittleDistal);
  }
  if (rightHandLandmarks) {
    // riggedRightHand = Kalidokit.Hand.solve(rightHandLandmarks, "Right");
    rigRotation("RightHand", {
        // Combine Z axis from pose hand and X/Y axis from hand wrist rotation
        z: riggedPose.RightHand.z,
        y: riggedRightHand.RightWrist.y,
        x: riggedRightHand.RightWrist.x,
    });
    rigRotation("RightRingProximal", riggedRightHand.RightRingProximal);
    rigRotation(
        "RightRingIntermediate",
        riggedRightHand.RightRingIntermediate
    );
    rigRotation("RightRingDistal", riggedRightHand.RightRingDistal);
    rigRotation("RightIndexProximal", riggedRightHand.RightIndexProximal);
    rigRotation(
        "RightIndexIntermediate",
        riggedRightHand.RightIndexIntermediate
    );
    rigRotation("RightIndexDistal", riggedRightHand.RightIndexDistal);
    rigRotation("RightMiddleProximal", riggedRightHand.RightMiddleProximal);
    rigRotation(
        "RightMiddleIntermediate",
        riggedRightHand.RightMiddleIntermediate
    );
    rigRotation("RightMiddleDistal", riggedRightHand.RightMiddleDistal);
    rigRotation("RightThumbProximal", riggedRightHand.RightThumbProximal);
    rigRotation(
        "RightThumbIntermediate",
        riggedRightHand.RightThumbIntermediate
    );
    rigRotation("RightThumbDistal", riggedRightHand.RightThumbDistal);
    rigRotation("RightLittleProximal", riggedRightHand.RightLittleProximal);
    rigRotation(
        "RightLittleIntermediate",
        riggedRightHand.RightLittleIntermediate
    );
    rigRotation("RightLittleDistal", riggedRightHand.RightLittleDistal);
  }



  // Update the model's animation
  vrm.update(deltaTime);
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

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
  if (vrm) {
      const Part = vrm.humanoid.getNormalizedBoneNode(
          capitalizeFirstLetterToLowerCase(name)
      );
      if (!Part) {
          return;
      }
      let euler = new THREE.Euler(
          (vrm.meta.metaVersion === "1" ? -1 : 1) * rotation.x * dampener,
          rotation.y * dampener,
          (vrm.meta.metaVersion === "1" ? -1 : 1) *
              rotation.z *
              dampener,
          rotation.rotationOrder || "XYZ"
      );
      let quaternion = new THREE.Quaternion().setFromEuler(euler);
      Part.quaternion.slerp(quaternion, lerpAmount); // interpolate
  } 
};

let oldLookTarget = new THREE.Euler();
const rigFace = (riggedFace) => {
  if (!vrm) {
      return; // face motion only support VRM Now
  }

  // Blendshapes and Preset Name Schema
  const Blendshape = vrm.expressionManager;
  const PresetName = {
      A: "aa",
      Angry: "angry",
      Blink: "blink",
      BlinkL: "blinkLeft",
      BlinkR: "blinkRight",
      E: "ee",
      Fun: "happy",
      I: "ih",
      Joy: "relaxed",
      Lookdown: "lookDown",
      Lookleft: "lookLeft",
      Lookright: "lookRight",
      Lookup: "lookUp",
      Neutral: "neutral",
      O: "oh",
      Sorrow: "sad",
      U: "ou",
      Unknown: "unknown",
  };

  // Simple example without winking. Interpolate based on old blendshape, then stabilize blink with `Kalidokit` helper function.
  // for VRM, 1 is closed, 0 is open.
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
  // riggedFace.eye.l = Kalidokit.Face.stabilizeBlink(
  //     {l:riggedFace.eye.l,r:riggedFace.eye.l},
  //     riggedFace.head.y
  // ).l;
  // riggedFace.eye.r = Kalidokit.Face.stabilizeBlink(
  //     {l:riggedFace.eye.r,r:riggedFace.eye.r},
  //     riggedFace.head.y
  // ).r;
  riggedFace.eye.l /= 0.8;
  riggedFace.eye.r /= 0.8;
  Blendshape.setValue(PresetName.BlinkL, riggedFace.eye.l);
  Blendshape.setValue(PresetName.BlinkR, riggedFace.eye.r);

  // Interpolate and set mouth blendshapes
  Blendshape.setValue(
      PresetName.I,
      lerp(
          riggedFace.mouth.shape.I / 0.8,
          Blendshape.getValue(PresetName.I),
          0.3
      )
  );
  Blendshape.setValue(
      PresetName.A,
      lerp(
          riggedFace.mouth.shape.A / 0.8,
          Blendshape.getValue(PresetName.A),
          0.3
      )
  );
  Blendshape.setValue(
      PresetName.E,
      lerp(
          riggedFace.mouth.shape.E / 0.8,
          Blendshape.getValue(PresetName.E),
          0.3
      )
  );
  Blendshape.setValue(
      PresetName.O,
      lerp(
          riggedFace.mouth.shape.O / 0.8,
          Blendshape.getValue(PresetName.O),
          0.3
      )
  );
  Blendshape.setValue(
      PresetName.U,
      lerp(
          riggedFace.mouth.shape.U / 0.8,
          Blendshape.getValue(PresetName.U),
          0.3
      )
  );

  //PUPILS
  //interpolate pupil and keep a copy of the value
  let lookTarget = new THREE.Euler(
      lerp(oldLookTarget.x, riggedFace.pupil.y, 0.4),
      lerp(oldLookTarget.y, riggedFace.pupil.x, 0.4),
      0,
      "XYZ"
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
