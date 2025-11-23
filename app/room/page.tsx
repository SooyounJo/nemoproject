"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { io } from "socket.io-client";
import Room from "@/components/desktop/room/room";

export default function FixedRoomPage() {
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
    const socket = io("/desktop", { path: "/api/socketio" });
    socketRef.current = socket;
    const onNext = () => setStep((s) => Math.min(steps.length - 1, s + 1));
    const onPrev = () => setStep((s) => Math.max(0, s - 1));
    const onSetStep = (v: number) => {
      const nv = Math.max(0, Math.min(steps.length - 1, Math.floor(v)));
      setStep(nv);
    };
    const onProgress = (v: number) => {
      if (typeof v === "number") {
        const clamped = Math.max(0, Math.min(1, v));
        setRemoteProgress(clamped);
        // Map progress to step thresholds: evenly distribute across available steps
        try {
          const count = steps.length;
          if (count > 0) {
            const idx = Math.min(count - 1, Math.max(0, Math.floor(clamped * count)));
            setStep((prev) => (prev !== idx ? idx : prev));
          }
        } catch {}
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
    return () => {
      socket.off("next", onNext);
      socket.off("prev", onPrev);
      socket.off("setStep", onSetStep);
      socket.off("progress", onProgress);
      socket.off("overlayOpacity", onOverlay);
      socket.off("overlayIndex");
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps.length]);
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
  const defaultProgress: number | any = step === 0 ? 0.538 : (step === 1 ? 0.0 : (undefined as any));
  const progressTarget = (remoteProgress !== null ? (remoteProgress as any) : defaultProgress);
  const dynamicProgressLerp = remoteProgress !== null ? 180 : 900;
  const overlayTarget = (remoteOverlay !== null ? remoteOverlay : (step === 3 ? 0 : 1));
  const dynamicOverlayLerp = remoteOverlay !== null ? 180 : 1200;

  // Top question modal (glassmorphism)
  const [bannerText, setBannerText] = useState<string>("");
  const [bannerVisible, setBannerVisible] = useState<boolean>(false);
  const bannerTimerRef = useRef<any>(null);
  // html2: white by default on step >= 2, and can switch to random genimg on user action
  const [html2Url, setHtml2Url] = useState<string | undefined>(undefined);
  // Build a static list of public/genimg/** candidates
  const overlayPool = useMemo(() => ([
    // public/genimg/1
    "/genimg/1/1-1.png", "/genimg/1/1-2.png", "/genimg/1/1-3.png", "/genimg/1/1-4.png",
    // public/genimg/2
    "/genimg/2/2-1.png", "/genimg/2/2-2.png", "/genimg/2/2-3.png", "/genimg/2/2-4.png",
    // public/genimg/3
    "/genimg/3/3-1.png", "/genimg/3/3-2.png", "/genimg/3/3-3.png", "/genimg/3/3-4.png", "/genimg/3/3-5.png",
    "/genimg/3/3-6.png", "/genimg/3/3-7.png", "/genimg/3/3-8.png", "/genimg/3/3-9.png", "/genimg/3/3-10.png",
    // public/genimg/4
    "/genimg/4/4-1.png", "/genimg/4/4-2.png", "/genimg/4/4-3.png", "/genimg/4/4-4.png", "/genimg/4/4-5.png",
    // public/genimg/5
    "/genimg/5/5-1.png", "/genimg/5/5-2.png", "/genimg/5/5-3.png", "/genimg/5/5-4.png",
  ]), []);
  useEffect(() => {
    if (step >= 2) {
      // default white state first
      setHtml2Url("__WHITE__");
    } else {
      setHtml2Url(undefined);
    }
  }, [step, overlayPool]);
  useEffect(() => {
    if (bannerTimerRef.current) {
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = null;
    }
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
  // emit selected image to tv/sbm when updated (skip white)
  useEffect(() => {
    try {
      if (step >= 2 && html2Url && html2Url !== "__WHITE__") {
        const s = io({ path: "/api/socketio" }); // default namespace bridge
        s.emit("imageSelected", html2Url);
        setTimeout(() => s.disconnect(), 600);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, html2Url]);

  return (
    <>
      <Room
        initialCamera={camVeryCloseUp}
        cameraTarget={combinedTarget}
        cameraLerp={1200}
        controlsTarget={step >= 2 ? lookWindow : { x: 0, y: 0, z: 0 }}
        controlsLerp={1200}
        initialLight={lightPreset1}
        lightTarget={lightTarget}
        lightLerp={1200}
        pinIntensityTarget={step === 2 ? 6 : 20}
        pinIntensityLerp={900}
        // After two Next presses (step === 2), apply a stronger yaw around Y (reverse direction)
        yawDegTarget={step >= 2 ? -48 : 0}
        yawLerp={1200}
        yawDelayMs={300}
        yawTrigger={step}
        initialHtmlDist={pHtmlDist}
        initialHtmlOffX={pHtmlOffX}
        initialHtmlOffY={pHtmlOffY}
        initialHtmlOffZ={pHtmlOffZ}
        initialHtmlScaleMul={pHtmlScale}
        htmlVisible={step < 2}
        /* show HTML (overlay plane) again after two Next presses (step >= 2) */
        overlayVisible={step >= 2}
        overlayPos={{ x: -3.9, y: -4.4, z: -18.6 }}
        overlayScale={5.0}
        overlayOpacityTarget={overlayTarget}
        overlayOpacityLerp={dynamicOverlayLerp}
        /* html2: starts white; can switch to random genimg via button */
        overlayImageUrl={html2Url}
        overlaySeqList={[]}
        overlayIndex={step >= 2 && remoteOverlayIndex !== null ? remoteOverlayIndex : undefined}
        overlaySlideLerp={500}
        progressTarget={progressTarget as any}
        progressLerp={dynamicProgressLerp}
        progressTrigger={step}
        initialProgress={0.538}
        disableColorMapping={step === 0}
        initialFov={28}
        hideUI={true}
        showPathSlider={step > 0}
        showHtmlSliders={false}
        staticView={true}
      />
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
      <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 12, zIndex: 40 }}>
        {step > 0 && (
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "1px solid #23262d",
              background: "#111318",
              color: "#e5e7eb",
              cursor: "pointer",
            }}
          >
            이전
          </button>
        )}
        {step < steps.length - 1 && (
          <button
            onClick={() => setStep(Math.min(steps.length - 1, step + 1))}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "1px solid #23262d",
              background: "#111318",
              color: "#e5e7eb",
              cursor: "pointer",
            }}
          >
            다음
          </button>
        )}
        {step >= 2 && (
          <button
            onClick={() => {
              const i = Math.floor(Math.random() * overlayPool.length);
              const url = overlayPool[i];
              // cache-bust to force texture reload even if same file is picked
              const bust = `${url}?t=${Date.now()}`;
              setHtml2Url(bust);
            }}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "1px solid #6b5bd4",
              background: "#1a1f2e",
              color: "#e5e7eb",
              cursor: "pointer",
            }}
          >
            밖을 보기
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
      {/* step 3: go to generator */}
      {step === 3 && (
        <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70 }}>
          <a
            href="/generate"
            style={{
              pointerEvents: "auto",
              padding: "12px 18px",
              borderRadius: 12,
              border: "1px solid #23262d",
              background: "#111318",
              color: "#e5e7eb",
              textDecoration: "none",
              fontSize: 14,
            }}
          >
            생성 페이지로 이동
          </a>
        </div>
      )}
    </>
  );
}

