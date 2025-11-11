/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { useEffect, useRef } from "react";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as THREE from "three";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Leva, folder, useControls } from "leva";

export default function Home() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const floorRef = useRef<THREE.Mesh | null>(null);
  const spotRef = useRef<THREE.SpotLight | null>(null);
  const spotTargetRef = useRef<THREE.Object3D | null>(null);

  // Create a soft radial white falloff texture to project as spotlight map (gobo)
  function createBlobGradientTexture(size = 1024): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, size, size);
    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.48;
    // Clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    // Fill bright white to let spotlight color define hue
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    // Soft alpha edge
    const radial = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    radial.addColorStop(0.0, "rgba(0,0,0,1)");
    radial.addColorStop(0.7, "rgba(0,0,0,1)");
    radial.addColorStop(1.0, "rgba(0,0,0,0)");
    ctx.globalCompositeOperation = "destination-in";
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, size, size);
    ctx.restore();
    ctx.globalCompositeOperation = "source-over";
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }

  const {
    camX,
    camY,
    camZ,
    floorSize,
    houseScale,
    houseX,
    houseY,
    houseZ,
    lockDistance,
    lockTilt,
    enableZoom,
    enablePan,
    lightIntensity,
    lightAngle,
    lightDistance,
    lightDecay,
    lightX,
    lightY,
    lightZ,
    targetX,
    targetY,
    targetZ,
    lightColor,
  } = useControls({
    Camera: folder({
      camX: { value: -3.2, min: -50, max: 50, step: 0.1 },
      camY: { value: 1.7, min: -50, max: 50, step: 0.1 },
      camZ: { value: 8.6, min: -50, max: 50, step: 0.1 },
      lockDistance: { value: true },
      lockTilt: { value: true },
      enableZoom: { value: false },
      enablePan: { value: false },
    }),
    Floor: folder({
      floorSize: { value: 20, min: 0.1, max: 20, step: 0.1 },
    }),
    House: folder({
      houseScale: { value: 1.01, min: 0.1, max: 10, step: 0.01 },
      houseX: { value: 0, min: -10, max: 10, step: 0.01 },
      houseY: { value: 0.02, min: -10, max: 10, step: 0.01 },
      houseZ: { value: 0, min: -10, max: 10, step: 0.01 },
    }),
    Light: folder({
      lightIntensity: { value: 307, min: 0, max: 500, step: 0.5 },
      lightAngle: { value: 0.48, min: 0.05, max: Math.PI / 2, step: 0.001 },
      lightDistance: { value: 61, min: 0, max: 500, step: 1 },
      lightDecay: { value: 1.19, min: 0.5, max: 2, step: 0.01 },
      lightX: { value: 1.8, min: -50, max: 50, step: 0.1 },
      lightY: { value: 3.8, min: 0, max: 50, step: 0.1 },
      lightZ: { value: 1.8, min: -50, max: 50, step: 0.1 },
      targetX: { value: 0.0, min: -50, max: 50, step: 0.1 },
      targetY: { value: 1.0, min: -10, max: 50, step: 0.1 },
      targetZ: { value: 0.7, min: -50, max: 50, step: 0.1 },
      lightColor: { value: "#fff59d" },
    }),
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f1115);

    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(2.5, 2, 3);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enableZoom = enableZoom;
    controls.enablePan = enablePan;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 0.25);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(5, 10, 7.5);
    dirLight.castShadow = false;
    scene.add(dirLight);

    const loader = new GLTFLoader();
    loader.load(
      "/house.glb",
      (gltf: any) => {
        const modelRoot = gltf.scene || gltf.scenes?.[0];
        if (!modelRoot) return;
        scene.add(modelRoot);
        modelRef.current = modelRoot;
        // Enable shadows on meshes
        modelRoot.traverse((obj: THREE.Object3D) => {
          const mesh = obj as any;
          if (mesh && mesh.isMesh) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
        });

        const box = new THREE.Box3().setFromObject(modelRoot);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        modelRoot.position.x += -center.x;
        modelRoot.position.y += -center.y;
        modelRoot.position.z += -center.z;
        // Apply initial house transforms from Leva defaults
        modelRoot.scale.setScalar(houseScale);
        modelRoot.position.x += houseX;
        modelRoot.position.y += houseY;
        modelRoot.position.z += houseZ;

        const maxDim = Math.max(size.x, size.y, size.z);
        const fitOffset = 1.35;
        const fov = THREE.MathUtils.degToRad(camera.fov);
        const distance = (maxDim * fitOffset) / (2 * Math.tan(fov / 2));

        // Use fixed camera from controls (Leva) instead of fit distance
        camera.position.set(camX, camY, camZ);
        const camDist = camera.position.length();
        camera.near = camDist / 100;
        camera.far = camDist * 100;
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();

        controls.target.set(0, 0, 0);
        // Apply locking rules based on current toggles
        if (lockDistance) {
          controls.minDistance = camDist;
          controls.maxDistance = camDist;
        } else {
          controls.minDistance = 0.1;
          controls.maxDistance = Infinity;
        }
        const currentPolar = new THREE.Spherical().setFromVector3(camera.position).phi;
        if (lockTilt) {
          controls.minPolarAngle = currentPolar;
          controls.maxPolarAngle = currentPolar;
        } else {
          controls.minPolarAngle = 0.01;
          controls.maxPolarAngle = Math.PI - 0.01;
        }
        controls.update();

        // Add a floor under the centered model
        const floorY = -size.y / 2;
        const floorSize = Math.max(size.x, size.z) * 10;
        const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
        const floorMaterial = new THREE.MeshStandardMaterial({
          color: 0x16181d,
          roughness: 1,
          metalness: 0,
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = floorY;
        floor.receiveShadow = true;
        scene.add(floor);
        floorRef.current = floor;
        // Apply initial Leva floor scale
        floor.scale.set(floorSize, 1, floorSize);
        // Spotlight with projected texture (gobo)
        const spot = new THREE.SpotLight(new THREE.Color(lightColor), lightIntensity, lightDistance, lightAngle, 1, lightDecay);
        spot.position.set(lightX, lightY, lightZ);
        spot.castShadow = true;
        spot.shadow.mapSize.set(1024, 1024);
        spot.shadow.bias = -0.003;
        const gobo = createBlobGradientTexture(1024);
        gobo.flipY = false;
        gobo.needsUpdate = true;
        // Assign map (supported in WebGPU; ignored in WebGL gracefully)
        (spot as any).map = gobo;
        const target = new THREE.Object3D();
        target.position.set(targetX, targetY, targetZ);
        scene.add(target);
        spot.target = target;
        scene.add(spot);
        spotRef.current = spot;
        spotTargetRef.current = target;
      },
      undefined,
      (error: any) => {
        // eslint-disable-next-line no-console
        console.error("Failed to load /house.glb", error);
      }
    );

    let animationFrameId: number | null = null;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    if ("ResizeObserver" in window) {
      resizeObserverRef.current = new ResizeObserver(handleResize);
      resizeObserverRef.current.observe(container);
    } else {
      (window as any).addEventListener("resize", handleResize);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      } else {
        (window as any).removeEventListener("resize", handleResize);
      }
      controls.dispose();
      if (rendererRef.current) {
        rendererRef.current.dispose();
        const el = rendererRef.current.domElement;
        if (el && el.parentNode) el.parentNode.removeChild(el);
      }
      scene.traverse((obj: THREE.Object3D) => {
        const mesh = obj as THREE.Mesh;
        if (!("isMesh" in mesh) || !(mesh as any).isMesh) return;
        if (mesh.geometry) mesh.geometry.dispose();
        const material: any = (mesh as any).material;
        if (!material) return;
        if (Array.isArray(material)) {
          material.forEach((m) => m.dispose && m.dispose());
        } else if (material.dispose) {
          material.dispose();
        }
      });
    };
  }, []);

  // React to Leva - camera position updates
  useEffect(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    camera.position.set(camX, camY, camZ);
    const distance = camera.position.length();
    // Keep clipping planes appropriate to the new distance
    camera.near = distance / 100;
    camera.far = distance * 100;
    camera.updateProjectionMatrix();
    const spherical = new THREE.Spherical().setFromVector3(camera.position);
    if (lockDistance) {
      controls.minDistance = distance;
      controls.maxDistance = distance;
    } else {
      controls.minDistance = 0.1;
      controls.maxDistance = Infinity;
    }
    if (lockTilt) {
      controls.minPolarAngle = spherical.phi;
      controls.maxPolarAngle = spherical.phi;
    } else {
      controls.minPolarAngle = 0.01;
      controls.maxPolarAngle = Math.PI - 0.01;
    }
    controls.enableZoom = enableZoom;
    controls.enablePan = enablePan;
    controls.update();
  }, [camX, camY, camZ, lockDistance, lockTilt, enableZoom, enablePan]);

  // React to Leva - floor size update
  useEffect(() => {
    const floor = floorRef.current;
    if (!floor) return;
    floor.scale.set(floorSize, 1, floorSize);
  }, [floorSize]);

  // React to Leva - house transform updates
  useEffect(() => {
    const model = modelRef.current;
    if (!model) return;
    model.scale.setScalar(houseScale);
    model.position.set(houseX, houseY, houseZ);
  }, [houseScale, houseX, houseY, houseZ]);

  // React to Leva - spotlight updates
  useEffect(() => {
    const spot = spotRef.current;
    const target = spotTargetRef.current;
    if (!spot) return;
    spot.color.set(lightColor as any);
    spot.intensity = lightIntensity;
    spot.angle = lightAngle;
    spot.distance = lightDistance;
    spot.decay = lightDecay;
    spot.position.set(lightX, lightY, lightZ);
    if (target) {
      target.position.set(targetX, targetY, targetZ);
      target.updateMatrixWorld();
      spot.target = target;
    }
    spot.updateMatrixWorld();
  }, [lightColor, lightIntensity, lightAngle, lightDistance, lightDecay, lightX, lightY, lightZ, targetX, targetY, targetZ]);

  return (
    <>
      <Leva collapsed={false} />
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      />
    </>
  );
}
