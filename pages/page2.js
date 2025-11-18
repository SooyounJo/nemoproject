"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import LandingVideoCRT from "@/components/desktop/page2/LandingVideoCRT";
import WindowsScatter from "@/components/desktop/page2/WindowsScatter";
import WindowsArrangeTransition from "@/components/desktop/page2/WindowsArrangeTransition";
import WindowsArrangeGrid from "@/components/desktop/page2/WindowsArrangeGrid";
import CenterPrompt from "@/components/desktop/page2/CenterPrompt";

export default function Page2() {
  const [show, setShow] = useState(false);
  const vidRef = useRef(null);
  const [fadeVideo, setFadeVideo] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showWindows, setShowWindows] = useState(false);
  const [stage, setStage] = useState(0); // 0: video, 1: prompt, 2: windows
  const autoTimerRef = useRef(null);
  const promptTimerRef = useRef(null);
  const questionTimerRef = useRef(null);
  const [showQuestion, setShowQuestion] = useState(false);
  const [arranged, setArranged] = useState(false);
  const [arranging, setArranging] = useState(false);
  const [transitionStart, setTransitionStart] = useState(false);
  const [survivors, setSurvivors] = useState([]); // indices to keep (9)
  const [targets, setTargets] = useState([]); // target rects for survivors
  const clearTimers = useCallback(() => {
    if (autoTimerRef.current) { clearTimeout(autoTimerRef.current); autoTimerRef.current = null; }
    if (promptTimerRef.current) { clearTimeout(promptTimerRef.current); promptTimerRef.current = null; }
    if (questionTimerRef.current) { clearTimeout(questionTimerRef.current); questionTimerRef.current = null; }
  }, []);
  const goToStage = useCallback((s) => {
    clearTimers();
    setStage(s);
    if (s === 0) {
      setFadeVideo(false);
      setShowPrompt(false);
      setShowWindows(false);
      setShowQuestion(false);
      setArranged(false);
      const v = vidRef.current;
      if (v) {
        try { v.currentTime = 0; } catch {}
        const p = v.play?.();
        if (p && typeof p.catch === "function") p.catch(() => {});
      }
    } else if (s === 1) {
      setFadeVideo(true);
      setShowWindows(false);
      setShowPrompt(true);
      setShowQuestion(false);
      setArranged(false);
      // Hide prompt after 2s
      promptTimerRef.current = setTimeout(() => setShowPrompt(false), 2000);
      // Auto advance to windows after ~2.6s
      autoTimerRef.current = setTimeout(() => goToStage(2), 2600);
    } else if (s === 2) {
      setFadeVideo(true);
      setShowPrompt(false);
      setShowWindows(true);
      setArranged(false);
      setShowQuestion(false);
      // After 1s, show center question box
      questionTimerRef.current = setTimeout(() => setShowQuestion(true), 1000);
    }
  }, [clearTimers]);
  const windows = useMemo(() => {
    // Stable pseudo-random layout for 16 windows, evenly spread across screen
    const rnd = (seed) => {
      let x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };
    const arr = [];
    const count = 16;
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
      // Extreme size variety
      let w, h;
      if (i % 7 === 0) { // very small
        w = 6 + Math.floor(r1 * 6);   // 6~12vw
        h = 10 + Math.floor(r2 * 8);  // 10~18vh
      } else if (i % 5 === 0) { // very large
        w = 38 + Math.floor(r1 * 22); // 38~60vw
        h = 40 + Math.floor(r2 * 30); // 40~70vh
      } else {
        // shape variety: wide/tall/mid
        const sp = r1;
        w = 14 + Math.floor(r1 * 28); // 14~42vw
        h = 20 + Math.floor(r2 * 40); // 20~60vh
        if (sp < 0.33) { w = 26 + Math.floor(r1 * 26); h = 22 + Math.floor(r2 * 30); }
        else if (sp > 0.66) { w = 16 + Math.floor(r1 * 22); h = 34 + Math.floor(r2 * 26); }
      }
      // choose cell and jitter inside
      const cell = cells[i % cells.length];
      const jitterX = (r2 - 0.5) * (cellW * 0.35); // +-35% cell jitter
      const jitterY = (r3 - 0.5) * (cellH * 0.35);
      let left = cell.gx * cellW + cellW * 0.1 + jitterX;   // keep margins inside cell
      let top  = cell.gy * cellH + cellH * 0.1 + jitterY;
      // clamp so window stays on screen
      if (left + w > 100) left = 100 - w - 1;
      if (top + h > 100) top = 100 - h - 1;
      if (left < 0) left = 0;
      if (top < 0) top = 0;
      // motion types
      const baseTypes = ["winVertical", "winExpand", "winWander", "winSlide", "winOrganic", "winPausey"];
      // ensure two windows get very wide roaming motion
      const type = i >= count - 2 ? (i % 2 === 0 ? "winRoamWideA" : "winRoamWideB") : baseTypes[i % baseTypes.length];
      // tempo and easing variety
      const durMs = 3800 + Math.floor(r2 * 6400); // 3.8s ~ 10.2s
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
    return arr;
  }, []);
  const triggerArrange = useCallback(() => {
    // Begin smooth transition into a 3x3 grid of 9 survivors
    setShowQuestion(false);
    setArranging(true);
    setTransitionStart(false);
    // pick top-9 by area
    const withArea = windows.map((w, idx) => ({
      idx,
      area: parseFloat(w.width) * parseFloat(w.height),
    }));
    withArea.sort((a, b) => b.area - a.area);
    const surv = withArea.slice(0, 9).map((e) => e.idx);
    setSurvivors(surv);
    // build 3x3 targets to fill viewport exactly (no outer padding/gaps)
    const padX = 0; // vw
    const padY = 0; // vh
    const gapX = 0; // vw
    const gapY = 0; // vh
    const cols = 3, rows = 3;
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
    // finalize after animation
    setTimeout(() => {
      setArranged(true);
      setArranging(false);
      setTransitionStart(false);
    }, 1000);
  }, [windows]);
  useEffect(() => {
    const t = setTimeout(() => {
      setShow(true);
      const v = vidRef.current;
      if (v) {
        const p = v.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      }
    }, 1000);
    return () => { clearTimeout(t); clearTimers(); };
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
            0%   { transform: translate3d(-10px,-8px,0) scale(0.98); }
            20%  { transform: translate3d(12px,-6px,0) scale(1.00); }
            40%  { transform: translate3d(6px,10px,0) scale(1.02); }
            60%  { transform: translate3d(-12px,6px,0) scale(0.99); }
            80%  { transform: translate3d(8px,-2px,0) scale(1.03); }
            100% { transform: translate3d(-10px,-8px,0) scale(1.00); }
          }
          @keyframes winSlide {
            0%   { transform: translate3d(-16px,0,0) scale(1.0); }
            25%  { transform: translate3d(6px,0,0) scale(1.02); }
            50%  { transform: translate3d(16px,0,0) scale(1.0); }
            75%  { transform: translate3d(-6px,0,0) scale(0.98); }
            100% { transform: translate3d(-16px,0,0) scale(1.0); }
          }
          @keyframes winOrganic {
            0%   { transform: translate3d(-8px,-4px,0) scale(0.98) rotate(0deg); }
            20%  { transform: translate3d(6px,  4px,0) scale(1.01) rotate(0.6deg); }
            40%  { transform: translate3d(4px, -6px,0) scale(1.03) rotate(-0.4deg); }
            60%  { transform: translate3d(-6px, 6px,0) scale(1.00) rotate(0.3deg); }
            80%  { transform: translate3d(8px, -2px,0) scale(1.02) rotate(-0.6deg); }
            100% { transform: translate3d(-8px,-4px,0) scale(1.00) rotate(0deg); }
          }
          /* includes short holds to feel 'alive' */
          @keyframes winPausey {
            0%   { transform: translate3d(0,0,0) scale(0.98); }
            20%  { transform: translate3d(6px,-4px,0) scale(1.02); }
            40%  { transform: translate3d(6px,-4px,0) scale(1.02); } /* hold */
            60%  { transform: translate3d(-8px,6px,0) scale(0.99); }
            80%  { transform: translate3d(-8px,6px,0) scale(0.99); }  /* hold */
            100% { transform: translate3d(0,0,0) scale(1.00); }
          }
          /* long-range roamers */
          @keyframes winRoamWideA {
            0%   { transform: translate3d(-18vw,-12vh,0) scale(0.98); }
            25%  { transform: translate3d(10vw,-6vh,0)  scale(1.01); }
            50%  { transform: translate3d(18vw,10vh,0)  scale(1.04); }
            75%  { transform: translate3d(-12vw,6vh,0)  scale(1.00); }
            100% { transform: translate3d(-18vw,-12vh,0) scale(1.00); }
          }
          @keyframes winRoamWideB {
            0%   { transform: translate3d(16vw, -14vh,0) scale(1.00); }
            20%  { transform: translate3d(-8vw, -4vh,0)  scale(1.02); }
            40%  { transform: translate3d(-18vw,12vh,0)  scale(1.00); }
            60%  { transform: translate3d(8vw,  6vh,0)   scale(1.03); }
            100% { transform: translate3d(16vw, -14vh,0) scale(1.00); }
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
        `,
        }}
      />
      <LandingVideoCRT
        visible={show && !fadeVideo}
        videoRef={vidRef}
        onEnded={() => goToStage(1)}
      />
      {/* Fade video to black overlay (after video ended) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#000",
          opacity: fadeVideo ? 1 : 0,
          transition: "opacity 600ms ease",
          pointerEvents: "none",
          zIndex: 4,
        }}
      />
      {/* Prompt message after fade */}
      <CenterPrompt visible={showPrompt}>모바일을 확인하고 슬라이드 하여, 선택해보세요</CenterPrompt>
      {/* Old modal windows montage */}
      {showWindows && !arranged && !arranging && <WindowsScatter windows={windows} />}
      {/* Transition layer: smooth arrange to 3x3 for 9 survivors */}
      {showWindows && arranging && (
        <WindowsArrangeTransition
          windows={windows}
          survivors={survivors}
          targets={targets}
          start={transitionStart}
        />
      )}
      {/* Arranged grid view */}
      {showWindows && arranged && <WindowsArrangeGrid windows={windows} survivors={survivors} />}
      {/* Center question box after 1s in stage 2 */}
      <CenterPrompt visible={showWindows && !arranged && showQuestion}>당신이 원하는 휴식은 무엇인가요?</CenterPrompt>
      {/* Scroll to arrange (desktop/mobile) */}
      {showWindows && !arranged && (
        <ScrollArrange onArrange={triggerArrange} />
      )}
      {/* Edge navigation: Prev / Next */}
      <button
        onClick={() => {
          if (stage === 2 && arranged) setArranged(false);
          else goToStage(Math.max(0, stage - 1));
        }}
        style={{
          position: "absolute",
          left: 8,
          top: "50%",
          transform: "translateY(-50%)",
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid #2a2f3a",
          background: "rgba(17,19,24,.8)",
          color: "#e5e7eb",
          cursor: "pointer",
          zIndex: 8,
        }}
        aria-label="Previous"
        title="Previous"
      >
        이전
      </button>
      <button
        onClick={() => {
          if (stage === 2 && !arranged) triggerArrange();
          else goToStage(Math.min(2, stage + 1));
        }}
        style={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid #2a2f3a",
          background: "rgba(17,19,24,.8)",
          color: "#e5e7eb",
          cursor: "pointer",
          zIndex: 8,
        }}
        aria-label="Next"
        title="Next"
      >
        다음
      </button>
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


