import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const GLTFViewer = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    let mixer;
    const clock = new THREE.Clock();

    if (!mountRef.current) {
      console.error('mountRef.current is null');
      return;
    }

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
    camera.position.set(0, 150, 300);
    camera.lookAt(0, 0, 0); // Ensure camera is looking at the origin

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 100, 0);
    controls.update();

    

    // Load Model
    const loader = new GLTFLoader();
    loader.load(
      '/src/models/test.glb',
      (gltf) => {
        console.log('Model loaded:', gltf);
        const model = gltf.scene;

        // Adjust scale and position
        model.scale.set(100, 100, 100);
        model.position.set(-10, -10, 0);

        // Override materials for testing
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.material = new THREE.MeshNormalMaterial(); // For visibility
            child.material.vertexColors = false;
          }
        });


        scene.add(model);

        mixer = new THREE.AnimationMixer(model);
        if (gltf.animations && gltf.animations.length > 0) {
          const action = mixer.clipAction(gltf.animations[0]);
          action.play();
        } else {
          console.warn('No animations found in the glTF file.');
        }
      },
      (xhr) => {
        console.log(
          `Model ${(xhr.loaded / xhr.total * 100).toFixed(2)}% loaded.`
        );
      },
      (error) => {
        console.error('An error occurred while loading the glTF model:', error);
      }
    );
    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      const delta = clock.getDelta();

      if (mixer) mixer.update(delta);

      renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      if (mountRef.current) {
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;

        renderer.setSize(width, height);

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup on component unmount
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} style={{ width: '100%', height: '100vh' }} />;
};

export default GLTFViewer;
