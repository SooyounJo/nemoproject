"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { setupEXREnvironment } from "./env";
import { createAtmosphere } from "./effects";
import { loadModelAndLights } from "./loader";
import { CSS3DRenderer, CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";

// Make all 3D meshes monochrome (neutral albedo) but still lit with colored lights
const MONOCHROME_LIT = true;
function forceAllMeshesToMonochromeLit(root) {
  if (!root || !root.traverse) return;
  root.traverse((obj) => {
    if (obj && obj.isMesh) {
      const toMonochromeStandard = (mat) => {
        const std = new THREE.MeshStandardMaterial({ color: 0xffffff });
        // Preserve useful physical params if present
        if (mat && typeof mat.roughness === "number") std.roughness = mat.roughness;
        if (mat && typeof mat.metalness === "number") std.metalness = mat.metalness;
        if (mat && typeof mat.side !== "undefined") std.side = mat.side;
        if (mat && mat.transparent === true) {
          std.transparent = true;
          std.opacity = typeof mat.opacity === "number" ? mat.opacity : 1.0;
        }
        // Drop base/baseColor maps to ensure neutral albedo; keep normals if available
        if (mat && mat.normalMap) std.normalMap = mat.normalMap, std.normalScale = mat.normalScale?.clone?.() || new THREE.Vector2(1, 1);
        return std;
      };
      if (Array.isArray(obj.material)) {
        obj.material = obj.material.map((m) => toMonochromeStandard(m));
        obj.material.forEach((m) => (m.needsUpdate = true));
      } else {
        obj.material = toMonochromeStandard(obj.material);
        if (obj.material) obj.material.needsUpdate = true;
      }
      // keep original shadow settings (do not disable)
    }
  });
}

// Auto-adjust camera after user zooms out (increase distance)
const AUTO_LOWER_ON_ZOOM_OUT = true;
const ZOOM_OUT_THRESHOLD = 0.6; // distance delta to treat as "zoomed out"
const LOWER_Y_OFFSET = 0.35;    // how much to lower camera/target (world units)
const LOWER_Y_LERP_MS = 700;    // animation duration
// Cap how far user can zoom out relative to initial distance (keep strong, but slightly less)
const MAX_ZOOM_OUT_FACTOR = 3.5;

// Manual tuning values for the HTML screen attachment
// Adjust these numbers to fine-tune position/size/rotation on the monitor
const HTML_TUNE = {
  offsetX: -0.12,   // strong left shift
  offsetY: 0.09,    // stronger upward shift
  offsetZ: 0.002,   // slight forward to avoid z-fighting
  scaleMul: 1.08,
  rotYDeg: 0,
  // Arrow-like local axis (can be tuned), distance controlled by slider htmlDist
  axisX: 1.0,
  axisY: 0.35,
  axisZ: 0.8,
  axisDist: 0.0,
};

export default function Room(props) {
  const {
    initialCamera,
    initialLight,
    initialFov,
    hideUI,
    showPathSlider,
    htmlOffset,
    zoomOnly,
    showHtmlSliders,
    cameraTarget,
    cameraLerp,
    controlsTarget,
    controlsLerp,
    lightTarget,
    lightLerp,
    progressTarget,
    progressLerp,
    progressTrigger,
    initialProgress,
    disableColorMapping,
    pinIntensityTarget,
    pinIntensityLerp,
    // External HTML screen control (optional)
    initialHtmlDist,
    initialHtmlOffX,
    initialHtmlOffY,
    initialHtmlOffZ,
    initialHtmlScaleMul,
    // Control CSS3D HTML visibility
    htmlVisible,
    // Overlay billboard plane (unlit) - outside window
    overlayImageUrl,
    overlayVisible,
    overlayPos,
    overlayScale,
    overlayOpacityTarget,
    overlayOpacityLerp,
    overlayFollowCamera,
    overlayFollowDist,
    // Debug: render solid color instead of texture
    overlayDebugSolid,
    overlayDebugColor = "#ff0000",
    // Safe 2D image plane (simple, independent)
    img2dUrl,
    img2dPos,
    img2dScale,
    img2dOpacity,
    enableImg2dPlane = false,
    enableCssWindow = false,
    useCssWindow,
    // Optional sequence control to change overlay image based on light path or external events
    overlaySeqPrefix,
    overlaySeqCount,
    overlaySeqExt = ".png",
    overlaySlideLerp = 500,
    overlaySeqList,
    // Optional external control of overlay index
    overlayIndex: overlayIndexProp,
    // Optional: 2x2 screen grid images on the desktop monitor
    screenGridImages,
  } = props || {};
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const spotRef = useRef(null);
  const spotHelperRef = useRef(null);
  const pinRef = useRef(null);
  const cssRendererRef = useRef(null);
  const cssIframeRef = useRef(null);
  const sceneRef = useRef(null);
  const lightOpenInitial = true;
  // HTML screen placement refs/state
  const screenObjRef = useRef(null);
  const cssScreenRef = useRef(null);
  const screenCenterLocalRef = useRef(null);
  // Overlay group and plane refs (for 2D billboard outside window)
  const overlayGroupRef = useRef(null);
  const overlayPlaneRef = useRef(null);
  // CSS3D outside image (preferred, replaces WebGL plane)
  const overlayCssObjRef = useRef(null);
  const overlayDomRef = useRef(null);
  const overlayMatRef = useRef(null);
  const overlayTexRef = useRef(null);
  const overlayNextPlaneRef = useRef(null);
  const overlayNextMatRef = useRef(null);
  const overlayNextTexRef = useRef(null);
  const overlayIndexRef = useRef(0);
  const overlaySlideRafRef = useRef(null);
  const overlayTexCacheRef = useRef(new Map());
  const [overlayIndex, setOverlayIndex] = useState(0);
  // Simple 2D image plane (safe path)
  const img2dGroupRef = useRef(null);
  const img2dPlaneRef = useRef(null);
  const img2dMatRef = useRef(null);
  // CSS window image
  const cssWindowGroupRef = useRef(null);
  const cssWindowObjRef = useRef(null);
  const cssWindowImgRef = useRef(null);
  // Window glass meshes (for direct texture replacement)
  const windowGlassMeshesRef = useRef([]);
  // Track zoom distance and manage post-zoom lowering animation
  const lastZoomDistRef = useRef(null);
  const lowerAnimRafRef = useRef(null);
  const lowerInProgressRef = useRef(false);
  const baseZoomDistRef = useRef(null);
  const overlayBaseSizeRef = useRef({ w: 1.6, h: 0.9 });
  // Overlay local offsets the user can tune in runtime
  const [overlayOffX, setOverlayOffX] = useState(0);
  const [overlayOffY, setOverlayOffY] = useState(0);
  const [overlayOffZ, setOverlayOffZ] = useState(0);
  const [htmlDist, setHtmlDist] = useState(
    typeof initialHtmlDist === "number" ? initialHtmlDist : (HTML_TUNE.axisDist || 0)
  );
  const [htmlOffX, setHtmlOffX] = useState(typeof initialHtmlOffX === "number" ? initialHtmlOffX : 0);
  const [htmlOffY, setHtmlOffY] = useState(typeof initialHtmlOffY === "number" ? initialHtmlOffY : 0);
  const [htmlOffZ, setHtmlOffZ] = useState(typeof initialHtmlOffZ === "number" ? initialHtmlOffZ : 0);
  const [htmlScaleMul, setHtmlScaleMul] = useState(
    typeof initialHtmlScaleMul === "number" ? initialHtmlScaleMul : 1
  );

  const [controlsOpen, setControlsOpen] = useState(true);
  const [camX, setCamX] = useState(initialCamera?.x ?? -2.0);
  const [camY, setCamY] = useState(initialCamera?.y ?? 0.9);
  const [camZ, setCamZ] = useState(initialCamera?.z ?? 9.2);
  const [enableZoom, setEnableZoom] = useState(true);
  const [enablePan, setEnablePan] = useState(false);
  const [lockDistance, setLockDistance] = useState(false);
  const [lockTilt, setLockTilt] = useState(true);

  const [lightOpen, setLightOpen] = useState(lightOpenInitial);
  const [lightX, setLightX] = useState(initialLight?.x ?? 0.2);
  const [lightY, setLightY] = useState(initialLight?.y ?? 15.2);
  const [lightZ, setLightZ] = useState(initialLight?.z ?? -27.2);
  const [preset3Cam, setPreset3Cam] = useState(null);
  // Path slider state (0..1)
  const [lightProgress, setLightProgress] = useState(
    typeof initialProgress === "number" ? initialProgress : 0.0
  );
  // Path definition
  const PATH = useMemo(() => ({ xMin: -34.8, xMax: 3.3, zStart: -22.7, zEnd: -50.0 }), []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f1115);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      initialFov ?? 38,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(camX, camY, camZ);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1));
    renderer.setSize(container.clientWidth, container.clientHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // Make the overall room a bit darker so light beams feel stronger
    renderer.toneMappingExposure = 1.30;
    renderer.physicallyCorrectLights = true;
    renderer.useLegacyLights = false;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    // Remove any CSS filter from the WebGL canvas (no blur/contrast)
    try {
      renderer.domElement.style.filter = "none";
      // Allow UI (buttons) to capture clicks above the canvas
      renderer.domElement.style.pointerEvents = "none";
    } catch {}
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    if (props.staticView) {
      controls.enabled = false;
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.enableRotate = false;
    } else {
      controls.enableZoom = zoomOnly ? true : enableZoom;
      controls.enablePan = zoomOnly ? false : enablePan;
      controls.enableRotate = zoomOnly ? false : true;
    }
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;
    // Record initial camera-target distance to cap max zoom-out
    try {
      baseZoomDistRef.current = camera.position.distanceTo(controls.target);
    } catch {}
    // Detect zoom-out and gently lower camera and target
    const scheduleLowerCamera = () => {
      if (!AUTO_LOWER_ON_ZOOM_OUT) return;
      if (lowerInProgressRef.current) return;
      const cam = cameraRef.current;
      const ctr = controlsRef.current;
      if (!cam || !ctr) return;
      lowerInProgressRef.current = true;
      const y0Cam = cam.position.y;
      const y1Cam = y0Cam - LOWER_Y_OFFSET;
      const t0 = performance.now();
      const dur = Math.max(120, LOWER_Y_LERP_MS);
      const step = (now) => {
        const u = Math.min(1, (now - t0) / dur);
        const s = u * u * (3 - 2 * u);
        cam.position.y = y0Cam + (y1Cam - y0Cam) * s;
        cam.updateProjectionMatrix();
        ctr.update();
        setCamY(cam.position.y);
        if (u < 1) {
          lowerAnimRafRef.current = requestAnimationFrame(step);
        } else {
          lowerInProgressRef.current = false;
          lowerAnimRafRef.current = null;
        }
      };
      lowerAnimRafRef.current = requestAnimationFrame(step);
    };
    const handleControlsChange = () => {
      const cam = cameraRef.current;
      const ctr = controlsRef.current;
      if (!cam || !ctr) return;
      const dist = cam.position.distanceTo(ctr.target);
      const prev = lastZoomDistRef.current;
      if (prev == null) {
        lastZoomDistRef.current = dist;
        return;
      }
      if (dist - prev > ZOOM_OUT_THRESHOLD) {
        scheduleLowerCamera();
      }
      lastZoomDistRef.current = dist;
    };
    controls.addEventListener("change", handleControlsChange);

    // EXR env
    const disposeEnv = setupEXREnvironment(renderer, scene, "/exr/mea.exr");

    // Add a faint cool ambient to neutralize yellow cast (no heavy filters)
    // Keep ambient very low so most brightness comes from the main lights
    const ambient = new THREE.AmbientLight(0xdfeaff, 0.010);
    scene.add(ambient);
    const ambientRef = { current: ambient };

    // Atmosphere
    const atmosphere = createAtmosphere(renderer, scene, camera, container);

    // CSS3D overlay renderer for HTML screen
    const cssRenderer = new CSS3DRenderer();
    cssRenderer.setSize(container.clientWidth, container.clientHeight);
    cssRenderer.domElement.style.position = "absolute";
    cssRenderer.domElement.style.top = "0";
    cssRenderer.domElement.style.left = "0";
    cssRenderer.domElement.style.pointerEvents = "none";
    cssRenderer.domElement.style.zIndex = "1";
    container.appendChild(cssRenderer.domElement);
    cssRendererRef.current = cssRenderer;

    // Capture initial camera as preset 3 snapshot
    setPreset3Cam({ x: camX, y: camY, z: camZ });

    // Lightweight FPS meter (no external deps)
    const fpsEl = document.createElement("div");
    fpsEl.style.position = "absolute";
    fpsEl.style.top = "8px";
    fpsEl.style.left = "8px";
    fpsEl.style.padding = "2px 6px";
    fpsEl.style.borderRadius = "6px";
    fpsEl.style.fontSize = "11px";
    fpsEl.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
    fpsEl.style.background = "rgba(17,19,24,.6)";
    fpsEl.style.border = "1px solid #23262d";
    fpsEl.style.color = "#bfc3ca";
    fpsEl.style.zIndex = "5";
    fpsEl.textContent = "FPS: --";
    container.appendChild(fpsEl);
    let fpsFrames = 0;
    let fpsLast = performance.now();
    let fpsAccum = 0;
    let fpsCount = 0;
    const updateFps = (dt) => {
      fpsFrames++;
      fpsAccum += dt;
      fpsCount++;
      // update every ~250ms for stability
      if (performance.now() - fpsLast >= 250) {
        const avgDt = fpsAccum / Math.max(1, fpsCount);
        const fps = Math.round(1000 / Math.max(1e-3, avgDt));
        fpsEl.textContent = `FPS: ${fps}`;
        fpsLast = performance.now();
        fpsAccum = 0;
        fpsCount = 0;
      }
    };

    // Create overlay group and initial WebGL plane (behind model)
    {
      const group = new THREE.Object3D();
      const p = overlayPos || { x: -3.9, y: -1.8, z: -50.0 };
      group.position.set(p.x || 0, p.y || 0, p.z || 0);
      group.visible = !!overlayVisible;
      scene.add(group);
      overlayGroupRef.current = group;
      const baseW = 1.6, baseH = 0.9;
      overlayBaseSizeRef.current = { w: baseW, h: baseH };
      // Pick initial texture URL
      let initUrl = null;
      const initialIndex = 0;
      if (Array.isArray(overlaySeqList) && overlaySeqList.length > 0) {
        overlayIndexRef.current = initialIndex;
        initUrl = overlaySeqList[initialIndex];
      } else if (!initUrl && typeof overlaySeqPrefix === "string" && typeof overlaySeqCount === "number") {
        overlayIndexRef.current = initialIndex;
        const num = String(initialIndex + 1);
        initUrl = `${overlaySeqPrefix}${num}${overlaySeqExt}`;
      } else {
        initUrl = overlayImageUrl;
      }
      // WebGL plane (respects depth)
      const geo = new THREE.PlaneGeometry(baseW, baseH);
      const mat = new THREE.MeshBasicMaterial({
        map: null,
        color: 0xffffff,
        transparent: false,
        depthTest: true,
        depthWrite: true,
        toneMapped: false,
        opacity: 1.0,
        side: THREE.DoubleSide,
      });
      mat.polygonOffset = true;
      mat.polygonOffsetFactor = -1;
      mat.polygonOffsetUnits = -1;
      const plane = new THREE.Mesh(geo, mat);
      plane.frustumCulled = false;
      const s = typeof overlayScale === "number" ? overlayScale : 1.2;
      plane.position.set(0, 0, 0);
      // Old good version: use scale as-is (no tiny factor)
      plane.scale.set(s, s, 1);
      group.add(plane);
      overlayPlaneRef.current = plane;
      overlayMatRef.current = mat;
      // Apply initial texture
      if (overlayDebugSolid) {
        mat.map = null;
        mat.color = new THREE.Color(overlayDebugColor || "#ff0000");
        mat.depthTest = false;
        mat.depthWrite = false;
        mat.needsUpdate = true;
        plane.renderOrder = 999;
        try { console.log("[room3d] DEBUG solid color ->", overlayDebugColor); } catch {}
      } else if (!initUrl || initUrl === "__WHITE__") {
        mat.map = null;
        mat.color = new THREE.Color(0xffffff);
        mat.needsUpdate = true;
        try { console.log("[room3d] init outside -> WHITE"); } catch {}
      } else {
        const loader = new THREE.TextureLoader();
        loader.load(
          initUrl,
          (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.needsUpdate = true;
            mat.map = tex;
            mat.needsUpdate = true;
            try { console.log("[room3d] init outside ->", initUrl); } catch {}
          },
          undefined,
          () => { try { console.warn("[room3d] init outside load error", initUrl); } catch {} }
        );
      }
    }

    // Create simple 2D image plane (independent, safe)
    if (enableImg2dPlane) {
      const group = new THREE.Object3D();
      const p = img2dPos || { x: -3.9, y: -1.8, z: -19.2 };
      group.position.set(p.x || 0, p.y || 0, p.z || 0);
      scene.add(group);
      img2dGroupRef.current = group;

      const geo = new THREE.PlaneGeometry(1.6, 0.9);
      const mat = new THREE.MeshBasicMaterial({
        map: null,
        color: 0xffffff,
        transparent: typeof img2dOpacity === "number" ? (img2dOpacity < 1) : false,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
        alphaTest: 0.001,
        blending: THREE.NormalBlending,
        opacity: typeof img2dOpacity === "number" ? img2dOpacity : 1.0,
      });
      const plane = new THREE.Mesh(geo, mat);
      plane.frustumCulled = false;
      // Ensure the image plane is fully unlit and not affected by scene shadows
      plane.castShadow = false;
      plane.receiveShadow = false;
      const s2 = typeof img2dScale === "number" ? img2dScale : 1.2;
      plane.scale.setScalar(s2);
      // ensure visibility over scene
      plane.renderOrder = 999;
      group.add(plane);
      img2dPlaneRef.current = plane;
      img2dMatRef.current = mat;

      if (img2dUrl === "__WHITE__") {
        mat.map = null;
        mat.color = new THREE.Color(0xffffff);
        mat.needsUpdate = true;
      } else if (img2dUrl) {
        const loader = new THREE.TextureLoader();
        loader.load(
          img2dUrl,
          (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.flipY = false;
            tex.needsUpdate = true;
        mat.map = tex;
        mat.color = new THREE.Color(0xffffff);
            mat.needsUpdate = true;
            try { console.log("[img2d] onLoad:", img2dUrl); } catch {}
          },
          undefined,
          () => { try { console.warn("[img2d] load error:", img2dUrl); } catch {} }
        );
      }
    }
    // Create CSS3D window image anchored in 3D space (outside window)
    if (enableCssWindow) {
      const group = new THREE.Object3D();
      const p = img2dPos || { x: -3.9, y: -1.8, z: -19.2 };
      group.position.set(p.x || 0, p.y || 0, p.z || 0);
      scene.add(group);
      cssWindowGroupRef.current = group;

      const el = document.createElement("img");
      el.style.width = "480px";
      el.style.height = "270px";
      el.style.objectFit = "cover";
      el.style.pointerEvents = "none";
      el.draggable = false;
      if (typeof img2dOpacity === "number") {
        el.style.opacity = String(Math.max(0, Math.min(1, img2dOpacity)));
      }
      if (!img2dUrl || img2dUrl === "__WHITE__") {
        el.src = "";
        el.style.background = "#ffffff";
      } else {
        el.src = img2dUrl;
      }
      const cssObj = new CSS3DObject(el);
      const s2 = typeof img2dScale === "number" ? img2dScale : 1.2;
      cssObj.scale.set(s2, s2, 1);
      group.add(cssObj);
      cssWindowObjRef.current = cssObj;
      cssWindowImgRef.current = el;
    }

    // Lofi film grain overlay (CSS-based, very lightweight)
    const makeGrainDataUrl = () => {
      const s = 64;
      const c = document.createElement("canvas");
      c.width = s;
      c.height = s;
      const ctx = c.getContext("2d");
      const img = ctx.createImageData(s, s);
      for (let i = 0; i < img.data.length; i += 4) {
        const n = 230 + Math.floor(Math.random() * 25); // subtle light grain
        img.data[i + 0] = n;
        img.data[i + 1] = n;
        img.data[i + 2] = n;
        img.data[i + 3] = Math.floor(14 + Math.random() * 12); // alpha 14~26
      }
      ctx.putImageData(img, 0, 0);
      return c.toDataURL("image/png");
    };

    const grain = document.createElement("div");
    grain.style.position = "absolute";
    grain.style.inset = "0";
    grain.style.pointerEvents = "none";
    grain.style.zIndex = "2";
    grain.style.mixBlendMode = "multiply";
    grain.style.imageRendering = "pixelated";
    // Temporarily disable grain overlay to rule out dimming/covering
    grain.style.display = "none";
    const applyGrain = () => {
      grain.style.backgroundImage = `url('${makeGrainDataUrl()}')`;
      grain.style.backgroundRepeat = "repeat";
      grain.style.backgroundSize = "128px 128px";
      grain.style.opacity = "0.18";
    };
    applyGrain();
    container.appendChild(grain);
    const grainTimer = null; // keep static grain for performance
    // Subtle vignette to increase perceived contrast at edges
    const vignette = document.createElement("div");
    vignette.style.position = "absolute";
    vignette.style.inset = "0";
    vignette.style.pointerEvents = "none";
    vignette.style.zIndex = "3";
    vignette.style.background = "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.28) 100%)";
    // Temporarily disable vignette overlay
    vignette.style.display = "none";
    container.appendChild(vignette);

    // Model + lights
    loadModelAndLights(
      scene,
      { x: lightX, y: lightY, z: lightZ },
      ({ spot, spotHelper, screen, pin }) => {
        spotRef.current = spot;
        spotHelperRef.current = spotHelper;
        pinRef.current = pin;
        // Attach HTML to monitor screen if detected, else fall back to a virtual anchor
        if (cssRendererRef.current) {
          // eslint-disable-next-line no-console
          console.log("Attaching HTML to screen:", screen ? screen.name : "(virtual anchor)");
          let anchor = screen;
          let isVirtual = false;
          if (!anchor) {
            isVirtual = true;
            const virtual = new THREE.Object3D();
            virtual.name = "VirtualScreenAnchor";
            virtual.position.set(0.4, 1.0, 0.2);
            virtual.rotation.y = Math.PI;
            scene.add(virtual);
            anchor = virtual;
          }
          // Prepare grid images from localStorage to show user's last 4 (2x2) selection
          let gridImgs = [];
          // Prefer externally provided grid images
          if (Array.isArray(screenGridImages) && screenGridImages.length > 0) {
            gridImgs = screenGridImages.slice(0, 4);
          } else {
            // Fallback to localStorage
            try {
              const raw = localStorage.getItem("nemo_grid_images");
              const arr = raw ? JSON.parse(raw) : null;
              if (Array.isArray(arr) && arr.length >= 4) {
                gridImgs = arr.slice(0, 4);
              } else {
                const last = localStorage.getItem("nemo_last_image");
                if (last) gridImgs = Array.from({ length: 4 }).map(() => last);
              }
            } catch {}
            if (gridImgs.length === 0) {
              gridImgs = Array.from({ length: 4 }).map(() => "/2d/nemo.png");
            }
          }
          const iframe = document.createElement("iframe");
          iframe.setAttribute("title", "screen");
          iframe.style.border = "0";
          iframe.width = "800";
          iframe.height = "500";
          iframe.style.pointerEvents = "none";
          // Save iframe ref for live updates
          try { cssIframeRef.current = iframe; } catch {}
          iframe.srcdoc = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      @import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css");
      :root { --bg:#0b0d12; --fg:#e5e7eb; }
      * { box-sizing: border-box; }
      html,body { height:100%; }
      body {
        margin:0;
        background: var(--bg);
        color: var(--fg);
        font-family: Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI",
          Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue",
          Arial, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji",
          sans-serif;
        display:flex; align-items:center; justify-content:center;
        overflow:hidden;
      }
      .wrap { position:relative; width:100%; height:100%; display:grid;
        grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(2, 1fr); gap: 2px; }
      .cell { position:relative; width:100%; height:100%; overflow:hidden; }
      .cell img { width:100%; height:100%; object-fit:cover; display:block; filter: brightness(1.02); }
      /* subtle vertical scanlines */
      .scan {
        position:absolute; inset:0; pointer-events:none; opacity:.12;
        background: repeating-linear-gradient(
          to bottom,
          rgba(255,255,255,0.06) 0px,
          rgba(255,255,255,0.06) 1px,
          transparent 2px,
          transparent 4px
        );
        animation: scanMove 6s linear infinite;
      }
      @keyframes float {
        0%,100% { transform: translateY(0) scale(1.0); }
        50% { transform: translateY(-4px) scale(1.005); }
      }
      @keyframes scanMove {
        0% { transform: translateY(-10%); }
        100% { transform: translateY(10%); }
      }
      @keyframes flicker {
        0%, 97%, 100% { filter: grayscale(12%) brightness(1.05); }
        98% { filter: grayscale(14%) brightness(1.0); }
        99% { filter: grayscale(10%) brightness(1.08); }
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      ${gridImgs.map((src, i) => `<div class="cell"><img src="${src}" alt="img_${i}" /></div>`).join("")}
      <div class="scan"></div>
    </div>
  </body>
  </html>`;
          // Build CSS3D object and attach in local space of anchor
          const cssObj = new CSS3DObject(iframe);
          const bbox = new THREE.Box3().setFromObject(anchor);
          const size = new THREE.Vector3();
          const centerWorld = new THREE.Vector3();
          bbox.getSize(size);
          bbox.getCenter(centerWorld);
          const centerLocal = anchor.worldToLocal(centerWorld.clone());
          cssObj.position.copy(centerLocal);
          cssObj.position.x += HTML_TUNE.offsetX + (htmlOffset?.x || 0) + htmlOffX;
          cssObj.position.y += HTML_TUNE.offsetY + (htmlOffset?.y || 0) + htmlOffY;
          cssObj.position.z += HTML_TUNE.offsetZ + (htmlOffset?.z || 0) + htmlOffZ;
          // Arrow-axis offset (local space)
          {
            const dir = new THREE.Vector3(
              HTML_TUNE.axisX || 0,
              HTML_TUNE.axisY || 0,
              HTML_TUNE.axisZ || 0
            );
            if (dir.lengthSq() > 0) {
              dir.normalize().multiplyScalar(htmlDist || 0);
              cssObj.position.add(dir);
            }
          }
          // Heuristic scale: map ~200 CSS px to screen width; fallback for virtual anchor
          let s = THREE.MathUtils.clamp((size.x / 200) || 0.005, 0.002, 0.02) * HTML_TUNE.scaleMul * htmlScaleMul;
          if (!Number.isFinite(size.x) || size.x < 1e-4 || isVirtual) {
            s = 0.008 * (HTML_TUNE.scaleMul || 1) * (htmlScaleMul || 1);
          }
          cssObj.scale.setScalar(s);
          cssObj.rotation.y = THREE.MathUtils.degToRad(HTML_TUNE.rotYDeg);
          cssObj.visible = htmlVisible !== false; // default true; hide when explicitly false
          anchor.add(cssObj);
          // save refs for live updates
          screenObjRef.current = anchor;
          cssScreenRef.current = cssObj;
          screenCenterLocalRef.current = centerLocal.clone();
        }

        // Heuristic: collect window glass meshes by name
        const candidates = [];
        scene.traverse((o) => {
          if (o && o.isMesh) {
            const n = String(o.name || "").toLowerCase();
            if (n.includes("glass") || n.includes("window_glass") || n.includes("window")) {
              candidates.push(o);
            }
          }
        });
        windowGlassMeshesRef.current = candidates;
      }
    );

    // If requested, override all mesh materials to monochrome (still lit) after setup
    if (MONOCHROME_LIT) {
      forceAllMeshesToMonochromeLit(scene);
    }

    let raf = null;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      controls.update();
      if (spotHelperRef.current) spotHelperRef.current.update();
      // keep group orientation (no billboard), so it stays aligned with the window
      atmosphere.onFrame();
      // FPS meter
      {
        const now = performance.now();
        updateFps(now - (tick.prevTime || now));
        tick.prevTime = now;
      }
      // Optionally follow camera for overlay
      if (overlayFollowCamera && overlayGroupRef.current && camera) {
        const dist = typeof overlayFollowDist === "number" ? overlayFollowDist : 1.2;
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        const pos = camera.position.clone().add(forward.multiplyScalar(dist));
        overlayGroupRef.current.position.copy(pos);
        overlayGroupRef.current.lookAt(camera.position);
      }
      renderer.render(scene, camera);
      if (cssRendererRef.current) cssRendererRef.current.render(scene, camera);
    };
    tick();

    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      atmosphere.onResize(w, h);
      if (cssRendererRef.current) cssRendererRef.current.setSize(w, h);
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(container);

    // cleanup
    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      disposeEnv();
      if (controlsRef.current) {
        try {
          controlsRef.current.removeEventListener("change", handleControlsChange);
        } catch {}
      }
      // Cleanup overlay objects
      if (overlayPlaneRef.current) {
        if (overlayPlaneRef.current.parent) overlayPlaneRef.current.parent.remove(overlayPlaneRef.current);
        overlayPlaneRef.current.geometry && overlayPlaneRef.current.geometry.dispose();
        overlayPlaneRef.current = null;
      }
      if (overlayCssObjRef.current) {
        try {
          const obj = overlayCssObjRef.current;
          if (obj.parent) obj.parent.remove(obj);
        } catch {}
        overlayCssObjRef.current = null;
      }
      if (overlayMatRef.current) {
        overlayMatRef.current.dispose();
      }
      if (overlayTexRef.current && overlayTexRef.current.dispose) {
        overlayTexRef.current.dispose();
      }
      atmosphere.dispose();
      controls.dispose();
      if (cssRendererRef.current && cssRendererRef.current.domElement && cssRendererRef.current.domElement.parentNode) {
        cssRendererRef.current.domElement.parentNode.removeChild(cssRendererRef.current.domElement);
      }
      if (grainTimer) clearInterval(grainTimer);
      if (grain && grain.parentNode) grain.parentNode.removeChild(grain);
      if (vignette && vignette.parentNode) vignette.parentNode.removeChild(vignette);
      if (rendererRef.current) {
        rendererRef.current.dispose();
        const el = rendererRef.current.domElement;
        if (el && el.parentNode) el.parentNode.removeChild(el);
      }
      if (fpsEl && fpsEl.parentNode) fpsEl.parentNode.removeChild(fpsEl);
    };
  }, []);

  // Update blur dynamically if prop changes
  const filterDepsKey = "force-none";
  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    const el = r.domElement;
    if (!el) return;
    try {
      el.style.filter = "none";
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterDepsKey]);

  // Mirror external overlay index if provided
  useEffect(() => {
    if (typeof overlayIndexProp === "number" && overlayIndexProp !== overlayIndex) {
      setOverlayIndex(overlayIndexProp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlayIndexProp]);

  // Preload overlay textures for smooth instant switching
  useEffect(() => {
    const list = Array.isArray(overlaySeqList) ? overlaySeqList : [];
    if (list.length === 0) return;
    const cache = overlayTexCacheRef.current;
    const loader = new THREE.TextureLoader();
    let cancelled = false;
    list.forEach((url) => {
      if (!url || cache.has(url)) return;
      loader.load(
        url,
        (tex) => {
          if (cancelled) {
            tex.dispose && tex.dispose();
            return;
          }
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.needsUpdate = true;
          cache.set(url, tex);
        },
        undefined,
        () => {
          // ignore errors for preloads
        }
      );
    });
    return () => { cancelled = true; };
  }, [overlaySeqList]);

  // Allow external page control to drive HTML params (if provided)
  useEffect(() => {
    if (typeof initialHtmlDist === "number") setHtmlDist(initialHtmlDist);
  }, [initialHtmlDist]);
  useEffect(() => {
    if (typeof initialHtmlOffX === "number") setHtmlOffX(initialHtmlOffX);
    if (typeof initialHtmlOffY === "number") setHtmlOffY(initialHtmlOffY);
    if (typeof initialHtmlOffZ === "number") setHtmlOffZ(initialHtmlOffZ);
  }, [initialHtmlOffX, initialHtmlOffY, initialHtmlOffZ]);
  useEffect(() => {
    if (typeof initialHtmlScaleMul === "number") setHtmlScaleMul(initialHtmlScaleMul);
  }, [initialHtmlScaleMul]);

  // React to htmlVisible
  useEffect(() => {
    const cssObj = cssScreenRef.current;
    if (!cssObj) return;
    cssObj.visible = htmlVisible !== false;
  }, [htmlVisible]);

  // React to overlay visibility/transform
  useEffect(() => {
    const group = overlayGroupRef.current;
    if (!group) return;
    group.visible = !!overlayVisible;
    if (overlayPos && typeof overlayPos === "object") {
      const { x, y, z } = overlayPos;
      group.position.set(
        (typeof x === "number" ? x : group.position.x) + (overlayOffX || 0),
        (typeof y === "number" ? y : group.position.y) + (overlayOffY || 0),
        (typeof z === "number" ? z : group.position.z) + (overlayOffZ || 0)
      );
    }
    // Apply scale, with special handling for the last image (square)
    const applyScale = () => {
      const cssObj = overlayCssObjRef.current;
      const plane = overlayPlaneRef.current;
      const s = typeof overlayScale === "number" ? overlayScale : 1;
      const base = overlayBaseSizeRef.current || { w: 1.6, h: 0.9 };
      const useList = Array.isArray(overlaySeqList) && overlaySeqList.length > 0;
      const listCount = useList ? overlaySeqList.length : (typeof overlaySeqCount === "number" ? overlaySeqCount : 0);
      const isLast = listCount > 0 && overlayIndexRef.current === listCount - 1;
      const sx = isLast ? s * (base.h / base.w) : s;
      const sy = s;
      if (cssObj) cssObj.scale.set(sx, sy, 1);
      if (plane) plane.scale.set(sx, sy, 1);
    };
    applyScale();
  }, [overlayVisible, overlayPos, overlayScale, overlayOffX, overlayOffY, overlayOffZ, overlaySeqList, overlaySeqCount]);

  // React to overlay image URL changes
  useEffect(() => {
    // Prefer CSS3D outside image
    const el = overlayDomRef.current;
    if (el) {
      if (!overlayImageUrl || overlayImageUrl === "__WHITE__") {
        el.style.background = "#ffffff";
      } else {
        el.style.background = `url('${overlayImageUrl}') center / cover no-repeat`;
      }
      return;
    }
    if (!overlayImageUrl) return;
    const currMat = overlayMatRef.current;
    if (!currMat) return;
    const plane = overlayPlaneRef.current;
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    if (overlayDebugSolid) {
      currMat.map = null;
      currMat.color = new THREE.Color(overlayDebugColor || "#ff0000");
      currMat.depthTest = false;
      currMat.depthWrite = false;
      currMat.needsUpdate = true;
      if (plane) plane.renderOrder = 999;
      try { console.log("[room3d] DEBUG solid color (effect)"); } catch {}
      return;
    }
    if (overlayImageUrl === "__WHITE__") {
      // switch to plain white
      if (overlayTexRef.current && overlayTexRef.current.dispose) {
        overlayTexRef.current.dispose();
      }
      currMat.map = null;
      currMat.color = new THREE.Color(0xffffff);
      currMat.opacity = 1.0;
      currMat.depthTest = false;
      currMat.depthWrite = false;
      currMat.needsUpdate = true;
      overlayTexRef.current = null;
      if (plane) plane.renderOrder = 999;
      return;
    }
    loader.load(
      overlayImageUrl,
      (tex) => {
        if (cancelled) {
          tex.dispose && tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        if (overlayTexRef.current && overlayTexRef.current !== tex && overlayTexRef.current.dispose) {
          overlayTexRef.current.dispose();
        }
        currMat.map = tex;
        currMat.opacity = 1.0;
        currMat.depthTest = true;
        currMat.depthWrite = true;
        currMat.needsUpdate = true;
        overlayTexRef.current = tex;
        if (plane) plane.renderOrder = 0;
        try { console.log("[room3d] outside tex set ->", overlayImageUrl); } catch {}
      },
      undefined,
      () => { try { console.warn("[room3d] outside load error", overlayImageUrl); } catch {} }
    );
    return () => { cancelled = true; };
  }, [overlayImageUrl]);

  // Safe 2D image plane: react to URL/pos/scale changes
  useEffect(() => {
    const mat = img2dMatRef.current;
    if (!mat) return;
    try { console.log("[img2d] url change ->", img2dUrl); } catch {}

    // If we have window glass meshes, prefer direct texture replacement (best quality)
    if (windowGlassMeshesRef.current && windowGlassMeshesRef.current.length > 0) {
      const applyGlass = (url) => {
        if (!windowGlassMeshesRef.current) return;
        windowGlassMeshesRef.current.forEach((m) => {
          // Build/update MeshBasicMaterial
          const texToApply = url && url !== "__WHITE__"
            ? new THREE.TextureLoader().load(url, (t) => {
                t.colorSpace = THREE.SRGBColorSpace;
                t.flipY = false;
                t.needsUpdate = true;
              })
            : null;
          const basic = new THREE.MeshBasicMaterial({
            map: texToApply,
            color: texToApply ? 0xffffff : 0xffffff,
            transparent: true,
            depthWrite: false,
            toneMapped: false,
            side: THREE.DoubleSide,
          });
          // slight offset to avoid z-fighting with frame
          basic.polygonOffset = true;
          basic.polygonOffsetFactor = -1;
          basic.polygonOffsetUnits = -1;
          m.material = basic;
          m.material.needsUpdate = true;
          m.castShadow = false;
          m.receiveShadow = false;
        });
      };
      applyGlass(img2dUrl);
      // Hide auxiliary planes if glass is present
      if (img2dGroupRef.current) img2dGroupRef.current.visible = false;
      if (cssWindowGroupRef.current) cssWindowGroupRef.current.visible = false;
      return;
    }

    // update CSS window image if present
    if (cssWindowImgRef.current) {
      const el = cssWindowImgRef.current;
      if (!img2dUrl || img2dUrl === "__WHITE__") {
        el.src = "";
        el.style.background = "#ffffff";
      } else if (el.src !== img2dUrl) {
        el.style.background = "none";
        el.src = img2dUrl;
      }
    }
    if (!img2dUrl) {
      mat.map = null;
      mat.needsUpdate = true;
      return;
    }
    if (img2dUrl === "__WHITE__") {
      mat.map = null;
      mat.color = new THREE.Color(0xffffff);
      mat.needsUpdate = true;
      return;
    }
    const loader = new THREE.TextureLoader();
    let cancelled = false;
    loader.load(
      img2dUrl,
      (tex) => {
        if (cancelled) {
          tex.dispose && tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.flipY = false;
        tex.needsUpdate = true;
        mat.map = tex;
        mat.needsUpdate = true;
        try { console.log("[img2d] applied"); } catch {}
      },
      undefined,
      () => { try { console.warn("[img2d] load error:", img2dUrl); } catch {} }
    );
    return () => { cancelled = true; };
  }, [img2dUrl]);

  // Reactively create/update CSS3D window image when enabled (step >= 2)
  useEffect(() => {
    const scene = sceneRef.current;
    const cssR = cssRendererRef.current;
    if (!scene || !cssR) return;
    if (enableCssWindow) {
      // create on demand
      if (!cssWindowGroupRef.current) {
        const group = new THREE.Object3D();
        scene.add(group);
        cssWindowGroupRef.current = group;
        const el = document.createElement("img");
        el.style.width = "480px";
        el.style.height = "270px";
        el.style.objectFit = "cover";
        el.style.pointerEvents = "none";
        el.draggable = false;
        const cssObj = new CSS3DObject(el);
        cssWindowObjRef.current = cssObj;
        cssWindowImgRef.current = el;
        group.add(cssObj);
      }
      // position/scale
      const g = cssWindowGroupRef.current;
      const cssObj = cssWindowObjRef.current;
      if (g && img2dPos) {
        const { x, y, z } = img2dPos;
        g.position.set(x ?? g.position.x, y ?? g.position.y, z ?? g.position.z);
      }
      if (cssObj) {
        const s2 = typeof img2dScale === "number" ? img2dScale : 1.2;
        cssObj.scale.set(s2, s2, 1);
      }
      // image src
      const el = cssWindowImgRef.current;
      if (el) {
        if (!img2dUrl || img2dUrl === "__WHITE__") {
          el.src = "";
          el.style.background = "#ffffff";
        } else if (el.getAttribute("src") !== img2dUrl) {
          el.style.background = "none";
          el.setAttribute("src", img2dUrl);
        }
      }
      // ensure visible
      if (cssWindowGroupRef.current) cssWindowGroupRef.current.visible = true;
    } else {
      if (cssWindowGroupRef.current) cssWindowGroupRef.current.visible = false;
    }
  }, [
    enableCssWindow,
    img2dUrl,
    img2dScale,
    img2dPos && img2dPos.x,
    img2dPos && img2dPos.y,
    img2dPos && img2dPos.z,
  ]);
  useEffect(() => {
    // CSS window group
    if (cssWindowGroupRef.current && img2dPos) {
      const g = cssWindowGroupRef.current;
      const { x, y, z } = img2dPos;
      g.position.set(x ?? g.position.x, y ?? g.position.y, z ?? g.position.z);
    }
    const group = img2dGroupRef.current;
    if (!group || !img2dPos) return;
    const { x, y, z } = img2dPos;
    group.position.set(x ?? group.position.x, y ?? group.position.y, z ?? group.position.z);
  }, [img2dPos && img2dPos.x, img2dPos && img2dPos.y, img2dPos && img2dPos.z]);
  useEffect(() => {
    if (cssWindowObjRef.current) {
      const cssObj = cssWindowObjRef.current;
      const s2 = typeof img2dScale === "number" ? img2dScale : 1.2;
      cssObj.scale.set(s2, s2, 1);
    }
    const plane = img2dPlaneRef.current;
    if (!plane) return;
    const s2 = typeof img2dScale === "number" ? img2dScale : 1.2;
    plane.scale.setScalar(s2);
  }, [img2dScale]);

  // Opacity updates for img2d (both WebGL plane and CSS3D image)
  useEffect(() => {
    if (img2dMatRef.current && typeof img2dOpacity === "number") {
      const mat = img2dMatRef.current;
      mat.transparent = img2dOpacity < 1;
      mat.opacity = Math.max(0, Math.min(1, img2dOpacity));
      mat.needsUpdate = true;
    }
    if (cssWindowImgRef.current && typeof img2dOpacity === "number") {
      cssWindowImgRef.current.style.opacity = String(Math.max(0, Math.min(1, img2dOpacity)));
    }
  }, [img2dOpacity]);

  // Update screen 2x2 grid images live when provided
  useEffect(() => {
    if (!Array.isArray(screenGridImages) || screenGridImages.length === 0) return;
    const iframe = cssIframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;
      const imgs = doc.querySelectorAll(".cell img");
      for (let i = 0; i < imgs.length; i++) {
        const el = imgs[i];
        const url = screenGridImages[i] || screenGridImages[screenGridImages.length - 1];
        if (el && typeof url === "string" && el.getAttribute("src") !== url) {
          el.setAttribute("src", url);
        }
      }
    } catch {}
  }, [screenGridImages && screenGridImages.join("|")]);

  // Smoothly drive overlay opacity to a target [0..1]
  useEffect(() => {
    const el = overlayDomRef.current;
    if (el && overlayOpacityTarget !== undefined && overlayOpacityTarget !== null) {
      const start = Number(el.style.opacity || 1);
      const end = THREE.MathUtils.clamp(overlayOpacityTarget, 0, 1);
      if (Math.abs(end - start) < 1e-6) return;
      let raf = null;
      const t0 = performance.now();
      const dur = Math.max(100, overlayOpacityLerp || 900);
      const step = (now) => {
        const u = Math.min(1, (now - t0) / dur);
        const s = u * u * (3 - 2 * u);
        const a = start + (end - start) * s;
        el.style.opacity = String(a);
        if (u < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      return () => raf && cancelAnimationFrame(raf);
    }
    const mat = overlayMatRef.current;
    const matN = overlayNextMatRef.current;
    if (!mat && !matN) return;
    if (overlayOpacityTarget === undefined || overlayOpacityTarget === null) return;
    const start = typeof (mat ? mat.opacity : 1.0) === "number" ? (mat ? mat.opacity : 1.0) : 1.0;
    const end = THREE.MathUtils.clamp(overlayOpacityTarget, 0, 1);
    if (Math.abs(end - start) < 1e-6) return;
    let raf = null;
    const t0 = performance.now();
    const dur = Math.max(100, overlayOpacityLerp || 900);
    const step = (now) => {
      const u = Math.min(1, (now - t0) / dur);
      const s = u * u * (3 - 2 * u);
      const a = start + (end - start) * s;
      if (mat) { mat.opacity = a; mat.needsUpdate = true; }
      if (matN) { matN.opacity = a; matN.needsUpdate = true; }
      if (u < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => raf && cancelAnimationFrame(raf);
  }, [overlayOpacityTarget, overlayOpacityLerp]);

  // If a sequence/list is provided, update overlay image index based on UI overlayIndex (step >= 2)
  useEffect(() => {
    const useList = Array.isArray(overlaySeqList) && overlaySeqList.length > 0;
    const listCount = useList ? overlaySeqList.length : (typeof overlaySeqCount === "number" ? overlaySeqCount : 0);
    if (!useList && !overlaySeqPrefix) return;
    if (!overlayGroupRef.current) return;
    if (!overlayVisible) return;
    const idx = Math.max(0, Math.min(Math.max(1, listCount) - 1, Math.floor(overlayIndex)));
    if (idx === overlayIndexRef.current) return;
    // instant switch to new index (no crossfade)
    const currMat = overlayMatRef.current;
    const group = overlayGroupRef.current;
    if (!currMat || !group) { overlayIndexRef.current = idx; return; }
    // Cancel any pending crossfade animation
    if (overlaySlideRafRef.current) {
      cancelAnimationFrame(overlaySlideRafRef.current);
      overlaySlideRafRef.current = null;
    }
    const url = useList ? overlaySeqList[idx] : `${overlaySeqPrefix}${String(idx + 1)}${overlaySeqExt}`;
    const cache = overlayTexCacheRef.current;
    const cached = cache.get(url);
    if (cached) {
      if (overlayTexRef.current && overlayTexRef.current !== cached && overlayTexRef.current.dispose) {
        overlayTexRef.current.dispose();
      }
      currMat.map = cached;
      currMat.opacity = 1.0;
      currMat.needsUpdate = true;
      overlayTexRef.current = cached;
      overlayIndexRef.current = idx;
      // Re-apply scale for last image (square)
      const base = overlayBaseSizeRef.current || { w: 1.6, h: 0.9 };
      const sNow = typeof overlayScale === "number" ? overlayScale : 1;
      const isLast = listCount > 0 && idx === listCount - 1;
      if (isLast) {
        const sx = sNow * (base.h / base.w);
        const sy = sNow;
        if (overlayPlaneRef.current) overlayPlaneRef.current.scale.set(sx, sy, 1);
      } else {
        if (overlayPlaneRef.current) overlayPlaneRef.current.scale.set(sNow, sNow, 1);
      }
      return;
    }
    const loader = new THREE.TextureLoader();
    let cancelled = false;
    loader.load(
      url,
      (tex) => {
        if (cancelled) {
          tex.dispose && tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        cache.set(url, tex);
        if (overlayTexRef.current && overlayTexRef.current !== tex && overlayTexRef.current.dispose) {
          overlayTexRef.current.dispose();
        }
        currMat.map = tex;
        currMat.opacity = 1.0;
        currMat.needsUpdate = true;
        overlayTexRef.current = tex;
        overlayIndexRef.current = idx;
        // Re-apply scale for last image (square)
        const base = overlayBaseSizeRef.current || { w: 1.6, h: 0.9 };
        const sNow = typeof overlayScale === "number" ? overlayScale : 1;
        const isLast = listCount > 0 && idx === listCount - 1;
        if (isLast) {
          const sx = sNow * (base.h / base.w);
          const sy = sNow;
          if (overlayPlaneRef.current) overlayPlaneRef.current.scale.set(sx, sy, 1);
        } else {
          if (overlayPlaneRef.current) overlayPlaneRef.current.scale.set(sNow, sNow, 1);
        }
      },
      undefined,
      () => {
        // ignore load error; keep current
      }
    );
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    overlayIndex,
    overlayVisible,
    (Array.isArray(overlaySeqList) ? overlaySeqList.length : 0),
    overlaySeqPrefix,
    overlaySeqCount,
    overlaySeqExt,
    overlayScale,
    overlaySlideLerp,
  ]);

  // Live update of HTML position when slider changes
  useEffect(() => {
    const screen = screenObjRef.current;
    const cssObj = cssScreenRef.current;
    const centerLocal = screenCenterLocalRef.current;
    if (!screen || !cssObj || !centerLocal) return;
    // reset to base
    cssObj.position.copy(centerLocal);
    cssObj.position.x += HTML_TUNE.offsetX + (htmlOffset?.x || 0) + (htmlOffX || 0);
    cssObj.position.y += HTML_TUNE.offsetY + (htmlOffset?.y || 0) + (htmlOffY || 0);
    cssObj.position.z += HTML_TUNE.offsetZ + (htmlOffset?.z || 0) + (htmlOffZ || 0);
    const dir = new THREE.Vector3(
      HTML_TUNE.axisX || 0,
      HTML_TUNE.axisY || 0,
      HTML_TUNE.axisZ || 0
    );
    if (dir.lengthSq() > 0) {
      dir.normalize().multiplyScalar(htmlDist || 0);
      cssObj.position.add(dir);
    }
    // scale live
    // estimate base width again from screen bbox
    const bbox = new THREE.Box3().setFromObject(screen);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const baseScale = THREE.MathUtils.clamp((size.x / 200) || 0.005, 0.002, 0.02) * (HTML_TUNE.scaleMul || 1);
    cssObj.scale.setScalar(baseScale * (htmlScaleMul || 1));
    cssObj.rotation.y = THREE.MathUtils.degToRad(HTML_TUNE.rotYDeg || 0);
    cssObj.updateMatrixWorld();
  }, [htmlDist, htmlOffset, htmlOffX, htmlOffY, htmlOffZ, htmlScaleMul]);

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
      const baseD = baseZoomDistRef.current ?? camera.position.distanceTo(controls.target);
      const cap = (typeof baseD === "number" && isFinite(baseD)) ? baseD * MAX_ZOOM_OUT_FACTOR : Infinity;
      controls.maxDistance = cap;
    }
    if (lockTilt) {
      controls.minPolarAngle = spherical.phi;
      controls.maxPolarAngle = spherical.phi;
    } else {
      controls.minPolarAngle = 0.01;
      controls.maxPolarAngle = Math.PI - 0.01;
    }
    if (props.staticView) {
      controls.enabled = false;
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.enableRotate = false;
    } else {
      controls.enableZoom = zoomOnly ? true : enableZoom;
      controls.enablePan = zoomOnly ? false : enablePan;
      controls.enableRotate = zoomOnly ? false : true;
    }
    controls.update();
  }, [camX, camY, camZ, lockDistance, lockTilt, enableZoom, enablePan, zoomOnly, props.staticView]);

  // Smooth camera move to external target (used by /room page buttons)
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    const target = (props && props.cameraTarget) || null;
    if (!target) return;
    const cam = cameraRef.current;
    const controls = controlsRef.current;
    const start = cam.position.clone();
    const end = new THREE.Vector3(
      target.x ?? start.x,
      target.y ?? start.y,
      target.z ?? start.z
    );
    let raf = null;
    const t0 = performance.now();
    const dur = Math.max(100, (props && props.cameraLerp) || 900);
    const step = (now) => {
      const u = Math.min(1, (now - t0) / dur);
      const s = u * u * (3 - 2 * u);
      cam.position.lerpVectors(start, end, s);
      cam.updateProjectionMatrix();
      if (controls) {
        controls.target.set(0, 0, 0);
        controls.update();
      }
      if (u < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => raf && cancelAnimationFrame(raf);
  }, [props && props.cameraTarget, props && props.cameraLerp]);

  // Slight yaw around Y-axis (rotate camera around current controls.target)
  useEffect(() => {
    const yawDeg = (props && props.yawDegTarget) || 0;
    const trigger = props && props.yawTrigger;
    const lerpMs = Math.max(120, (props && props.yawLerp) || 700);
    const delayMs = Math.max(0, (props && props.yawDelayMs) || 0);
    if (!cameraRef.current || !controlsRef.current) return;
    if (!Number.isFinite(yawDeg) || Math.abs(yawDeg) < 1e-3) return;
    const cam = cameraRef.current;
    const ctr = controlsRef.current;
    const target = ctr.target.clone();
    const startRel = cam.position.clone().sub(target);
    const sph = new THREE.Spherical().setFromVector3(startRel);
    const startTheta = sph.theta;
    const endTheta = startTheta + THREE.MathUtils.degToRad(yawDeg);
    let raf = null;
    let timer = null;
    const startAnim = () => {
      const t0 = performance.now();
      const step = (now) => {
        const u = Math.min(1, (now - t0) / lerpMs);
        const s = u * u * (3 - 2 * u);
        const curTheta = startTheta + (endTheta - startTheta) * s;
        const curSph = new THREE.Spherical(sph.radius, sph.phi, curTheta);
        const curRel = new THREE.Vector3().setFromSpherical(curSph);
        const curPos = target.clone().add(curRel);
        cam.position.copy(curPos);
        cam.updateProjectionMatrix();
        ctr.update();
        if (u < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    if (delayMs > 0) {
      timer = setTimeout(startAnim, delayMs);
    } else {
      startAnim();
    }
    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props && props.yawDegTarget, props && props.yawLerp, props && props.yawTrigger]);

  // Smoothly move OrbitControls target if provided
  useEffect(() => {
    if (!controlsRef.current) return;
    const target = (props && props.controlsTarget) || null;
    if (!target) return;
    const controls = controlsRef.current;
    const start = controls.target.clone();
    const end = new THREE.Vector3(
      target.x ?? start.x,
      target.y ?? start.y,
      target.z ?? start.z
    );
    let raf = null;
    const t0 = performance.now();
    const dur = Math.max(100, (props && props.controlsLerp) || 900);
    const step = (now) => {
      const u = Math.min(1, (now - t0) / dur);
      const s = u * u * (3 - 2 * u);
      const cur = start.clone().lerp(end, s);
      controls.target.copy(cur);
      controls.update();
      if (u < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => raf && cancelAnimationFrame(raf);
  }, [props && props.controlsTarget, props && props.controlsLerp]);

  // Smoothly adjust pin light intensity
  useEffect(() => {
    const pin = pinRef.current;
    if (!pin) return;
    if (pinIntensityTarget === undefined || pinIntensityTarget === null) return;
    const start = pin.intensity ?? 0;
    const end = pinIntensityTarget;
    if (Math.abs(end - start) < 1e-6) return;
    let raf = null;
    const t0 = performance.now();
    const dur = Math.max(100, pinIntensityLerp || 900);
    const step = (now) => {
      const u = Math.min(1, (now - t0) / dur);
      const s = u * u * (3 - 2 * u);
      const v = start + (end - start) * s;
      pin.intensity = v;
      if (u < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => raf && cancelAnimationFrame(raf);
  }, [pinIntensityTarget, pinIntensityLerp]);
  // Smooth light move to external target (used by /room page buttons)
  useEffect(() => {
    const target = (props && props.lightTarget) || null;
    if (!target) return;
    const start = { x: lightX, y: lightY, z: lightZ };
    const end = {
      x: target.x ?? start.x,
      y: target.y ?? start.y,
      z: target.z ?? start.z,
    };
    let raf = null;
    const t0 = performance.now();
    const dur = Math.max(100, (props && props.lightLerp) || 900);
    const step = (now) => {
      const u = Math.min(1, (now - t0) / dur);
      const s = u * u * (3 - 2 * u);
      const ny = start.y + (end.y - start.y) * s;
      setLightY(ny);
      if (u < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => raf && cancelAnimationFrame(raf);
  }, [props && props.lightTarget, props && props.lightLerp]);

  // Smoothly drive the color/light path slider (lightProgress) to a target [0..1]
  useEffect(() => {
    if (progressTarget === undefined || progressTarget === null) return;
    const start = lightProgress;
    const end = THREE.MathUtils.clamp(progressTarget, 0, 1);
    if (Math.abs(end - start) < 1e-6) return;
    let raf = null;
    const t0 = performance.now();
    const dur = Math.max(100, progressLerp || 900);
    const step = (now) => {
      const u = Math.min(1, (now - t0) / dur);
      const s = u * u * (3 - 2 * u);
      const v = start + (end - start) * s;
      setLightProgress(v);
      if (u < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => raf && cancelAnimationFrame(raf);
  }, [progressTarget, progressLerp, progressTrigger]);

  // React to light state
  useEffect(() => {
    if (!spotRef.current) return;
    spotRef.current.position.set(lightX, lightY, lightZ);
    spotRef.current.updateMatrixWorld();
  }, [lightX, lightY, lightZ]);

  // Map progress 0..1 to X/Z as specified:
  // 0..0.5: move X from xMin -> xMax, Z fixed zStart
  // 0.5..1: X fixed xMax, move Z from zStart -> zEnd
  useEffect(() => {
    const p = THREE.MathUtils.clamp(lightProgress, 0, 1);
    if (p <= 0.5) {
      const t = p / 0.5;
      const nx = THREE.MathUtils.lerp(PATH.xMin, PATH.xMax, t);
      setLightX(nx);
      setLightZ(PATH.zStart);
    } else {
      const t = (p - 0.5) / 0.5;
      setLightX(PATH.xMax);
      const nz = THREE.MathUtils.lerp(PATH.zStart, PATH.zEnd, t);
      setLightZ(nz);
    }
  }, [lightProgress, PATH]);

  // Multi-stop color transition (yellow → light blue → white → light pink → orange → blue → night)
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    // Landing 등 컬러 비적용 구간: 중립 톤으로 고정
    if (disableColorMapping) {
      const ambLight = scene.children.find((c) => c.isLight && c.type === "AmbientLight");
      if (ambLight) ambLight.color.set("#ffffff");
      scene.background = new THREE.Color(0xf2f2f2);
      if (spotRef.current) spotRef.current.color.set("#ffffff");
      return;
    }
    // compute progress from current X/Z
    let p = 0.0;
    if (Math.abs(lightZ - PATH.zStart) < Math.abs(PATH.zEnd - PATH.zStart) * 0.25) {
      // first leg
      const t = (lightX - PATH.xMin) / (PATH.xMax - PATH.xMin || 1e-6);
      p = THREE.MathUtils.clamp(t, 0, 1) * 0.5;
    } else {
      // second leg
      const t = (lightZ - PATH.zStart) / (PATH.zEnd - PATH.zStart || 1e-6);
      p = 0.5 + THREE.MathUtils.clamp(t, 0, 1) * 0.5;
    }
    const lerpPalette = (palette, t) => {
      const n = palette.length;
      if (n === 0) return new THREE.Color("#ffffff");
      if (t <= 0) return new THREE.Color(palette[0]);
      if (t >= 1) return new THREE.Color(palette[n - 1]);
      const seg = (n - 1) * t;
      const i = Math.floor(seg);
      const f = seg - i;
      const c1 = new THREE.Color(palette[i]);
      const c2 = new THREE.Color(palette[i + 1]);
      return c1.lerp(c2, f);
    };
    // palettes (soft, non-primary “emotional” tones) - 원래 순서 유지
    // p=0 쪽이 아침, p=1 쪽이 밤에 가깝도록 구성
    // 전체 방은 한 톤 더 어둡게, 창/책상 위 빛만 강조되도록 배경 계열을 어둡게 조정
    const ambPalette = ["#b8c7e0", "#c2d6f0", "#d4d9e8", "#d5c3d6", "#d2a67a", "#a5b7e5", "#12131b"];
    const bgPalette  = ["#272934", "#2b3040", "#303545", "#332a38", "#372721", "#2b3244", "#08090f"];
    const spotPalette= ["#ffd48a", "#cbe1ff", "#ffffff", "#ffc2da", "#ff8d36", "#9ab7ff", "#b0c0ff"];

    // 색상 보간은 진행값 p와 같은 방향으로
    const ambCol = lerpPalette(ambPalette, p);
    let bgCol    = lerpPalette(bgPalette, p);
    const spotCol= lerpPalette(spotPalette, p);

    // Emphasize outdoor color:
    // - Daytime: push toward sky blue
    // - Sunset: push strongly toward warm orange
    const smoothstep = (edge0, edge1, x) => {
      const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
      return t * t * (3 - 2 * t);
    };
    const skyBlue = new THREE.Color("#84c8ff");
    const strongSunset = new THREE.Color("#ff8a3e");
    // 낮/석양 강조는 p 기준 위치 사용 (낮≈0.25, 석양≈0.70)
    const dayW = smoothstep(0.10, 0.35, 1 - Math.abs(p - 0.25) * 4);
    const sunsetW = smoothstep(0.55, 0.80, 1 - Math.abs(p - 0.70) * 5);
    if (dayW > 0) bgCol.lerp(skyBlue, THREE.MathUtils.clamp(dayW * 0.6, 0, 1));
    if (sunsetW > 0) bgCol.lerp(strongSunset, THREE.MathUtils.clamp(sunsetW * 0.85, 0, 1));

    // ambient
    const ambLight = scene.children.find((c) => c.isLight && c.type === "AmbientLight");
    if (ambLight) ambLight.color.copy(ambCol);
    // background
    scene.background = bgCol;
    // spot color
    if (spotRef.current) spotRef.current.color.copy(spotCol);
  }, [lightX, lightZ]);

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
              onClick={(e) => {
                if (e.shiftKey) {
                  // Save current camera to preset 3
                  setPreset3Cam({ x: camX, y: camY, z: camZ });
                } else if (preset3Cam) {
                  // Recall saved camera
                  setCamX(preset3Cam.x);
                  setCamY(preset3Cam.y);
                  setCamZ(preset3Cam.z);
                  setEnableZoom(true);
                  setEnablePan(false);
                  setLockDistance(false);
                  setLockTilt(true);
                }
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
            <button onClick={() => { setLightX(-1.2); setLightY(10.2); setLightZ(-22.7); }} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #6b5bd4", background: "#1a1f2e", color: "#e5e7eb", cursor: "pointer" }}>3</button>
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
      {showPathSlider && (
        <div
          style={{
            position: "fixed",
            top: 10,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 70,
            display: "flex",
            alignItems: "center",
            gap: 18,
            background: "rgba(17,19,24,.6)",
            border: "1px solid #23262d",
            borderRadius: 10,
            padding: "8px 12px",
            backdropFilter: "blur(4px)",
          }}
        >
          <span style={{ color: "#bfc3ca", fontSize: 12, minWidth: 70, textAlign: "right" }}>Light Path</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={lightProgress}
            onChange={(e) => setLightProgress(parseFloat(e.target.value))}
            style={{ width: 220 }}
          />
          <span style={{ color: "#bfc3ca", fontSize: 12 }}>{lightProgress.toFixed(3)}</span>
        </div>
      )}
      {showHtmlSliders && (
        <div
          style={{
            position: "fixed",
            top: 52,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 70,
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "rgba(17,19,24,.6)",
            border: "1px solid #23262d",
            borderRadius: 10,
            padding: "8px 12px",
            backdropFilter: "blur(4px)",
          }}
        >
          <span style={{ color: "#bfc3ca", fontSize: 12 }}>HTML X</span>
          <input type="range" min={-40} max={40} step={0.001} value={htmlOffX} onChange={(e) => setHtmlOffX(parseFloat(e.target.value))} style={{ width: 160 }} />
          <span style={{ color: "#bfc3ca", fontSize: 12, width: 70, textAlign: "right" }}>{htmlOffX.toFixed(3)}</span>
          <span style={{ color: "#bfc3ca", fontSize: 12, marginLeft: 10 }}>Y</span>
          <input type="range" min={-40} max={40} step={0.001} value={htmlOffY} onChange={(e) => setHtmlOffY(parseFloat(e.target.value))} style={{ width: 160 }} />
          <span style={{ color: "#bfc3ca", fontSize: 12, width: 70, textAlign: "right" }}>{htmlOffY.toFixed(3)}</span>
          <span style={{ color: "#bfc3ca", fontSize: 12, marginLeft: 10 }}>Z</span>
          <input type="range" min={-40} max={40} step={0.001} value={htmlOffZ} onChange={(e) => setHtmlOffZ(parseFloat(e.target.value))} style={{ width: 160 }} />
          <span style={{ color: "#bfc3ca", fontSize: 12, width: 70, textAlign: "right" }}>{htmlOffZ.toFixed(3)}</span>
          <span style={{ color: "#bfc3ca", fontSize: 12, marginLeft: 12 }}>Scale</span>
          <input type="range" min={0.2} max={80} step={0.001} value={htmlScaleMul} onChange={(e) => setHtmlScaleMul(parseFloat(e.target.value))} style={{ width: 160 }} />
          <span style={{ color: "#bfc3ca", fontSize: 12, width: 70, textAlign: "right" }}>{htmlScaleMul.toFixed(3)}</span>
        </div>
      )}
      {!hideUI && (
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
        </>
      )}
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


