import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { getBonePositions } from './pose.js';

const boneMapping = {
  m_avg_Pelvis: 'hips', m_avg_Spine1: 'spine', m_avg_Spine2: 'chest',
  m_avg_Spine3: 'upperChest', m_avg_Neck: 'neck', m_avg_Head: 'head',
  m_avg_L_Hip: 'leftUpperLeg', m_avg_L_Knee: 'leftLowerLeg',
  m_avg_L_Ankle: 'leftFoot', m_avg_L_Foot: 'leftToes',
  m_avg_R_Hip: 'rightUpperLeg', m_avg_R_Knee: 'rightLowerLeg',
  m_avg_R_Ankle: 'rightFoot', m_avg_R_Foot: 'rightToes',
  m_avg_L_Collar: 'leftShoulder', m_avg_L_Shoulder: 'leftUpperArm',
  m_avg_L_Elbow: 'leftLowerArm', m_avg_L_Wrist: 'leftHand',
  m_avg_R_Collar: 'rightShoulder', m_avg_R_Shoulder: 'rightUpperArm',
  m_avg_R_Elbow: 'rightLowerArm', m_avg_R_Wrist: 'rightHand',
};

export default function DanceModel({ isGameStarted, animationUrl, onPose, onReady, onError }) {
  const mountRef = useRef(null);
  const propsRef = useRef({ isGameStarted, onPose, onReady, onError });
  propsRef.current = { isGameStarted, onPose, onReady, onError };
  useEffect(() => {
    const mount = mountRef.current;
    let disposed = false, frame, vrm, mixer;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, .1, 100);
    camera.position.set(0, 1.2, 3.2);
    camera.lookAt(0, 1, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x443355, 3));
    const clock = new THREE.Clock();
    const resize = () => {
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();
    const loader = new GLTFLoader();
    loader.register(parser => new VRMLoaderPlugin(parser));
    loader.load('/models/shibu_sendagaya.vrm', gltf => {
      if (disposed) { VRMUtils.deepDispose(gltf.scene); return; }
      vrm = gltf.userData.vrm;
      if (vrm.meta.metaVersion === '0') vrm.scene.rotation.y = Math.PI;
      scene.add(vrm.scene);
      new FBXLoader().load(animationUrl, fbx => {
        if (disposed) return;
        const animation = fbx.animations[0];
        if (!animation) { propsRef.current.onError('The dance file contains no animation.'); return; }
        const tracks = [];
        for (const track of animation.tracks) {
          const [source, property] = track.name.split('.');
          const bone = vrm.humanoid.getRawBoneNode(boneMapping[source]);
          if (!bone || property !== 'quaternion') continue;
          tracks.push(new THREE.QuaternionKeyframeTrack(`${bone.name}.quaternion`, track.times, track.values));
        }
        if (!tracks.length) { propsRef.current.onError('The dance skeleton is incompatible with the avatar.'); return; }
        mixer = new THREE.AnimationMixer(vrm.scene);
        mixer.clipAction(new THREE.AnimationClip(animation.name, animation.duration, tracks)).play();
        propsRef.current.onReady();
      }, undefined, () => propsRef.current.onError('Unable to load the dance animation.'));
    }, undefined, () => propsRef.current.onError('Unable to load the dancer model.'));
    function animate() {
      frame = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      if (vrm && mixer && propsRef.current.isGameStarted) {
        mixer.update(delta);
        vrm.scene.updateMatrixWorld(true);
        propsRef.current.onPose(getBonePositions(vrm));
      }
      renderer.render(scene, camera);
    }
    animate();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      mixer?.stopAllAction();
      if (vrm) VRMUtils.deepDispose(vrm.scene);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [animationUrl]);
  return <div ref={mountRef} style={{ width: '100%', height: '65vh' }} />;
}
