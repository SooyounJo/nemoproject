"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { io } from "socket.io-client";
import QRCode from "qrcode";
import FrameTypos from "../app/loding/components/FrameTypos";
import Head from "next/head";

function TypingNemo() {
  // Title is static "NEMO", subline is typed
  const fullTitle = "NEMO";
  const [txt, setTxt] = useState("");
  const full = "나만의 힐링 window를 제작해보세요";
  const modeRef = useRef("typing"); // typing | deleting | pause
  const idxRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    const step = () => {
      const mode = modeRef.current;
      if (mode === "typing") {
        idxRef.current += 1;
        const n = Math.min(full.length, idxRef.current);
        setTxt(full.slice(0, n));
        if (n === full.length) {
          modeRef.current = "pause";
          timerRef.current = setTimeout(step, 1200);
          return;
        }
        timerRef.current = setTimeout(step, 180);
      } else if (mode === "deleting") {
        idxRef.current -= 1;
        const n = Math.max(0, idxRef.current);
        setTxt(full.slice(0, n));
        if (n === 0) {
          modeRef.current = "typing";
          timerRef.current = setTimeout(step, 650);
          return;
        }
        timerRef.current = setTimeout(step, 110);
      } else {
        // pause
        modeRef.current = "deleting";
        timerRef.current = setTimeout(step, 100);
      }
    };
    timerRef.current = setTimeout(step, 250);
    return () => timerRef.current && clearTimeout(timerRef.current);
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        top: 96,
        left: 60,
        zIndex: 4,
        pointerEvents: "none",
        display: "grid",
        gap: 6,
        color: "#e5e7eb",
        fontFamily:
          'Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
      aria-label="NEMO typing"
    >
      {/* Static title */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontWeight: 400,
          letterSpacing: 10,
          fontSize: 68,
          textTransform: "uppercase",
          textShadow: "0 3px 24px rgba(0,0,0,.45)",
        }}
      >
        {fullTitle}
      </div>
      {/* Typed subline */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontWeight: 600,
          letterSpacing: 0.3,
          fontSize: 14,
          textShadow: "0 2px 18px rgba(0,0,0,.35)",
        }}
      >
        <span>{txt}</span>
        <span
          aria-hidden="true"
          style={{
            width: 8,
            height: 14,
            background: "#e5e7eb",
            opacity: 0.9,
            display: "inline-block",
            animation: "caretBlink 1s step-end infinite",
          }}
        />
        <style>{`@keyframes caretBlink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
      </div>
    </div>
  );
}

export default function Index() {
  const router = useRouter();
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [fading, setFading] = useState(false);
  const [fxGather, setFxGather] = useState(false);
  const [fxExplode, setFxExplode] = useState(false);
  const mainAudioRef = useRef(null);
  const [needsTap, setNeedsTap] = useState(false);

  useEffect(() => {
    // generate QR for /mobile on same host (socket path shared)
    const href = typeof window !== "undefined" ? `${window.location.origin}/mobile` : "/mobile";
    QRCode.toDataURL(href, { margin: 1, scale: 6, color: { dark: "#e5e7eb", light: "#000000" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, []);

  function rampVolume(audio, target, ms) {
    if (!audio) return;
    const steps = Math.max(1, Math.floor(ms / 50));
    const start = audio.volume;
    const delta = target - start;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      const t = i / steps;
      audio.volume = Math.max(0, Math.min(1, start + delta * t));
      if (i >= steps) clearInterval(id);
    }, 50);
  }

  useEffect(() => {
    // boot background main music at landing
    try {
      const a = new Audio("/mmusic/main.mp3");
      a.loop = true;
      a.volume = 0;
      mainAudioRef.current = a;
      a.play().then(() => {
        rampVolume(a, 0.5, 1200);
      }).catch(() => setNeedsTap(true));
    } catch {}
  }, []);

  const enableAudio = () => {
    try {
      const a = mainAudioRef.current || new Audio("/mmusic/main.mp3");
      mainAudioRef.current = a;
      a.loop = true;
      if (a.paused) a.play().catch(() => {});
      rampVolume(a, 0.5, 800);
      setNeedsTap(false);
    } catch {}
  };

  useEffect(() => {
    // Listen for mobile connection to auto proceed
    const socket = io({ path: "/api/socketio" });
    const onProceed = () => {
      handleStart();
    };
    const onReset = () => {
      try {
        // already on index; ensure state reset visually
        setFading(false); setFxGather(false); setFxExplode(false);
      } catch {}
    };
    socket.on("landingProceed", onProceed);
    socket.on("app:reset", onReset);
    return () => {
      socket.off("landingProceed", onProceed);
      socket.off("app:reset", onReset);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = useCallback(() => {
    if (fading) return;
    // sequence: gather -> explode -> blackout -> navigate
    setFxGather(true);
    setTimeout(() => setFxExplode(true), 800);
    setTimeout(() => setFading(true), 1650);
    setTimeout(() => router.push("/page2"), 2400);
  }, [fading, router]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        background: "#0b0d12",
        overflow: "hidden",
      }}
      onPointerDown={needsTap ? enableAudio : undefined}
    >
      <Head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css"
        />
      </Head>

      {/* Loading background video (like /loding) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          opacity: 0.35,
          pointerEvents: "none",
        }}
      >
        <video
          src="/nemo.mp4"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          autoPlay
          loop
          muted
          playsInline
        />
      </div>

      {/* Window-frame flowing typos */}
      <FrameTypos gather={fxGather} explode={fxExplode} />

      {/* Top-left typing NEMO */}
      <TypingNemo />

      {/* QR bottom-left - glassy modal style (only QR) */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: 60,
          transform: "none",
          display: "grid",
          placeItems: "center",
          padding: 12,
          borderRadius: 16,
          background: "rgba(17,19,24,.72)",
          border: "none",
          backdropFilter: "blur(8px)",
          boxShadow: "0 12px 40px rgba(0,0,0,.35)",
          zIndex: 3,
        }}
      >
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="Open mobile control"
            width={140}
            height={140}
            style={{ display: "block", borderRadius: 10 }}
          />
        ) : null}
        </div>

      {/* Bottom-right glass nav */}
      <div
        style={{
          position: "absolute",
          right: 16,
          bottom: 16,
          zIndex: 4,
          display: "flex",
          gap: 8,
          padding: "6px 8px",
          borderRadius: 12,
          background: "rgba(17,19,24,0.35)",
          border: "1px solid rgba(255,255,255,0.16)",
          backdropFilter: "blur(10px) saturate(1.02)",
        }}
      >
        <button
          onClick={handleStart}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(17,19,24,0.35)",
            color: "#e5e7eb",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          다음
        </button>
      </div>

      {/* Sound opt-in */}
      {needsTap ? (
        <div
          onClick={enableAudio}
          style={{
            position: "absolute",
            bottom: 22,
            left: 22,
            zIndex: 4,
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(0,0,0,0.35)",
            color: "#e5e7eb",
            fontSize: 13,
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          🔊 탭하여 사운드 활성화
        </div>
      ) : null}

      {/* Fade-to-black overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#000",
          pointerEvents: "none",
          opacity: fading ? 1 : 0,
          transition: "opacity 900ms ease",
        }}
      />
    </div>
  );
}


