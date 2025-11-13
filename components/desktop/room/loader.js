"use client";

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export function loadModelAndLights(scene, lightPos, onReady) {
  const gltfLoader = new GLTFLoader();
  const refs = {
    model: null,
    spot: null,
    spotHelper: null,
    spotTarget: null,
    point: null,
    pin: null,
  };

  gltfLoader.load(
    "/3d/mainroom.glb",
    (gltf) => {
      const modelRoot = gltf.scene || (gltf.scenes && gltf.scenes[0]);
      if (!modelRoot) return;
      scene.add(modelRoot);
      refs.model = modelRoot;
      // Center model to origin for consistent camera height/target
      const box = new THREE.Box3().setFromObject(modelRoot);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      modelRoot.position.x += -center.x;
      modelRoot.position.y += -center.y;
      modelRoot.position.z += -center.z;
      modelRoot.traverse((obj) => {
        const mesh = obj;
        if (mesh && mesh.isMesh) {
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          const material = mesh.material;
          if (Array.isArray(material)) {
            material.forEach((m) => {
              if (m && "envMapIntensity" in m) m.envMapIntensity = 0.05;
              // Swap high-metalness materials to a bright steel look
              if (m && "metalness" in m && (m.metalness ?? 0) > 0.5) {
                const newMat = new THREE.MeshStandardMaterial({
                  color: new THREE.Color(0xe6eef5), // cool bright steel
                  metalness: 0.9,
                  roughness: 0.2,
                  envMapIntensity: 0.2,
                });
                m.dispose && m.dispose();
                const idx = material.indexOf(m);
                if (idx >= 0) material[idx] = newMat;
              }
            });
          } else if (material && "envMapIntensity" in material) {
            material.envMapIntensity = 0.2;
            if ("metalness" in material && (material.metalness ?? 0) > 0.5) {
              const newMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(0xe6eef5),
                metalness: 0.9,
                roughness: 0.2,
                envMapIntensity: 0.2,
              });
              material.dispose && material.dispose();
              mesh.material = newMat;
            }
          }
        }
      });

      // Spotlight
      const spot = new THREE.SpotLight(new THREE.Color("#eaf2ff"), 850, 100, 0.35, 0.25, 1.0);
      spot.position.set(lightPos.x, lightPos.y, lightPos.z);
      spot.castShadow = true;
      spot.shadow.mapSize.set(2048, 2048);
      spot.shadow.bias = -0.0015;
      spot.shadow.normalBias = 0.02;
      spot.shadow.camera.near = 0.5;
      spot.shadow.camera.far = 100;
      const target = new THREE.Object3D();
      target.position.set(0, 1, 0.7);
      scene.add(target);
      spot.target = target;
      scene.add(spot);
      const helper = new THREE.SpotLightHelper(spot);
      helper.visible = false;
      scene.add(helper);
      refs.spot = spot;
      refs.spotTarget = target;
      refs.spotHelper = helper;

      // Soft point inside (dimmer)
      const point = new THREE.PointLight(0xeaf2ff, 0.1, 3, 2);
      point.position.set(0.2, 1.2, -0.3);
      point.castShadow = false;
      scene.add(point);
      refs.point = point;

      // Weak point light inside the space (wider spread, no shadows)
      const pin = new THREE.PointLight(0xeaf2ff, 20, 16, 1.6);
      pin.position.set(0.5, 1.9, -1.0);
      pin.castShadow = false;
      scene.add(pin);
      refs.pin = pin;

      onReady && onReady(refs);
    },
    undefined,
    (error) => {
      console.error("Failed to load /3d/mainroom.glb", error);
    }
  );

  return refs;
}


