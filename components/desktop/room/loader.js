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
    screen: null,
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
      // Debug helper: print a compact model tree to the console
      try {
        const maxDepth = 5;
        const lines = [];
        const walk = (obj, depth = 0) => {
          if (depth > maxDepth || !obj) return;
          const indent = "  ".repeat(depth);
          const name = (obj.name || "(unnamed)").toString();
          const type = obj.type || "Object3D";
          const geo = obj.geometry && obj.geometry.type ? ` · geo:${obj.geometry.type}` : "";
          const mat = obj.material && (obj.material.name || obj.material.type) ? ` · mat:${(Array.isArray(obj.material) ? "Array" : (obj.material.name || obj.material.type))}` : "";
          lines.push(`${indent}- ${name} [${type}]${geo}${mat}`);
          if (obj.children && obj.children.length) obj.children.forEach((c) => walk(c, depth + 1));
        };
        walk(modelRoot, 0);
        // @ts-ignore
        window.__MODEL_TREE__ = lines.join("\n");
        // eslint-disable-next-line no-console
        console.log("%cModel Tree (window.__MODEL_TREE__)", "color:#7bd; font-weight:700");
        // eslint-disable-next-line no-console
        console.log(lines.join("\n"));
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("Failed to print model tree", e);
      }

      // helper to create brighter, light steel material while preserving important maps
      const makeSteelMaterial = (old) => {
        const steel = new THREE.MeshStandardMaterial({
          // brighter cool-white steel tint
          color: new THREE.Color(0xf7fbff),
          metalness: 1.0,
          roughness: 0.12,
          // stronger reflections for a brighter look
          envMapIntensity: 0.35,
        });
        // preserve supported maps where possible to keep surface detail
        if (old && old.normalMap) steel.normalMap = old.normalMap, steel.normalScale = old.normalScale?.clone?.() || steel.normalScale;
        if (old && old.aoMap) steel.aoMap = old.aoMap;
        if (old && old.roughnessMap) steel.roughnessMap = old.roughnessMap;
        if (old && old.metalnessMap) steel.metalnessMap = old.metalnessMap;
        if (old && old.envMap) steel.envMap = old.envMap;
        return steel;
      };

      modelRoot.traverse((obj) => {
        const mesh = obj;
        if (mesh && mesh.isMesh) {
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          const lname = (mesh.name || "").toLowerCase();
          if (!refs.screen && /(screen|monitor|display|lcd|panel|screen_?\d+|monitor_?\d+|body\d+)/.test(lname)) {
            refs.screen = mesh;
            // eslint-disable-next-line no-console
            console.log("Screen candidate (by name):", mesh.name);
          }
          const material = mesh.material;
          if (Array.isArray(material)) {
            material.forEach((m) => {
              if (!m) return;
              if ("envMapIntensity" in m) m.envMapIntensity = 0.05;
              // Consider any PBR material with metalness property or metalnessMap as metallic
              const isMetal =
                ("metalness" in m && (m.metalness ?? 0) > 0.1) || !!m.metalnessMap;
              if (isMetal) {
                const newMat = makeSteelMaterial(m);
                // Try to preserve name for debugging/material grouping
                if (m.name) newMat.name = `${m.name}_steel`;
                m.dispose && m.dispose();
                const idx = material.indexOf(m);
                if (idx >= 0) material[idx] = newMat;
              }
            });
          } else if (material) {
            if ("envMapIntensity" in material) material.envMapIntensity = 0.2;
            const isMetal =
              ("metalness" in material && (material.metalness ?? 0) > 0.1) ||
              !!material.metalnessMap;
            if (isMetal) {
              const newMat = makeSteelMaterial(material);
              if (material.name) newMat.name = `${material.name}_steel`;
              material.dispose && material.dispose();
              mesh.material = newMat;
            }
          }
        }
      });

      // Fallback: try to pick a thin, wide rectangle around desk height as screen
      if (!refs.screen) {
        const candidates = [];
        modelRoot.traverse((obj) => {
          const mesh = obj;
          if (!(mesh && mesh.isMesh && mesh.geometry)) return;
          const bb = new THREE.Box3().setFromObject(mesh);
          const size = new THREE.Vector3();
          const center = new THREE.Vector3();
          bb.getSize(size);
          bb.getCenter(center);
          const w = size.x, h = size.y, d = size.z;
          if (!isFinite(w) || !isFinite(h) || !isFinite(d)) return;
          const ratio = w > h ? w / (h || 1e-6) : h / (w || 1e-6);
          const area = w * h;
          // screen-like: thin depth, reasonable aspect ratio, near typical monitor height
          if (d < 0.1 && ratio > 1.2 && ratio < 2.6 && center.y > 0.3 && center.y < 1.5) {
            candidates.push({ mesh, score: area });
          }
        });
        if (candidates.length) {
          candidates.sort((a, b) => b.score - a.score);
          refs.screen = candidates[0].mesh;
          // eslint-disable-next-line no-console
          console.log("Screen fallback detected:", refs.screen?.name);
        }
      }

      // Spotlight: key light; keep strong but rely less on global exposure
      const spot = new THREE.SpotLight(new THREE.Color("#eaf2ff"), 750, 80, 0.35, 0.25, 1.0);
      spot.position.set(lightPos.x, lightPos.y, lightPos.z);
      spot.castShadow = true;
      spot.shadow.mapSize.set(2048, 2048);
      // Tweak shadow acne/peter-panning balance for crisper edges
      spot.shadow.bias = -0.0005;
      spot.shadow.normalBias = 0.05;
      spot.shadow.camera.near = 0.5;
      spot.shadow.camera.far = 80;
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

      // Soft point inside (very dim fill so corners are not completely black)
      const point = new THREE.PointLight(0xeaf2ff, 0.06, 3, 2);
      point.position.set(0.2, 1.2, -0.3);
      point.castShadow = false;
      scene.add(point);
      refs.point = point;

      // Weak point light inside the space (wider spread, no shadows) — lowered so room stays dark
      const pin = new THREE.PointLight(0xeaf2ff, 12, 16, 1.6);
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


