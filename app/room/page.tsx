"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { io } from "socket.io-client";
import Room from "@/components/desktop/room/room";
import TypoWeather from "@/app/components/room/TypoWeather";
import { getTimeSlotFromProgress } from "@/lib/mood-select";
import { useRouter } from "next/navigation";

export default function FixedRoomPage() {
  const router = useRouter();
  // 페이지 스크롤 잠금
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlHeight = html.style.height;
    const prevBodyHeight = body.style.height;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.height = "100%";
    body.style.height = "100%";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      html.style.height = prevHtmlHeight;
      body.style.height = prevBodyHeight;
    };
  }, []);
  // page-level HTML screen controls (left panel)
  const [pHtmlDist, setPHtmlDist] = useState(-10.0);
  const [pHtmlOffX, setPHtmlOffX] = useState(-40.0);
  const [pHtmlOffY, setPHtmlOffY] = useState(-32.050);
  const [pHtmlOffZ, setPHtmlOffZ] = useState(-30.644);
  const [pHtmlScale, setPHtmlScale] = useState(3.787);
  // Dramatic landing (very close), then pull back step-by-step
  // Push in even further for a “fully zoomed-in” landing shot
  const camVeryClose = useMemo(() => ({ x: 1.10, y: 1.00, z: 2.00 }), []);
  // Start slightly higher on Z, then settle down to camVeryClose
  const camVeryCloseUp = useMemo(() => ({ x: 1.10, y: 1.00, z: 2.30 }), []);
  const camClose = useMemo(() => ({ x: 3.2, y: 2.2, z: 4.2 }), []);
  const camFar = useMemo(() => ({ x: 6.0, y: 4.0, z: 12.0 }), []);
  // Slightly left-shifted variant of camFar for final turn
  const camFarLeft = useMemo(() => ({ x: 4.0, y: 4.0, z: 12.0 }), []);
  // 이미지 각도에 더 근접하도록 오른쪽/뒤/약간 위로
  const camAngle = useMemo(() => ({ x: -3.9, y: -2, z: 6.8 }), []);
  // 정면 보기 타겟 (창문 방향을 정면으로 바라보는 느낌)
  const lookWindow = useMemo(() => ({ x: -3.9, y: -1.6, z: -4.8 }), []);
  // Step 0 -> camClose, Step 1 -> camFar (zoom-out), Step 2 -> camFarLeft + yaw
  const steps = [camClose, camFar, camFarLeft] as { x: number; y: number; z: number }[];
  const [step, setStep] = useState(0);
  const socketRef = useRef<any>(null);
  const [remoteProgress, setRemoteProgress] = useState<number | null>(null);
  const [remoteOverlay, setRemoteOverlay] = useState<number | null>(null);
  const [remoteOverlayIndex, setRemoteOverlayIndex] = useState<number | null>(null);
  const [savedLightPath, setSavedLightPath] = useState<number | null>(null);
  const [lightPath, setLightPath] = useState<number>(0.538);
  // Gate mobile controls during camera transitions
  const [mobileLocked, setMobileLocked] = useState<boolean>(false);
  const mobileLockedRef = useRef(false);
  const [lookMsg, setLookMsg] = useState(false);
  // step 0로 돌아오면 랜딩 최종 구도(camVeryClose)로 복귀
  const stepTarget = step === 0 ? camVeryClose : steps[step];
  // Intro settle animation (once on mount: camVeryCloseUp -> camVeryClose)
  const [intro, setIntro] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setIntro(false), 900);
    return () => clearTimeout(id);
  }, []);
  const combinedTarget = intro ? camVeryClose : stepTarget;
  // Socket.IO client for remote control (next / prev / progress / setStep)
  useEffect(() => {
    // pick up light path chosen on mobile (if any)
    try {
      const v = localStorage.getItem("nemo_light_path");
      if (v != null) {
        const n = Math.max(0, Math.min(1, parseFloat(v)));
        if (!Number.isNaN(n)) setSavedLightPath(n);
      }
    } catch {}
  }, []);
  useEffect(() => {
    // initialize light path once saved value is known
    if (savedLightPath != null) setLightPath(savedLightPath);
  }, [savedLightPath]);
  useEffect(() => {
    const socket = io("/desktop", { path: "/api/socketio" });
    socketRef.current = socket;
    const onResetAll = () => { try { router.push("/"); } catch {} };
    const onNext = () => {
      if (mobileLockedRef.current) return;
      setStep((prev) => {
        if (prev === 2) {
          // Finalize weather selection: fade out and ask to look at the window.
          setLookMsg(true);
          // Emit weather selection to server aggregator
          try {
            const weatherKeys = ["clear","cloudy","rainy","snowy","foggy","stormy"];
            const w = weatherKeys[Math.max(0, Math.min(5, weatherIdx))] as any;
            const s = io("/desktop", { path: "/api/socketio" });
            s.emit("sel:weather", w);
            setTimeout(() => s.disconnect(), 400);
          } catch {}
          // TV 노출은 페이지2 최종 확정 시점에서만 수행 (room에서는 송신하지 않음)
          return 3;
        }
        return Math.min(steps.length - 1, prev + 1);
      });
    };
    const onPrev = () => {
      if (mobileLockedRef.current) return;
      setStep((s) => Math.max(0, s - 1));
    };
    const onSetStep = (v: number) => {
      if (mobileLockedRef.current) return;
      const nv = Math.max(0, Math.min(steps.length - 1, Math.floor(v)));
      setStep(nv);
    };
    const onProgress = (v: number) => {
      if (mobileLockedRef.current) return;
      if (typeof v === "number") {
        const clamped = Math.max(0, Math.min(1, v));
        setRemoteProgress(clamped);
        // In room, progress should not change steps. Navigation via next/prev only.
      }
    };
    const onOverlay = (v: number) => {
      if (typeof v === "number") setRemoteOverlay(Math.max(0, Math.min(1, v)));
    };
    socket.on("next", onNext);
    socket.on("prev", onPrev);
    socket.on("setStep", onSetStep);
    socket.on("progress", onProgress);
    socket.on("overlayOpacity", onOverlay);
    socket.on("overlayIndex", (v: number) => {
      if (typeof v === "number") setRemoteOverlayIndex(Math.max(0, Math.min(13, Math.floor(v))));
    });
    socket.on("app:reset", onResetAll);
    return () => {
      socket.off("next", onNext);
      socket.off("prev", onPrev);
      socket.off("setStep", onSetStep);
      socket.off("progress", onProgress);
      socket.off("overlayOpacity", onOverlay);
      socket.off("overlayIndex");
      socket.off("app:reset", onResetAll);
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps.length]);
  // When entering zoom-out step (step === 1), lock mobile controls until camera lerp completes
  const prevStepRef = useRef(step);
  useEffect(() => {
    const prev = prevStepRef.current;
    prevStepRef.current = step;
    if (prev !== step && step === 1) {
      const lockMs = 1200 + 200; // cameraLerp + buffer
      setMobileLocked(true);
      mobileLockedRef.current = true;
      try { socketRef.current?.emit("moodScroll:disable"); } catch {}
      const t = setTimeout(() => {
        setMobileLocked(false);
        mobileLockedRef.current = false;
        try { socketRef.current?.emit("moodScroll:enable"); } catch {}
      }, lockMs);
      return () => clearTimeout(t);
    }
  }, [step]);
  // On entering room: auto-advance once, then enable mobile scroll after the motion
  useEffect(() => {
    const t1 = setTimeout(() => {
      setStep((s) => Math.min(steps.length - 1, s + 1));
      const t2 = setTimeout(() => {
        try {
          const s = io("/mobile", { path: "/api/socketio" });
          s.emit("enableScroll");
          setTimeout(() => s.disconnect(), 500);
        } catch {}
      }, 1700);
      return () => clearTimeout(t2);
    }, 1300);
    return () => clearTimeout(t1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Final step idle → return to index after 20s
  useEffect(() => {
    if (step !== 3) return;
    const id = setTimeout(() => {
      try { router.push("/"); } catch {}
    }, 20000);
    return () => clearTimeout(id);
  }, [step, router]);
  useEffect(() => {
    // Apply the same placement through step 0, 1, and 2
    if (step === 0 || step === 1 || step === 2) {
      setPHtmlDist(-10.0);
      setPHtmlOffX(-40.0);
      setPHtmlOffY(-32.050);
      setPHtmlOffZ(-30.644);
      setPHtmlScale(3.787);
    }
  }, [step]);

  // Light presets aligned with index: 1 -> (-0.9,12.8,-24.0), 2 -> (-14.7,10.7,-18.9)
  const lightPreset1 = useMemo(() => ({ x: -0.9, y: 12.8, z: -24.0 }), []);
  const lightPreset2 = useMemo(() => ({ x: -14.7, y: 10.7, z: -18.9 }), []);
  // 첫 “다음”에 조명을 파라미터 첫 화면 상태(프리셋1)로 부드럽게 복귀
  const lightSteps = [null, lightPreset1, lightPreset1] as (null | { x: number; y: number; z: number })[];
  const lightTarget = lightSteps[step] || undefined;
  // 진행 슬라이더: 랜딩(0)에서는 0.538, 첫 다음(1)에서는 0.0(아침)으로 이동
  // 그 이후 스텝에서는 사용자가 조정한 값을 보존하도록 별도 타깃을 주지 않음
  const defaultProgress: number | any = step === 0 ? (savedLightPath ?? 0.538) : (step === 1 ? 0.0 : (undefined as any));
  // Only update light path from remote progress during step === 1 (time-of-day).
  useEffect(() => {
    if (step !== 1) return;
    if (typeof remoteProgress === "number") {
      const clamped = Math.max(0, Math.min(1, remoteProgress));
      setLightPath(clamped);
      try { localStorage.setItem("nemo_light_path", String(clamped)); } catch {}
    }
  }, [step, remoteProgress]);
  const progressTarget = (lightPath ?? defaultProgress) as any;
  // Slow down light path interpolation for a heavier feel
  const dynamicProgressLerp = 1800;
  const overlayTarget = (remoteOverlay !== null ? remoteOverlay : (step === 3 ? 0 : 1));
  const dynamicOverlayLerp = remoteOverlay !== null ? 180 : 1200;

  // Top question modal (glassmorphism)
  const [bannerText, setBannerText] = useState<string>("");
  const [bannerVisible, setBannerVisible] = useState<boolean>(false);
  const bannerTimerRef = useRef<any>(null);
  // html2: white by default on step >= 2, and can switch to random genimg on user action
  const [html2Url, setHtml2Url] = useState<string | undefined>(undefined);
  // Picker overlay (HTML, translucent) - appears after two Next
  const pickerPool = useMemo(
    () => [
      { name: "SUNNY", url: "/weather/sunny.png" },
      { name: "CLOUDY", url: "/weather/cloudy.png" },
      { name: "RAINY", url: "/weather/rainy.png" },
      { name: "SNOWY", url: "/weather/snowy.png" },
      { name: "NIGHT", url: "/weather/night.png" },
    ],
    []
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerIndex, setPickerIndex] = useState(0);
  const pickerStopTimer = useRef<any>(null);
  // Build a static list of public/weather/** candidates
  const weatherPool = useMemo(
    () => [
      "/weather/sunny.png",
      "/weather/rain.png",
      "/weather/snow.png",
      "/weather/rainbow.png",
      "/weather/smog.png",
    ],
    []
  );
  useEffect(() => {
    if (step >= 2) {
      if (!html2Url) setHtml2Url(weatherPool[0] || "/2d/nemo.png");
      // keep picker closed for 3D-anchored HTML (CSS3D) mode
      setPickerOpen(false);
    } else {
      if (html2Url) setHtml2Url(undefined);
      setPickerOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);
  useEffect(() => {
    if (bannerTimerRef.current) {
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = null;
    }
    // debug: step change
    try { console.log("[room] step ->", step); } catch {}
    // step 1: first Next
    if (step === 1) {
      setBannerText("당신이 좋아하는 시간대를 선택해주세요");
      setBannerVisible(true);
      bannerTimerRef.current = setTimeout(() => setBannerVisible(false), 3000);
    }
    // step 2: second Next
    if (step === 2) {
      setBannerText("창문 밖의 날씨가 어떨 것 같나요?");
      setBannerVisible(true);
      bannerTimerRef.current = setTimeout(() => setBannerVisible(false), 3000);
    }
    return () => {
      if (bannerTimerRef.current) {
        clearTimeout(bannerTimerRef.current);
        bannerTimerRef.current = null;
      }
    };
  }, [step]);
  // During step 2 (weather question), map mobile scroll progress to a weather image (HTML screen)
  // Weather index for typo overlay (6 bins)
  const weatherIdx = useMemo(() => {
    const p = typeof remoteProgress === "number" ? Math.max(0, Math.min(1, remoteProgress)) : 0;
    return Math.min(5, Math.floor(p * 6));
  }, [remoteProgress]);

  // Freeze desktop screen 2x2 images to the user's last selection (do NOT follow light path)
  const [screenGridImages, setScreenGridImages] = useState<string[] | undefined>(undefined);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("nemo_grid_images");
      const arr = raw ? JSON.parse(raw) : null;
      if (Array.isArray(arr) && arr.length >= 4) {
        setScreenGridImages(arr.slice(0, 4));
      }
    } catch {}
  }, []);

  return (
    <>
      <Room
        initialCamera={camVeryCloseUp}
        cameraTarget={combinedTarget}
        cameraLerp={1800}
        controlsTarget={step >= 2 ? lookWindow : { x: 0, y: 0, z: 0 }}
        controlsLerp={1800}
        initialLight={lightPreset1}
        lightTarget={lightTarget}
        lightLerp={1200}
        pinIntensityTarget={step === 2 ? 6 : 20}
        pinIntensityLerp={1200}
        // After two Next presses (step === 2), apply a stronger yaw around Y (reverse direction)
        yawDegTarget={step >= 2 ? -48 : 0}
        yawLerp={1800}
        yawDelayMs={500}
        yawTrigger={step}
        initialHtmlDist={pHtmlDist}
        initialHtmlOffX={pHtmlOffX}
        initialHtmlOffY={pHtmlOffY}
        initialHtmlOffZ={pHtmlOffZ}
        initialHtmlScaleMul={pHtmlScale}
        htmlVisible={step < 2}
        /* remove legacy planes and overlays */
        overlayVisible={false}
        enableImg2dPlane={false}
        enableCssWindow={false}
        overlayImageUrl={undefined}
        overlaySeqList={[]}
        overlayIndex={undefined}
        overlaySlideLerp={500}
        progressTarget={progressTarget as any}
        progressLerp={dynamicProgressLerp}
        progressTrigger={step}
        initialProgress={0.538}
        disableColorMapping={step === 0}
        initialFov={28}
        hideUI={true}
        showPathSlider={false}
        showHtmlSliders={false}
        staticView={true}
        screenGridImages={screenGridImages}
      />
      {/* Left-fixed typo weather (no modal) */}
      {step === 2 && (
        <TypoWeather
          visible
          highlightIndex={weatherIdx}
          timeSlot={getTimeSlotFromProgress(typeof remoteProgress === "number" ? remoteProgress : 0)}
        />
      )}
      {/* Top glassy banner modal */}
      {bannerVisible && bannerText && (
        <div
          style={{
            position: "fixed",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 70,
            padding: "10px 14px",
            borderRadius: 12,
            background: "rgba(0,0,0,0.62)",
            border: "1px solid rgba(255,255,255,0.14)",
            color: "#e5e7eb",
            backdropFilter: "blur(8px)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            fontSize: 13.5,
            letterSpacing: 0.2,
            pointerEvents: "none",
            textAlign: "center",
          }}
        >
          {bannerText}
        </div>
      )}
      {/* Bottom-right glass nav */}
      <div style={{ position: "fixed", right: 16, bottom: 16, display: "flex", gap: 8, zIndex: 40, padding: "6px 8px", borderRadius: 12, background: "rgba(17,19,24,0.35)", border: "1px solid rgba(255,255,255,0.16)", backdropFilter: "blur(10px) saturate(1.02)" }}>
        {step > 0 && (
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(17,19,24,0.35)", color: "#e5e7eb", cursor: "pointer" }}
          >
            이전
          </button>
        )}
        {step < steps.length - 1 && (
          <button
            onClick={() => setStep(Math.min(steps.length - 1, step + 1))}
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(17,19,24,0.35)", color: "#e5e7eb", cursor: "pointer" }}
          >
            다음
          </button>
        )}
      </div>
      {/* Fade to black at step 3 */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#000",
          opacity: step === 3 ? 1 : 0,
          transition: "opacity 1.2s ease",
          pointerEvents: "none",
          zIndex: 60,
        }}
      />
      {/* step 3: fade-out and instruction to look at the window */}
      {step === 3 && lookMsg && (
        <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70 }}>
          <div
            style={{
              pointerEvents: "none",
              padding: "12px 18px",
              borderRadius: 12,
              border: "1px solid #23262d",
              background: "rgba(17,19,24,0.85)",
              color: "#e5e7eb",
              fontSize: 16,
            }}
          >
            이제 창문을 바라봐 주세요
          </div>
        </div>
      )}
    </>
  );
}

