"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { setupEXREnvironment } from "./env";
import { createAtmosphere } from "./effects";
import { loadModelAndLights } from "./loader";

export default function Room() {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const spotRef = useRef(null);
  const spotHelperRef = useRef(null);
  const lightOpenInitial = true;

  const [controlsOpen, setControlsOpen] = useState(true);
  const [camX, setCamX] = useState(-3.2);
  const [camY, setCamY] = useState(1.7);
  const [camZ, setCamZ] = useState(8.6);
  const [enableZoom, setEnableZoom] = useState(true);
  const [enablePan, setEnablePan] = useState(false);
  const [lockDistance, setLockDistance] = useState(false);
  const [lockTilt, setLockTilt] = useState(true);

  const [lightOpen, setLightOpen] = useState(lightOpenInitial);
  const [lightX, setLightX] = useState(0.2);
  const [lightY, setLightY] = useState(15.2);
  const [lightZ, setLightZ] = useState(-27.2);

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

    // EXR env
    const disposeEnv = setupEXREnvironment(renderer, scene, "/exr/mea.exr");

    // Add a faint cool ambient to neutralize yellow cast (no heavy filters)
    const ambient = new THREE.AmbientLight(0xdfeaff, 0.12);
    scene.add(ambient);

    // Atmosphere
    const atmosphere = createAtmosphere(renderer, scene, camera, container);

    // Model + lights
    loadModelAndLights(
      scene,
      { x: lightX, y: lightY, z: lightZ },
      ({ spot, spotHelper }) => {
        spotRef.current = spot;
        spotHelperRef.current = spotHelper;
      }
    );

    let raf = null;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      controls.update();
      if (spotHelperRef.current) spotHelperRef.current.update();
      atmosphere.onFrame();
      renderer.render(scene, camera);
    };
    tick();

    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      atmosphere.onResize(w, h);
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(container);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      disposeEnv();
      atmosphere.dispose();
      controls.dispose();
      if (rendererRef.current) {
        rendererRef.current.dispose();
        const el = rendererRef.current.domElement;
        if (el && el.parentNode) el.parentNode.removeChild(el);
      }
    };
  }, []);

  // React to camera state
  useEffect(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    camera.position.set(camX, camY, camZ);
    const distance = camera.position.length();
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

  // React to light state
  useEffect(() => {
    if (!spotRef.current) return;
    spotRef.current.position.set(lightX, lightY, lightZ);
    spotRef.current.updateMatrixWorld();
  }, [lightX, lightY, lightZ]);

  const moveCameraBy = (offset) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    camera.position.add(offset);
    controls.target.add(offset);
    setCamX(camera.position.x);
    setCamY(camera.position.y);
    setCamZ(camera.position.z);
    camera.updateProjectionMatrix();
    controls.update();
  };

  const Sidebar = useMemo(() => {
    return (
      <div
        style={{
          position: "fixed",
          top: 60,
          left: controlsOpen ? 0 : -300,
          width: 300,
          height: "calc(100vh - 60px)",
          background: "#0e1117",
          color: "#e5e7eb",
          borderRight: "1px solid #23262d",
          transition: "left 0.2s ease",
          overflowY: "auto",
          padding: 16,
          boxSizing: "border-box",
          zIndex: 20,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Camera Controls</div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>camX: {camX.toFixed(2)}</label>
          <input type="range" min={-50} max={50} step={0.1} value={camX} onChange={(e) => setCamX(parseFloat(e.target.value))} style={{ width: "100%" }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>camY: {camY.toFixed(2)}</label>
          <input type="range" min={-50} max={50} step={0.1} value={camY} onChange={(e) => setCamY(parseFloat(e.target.value))} style={{ width: "100%" }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>camZ: {camZ.toFixed(2)}</label>
          <input type="range" min={-50} max={50} step={0.1} value={camZ} onChange={(e) => setCamZ(parseFloat(e.target.value))} style={{ width: "100%" }} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={enableZoom} onChange={(e) => setEnableZoom(e.target.checked)} />
            Enable Zoom
          </label>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={enablePan} onChange={(e) => setEnablePan(e.target.checked)} />
            Enable Pan
          </label>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={lockDistance} onChange={(e) => setLockDistance(e.target.checked)} />
            Lock Distance
          </label>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={lockTilt} onChange={(e) => setLockTilt(e.target.checked)} />
            Lock Tilt
          </label>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: "#bfc3ca" }}>
          Pos: X {camX.toFixed(2)} Y {camY.toFixed(2)} Z {camZ.toFixed(2)}
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "40px 40px 40px", gap: 8, justifyContent: "start" }}>
            <div />
            <button
              onClick={() => {
                const camera = cameraRef.current;
                if (!camera) return;
                const forward = new THREE.Vector3();
                camera.getWorldDirection(forward);
                forward.y = 0;
                if (forward.lengthSq() === 0) forward.set(0, 0, -1);
                forward.normalize().multiplyScalar(0.5);
                moveCameraBy(forward);
              }}
              style={{ width: 40, height: 32, borderRadius: 6, border: "1px solid #23262d", background: "#111318", color: "#e5e7eb", cursor: "pointer" }}
              title="Up"
            >
              ↑
            </button>
            <div />
            <button
              onClick={() => {
                const camera = cameraRef.current;
                if (!camera) return;
                const forward = new THREE.Vector3();
                camera.getWorldDirection(forward);
                forward.y = 0;
                if (forward.lengthSq() === 0) forward.set(0, 0, -1);
                const right = new THREE.Vector3().copy(forward).cross(camera.up).normalize().multiplyScalar(-0.5);
                moveCameraBy(right);
              }}
              style={{ width: 40, height: 32, borderRadius: 6, border: "1px solid #23262d", background: "#111318", color: "#e5e7eb", cursor: "pointer" }}
              title="Left"
            >
              ←
            </button>
            <button
              onClick={() => {
                const camera = cameraRef.current;
                if (!camera) return;
                const forward = new THREE.Vector3();
                camera.getWorldDirection(forward);
                forward.y = 0;
                if (forward.lengthSq() === 0) forward.set(0, 0, -1);
                forward.normalize().multiplyScalar(-0.5);
                moveCameraBy(forward);
              }}
              style={{ width: 40, height: 32, borderRadius: 6, border: "1px solid #23262d", background: "#111318", color: "#e5e7eb", cursor: "pointer" }}
              title="Down"
            >
              ↓
            </button>
            <button
              onClick={() => {
                const camera = cameraRef.current;
                if (!camera) return;
                const forward = new THREE.Vector3();
                camera.getWorldDirection(forward);
                forward.y = 0;
                if (forward.lengthSq() === 0) forward.set(0, 0, -1);
                const right = new THREE.Vector3().copy(forward).cross(camera.up).normalize().multiplyScalar(0.5);
                moveCameraBy(right);
              }}
              style={{ width: 40, height: 32, borderRadius: 6, border: "1px solid #23262d", background: "#111318", color: "#e5e7eb", cursor: "pointer" }}
              title="Right"
            >
              →
            </button>
          </div>
        </div>

        {/* Camera presets */}
        <div style={{ marginTop: 18, paddingTop: 12, borderTop: "1px solid #23262d" }}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>Presets</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => {
                setCamX(7.6);
                setCamY(5.1);
                setCamZ(9.6);
                setEnableZoom(true);
                setEnablePan(false);
                setLockDistance(false);
                setLockTilt(true);
              }}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #6b5bd4", background: "#1a1f2e", color: "#e5e7eb", cursor: "pointer" }}
            >
              1
            </button>
            <button
              onClick={() => {
                setCamX(-3.9);
                setCamY(4.2);
                setCamZ(10.7);
                setEnableZoom(true);
                setEnablePan(false);
                setLockDistance(false);
                setLockTilt(true);
              }}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #6b5bd4", background: "#1a1f2e", color: "#e5e7eb", cursor: "pointer" }}
            >
              2
            </button>
            <button
              onClick={() => {
                setCamX(-1.9);
                setCamY(0.8);
                setCamZ(3.6);
                setEnableZoom(true);
                setEnablePan(false);
                setLockDistance(false);
                setLockTilt(true);
              }}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #6b5bd4", background: "#1a1f2e", color: "#e5e7eb", cursor: "pointer" }}
            >
              3
            </button>
          </div>
        </div>

        {/* Light Presets */}
        <div style={{ marginTop: 18, paddingTop: 12, borderTop: "1px solid #23262d" }}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>Light Presets</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setLightX(-0.9); setLightY(12.8); setLightZ(-24.0); }} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #6b5bd4", background: "#1a1f2e", color: "#e5e7eb", cursor: "pointer" }}>1</button>
            <button onClick={() => { setLightX(-14.7); setLightY(10.7); setLightZ(-18.9); }} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #6b5bd4", background: "#1a1f2e", color: "#e5e7eb", cursor: "pointer" }}>2</button>
            <button onClick={() => { setLightX(-14.7); setLightY(10.7); setLightZ(-24.4); }} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #6b5bd4", background: "#1a1f2e", color: "#e5e7eb", cursor: "pointer" }}>3</button>
          </div>
        </div>
      </div>
    );
  }, [controlsOpen, camX, camY, camZ, enableZoom, enablePan, lockDistance, lockTilt]);

  const LightToolbar = useMemo(() => {
    const panelWidth = 280;
    return (
      <div
        style={{
          position: "fixed",
          top: 60,
          right: lightOpen ? 0 : -panelWidth,
          width: panelWidth,
          height: "calc(100vh - 60px)",
          background: "#0e1117",
          color: "#e5e7eb",
          borderLeft: "1px solid #23262d",
          transition: "right 0.2s ease",
          overflowY: "auto",
          padding: 16,
          boxSizing: "border-box",
          zIndex: 25,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Light Position</div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>lightX: {lightX.toFixed(2)}</label>
          <input type="range" min={-50} max={50} step={0.1} value={lightX} onChange={(e) => setLightX(parseFloat(e.target.value))} style={{ width: "100%" }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>lightY: {lightY.toFixed(2)}</label>
          <input type="range" min={0} max={50} step={0.1} value={lightY} onChange={(e) => setLightY(parseFloat(e.target.value))} style={{ width: "100%" }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>lightZ: {lightZ.toFixed(2)}</label>
          <input type="range" min={-50} max={50} step={0.1} value={lightZ} onChange={(e) => setLightZ(parseFloat(e.target.value))} style={{ width: "100%" }} />
        </div>
      </div>
    );
  }, [lightOpen, lightX, lightY, lightZ]);

  return (
    <>
      {/* toggles */}
      <button
        onClick={() => setControlsOpen((v) => !v)}
        style={{
          position: "fixed",
          top: 60,
          left: controlsOpen ? 300 : 0,
          transform: "translateX(-50%)",
          width: 36,
          height: 36,
          borderRadius: 18,
          border: "1px solid #23262d",
          background: "#111318",
          color: "#e5e7eb",
          cursor: "pointer",
          zIndex: 30,
          transition: "left 0.2s ease",
        }}
        aria-label="Toggle camera controls"
        title="Toggle camera controls"
      >
        {controlsOpen ? "←" : "→"}
      </button>
      <button
        onClick={() => setLightOpen((v) => !v)}
        style={{
          position: "fixed",
          top: 60,
          right: lightOpen ? 280 : 0,
          transform: "translateX(50%)",
          width: 36,
          height: 36,
          borderRadius: 18,
          border: "1px solid #23262d",
          background: "#111318",
          color: "#e5e7eb",
          cursor: "pointer",
          zIndex: 30,
          transition: "right 0.2s ease",
        }}
        aria-label="Toggle light controls"
        title="Toggle light controls"
      >
        {lightOpen ? "→" : "←"}
      </button>
      {Sidebar}
      {LightToolbar}
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


