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
  // 이미지 각도에 더 근접하도록 오른쪽/뒤/약간 위로
  const camAngle = useMemo(() => ({ x: -3.9, y: -2, z: 6.8 }), []);
  // 정면 보기 타겟 (창문 방향을 정면으로 바라보는 느낌)
  const lookWindow = useMemo(() => ({ x: -3.9, y: -1.6, z: -4.8 }), []);
  // Step 0 -> camClose, Step 1 -> camFar, Step 2 -> camAngle, Step 3 -> same as camAngle (fade stage)
  const steps = [camClose, camFar, camAngle, camAngle] as { x: number; y: number; z: number }[];
  const [step, setStep] = useState(0);
  const socketRef = useRef<any>(null);
  const [remoteProgress, setRemoteProgress] = useState<number | null>(null);
  const [remoteOverlay, setRemoteOverlay] = useState<number | null>(null);
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
    const socket = io({ path: "/api/socketio" });
    socketRef.current = socket;
    const onNext = () => setStep((s) => Math.min(steps.length - 1, s + 1));
    const onPrev = () => setStep((s) => Math.max(0, s - 1));
    const onSetStep = (v: number) => {
      const nv = Math.max(0, Math.min(steps.length - 1, Math.floor(v)));
      setStep(nv);
    };
    const onProgress = (v: number) => {
      if (typeof v === "number") setRemoteProgress(Math.max(0, Math.min(1, v)));
    };
    const onOverlay = (v: number) => {
      if (typeof v === "number") setRemoteOverlay(Math.max(0, Math.min(1, v)));
    };
    socket.on("next", onNext);
    socket.on("prev", onPrev);
    socket.on("setStep", onSetStep);
    socket.on("progress", onProgress);
    socket.on("overlayOpacity", onOverlay);
    return () => {
      socket.off("next", onNext);
      socket.off("prev", onPrev);
      socket.off("setStep", onSetStep);
      socket.off("progress", onProgress);
      socket.off("overlayOpacity", onOverlay);
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
        initialHtmlDist={pHtmlDist}
        initialHtmlOffX={pHtmlOffX}
        initialHtmlOffY={pHtmlOffY}
        initialHtmlOffZ={pHtmlOffZ}
        initialHtmlScaleMul={pHtmlScale}
        htmlVisible={step < 2}
        overlayVisible={step >= 2}
        overlayPos={{ x: -3.9, y: -4.4, z: -18.6 }}
        overlayScale={5.0}
        overlayOpacityTarget={overlayTarget}
        overlayOpacityLerp={dynamicOverlayLerp}
        overlaySeqList={[
          "/2d/pic/nightcity.png",
          "/2d/pic/rainycity.png",
          "/2d/pic/rainywindow.png",
          "/2d/pic/christmasnight.png",
          "/2d/pic/snowystreet.png",
          "/2d/pic/snowynight.png",
          "/2d/pic/autumstreet.png",
          "/2d/pic/autumsunset.png",
          "/2d/pic/foggyforest.png",
          "/2d/pic/windymountine.png",
          "/2d/pic/rainysummer.png",
          "/2d/pic/summerriver.png",
          "/2d/pic/summerbeach.png",
          "/2d/pic/rainyspring.png",
        ]}
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

