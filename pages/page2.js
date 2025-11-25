"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { io } from "socket.io-client";
import LandingVideoCRT from "@/components/desktop/page2/LandingVideoCRT";
import WindowsScatter from "@/components/desktop/page2/WindowsScatter";
import WindowsArrangeTransition from "@/components/desktop/page2/WindowsArrangeTransition";
import WindowsArrangeGrid from "@/components/desktop/page2/WindowsArrangeGrid";
import CenterPrompt from "@/components/desktop/page2/CenterPrompt";
import FadeOverlay from "@/components/desktop/page2/FadeOverlay";
import EdgeNav from "@/components/desktop/page2/EdgeNav";
import { getTimeSlotFromProgress, buildRandomGenimgUrlForTime } from "@/lib/mood-select";
import { FOLDER_TO_MOOD } from "@/lib/mood-config";

export default function Page2() {
  const [show, setShow] = useState(false);
  const vidRef = useRef(null);
  const [fadeVideo, setFadeVideo] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showWindows, setShowWindows] = useState(false);
  const [stage, setStage] = useState(0); // 0: video, 1: prompt, 2: windows
  // Clarity animation and camera integration
  const [clarity, setClarity] = useState(0); // 0 -> blurred, 1 -> clear
  const clarityRafRef = useRef(null);
  const [camTargets, setCamTargets] = useState([]);
  const [camImages, setCamImages] = useState([]);
  const camVideoRef = useRef(null);
  const camCanvasRef = useRef(null);
  const camStreamRef = useRef(null);
  const camCaptureTimerRef = useRef(null);
  const router = useRouter();
  const autoTimerRef = useRef(null);
  const promptTimerRef = useRef(null);
  const questionTimerRef = useRef(null);
  const navTimerRef = useRef(null);
  const isResetRef = useRef(false);
  const [showQuestion, setShowQuestion] = useState(false);
  const [arranged, setArranged] = useState(false);
  const [arranging, setArranging] = useState(false);
  const [transitionStart, setTransitionStart] = useState(false);
  // Removed mosaic/zoomOut sequence — keep scatter simple
  const [survivors, setSurvivors] = useState([]); // indices to keep (9)
  const [targets, setTargets] = useState([]); // target rects for survivors
  // Color mood set (applied as overlay/filter to unify tone)
  const moods = useMemo(
    () => [
      // Stronger overlays + filters to better unify tone across all tiles
      { name: "warm",    overlay: "rgba(255,150,90,0.36)",  filter: "saturate(1.18) contrast(1.08) hue-rotate(12deg) brightness(1.02)" },
      { name: "cool",    overlay: "rgba(90,160,255,0.34)",  filter: "saturate(1.12) contrast(1.07) hue-rotate(-14deg) brightness(1.02)" },
      { name: "forest",  overlay: "rgba(70,180,120,0.34)",  filter: "saturate(1.2) contrast(1.06) hue-rotate(28deg)" },
      { name: "violet",  overlay: "rgba(150,110,255,0.34)", filter: "saturate(1.18) contrast(1.08) hue-rotate(260deg)" },
      { name: "gold",    overlay: "rgba(255,210,90,0.34)",  filter: "saturate(1.22) contrast(1.08) hue-rotate(6deg) brightness(1.03)" },
      { name: "teal",    overlay: "rgba(70,210,200,0.32)",  filter: "saturate(1.15) contrast(1.06) hue-rotate(180deg)" },
      { name: "rose",    overlay: "rgba(255,120,160,0.34)", filter: "saturate(1.22) contrast(1.07) hue-rotate(318deg)" },
      { name: "mono",    overlay: "rgba(0,0,0,0.12)",       filter: "grayscale(0.75) contrast(1.12) brightness(0.98)" },
    ],
    []
  );
  const [moodIndex, setMoodIndex] = useState(0);
  const nextMood = useCallback(() => {
    setMoodIndex((i) => (i + 1) % Math.max(1, moods.length));
  }, [moods.length]);
  const prevMood = useCallback(() => {
    setMoodIndex((i) => (i - 1 + Math.max(1, moods.length)) % Math.max(1, moods.length));
  }, [moods.length]);
  // Scroll pulse direction for arranged grid ("up" | "down" | null) and key to re-trigger animation
  const [scrollPulseDir, setScrollPulseDir] = useState(null);
  const [scrollPulseKey, setScrollPulseKey] = useState(0);
  const triggerPulse = useCallback((dir) => {
    setScrollPulseDir(dir);
    setScrollPulseKey((k) => k + 1);
  }, []);
  function clearTimers() {
    if (autoTimerRef.current) { clearTimeout(autoTimerRef.current); autoTimerRef.current = null; }
    if (promptTimerRef.current) { clearTimeout(promptTimerRef.current); promptTimerRef.current = null; }
    if (questionTimerRef.current) { clearTimeout(questionTimerRef.current); questionTimerRef.current = null; }
    if (navTimerRef.current) { clearTimeout(navTimerRef.current); navTimerRef.current = null; }
  }
  const stopClarityAnim = useCallback(() => {
    if (clarityRafRef.current) { cancelAnimationFrame(clarityRafRef.current); clarityRafRef.current = null; }
  }, []);
  const startClarityAnim = useCallback(() => {
    stopClarityAnim();
    setClarity(0);
    const startTs = performance.now();
    const dur = 3200;
    const step = (ts) => {
      const t = Math.min(1, (ts - startTs) / dur);
      // ease-out
      const eased = 1 - Math.pow(1 - t, 3);
      setClarity(eased);
      if (t < 1) {
        clarityRafRef.current = requestAnimationFrame(step);
      } else {
        clarityRafRef.current = null;
      }
    };
    clarityRafRef.current = requestAnimationFrame(step);
  }, [stopClarityAnim]);
  const stopCamera = useCallback(() => {
    try {
      if (camCaptureTimerRef.current) { clearInterval(camCaptureTimerRef.current); camCaptureTimerRef.current = null; }
      const s = camStreamRef.current;
      if (s) {
        s.getTracks().forEach((tr) => { try { tr.stop(); } catch {} });
        camStreamRef.current = null;
      }
      setCamImages([]);
    } catch {}
  }, []);
  const startCamera = useCallback(async () => {
    try {
      // choose 4 smallest windows by area to attach camera
      const areas = windows.map((w, idx) => ({ idx, area: (w.widthVw || parseFloat(w.width)) * (w.heightVh || parseFloat(w.height)) }));
      areas.sort((a, b) => a.area - b.area);
      const picks = areas.slice(0, 4).map((e) => e.idx);
      setCamTargets(picks);
      // init stream
      const stream = await navigator.mediaDevices?.getUserMedia?.({ video: { width: 640, height: 480 }, audio: false });
      if (!stream) return;
      camStreamRef.current = stream;
      if (!camVideoRef.current) {
        camVideoRef.current = document.createElement("video");
        camVideoRef.current.setAttribute("playsinline", "");
        camVideoRef.current.muted = true;
        camVideoRef.current.autoplay = true;
        camVideoRef.current.style.display = "none";
        document.body.appendChild(camVideoRef.current);
      }
      camVideoRef.current.srcObject = stream;
      await camVideoRef.current.play().catch(() => {});
      if (!camCanvasRef.current) {
        camCanvasRef.current = document.createElement("canvas");
        camCanvasRef.current.width = 640;
        camCanvasRef.current.height = 480;
      }
      const ctx = camCanvasRef.current.getContext("2d");
      camCaptureTimerRef.current = setInterval(() => {
        try {
          const vw = camVideoRef.current.videoWidth || 640;
          const vh = camVideoRef.current.videoHeight || 480;
          camCanvasRef.current.width = vw;
          camCanvasRef.current.height = vh;
          ctx.drawImage(camVideoRef.current, 0, 0, vw, vh);
          const url = camCanvasRef.current.toDataURL("image/jpeg", 0.72);
          setCamImages((prev) => {
            const next = [...prev];
            if (next.length < 4) next.push(url); else next[(Date.now() >> 12) % 4] = url;
            return next;
          });
        } catch {}
      }, 900);
    } catch {
      // ignore if denied
    }
  }, []);
  const goToStage = useCallback((s) => {
    clearTimers();
    setStage(s);
    if (s === 0) {
      try { socketRef.current?.emit("moodScroll:disable"); } catch {}
      setFadeVideo(false);
      setShowPrompt(false);
      setShowWindows(false);
      setShowQuestion(false);
      setArranged(false);
      setClarity(0);
      stopClarityAnim();
      stopCamera();
      const v = vidRef.current;
      if (v) {
        try { v.currentTime = 0; } catch {}
        const p = v.play?.();
        if (p && typeof p.catch === "function") p.catch(() => {});
      }
    } else if (s === 1) {
      try { socketRef.current?.emit("moodScroll:disable"); } catch {}
      setFadeVideo(true);
      setShowWindows(false);
      setShowPrompt(false);
      setShowQuestion(false);
      setArranged(false);
      setClarity(0);
      stopClarityAnim();
      stopCamera();
      // Hide prompt after 2s
      promptTimerRef.current = setTimeout(() => setShowPrompt(false), 2000);
      // Auto advance to windows after ~2.6s
      autoTimerRef.current = setTimeout(() => goToStage(2), 2600);
    } else if (s === 2) {
      try { socketRef.current?.emit("moodScroll:enable"); } catch {}
      setMoodLocked(false);
      moodLockedRef.current = false;
      setFadeVideo(true);
      setShowPrompt(false);
      setShowWindows(true);
      setArranged(false);
      setShowQuestion(true);
      startClarityAnim();
      startCamera();
    }
  }, [clearTimers, startClarityAnim, startCamera, stopCamera, stopClarityAnim]);
  const windows = useMemo(() => {
    // Stable pseudo-random layout for 16 windows, evenly spread with aesthetic aspect ratios
    const rnd = (seed) => {
      let x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };
    const phi = 1.61803398875;
    const ratioPalette = [1, 4/3, 3/4, 16/9, 9/16, phi, 1/phi];
    const arr = [];
    const count = 24; // reduced number of OS windows
    // grid buckets to avoid clustering and to fill top-left as well
    const cols = 5, rows = 4;
    const cells = [];
    for (let gy = 0; gy < rows; gy++) for (let gx = 0; gx < cols; gx++) cells.push({ gx, gy });
    // Fisher–Yates shuffle with deterministic rnd
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(rnd(i + 101) * (i + 1));
      const t = cells[i]; cells[i] = cells[j]; cells[j] = t;
    }
    // Ensure a cell at top-left (0,0) exists first
    const hasTopLeft = cells.findIndex(c => c.gx === 0 && c.gy === 0);
    if (hasTopLeft > 0) {
      const tl = cells.splice(hasTopLeft, 1)[0];
      cells.unshift(tl);
    }
    const cellW = 100 / cols;
    const cellH = 100 / rows;
    for (let i = 0; i < count; i++) {
      const r1 = rnd(i + 1);
      const r2 = rnd(i + 2);
      const r3 = rnd(i + 3);
      const targetRatio = ratioPalette[Math.floor(r1 * ratioPalette.length) % ratioPalette.length];
      // Stronger size variety
      let w, h;
      if (i % 9 === 0) { // ultra small
        w = 5 + Math.floor(r1 * 7);    // 5~12vw
        h = 8 + Math.floor(r2 * 16);   // 8~24vh
      } else if (i % 7 === 0) { // small & short (avoid overly tall)
        w = 12 + Math.floor(r1 * 14);  // 12~26vw
        h = 12 + Math.floor(r2 * 14);  // 12~26vh
      } else if (i % 5 === 0) { // very large
        w = 44 + Math.floor(r1 * 22);  // 44~66vw
        h = 46 + Math.floor(r2 * 32);  // 46~78vh
      } else {
        // shape variety: wide / mid / tall
        const sp = r1;
        w = 12 + Math.floor(r1 * 34);  // 12~46vw
        h = 18 + Math.floor(r2 * 46);  // 18~64vh
        if (sp < 0.33) { w = 24 + Math.floor(r1 * 28); h = 20 + Math.floor(r2 * 30); }       // wide-ish
        else if (sp > 0.66) { w = 14 + Math.floor(r1 * 22); h = 36 + Math.floor(r2 * 30); }  // tall-ish
      }
      // Nudge towards aesthetic aspect ratio (approximate due to vw/vh units)
      const minH = 8, maxH = 78;
      const currentRatio = w / Math.max(1, h);
      const blend = 0.7;
      const blendedRatio = currentRatio * (1 - blend) + targetRatio * blend;
      h = Math.max(minH, Math.min(maxH, Math.round((w / Math.max(0.1, blendedRatio)))));
      // Re-apply small & short cap for the designated bucket
      if (i % 7 === 0) {
        h = Math.max(12, Math.min(26, h));
        w = Math.max(12, Math.min(26, w));
      }
      // choose cell and jitter inside
      const cell = cells[i % cells.length];
      const jitterX = (r2 - 0.5) * (cellW * 0.25); // slightly calmer jitter for cleaner composition
      const jitterY = (r3 - 0.5) * (cellH * 0.25);
      let left = cell.gx * cellW + cellW * 0.1 + jitterX;   // keep margins inside cell
      let top  = cell.gy * cellH + cellH * 0.1 + jitterY;
      // clamp so window stays on screen
      if (left + w > 100) left = 100 - w - 1;
      if (top + h > 100) top = 100 - h - 1;
      if (left < 0) left = 0;
      if (top < 0) top = 0;
      // mix vertical placement: avoid "big always bottom, small always top"
      const areaNow = w * h;
      if (areaNow > 1800 && top > 55) {
        // move some large windows into upper band
        const tBand = 15 + Math.floor(r1 * 30); // 15~45
        top = Math.min(top, tBand);
      } else if (areaNow < 400 && top > 55 && r2 > 0.45) {
        // pull some small windows upward instead of pushing down
        const tBand = 12 + Math.floor(r3 * 28); // 12~40
        top = Math.min(top, tBand);
      }
      // motion types by size: large => slow y/z or still; small => lively skitter; else => mixed
      const baseTypes = ["winVertical", "winExpand", "winWander", "winSlide", "winOrganic", "winPausey"];
      let type;
      let durMs;
      if (areaNow > 1800) {
        type = r1 > 0.2 ? "winDepthFloat" : "winStill";
        durMs = 5000 + Math.floor(r2 * 5000); // 5s ~ 10s (faster)
      } else if (areaNow < 400) {
        type = "winSkitter";
        durMs = 1600 + Math.floor(r2 * 2000); // 1.6s ~ 3.6s (faster)
      } else {
        type = baseTypes[Math.floor(r1 * baseTypes.length) % baseTypes.length];
        durMs = 2800 + Math.floor(r2 * 4200); // 2.8s ~ 7.0s (faster)
      }
      // allow two roamers only if not huge
      if (i >= count - 2 && areaNow <= 1200) {
        type = i % 2 === 0 ? "winRoamWideA" : "winRoamWideB";
      }
      const delayMs = Math.floor(r1 * 4200);
      const timingFns = [
        "ease-in-out",
        "cubic-bezier(0.55, 0.03, 0.24, 1)",
        "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        "cubic-bezier(0.19, 1, 0.22, 1)",
      ];
      const direction = r3 > 0.5 ? "alternate" : "normal";
      const timing = timingFns[Math.floor(r3 * timingFns.length) % timingFns.length];
      arr.push({
        id: i,
        left: `${left}vw`,
        top: `${top}vh`,
        width: `${w}vw`,
        height: `${h}vh`,
        leftVw: left, topVh: top, widthVw: w, heightVh: h,
        delay: `${delayMs}ms`,
        duration: `${durMs}ms`,
        type,
        origin: type === "winVertical" ? "top center" : "center",
        direction,
        timing,
      });
    }
    // Assign z-index so large windows are behind, small are in front
    const byAreaDesc = [...arr].map((w, idx) => ({ idx, area: w.widthVw * w.heightVh }))
      .sort((a, b) => b.area - a.area);
    byAreaDesc.forEach((item, rank) => {
      // largest gets smallest z (back), smallest gets largest z (front)
      arr[item.idx].z = rank + 1; // 1..N
    });
    // Pin the largest modal near the top and give it a depth float (y+z) animation
    if (arr.length) {
      let gi = 0;
      for (let i = 1; i < arr.length; i++) {
        const a1 = arr[i].widthVw * arr[i].heightVh;
        const a0 = arr[gi].widthVw * arr[gi].heightVh;
        if (a1 > a0) gi = i;
      }
      const tRand = rnd(777);
      const lRand = rnd(778);
      let newTop = 4 + Math.floor(tRand * 8);   // 4~12vh band
      let newLeft = 10 + Math.floor(lRand * 60); // 10~70vw
      if (newLeft + arr[gi].widthVw > 100) newLeft = Math.max(0, 100 - arr[gi].widthVw - 1);
      arr[gi].top = `${newTop}vh`;
      arr[gi].left = `${newLeft}vw`;
      arr[gi].topVh = newTop;
      arr[gi].leftVw = newLeft;
      arr[gi].type = "winDepthFloat";
      arr[gi].duration = `${12000 + Math.floor(lRand * 6000)}ms`; // slower for the biggest
      arr[gi].origin = "top center";
      arr[gi].direction = "alternate";
    }
    return arr;
  }, []);
  const [tileSources, setTileSources] = useState([]);
  const [folderIndex, setFolderIndex] = useState(1); // 1..9 for /2d/{n}
  const [prevTileSources, setPrevTileSources] = useState([]);
  const [moodLocked, setMoodLocked] = useState(false);
  const socketRef = useRef(null);
  const moodLockedRef = useRef(false);
  const [selectedTime, setSelectedTime] = useState("day");
  const triggerArrange = useCallback(() => {
    // Begin smooth transition into a 2x2 grid of 4 survivors
    setArranging(true);
    setTransitionStart(false);
    // pick top-4 by area
    const withArea = windows.map((w, idx) => ({
      idx,
      area: parseFloat(w.width) * parseFloat(w.height),
    }));
    withArea.sort((a, b) => b.area - a.area);
    const surv = withArea.slice(0, 4).map((e) => e.idx);
    setSurvivors(surv);
    // compute folder-based 4 tile sources from /2d/{1..9}/{n}-{1..4}.png
    const n0 = ((folderIndex % 9) + 9) % 9 || 9;
    const tiles0 = [1, 2, 3, 4].map((k) => `/2d/${n0}/${n0}-${k}.png`);
    setPrevTileSources(tiles0);
    setTileSources(tiles0);
    // emit selected mood based on folder → mood mapping
    try {
      const moodNow = FOLDER_TO_MOOD[n0];
      if (moodNow) socketRef.current?.emit("sel:mood", moodNow);
    } catch {}
    // build 2x2 targets to fill viewport exactly (no outer padding/gaps)
    const padX = 0; // vw
    const padY = 0; // vh
    const gapX = 0; // vw
    const gapY = 0; // vh
    const cols = 2, rows = 2;
    const tileW = (100 - padX * 2 - gapX * (cols - 1)) / cols;
    const tileH = (100 - padY * 2 - gapY * (rows - 1)) / rows;
    const tgs = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        tgs.push({
          left: padX + c * (tileW + gapX),
          top: padY + r * (tileH + gapY),
          width: tileW,
          height: tileH,
        });
      }
    }
    setTargets(tgs);
    // kick transitions on next frame
    requestAnimationFrame(() => setTransitionStart(true));
    // finalize after animation to enable interactions on arranged grid
    setTimeout(() => {
      setArranged(true);
      setArranging(false);
      setTransitionStart(false);
    }, 1000);
  }, [windows]);

  // Socket.IO: listen to desktop namespace for mobile-driven controls
  useEffect(() => {
    const socket = io("/desktop", { path: "/api/socketio" });
    socketRef.current = socket;
    const onReset = () => {
      try {
        isResetRef.current = true;
        clearTimers();
        setClosing(false);
        stopClarityAnim();
        stopCamera();
        router.push("/");
      } catch {}
    };
    const onNext = () => {
      // emulate pressing EdgeNav Next
      if (stage === 2 && !arranged) { triggerArrange(); return; }
      if (stage === 2 && arranged) {
        // same as EdgeNav Next when arranged: persist and go to /room
        try {
          const arr = Array.isArray(tileSources) && tileSources.length ? tileSources : ["/2d/nemo.png"];
          const last = arr[0] || "/2d/nemo.png";
          localStorage.setItem("nemo_last_image", last);
          const grid = Array.from({ length: 9 }).map((_, i) => arr[i % arr.length]);
          localStorage.setItem("nemo_grid_images", JSON.stringify(grid));
          // also persist selection: time + mood
          const moodNow = FOLDER_TO_MOOD[folderIndex] || "";
          if (selectedTime) localStorage.setItem("nemo_time_slot", selectedTime);
          if (moodNow) localStorage.setItem("nemo_color_mood", moodNow);
        } catch {}
        try { socketRef.current?.emit("moodSelect"); } catch {}
        try { socketRef.current?.emit("moodScroll:disable"); } catch {}
        setMoodLocked(true);
        moodLockedRef.current = true;
        // emit final time/mood selections to server aggregator (TV will display after weather)
        try { if (selectedTime) socketRef.current?.emit("sel:time", selectedTime); } catch {}
        try {
          const moodNow = FOLDER_TO_MOOD[folderIndex] || "";
          if (moodNow) socketRef.current?.emit("sel:mood", moodNow);
        } catch {}
        setClosing(true);
        navTimerRef.current = setTimeout(() => { if (!isResetRef.current) router.push("/room"); }, 700);
        return;
      }
      goToStage(Math.min(2, stage + 1));
    };
    const onPrev = () => {
      if (stage === 2 && arranged) setArranged(false);
      else goToStage(Math.max(0, stage - 1));
    };
    const onProgress = (v) => {
      const value = typeof v === "number" ? v : 0;
      // Map progress [0..1] → folderIndex 1..9
      if (!moodLockedRef.current) {
        const idx = Math.max(1, Math.min(9, Math.floor(value * 9) + 1));
        setFolderIndex(idx);
      }
      // derive time slot from progress and emit tentative selection
      const t = getTimeSlotFromProgress(value);
      setSelectedTime(t);
      try { socketRef.current?.emit("sel:time", t); } catch {}
      // Ensure we are on windows stage and arranged 2x2 to visualize mood
      if (stage < 2) {
        goToStage(2);
        // arrange on next tick
        setTimeout(() => { if (!arranged) triggerArrange(); }, 100);
      } else if (stage === 2 && !arranged) {
        triggerArrange();
      }
    };
    const onMoodSelect = () => { setMoodLocked(true); moodLockedRef.current = true; };
    socket.on("moodSelect", onMoodSelect);
    socket.on("app:reset", onReset);
    socket.on("next", onNext);
    socket.on("prev", onPrev);
    socket.on("progress", onProgress);
    return () => {
      socket.off("moodSelect", onMoodSelect);
      socket.off("app:reset", onReset);
      socket.off("next", onNext);
      socket.off("prev", onPrev);
      socket.off("progress", onProgress);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, arranged, tileSources]);

  // update tile sources when folderIndex changes in arranged state
  useEffect(() => {
    if (!arranged) return;
    const n = ((folderIndex % 9) + 9) % 9 || 9;
    const tiles = [1, 2, 3, 4].map((k) => `/2d/${n}/${n}-${k}.png`);
    setPrevTileSources(tileSources);
    setTileSources(tiles);
  }, [folderIndex, arranged]);
  useEffect(() => {
    const t = setTimeout(() => {
      setShow(true);
      const v = vidRef.current;
      if (v) {
        const p = v.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      }
    }, 1000);
    isResetRef.current = false;
    return () => { clearTimeout(t); clearTimers(); isResetRef.current = false; };
  }, []);
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        background: "#000",
        overflow: "hidden",
      }}
    >
      {/* Simple CRT/glitch styling */}
      <style
        // Using a style tag to define keyframes for the inline styles below
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes crtFlicker {
            0%, 97%, 100% { filter: brightness(1.0) contrast(1.06) saturate(1.02); }
            98% { filter: brightness(0.96) contrast(1.04) saturate(1.00); }
            99% { filter: brightness(1.06) contrast(1.10) saturate(1.06); }
          }
          @keyframes jitter {
            0% { transform: translate(0, 0); }
            10% { transform: translate(0.5px, 0); }
            20% { transform: translate(-0.6px, 0); }
            30% { transform: translate(0.4px, 0); }
            40% { transform: translate(-0.8px, 0); }
            50% { transform: translate(0.3px, 0); }
            60% { transform: translate(-0.4px, 0); }
            70% { transform: translate(0.6px, 0); }
            80% { transform: translate(-0.3px, 0); }
            90% { transform: translate(0.2px, 0); }
            100% { transform: translate(0, 0); }
          }
          @keyframes scanMove {
            0% { transform: translateY(-10%); }
            100% { transform: translateY(10%); }
          }
          @keyframes promptFade {
            0% { opacity: 0; transform: translateY(4px); }
            15% { opacity: 1; transform: translateY(0px); }
            85% { opacity: 1; transform: translateY(0px); }
            100% { opacity: 0; transform: translateY(-3px); }
          }
          @keyframes winLoop {
            0%   { opacity: 0; transform: translate3d(-8px,-6px,0) scale(0.96); }
            10%  { opacity: 1; transform: translate3d(0px,0px,0) scale(1.0); }
            40%  { opacity: 1; transform: translate3d(6px,-4px,0) scale(1.04); }
            60%  { opacity: 1; transform: translate3d(-4px,6px,0) scale(0.98); }
            90%  { opacity: 1; transform: translate3d(8px,4px,0) scale(1.02); }
            100% { opacity: 0; transform: translate3d(0px,0px,0) scale(0.95); }
          }
          @keyframes winVertical {
            0%   { opacity: .9; transform: translate3d(0,0,0) scaleY(0.92); }
            25%  { opacity: 1;  transform: translate3d(0,-6px,0) scaleY(1.08); }
            50%  { opacity: 1;  transform: translate3d(0, 4px,0) scaleY(0.96); }
            75%  { opacity: 1;  transform: translate3d(0,-8px,0) scaleY(1.12); }
            100% { opacity: .9; transform: translate3d(0,0,0) scaleY(0.94); }
          }
          @keyframes winExpand {
            0%   { opacity: .9; transform: translate3d(0,0,0) scale(0.94); }
            30%  { opacity: 1;  transform: translate3d(4px,-4px,0) scale(1.06); }
            60%  { opacity: 1;  transform: translate3d(-6px,6px,0) scale(1.10); }
            100% { opacity: .9; transform: translate3d(0,0,0) scale(0.96); }
          }
          @keyframes winWander {
            0%   { transform: translate3d(-24px,-18px,0) scale(0.98); }
            20%  { transform: translate3d(22px,-14px,0) scale(1.01); }
            40%  { transform: translate3d(16px,18px,0) scale(1.03); }
            60%  { transform: translate3d(-24px,14px,0) scale(0.99); }
            80%  { transform: translate3d(18px,-8px,0) scale(1.04); }
            100% { transform: translate3d(-24px,-18px,0) scale(1.00); }
          }
          @keyframes winSlide {
            0%   { transform: translate3d(-40px,0,0) scale(1.0); }
            25%  { transform: translate3d(14px,0,0) scale(1.02); }
            50%  { transform: translate3d(40px,0,0) scale(1.0); }
            75%  { transform: translate3d(-14px,0,0) scale(0.98); }
            100% { transform: translate3d(-40px,0,0) scale(1.0); }
          }
          @keyframes winOrganic {
            0%   { transform: translate3d(-16px,-10px,0) scale(0.98) rotate(0deg); }
            20%  { transform: translate3d(12px,  10px,0) scale(1.02) rotate(1deg); }
            40%  { transform: translate3d(10px, -14px,0) scale(1.04) rotate(-0.8deg); }
            60%  { transform: translate3d(-14px, 14px,0) scale(1.00) rotate(0.6deg); }
            80%  { transform: translate3d(16px, -8px,0) scale(1.03) rotate(-1deg); }
            100% { transform: translate3d(-16px,-10px,0) scale(1.00) rotate(0deg); }
          }
          /* includes short holds to feel 'alive' */
          @keyframes winPausey {
            0%   { transform: translate3d(0,0,0) scale(0.98); }
            20%  { transform: translate3d(12px,-10px,0) scale(1.02); }
            40%  { transform: translate3d(12px,-10px,0) scale(1.02); } /* hold */
            60%  { transform: translate3d(-16px,12px,0) scale(0.99); }
            80%  { transform: translate3d(-16px,12px,0) scale(0.99); }  /* hold */
            100% { transform: translate3d(0,0,0) scale(1.00); }
          }
          /* long-range roamers */
          @keyframes winRoamWideA {
            0%   { transform: translate3d(-36vw,-24vh,0) scale(0.98); }
            25%  { transform: translate3d(20vw,-14vh,0)  scale(1.01); }
            50%  { transform: translate3d(36vw,44vh,0)  scale(1.04); }
            75%  { transform: translate3d(-24vw,28vh,0)  scale(1.00); }
            100% { transform: translate3d(-36vw,-24vh,0) scale(1.00); }
          }
          @keyframes winRoamWideB {
            0%   { transform: translate3d(32vw, -24vh,0) scale(1.00); }
            20%  { transform: translate3d(-18vw, -12vh,0)  scale(1.02); }
            40%  { transform: translate3d(-34vw,44vh,0)  scale(1.00); }
            60%  { transform: translate3d(18vw,  28vh,0)   scale(1.03); }
            100% { transform: translate3d(32vw, -24vh,0) scale(1.00); }
          }
          /* large modal roaming mostly near the top band */
          @keyframes winRoamTop {
            0%   { transform: translate3d(-36vw, -4vh, 0) scale(1.02); }
            25%  { transform: translate3d(20vw,  10vh, 0)  scale(1.00); }
            50%  { transform: translate3d(36vw,  8vh, 0)  scale(1.03); }
            75%  { transform: translate3d(-18vw, 14vh, 0)  scale(0.99); }
            100% { transform: translate3d(-36vw, -4vh, 0) scale(1.01); }
          }
          /* depth float (y + z only), very gentle for large windows */
          @keyframes winDepthFloat {
            0%   { transform: translate3d(0, -18px, 24px) scale(0.99); }
            25%  { transform: translate3d(0, -6px, 12px)  scale(1.00); }
            50%  { transform: translate3d(0,  12px, -12px) scale(1.02); }
            75%  { transform: translate3d(0,  4px, 6px)  scale(1.01); }
            100% { transform: translate3d(0, -18px, 24px) scale(0.99); }
          }
          /* almost still (subtle breathing) */
          @keyframes winStill {
            0%   { transform: translate3d(0,0,2px) scale(1.00); }
            50%  { transform: translate3d(0,1px,-2px) scale(1.01); }
            100% { transform: translate3d(0,0,2px) scale(1.00); }
          }
          /* fast skitter for tiny windows (x+y, lively) */
          @keyframes winSkitter {
            0%   { transform: translate3d(-22px,-14px,0) scale(1.00); }
            20%  { transform: translate3d(20px, -8px,0) scale(1.04); }
            40%  { transform: translate3d(16px,  16px,0) scale(0.97); }
            60%  { transform: translate3d(-22px,12px,0) scale(1.03); }
            80%  { transform: translate3d(10px, -12px,0) scale(1.00); }
            100% { transform: translate3d(-22px,-14px,0) scale(1.00); }
          }
          @keyframes fallAway {
            0% { opacity: 1; transform: translate3d(0,0,0) scale(1); }
            70% { opacity: .8; transform: translate3d(6vw, 24vh, 0) scale(0.96) rotate(1.5deg); }
            100% { opacity: 0; transform: translate3d(-4vw, 44vh, 0) scale(0.92) rotate(-2deg); }
          }
          /* fling off-screen in various directions */
          @keyframes flingTR {
            0% { opacity: 1; transform: translate3d(0,0,0) scale(1); }
            100% { opacity: 0; transform: translate3d(120vw,-80vh,0) scale(0.92) rotate(-6deg); }
          }
          @keyframes flingTL {
            0% { opacity: 1; transform: translate3d(0,0,0) scale(1); }
            100% { opacity: 0; transform: translate3d(-120vw,-80vh,0) scale(0.92) rotate(6deg); }
          }
          @keyframes flingBR {
            0% { opacity: 1; transform: translate3d(0,0,0) scale(1); }
            100% { opacity: 0; transform: translate3d(120vw,120vh,0) scale(0.92) rotate(8deg); }
          }
          @keyframes flingBL {
            0% { opacity: 1; transform: translate3d(0,0,0) scale(1); }
            100% { opacity: 0; transform: translate3d(-120vw,120vh,0) scale(0.92) rotate(-8deg); }
          }
          @keyframes zoomOutLayer {
            0% { transform: scale(1); }
            100% { transform: scale(0.75); }
          }
        `,
        }}
      />
      <LandingVideoCRT
        visible={show && !fadeVideo}
        videoRef={vidRef}
        onEnded={() => goToStage(2)}
      />
      {/* Fade video to black overlay (after video ended) */}
      <FadeOverlay visible={fadeVideo} duration={600} zIndex={4} />
      {/* Removed stage-1 prompt */}
      {/* Scatter montage (no mosaic step) */}
      {showWindows && !arranged && !arranging && (
        <WindowsScatter
          windows={windows}
          clarity={clarity}
          cameraTargets={camTargets}
          cameraImages={camImages}
        />
      )}
      {/* Transition layer: 2x2 arrange (also kept for arranged state) */}
      {showWindows && (arranging || arranged) && (
        <WindowsArrangeTransition
          windows={windows}
          survivors={survivors}
          targets={targets}
          start={arranged || transitionStart}
          tileSources={tileSources}
          prevTileSources={prevTileSources}
          pulseDir={scrollPulseDir}
          pulseKey={scrollPulseKey}
        />
      )}
      {/* Background focus overlay to make question modal stand out */}
      {showWindows && !arranged && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 8, // below CenterPrompt (z 9), above scatter/transition (z 6-7)
            background: "rgba(0,0,0,0.12)",
            backdropFilter: "blur(1px) saturate(1.02)",
            WebkitBackdropFilter: "blur(1px) saturate(1.02)",
            transition: "opacity 350ms ease",
            opacity: 1,
          }}
        />
      )}
      {/* Keyword up/down buttons (visible only when arranged) */}
      {showWindows && arranged && (
        <>
          <button
            onClick={() => { setFolderIndex((i) => (i - 2 + 9) % 9 + 1); triggerPulse("up"); }}
            style={{
              position: "absolute",
              right: 12,
              top: "38%",
              transform: "translateY(-50%)",
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #2a2f3a",
              background: "rgba(17,19,24,.8)",
              color: "#e5e7eb",
              cursor: "pointer",
              zIndex: 9,
            }}
            title="위로 (이전 키워드)"
          >
            ↑
          </button>
          <button
            onClick={() => { setFolderIndex((i) => (i % 9) + 1); triggerPulse("down"); }}
            style={{
              position: "absolute",
              right: 12,
              top: "62%",
              transform: "translateY(-50%)",
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #2a2f3a",
              background: "rgba(17,19,24,.8)",
              color: "#e5e7eb",
              cursor: "pointer",
              zIndex: 9,
            }}
            title="아래로 (다음 키워드)"
          >
            ↓
          </button>
          <div
            style={{
              position: "absolute",
              right: 12,
              bottom: 12,
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #2a2f3a",
              background: "rgba(17,19,24,.75)",
              color: "#e5e7eb",
              fontSize: 12,
              zIndex: 9,
            }}
          >
            {`파일 폴더: ${folderIndex}`}
          </div>
        </>
      )}
      {/* Center question box during scatter */}
      <CenterPrompt
        visible={showWindows && !arranged}
        os
        noFade
        raise
      >
        <div style={{ lineHeight: 1.45 }}>
          <div>편안함이 느껴지는 무드를 찾아보세요</div>
          <div style={{ marginTop: 8, fontSize: 14, opacity: 0.9 }}>모바일을 스크롤하여 찾아보세요</div>
        </div>
      </CenterPrompt>
      {/* Scroll arrange disabled (no 4-up transition) */}
      {/* Edge navigation: Prev / Next */}
      <EdgeNav
        onPrev={() => {
          if (stage === 2 && arranged) setArranged(false);
          else goToStage(Math.max(0, stage - 1));
        }}
        onNext={() => {
          if (stage === 2 && !arranged) { triggerArrange(); return; }
          if (stage === 2 && arranged) {
            // Persist current 2x2 sources to be shown in room's HTML screen
            try {
              const arr = Array.isArray(tileSources) && tileSources.length ? tileSources : ["/2d/nemo.png"];
              const last = arr[0] || "/2d/nemo.png";
              localStorage.setItem("nemo_last_image", last);
              // Room currently renders 3x3; fill 9 slots by repeating the 4 tiles
              const grid = Array.from({ length: 9 }).map((_, i) => arr[i % arr.length]);
              localStorage.setItem("nemo_grid_images", JSON.stringify(grid));
            } catch {}
            setClosing(true);
            navTimerRef.current = setTimeout(() => { if (!isResetRef.current) router.push("/room"); }, 700);
            return;
          }
          goToStage(Math.min(2, stage + 1));
        }}
      />
      {/* Final close-out fade */}
      <FadeOverlay visible={closing} duration={700} zIndex={10} />
    </div>
  );
}

function ScrollArrange({ onArrange }) {
  useEffect(() => {
    const handler = () => onArrange && onArrange();
    const opts = { passive: true };
    window.addEventListener("wheel", handler, opts);
    window.addEventListener("touchstart", handler, opts);
    window.addEventListener("touchmove", handler, opts);
    return () => {
      window.removeEventListener("wheel", handler, opts);
      window.removeEventListener("touchstart", handler, opts);
      window.removeEventListener("touchmove", handler, opts);
    };
  }, [onArrange]);
  return null;
}


